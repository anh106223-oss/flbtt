import { useMemo, useState } from 'react';
import { Eye, Mountain } from 'lucide-react';
import {
  FLAGSHIP_ARMOR_LAYERS,
  MAX_MAP_MINES,
  MAX_MAP_ROCKS,
  NATIONS,
  buildBalancedAIFleet,
  ensureFlagshipTemplates,
  getDefaultPlayerName,
  getFormationShips,
  isDefaultPlayerName,
} from './data/nationsAndFleets';
import {
  DEFAULT_P1_SKILLS,
  SKILLS,
  getAISkillsForDifficulty,
} from './data/skills';
import {
  BattleGoal,
  BattleLogEntry,
  GameMode,
  GameRules,
  GameScreen,
  MapMode,
  PlacedShip,
  PlayerBattleState,
  PlayerSetup,
  ShotResultStatus,
} from './types/game';
import {
  autoPlaceFleet,
  coordKey,
  formatCoordLabel,
  generateRandomHazards,
} from './utils/fleetLogic';
import { soundFX } from './utils/sound';
import { OceanCanvas } from './components/OceanCanvas';
import { TitleScreen } from './components/TitleScreen';
import { SetupScreen } from './components/SetupScreen';
import { HazardPlacementPhase } from './components/HazardPlacementPhase';
import { PlacementPhase } from './components/PlacementPhase';
import { BattlePhase } from './components/BattlePhase';
import { PythonAiModal } from './components/PythonAiModal';

function buildInitialBattleState(
  setup: PlayerSetup,
  ships: PlacedShip[],
  battleGoal: BattleGoal,
  mapMode: MapMode
): PlayerBattleState {
  const skillUsesLeft: Record<string, number> = {};
  const skillCooldowns: Record<string, number> = {};
  for (const sid of setup.skillIds) {
    const def = SKILLS[sid];
    if (def) {
      skillUsesLeft[sid] = def.maxUses;
      skillCooldowns[sid] = 0;
    }
  }

  const hasReinforcedArmor = setup.skillIds.includes('reinforced_armor');
  const segMaxVal = hasReinforcedArmor ? 2 : 1;

  let normalizedShips: PlacedShip[] = ships.map((s) => {
    const segmentHp: Record<string, number> = {};
    const segmentMaxHp: Record<string, number> = {};
    for (const c of s.cells) {
      const k = coordKey(c.r, c.c);
      segmentMaxHp[k] = segMaxVal;
      segmentHp[k] = segMaxVal;
    }
    return {
      ...s,
      hits: [],
      sunk: false,
      segmentHp,
      segmentMaxHp,
    };
  });

  if (battleGoal === 'FLAGSHIP_HUNT') {
    let flagshipIdx = normalizedShips.findIndex((s) => s.isFlagship);
    if (flagshipIdx === -1) {
      flagshipIdx = normalizedShips.findIndex((s) => s.cells.length === 6);
    }
    if (flagshipIdx === -1) {
      flagshipIdx = normalizedShips.findIndex((s) => s.cells.length === 5);
    }
    if (flagshipIdx === -1 && normalizedShips.length > 0) {
      flagshipIdx = 0;
      normalizedShips.forEach((s, i) => {
        if (s.cells.length > normalizedShips[flagshipIdx].cells.length) {
          flagshipIdx = i;
        }
      });
    }
    normalizedShips = normalizedShips.map((s, i) =>
      i === flagshipIdx
        ? {
            ...s,
            isFlagship: true,
            armorMax: FLAGSHIP_ARMOR_LAYERS,
            armorRemaining: FLAGSHIP_ARMOR_LAYERS,
          }
        : {
            ...s,
            isFlagship: false,
            armorMax: 0,
            armorRemaining: 0,
          }
    );
  } else {
    normalizedShips = normalizedShips.map((s) => ({
      ...s,
      isFlagship: false,
      armorMax: 0,
      armorRemaining: 0,
    }));
  }

  const activeRocks = mapMode === 'CUSTOM_HAZARDS' ? [...setup.rocks] : [];
  const activeMapMines = mapMode === 'CUSTOM_HAZARDS' ? [...setup.mapMines] : [];
  const mineSet = new Set(activeMapMines);
  const detonatedMines = new Set<string>();
  const receivedShots: Record<string, ShotResultStatus> = {};
  const initialLogs: BattleLogEntry[] = [];
  let totalShotsReceived = 0;
  let totalHitsReceived = 0;

  if (mineSet.size > 0) {
    normalizedShips = normalizedShips.map((ship) => {
      const hitKeys: string[] = [];
      const nextSegHp = { ...(ship.segmentHp ?? {}) };
      for (const cell of ship.cells) {
        const k = coordKey(cell.r, cell.c);
        if (mineSet.has(k)) {
          detonatedMines.add(k);
          const curSeg = nextSegHp[k] ?? 1;
          if (curSeg > 1) {
            nextSegHp[k] = curSeg - 1;
            receivedShots[k] = 'armor';
          } else {
            nextSegHp[k] = 0;
            hitKeys.push(k);
            receivedShots[k] = 'hit';
          }
          totalShotsReceived++;
          totalHitsReceived++;
        }
      }
      if (!ship.cells.some((c) => detonatedMines.has(coordKey(c.r, c.c)))) {
        return ship;
      }

      const isNowSunk = hitKeys.length >= ship.cells.length;
      if (isNowSunk) {
        for (const sc of ship.cells) {
          receivedShots[coordKey(sc.r, sc.c)] = 'sunk';
        }
      }
      const affectedCoords = ship.cells
        .filter((c) => detonatedMines.has(coordKey(c.r, c.c)))
        .map((c) => formatCoordLabel(c.r, c.c))
        .join(', ');

      initialLogs.push({
        id: `init-mine-${setup.id}-${ship.instanceId}`,
        turn: 1,
        attackerName: setup.name,
        attackerNation: setup.nationId,
        coordLabel: affectedCoords,
        result: isNowSunk ? 'sunk' : hitKeys.length > 0 ? 'hit' : 'armor',
        sunkShipName: isNowSunk ? ship.name : undefined,
        detail: `${ship.name} đặt nhầm thủy lôi! Kích nổ ngay khi vào trận.`,
      });

      return {
        ...ship,
        hits: hitKeys,
        sunk: isNowSunk,
        segmentHp: nextSegHp,
      };
    });
  }

  const remainingMines = activeMapMines.filter((m) => !detonatedMines.has(m));

  const initialShields: string[] = [];
  if (setup.skillIds.includes('first_turn_aegis')) {
    const target =
      normalizedShips.find((s) => s.isFlagship && !s.sunk) ??
      [...normalizedShips]
        .filter((s) => !s.sunk)
        .sort((a, b) => b.cells.length - a.cells.length)[0];
    if (target) initialShields.push(target.instanceId);
  }

  return {
    setup,
    ships: normalizedShips,
    receivedShots,
    totalShotsReceived,
    totalHitsReceived,
    rocks: activeRocks,
    hiddenMapMines: remainingMines,
    initialLogs,
    shieldedShipIds: initialShields,
    reflectiveShieldShipIds: [],
    evasionProtectedShipIds: [],
    smokeCells: {},
    domeShieldCells: {},
    airstrikeJamZones: [],
    empGrids: [],
    mines: [],
    decoys: [],
    decoyExpiry: {},
    revealedShipIds: [],
    revealedCells: [],
    revealedMineCells: [],
    signalAnalysisRecords: {},
    burningCells: {},
    empLockedTurns: 0,
    empImmunityTurns: 0,
    radarJamTurns: 0,
    interceptorReady: false,
    followUpReady: false,
    improvedAmmoReady: false,
    ciwsReady: setup.skillIds.includes('ciws'),
    noDamageStreakTurns: 0,
    tookDamageLastTurn: false,
    infoFogTurns: 0,
    hiddenHitMarks: {},
    jammedTiles: {},
    skillCooldowns,
    skillUsesLeft,
  };
}

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('TITLE');
  const [showPythonModal, setShowPythonModal] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);

  const [rules, setRules] = useState<GameRules>({
    mode: 'VS_AI',
    battleGoal: 'ANNIHILATION',
    mapMode: 'OPEN_SEA',
    randomEventsEnabled: true,
    aiDifficulty: 5,
    aiPlacementMode: 'RANDOM',
    firingRule: 'SINGLE',
    noTouch: true,
    autoBalanceAI: true,
  });

  const [player1, setPlayer1] = useState<PlayerSetup>({
    id: 'P1',
    name: getDefaultPlayerName('VN', false),
    nationId: 'VN',
    formationId: 'NATIONAL',
    customShipIds: [...NATIONS.VN.signatureShipIds],
    bonusShipIds: [],
    skillIds: [...DEFAULT_P1_SKILLS],
    rocks: [],
    mapMines: [],
  });

  const [player2, setPlayer2] = useState<PlayerSetup>({
    id: 'P2',
    name: getDefaultPlayerName('US', true),
    nationId: 'US',
    formationId: 'NATIONAL',
    customShipIds: [...NATIONS.US.signatureShipIds],
    bonusShipIds: [],
    skillIds: getAISkillsForDifficulty(5),
    rocks: [],
    mapMines: [],
  });

  const [placementStage, setPlacementStage] = useState<'HAZARDS' | 'SHIPS'>('SHIPS');
  const [hazardStepFor, setHazardStepFor] = useState<'P1' | 'P2'>('P1');
  const [hazardHandoff, setHazardHandoff] = useState<boolean>(false);
  const [placingFor, setPlacingFor] = useState<'P1' | 'P2'>('P1');
  const [p2PlacementHandoff, setP2PlacementHandoff] = useState<boolean>(false);
  const [p1PlacedShips, setP1PlacedShips] = useState<PlacedShip[]>([]);
  const [p2PlacedShips, setP2PlacedShips] = useState<PlacedShip[]>([]);

  const [battleKey, setBattleKey] = useState<number>(1);
  const [battleP1, setBattleP1] = useState<PlayerBattleState | null>(null);
  const [battleP2, setBattleP2] = useState<PlayerBattleState | null>(null);

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundFX.setMuted(next);
    if (!next) {
      soundFX.playClick();
    }
  };

  const handleSelectMode = (mode: GameMode) => {
    setRules((prev) => ({ ...prev, mode }));
    setPlayer2((prev) => ({
      ...prev,
      name: isDefaultPlayerName(prev.name)
        ? getDefaultPlayerName(prev.nationId, mode === 'VS_AI')
        : prev.name,
    }));
    setScreen('SETUP');
  };

  const handleUpdatePlayer = (which: 'P1' | 'P2', next: PlayerSetup) => {
    if (which === 'P1') {
      setPlayer1(next);
      setP1PlacedShips([]);
    } else {
      setPlayer2(next);
      setP2PlacedShips([]);
    }
  };

  const startPlacement = () => {
    setP1PlacedShips([]);
    setP2PlacedShips([]);
    setPlacingFor('P1');
    setP2PlacementHandoff(false);
    if (rules.mapMode === 'CUSTOM_HAZARDS') {
      setPlayer1((prev) => ({ ...prev, rocks: [], mapMines: [] }));
      setPlayer2((prev) => ({ ...prev, rocks: [], mapMines: [] }));
      setPlacementStage('HAZARDS');
      setHazardStepFor('P1');
      setHazardHandoff(false);
    } else {
      setPlacementStage('SHIPS');
    }
    setScreen('PLACEMENT');
  };

  const handleConfirmHazards = (rocks: string[], mapMines: string[]) => {
    if (hazardStepFor === 'P1') {
      // P1 places hazards onto P2 / AI board
      setPlayer2((prev) => ({ ...prev, rocks, mapMines }));
      if (rules.mode === 'VS_AI') {
        // AI places 8 rocks + 8 hidden mines onto P1 board
        const aiHazards = generateRandomHazards(MAX_MAP_ROCKS, MAX_MAP_MINES);
        setPlayer1((prev) => ({
          ...prev,
          rocks: aiHazards.rocks,
          mapMines: aiHazards.mapMines,
        }));
        setPlacementStage('SHIPS');
        setPlacingFor('P1');
        setP2PlacementHandoff(false);
      } else {
        setHazardStepFor('P2');
        setHazardHandoff(true);
      }
    } else {
      // P2 places hazards onto P1 board
      setPlayer1((prev) => ({ ...prev, rocks, mapMines }));
      setHazardHandoff(false);
      setPlacementStage('SHIPS');
      setPlacingFor('P1');
      setP2PlacementHandoff(true);
    }
  };

  const launchBattle = (ships1: PlacedShip[], ships2: PlacedShip[]) => {
    setBattleP1(
      buildInitialBattleState(player1, ships1, rules.battleGoal, rules.mapMode)
    );
    setBattleP2(
      buildInitialBattleState(player2, ships2, rules.battleGoal, rules.mapMode)
    );
    setBattleKey((k) => k + 1);
    setScreen('BATTLE');
  };

  const balancedAITemplates = useMemo(() => {
    if (rules.mode !== 'VS_AI' || !rules.autoBalanceAI) return undefined;
    const p1Tpls = ensureFlagshipTemplates(
      getFormationShips(
        player1.formationId,
        player1.customShipIds,
        player1.nationId,
        player1.bonusShipIds ?? []
      ),
      player1.nationId,
      rules.battleGoal,
      player1.flagshipIndex
    );
    return ensureFlagshipTemplates(
      buildBalancedAIFleet(p1Tpls, player2.nationId),
      player2.nationId,
      rules.battleGoal
    );
  }, [
    rules.mode,
    rules.autoBalanceAI,
    rules.battleGoal,
    player1.formationId,
    player1.customShipIds,
    player1.bonusShipIds,
    player1.flagshipIndex,
    player1.nationId,
    player2.nationId,
  ]);

  const handleConfirmP1Fleet = (ships: PlacedShip[]) => {
    setP1PlacedShips(ships);
    if (rules.mode === 'VS_AI') {
      if (rules.aiPlacementMode === 'MANUAL') {
        setPlacingFor('P2');
        setP2PlacementHandoff(false);
      } else {
        const p1Tpls = ensureFlagshipTemplates(
          getFormationShips(
            player1.formationId,
            player1.customShipIds,
            player1.nationId,
            player1.bonusShipIds ?? []
          ),
          player1.nationId,
          rules.battleGoal,
          player1.flagshipIndex
        );
        const rawAiTemplates = rules.autoBalanceAI
          ? buildBalancedAIFleet(p1Tpls, player2.nationId)
          : getFormationShips(
              player2.formationId,
              player2.customShipIds,
              player2.nationId,
              player2.bonusShipIds ?? []
            );
        const aiTemplates = ensureFlagshipTemplates(
          rawAiTemplates,
          player2.nationId,
          rules.battleGoal,
          rules.autoBalanceAI ? undefined : player2.flagshipIndex
        );
        const aiRocks = rules.mapMode === 'CUSTOM_HAZARDS' ? player2.rocks : [];
        const aiShips = autoPlaceFleet(aiTemplates, rules.noTouch, aiRocks, []);
        setP2PlacedShips(aiShips);
        launchBattle(ships, aiShips);
      }
    } else {
      setPlacingFor('P2');
      setP2PlacementHandoff(true);
    }
  };

  const handleConfirmP2Fleet = (ships: PlacedShip[]) => {
    setP2PlacedShips(ships);
    launchBattle(p1PlacedShips, ships);
  };

  const handleRematch = () => {
    startPlacement();
  };

  const isPlacingAI = rules.mode === 'VS_AI' && placingFor === 'P2';

  return (
    <div className="relative min-h-screen w-full">
      <OceanCanvas />

      {screen === 'TITLE' && (
        <TitleScreen
          onSelectMode={handleSelectMode}
          onOpenPythonModal={() => setShowPythonModal(true)}
          muted={muted}
          onToggleMute={handleToggleMute}
        />
      )}

      {screen === 'SETUP' && (
        <SetupScreen
          rules={rules}
          player1={player1}
          player2={player2}
          onUpdateRules={setRules}
          onUpdatePlayer={handleUpdatePlayer}
          onBack={() => setScreen('TITLE')}
          onContinue={startPlacement}
        />
      )}

      {screen === 'PLACEMENT' && placementStage === 'HAZARDS' && !hazardHandoff && (
        <HazardPlacementPhase
          key={`hazards-${hazardStepFor}`}
          placerSetup={hazardStepFor === 'P1' ? player1 : player2}
          targetSetup={hazardStepFor === 'P1' ? player2 : player1}
          isVsAI={rules.mode === 'VS_AI'}
          onBack={() => {
            if (hazardStepFor === 'P2') {
              setHazardStepFor('P1');
            } else {
              setScreen('SETUP');
            }
          }}
          onConfirmHazards={handleConfirmHazards}
        />
      )}

      {screen === 'PLACEMENT' && placementStage === 'HAZARDS' && hazardHandoff && (
        <div className="min-h-screen w-full flex items-center justify-center p-6">
          <div className="max-w-md w-full p-7 rounded-2xl bg-[#0B2040]/95 border border-sky-400/35 text-center space-y-5 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-500/15 border border-orange-400/40 flex items-center justify-center text-orange-400">
              <Mountain className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-mono-tabular uppercase tracking-wider text-orange-300">
                Bước 1 · Người chơi 2
              </div>
              <h2 className="font-display text-3xl font-bold text-white">
                Giao máy cho {player2.name} xếp Đá &amp; Thủy Lôi
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                setHazardHandoff(false);
              }}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display text-xl font-bold tracking-wide cursor-pointer"
            >
              Sẵn sàng xếp địa hình
            </button>
          </div>
        </div>
      )}

      {screen === 'PLACEMENT' && placementStage === 'SHIPS' && !p2PlacementHandoff && (
        <PlacementPhase
          key={`place-${placingFor}-${rules.battleGoal}-${rules.mapMode}-${rules.aiPlacementMode}-${rules.autoBalanceAI}-${player1.nationId}-${player1.formationId}-${player1.customShipIds.join(',')}-${(player1.bonusShipIds ?? []).join(',')}-${player1.rocks.join(',')}-${player2.nationId}-${player2.formationId}-${player2.customShipIds.join(',')}-${(player2.bonusShipIds ?? []).join(',')}-${player2.rocks.join(',')}-${rules.noTouch}`}
          playerSetup={placingFor === 'P1' ? player1 : player2}
          playerNumber={placingFor === 'P1' ? 1 : 2}
          rules={rules}
          initialShips={placingFor === 'P1' ? p1PlacedShips : p2PlacedShips}
          overrideTemplates={isPlacingAI ? balancedAITemplates : undefined}
          placementContextLabel={
            isPlacingAI ? `Tự xếp Hạm đội cho AI · ${player2.name}` : undefined
          }
          confirmButtonLabel={
            isPlacingAI ? 'Xác nhận tàu AI & Khai Hỏa' : undefined
          }
          onSelectFlagshipIndex={(shipIndex) => {
            if (placingFor === 'P1') {
              setPlayer1((prev) => ({ ...prev, flagshipIndex: shipIndex }));
            } else {
              setPlayer2((prev) => ({ ...prev, flagshipIndex: shipIndex }));
            }
          }}
          onBack={() => {
            if (placingFor === 'P2') {
              setPlacingFor('P1');
            } else if (rules.mapMode === 'CUSTOM_HAZARDS') {
              setPlacementStage('HAZARDS');
              setHazardStepFor('P1');
            } else {
              setScreen('SETUP');
            }
          }}
          onConfirmFleet={
            placingFor === 'P1' ? handleConfirmP1Fleet : handleConfirmP2Fleet
          }
        />
      )}

      {screen === 'PLACEMENT' && placementStage === 'SHIPS' && p2PlacementHandoff && (
        <div className="min-h-screen w-full flex items-center justify-center p-6">
          <div className="max-w-md w-full p-7 rounded-2xl bg-[#0B2040]/95 border border-sky-400/35 text-center space-y-5 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-500/15 border border-orange-400/40 flex items-center justify-center text-orange-400">
              <Eye className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-mono-tabular uppercase tracking-wider text-orange-300">
                {placingFor === 'P1' ? 'Người chơi 1' : 'Người chơi 2'}
              </div>
              <h2 className="font-display text-3xl font-bold text-white">
                Giao máy cho {placingFor === 'P1' ? player1.name : player2.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                setP2PlacementHandoff(false);
              }}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display text-xl font-bold tracking-wide cursor-pointer"
            >
              Sẵn sàng xếp hạm đội
            </button>
          </div>
        </div>
      )}

      {screen === 'BATTLE' && battleP1 && battleP2 && (
        <BattlePhase
          key={battleKey}
          rules={rules}
          initialP1={battleP1}
          initialP2={battleP2}
          muted={muted}
          onToggleMute={handleToggleMute}
          onExitToSetup={() => setScreen('SETUP')}
          onRematch={handleRematch}
        />
      )}

      {showPythonModal && (
        <PythonAiModal onClose={() => setShowPythonModal(false)} />
      )}
    </div>
  );
}
