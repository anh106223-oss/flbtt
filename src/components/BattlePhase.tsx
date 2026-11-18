import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Anchor,
  BookOpen,
  Crosshair,
  Crown,
  Eye,
  Flag,
  History,
  RotateCcw,
  RotateCw,
  Shield,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  AI_MODES,
  COL_LABELS,
  FIRING_RULES,
  GRID_SIZE,
  NATIONS,
} from '../data/nationsAndFleets';
import {
  ALL_OCEAN_EVENT_IDS,
  OCEAN_EVENTS,
  randomCorner6x6,
  scheduleMatchOceanEvents,
} from '../data/oceanEvents';
import { SKILLS } from '../data/skills';
import {
  BattleGoal,
  BattleLogEntry,
  CardinalDirection,
  Coord,
  FuelLeakZone,
  GameRules,
  MaelstromCell,
  PendingHeavyStrike,
  PlacedShip,
  PlayerBattleState,
  ReconLineScan,
  SatelliteRevealZone,
  ScheduledOceanEvent,
  ShotResultStatus,
  SkillId,
  SonarZone,
  StormZone,
} from '../types/game';
import { chooseAIShot, chooseAISkillAction } from '../utils/aiEngine';
import {
  canPlaceShip,
  coordKey,
  formatCoordLabel,
} from '../utils/fleetLogic';
import {
  applySweepingFrequency,
  checkHydrographicHazards,
  clampBoxOrigin,
  dirLabelVi,
  executeTidalShockwaveLine,
  getAreaCells,
  getCrossCells,
  getDiagonalLineCells,
  getDirectionalConeCells,
  getLineCells,
  getXCells,
  hasPassive,
  inBounds,
  recordSignalAnalysis,
  relocateShipWithRollback,
  repairOneSegmentOnShip,
  tryRotateOwnShip90,
  tryRotateOwnShip180,
  trySwapTwoOwnShips,
} from '../utils/skillEngine';
import { NationFlag } from './NationFlag';
import { ShipMiniPreview } from './ShipGraphic';
import { TacticalGrid } from './TacticalGrid';
import { GuideModal } from './GuideModal';
import { soundFX } from '../utils/sound';

interface BattlePhaseProps {
  rules: GameRules;
  initialP1: PlayerBattleState;
  initialP2: PlayerBattleState;
  muted: boolean;
  onToggleMute: () => void;
  onExitToSetup: () => void;
  onRematch: () => void;
}

function hasLostBattle(state: PlayerBattleState, goal: BattleGoal): boolean {
  if (goal === 'FLAGSHIP_HUNT') {
    const flagship = state.ships.find((s) => s.isFlagship);
    if (flagship) return flagship.sunk;
  }
  return state.ships.every((s) => s.sunk);
}

const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const DIR_CYCLE: CardinalDirection[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];

function getShotsPerTurn(
  firingRule: GameRules['firingRule'],
  attackerShips: PlacedShip[]
): number {
  const aliveShips = attackerShips.filter((s) => !s.sunk).length;
  if (firingRule === 'SALVO_3') return Math.max(1, Math.min(3, aliveShips));
  if (firingRule === 'SALVO_5') return Math.max(1, Math.min(5, aliveShips));
  return 1;
}

/**
 * Kết thúc lượt của phe vừa bắn: giảm CD kỹ năng, xóa trạng thái dùng trong lượt (followUpReady, empLockedTurns)
 */
function finishOwnTurnCounters(state: PlayerBattleState): PlayerBattleState {
  const nextCooldowns: Record<string, number> = {};
  for (const [k, v] of Object.entries(state.skillCooldowns)) {
    nextCooldowns[k] = Math.max(0, v - 1);
  }
  const nextJammed: Record<string, number> = {};
  for (const [k, v] of Object.entries(state.jammedTiles)) {
    if (v > 1) nextJammed[k] = v - 1;
  }
  return {
    ...state,
    skillCooldowns: nextCooldowns,
    empLockedTurns: Math.max(0, state.empLockedTurns - 1),
    followUpReady: false,
    jammedTiles: nextJammed,
  };
}

/**
 * Kết thúc lượt tấn công của đối phương lên phe phòng thủ: giảm thời hạn khiên/khói/nhiễu/màn sương & hồi giáp thụ động
 */
function decayDefenseOnEnemyTurnEnd(
  defender: PlayerBattleState,
  completedTurnNo: number
): { nextState: PlayerBattleState; selfRepairedMsg?: string } {
  const nextSmoke: Record<string, number> = {};
  for (const [k, v] of Object.entries(defender.smokeCells)) {
    if (v > 1) nextSmoke[k] = v - 1;
  }
  const nextDome: Record<string, number> = {};
  for (const [k, v] of Object.entries(defender.domeShieldCells)) {
    if (v > 1) nextDome[k] = v - 1;
  }
  const nextHiddenMarks: Record<string, number> = {};
  for (const [k, v] of Object.entries(defender.hiddenHitMarks)) {
    if (v > 1) nextHiddenMarks[k] = v - 1;
  }
  const nextJamZones = defender.airstrikeJamZones.filter(
    (z) => z.expiresTurn > completedTurnNo
  );

  // Decay temporary decoys whose expiry passed
  const nextDecoys = defender.decoys.filter((dk) => {
    const exp = defender.decoyExpiry[dk];
    return exp === undefined || exp > completedTurnNo;
  });
  const nextDecoyExpiry: Record<string, number> = {};
  for (const dk of nextDecoys) {
    if (defender.decoyExpiry[dk] !== undefined) {
      nextDecoyExpiry[dk] = defender.decoyExpiry[dk];
    }
  }

  let updated: PlayerBattleState = {
    ...defender,
    smokeCells: nextSmoke,
    domeShieldCells: nextDome,
    hiddenHitMarks: nextHiddenMarks,
    airstrikeJamZones: nextJamZones,
    evasionProtectedShipIds: [],
    radarJamTurns: Math.max(0, defender.radarJamTurns - 1),
    infoFogTurns: Math.max(0, defender.infoFogTurns - 1),
    empImmunityTurns: Math.max(0, defender.empImmunityTurns - 1),
    decoys: nextDecoys,
    decoyExpiry: nextDecoyExpiry,
  };

  // 26. Giáp Tự Phục Hồi (Bị động): 5 lượt liên tiếp không nhận sát thương vào tàu -> hồi +1 HP/giáp
  let selfRepairedMsg: string | undefined;
  if (hasPassive(updated, 'self_repair_armor')) {
    if (updated.tookDamageLastTurn) {
      updated = { ...updated, noDamageStreakTurns: 0, tookDamageLastTurn: false };
    } else {
      const nextStreak = updated.noDamageStreakTurns + 1;
      if (nextStreak >= 5) {
        const damagedShip = updated.ships.find(
          (s) =>
            !s.sunk &&
            (s.hits.length > 0 || (s.armorRemaining ?? 0) < (s.armorMax ?? 0))
        );
        if (damagedShip) {
          const rep = repairOneSegmentOnShip(updated, damagedShip.instanceId);
          updated = rep.nextState;
          if (rep.repaired) {
            selfRepairedMsg = `Giáp Tự Phục Hồi: ${rep.detail}`;
          }
        }
        updated = { ...updated, noDamageStreakTurns: 0, tookDamageLastTurn: false };
      } else {
        updated = {
          ...updated,
          noDamageStreakTurns: nextStreak,
          tookDamageLastTurn: false,
        };
      }
    }
  } else {
    updated = { ...updated, tookDamageLastTurn: false };
  }

  return { nextState: updated, selfRepairedMsg };
}

export const BattlePhase: React.FC<BattlePhaseProps> = ({
  rules,
  initialP1,
  initialP2,
  muted,
  onToggleMute,
  onExitToSetup,
  onRematch,
}) => {
  const [p1, setP1] = useState<PlayerBattleState>(initialP1);
  const [p2, setP2] = useState<PlayerBattleState>(initialP2);
  const [activeTurn, setActiveTurn] = useState<'P1' | 'P2'>('P1');
  const [turnNumber, setTurnNumber] = useState<number>(1);
  const [shotsRemaining, setShotsRemaining] = useState<number>(() =>
    getShotsPerTurn(rules.firingRule, initialP1.ships)
  );
  const [isAIThinking, setIsAIThinking] = useState<boolean>(false);
  const [privacyShieldFor, setPrivacyShieldFor] = useState<'P1' | 'P2' | null>(
    null
  );
  const [winner, setWinner] = useState<'P1' | 'P2' | null>(() => {
    if (hasLostBattle(initialP2, rules.battleGoal)) return 'P1';
    if (hasLostBattle(initialP1, rules.battleGoal)) return 'P2';
    return null;
  });
  const [lastShotKeysP1, setLastShotKeysP1] = useState<string[]>([]);
  const [lastShotKeysP2, setLastShotKeysP2] = useState<string[]>([]);
  const [shakeBoard, setShakeBoard] = useState<'P1' | 'P2' | null>(null);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>(() => [
    ...(initialP1.initialLogs ?? []),
    ...(initialP2.initialLogs ?? []),
  ]);

  // Active Skill Selection UI State
  const [activeSkillId, setActiveSkillId] = useState<SkillId | null>(null);
  const [skillAxis, setSkillAxis] = useState<'ROW' | 'COL'>('ROW');
  const [actionDirection, setActionDirection] =
    useState<CardinalDirection>('RIGHT');
  const [salvoQueuedCoords, setSalvoQueuedCoords] = useState<Coord[]>([]);
  const [swapFirstShipId, setSwapFirstShipId] = useState<string | null>(null);
  const [usedActiveSkillThisTurn, setUsedActiveSkillThisTurn] =
    useState<boolean>(false);
  const [primaryFirepowerUsedThisTurn, setPrimaryFirepowerUsedThisTurn] =
    useState<boolean>(false);
  const [pendingHeavyStrikes, setPendingHeavyStrikes] = useState<
    PendingHeavyStrike[]
  >([]);
  const [hoverEnemyCell, setHoverEnemyCell] = useState<Coord | null>(null);
  const [hoverOwnCell, setHoverOwnCell] = useState<Coord | null>(null);

  // Recon intel overlays per attacker
  const [sonarZonesP1, setSonarZonesP1] = useState<SonarZone[]>([]);
  const [sonarZonesP2, setSonarZonesP2] = useState<SonarZone[]>([]);
  const [reconLinesP1, setReconLinesP1] = useState<ReconLineScan[]>([]);
  const [reconLinesP2, setReconLinesP2] = useState<ReconLineScan[]>([]);

  // Random Ocean Events State (cả 7 sự kiện mỗi ván, bắt đầu lượt 10-20, cách nhau 8-15 lượt)
  const scheduledEventsRef = useRef<ScheduledOceanEvent[]>(
    rules.randomEventsEnabled
      ? scheduleMatchOceanEvents(rules.mode === 'VS_AI')
      : []
  );
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [triggeredEventsCount, setTriggeredEventsCount] = useState<number>(0);
  const [satelliteBoardP1, setSatelliteBoardP1] = useState<
    SatelliteRevealZone[]
  >([]);
  const [satelliteBoardP2, setSatelliteBoardP2] = useState<
    SatelliteRevealZone[]
  >([]);
  const [stormBoardP1, setStormBoardP1] = useState<StormZone[]>([]);
  const [stormBoardP2, setStormBoardP2] = useState<StormZone[]>([]);
  const [fuelLeakBoardP1, setFuelLeakBoardP1] = useState<FuelLeakZone[]>([]);
  const [fuelLeakBoardP2, setFuelLeakBoardP2] = useState<FuelLeakZone[]>([]);
  const [maelstromBoardP1, setMaelstromBoardP1] = useState<MaelstromCell[]>([]);
  const [maelstromBoardP2, setMaelstromBoardP2] = useState<MaelstromCell[]>([]);
  const [denseFogUntilTurn, setDenseFogUntilTurn] = useState<number>(0);
  const [activeEventBanner, setActiveEventBanner] = useState<{
    title: string;
    detail: string;
    turn: number;
  } | null>(null);

  const aiTimerRef = useRef<number | null>(null);
  const flagshipAegisUsedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      if (aiTimerRef.current) {
        window.clearTimeout(aiTimerRef.current);
      }
    };
  }, []);

  // Keyboard R to cycle direction/axis when targeting directional/line skills
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'r' || e.key === 'R') && activeSkillId) {
        if (activeSkillId === 'recon_plane') {
          e.preventDefault();
          soundFX.playRotate();
          setSkillAxis((prev) => (prev === 'ROW' ? 'COL' : 'ROW'));
        } else {
          const mode = SKILLS[activeSkillId]?.targetMode;
          if (
            activeSkillId === 'tidal_shockwave' ||
            activeSkillId === 'fleet_smoke_wall' ||
            mode === 'ENEMY_LINE' ||
            mode === 'ENEMY_LINE_4' ||
            mode === 'ENEMY_LINE_6' ||
            mode === 'ENEMY_DIAG' ||
            mode === 'ENEMY_CONE' ||
            mode === 'OWN_SHIP_DIR' ||
            mode === 'ENEMY_SHIP_DIR'
          ) {
            e.preventDefault();
            soundFX.playRotate();
            setActionDirection((prev) => {
              const idx = DIR_CYCLE.indexOf(prev);
              return DIR_CYCLE[(idx + 1) % DIR_CYCLE.length];
            });
          }
        }
      } else if (e.key === 'Escape' && activeSkillId) {
        setActiveSkillId(null);
        setSalvoQueuedCoords([]);
        setSwapFirstShipId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeSkillId]);

  const triggerShake = (board: 'P1' | 'P2') => {
    setShakeBoard(board);
    window.setTimeout(() => setShakeBoard(null), 320);
  };

  const pushLog = (entry: Omit<BattleLogEntry, 'id'>) => {
    setBattleLog((prev) => [
      { ...entry, id: `${entry.turn}-${Date.now()}-${Math.random()}` },
      ...prev.slice(0, 69),
    ]);
  };

  /**
   * Áp dụng hiệu ứng Vùng Nước Xoáy Ngầm:
   * Tàu chạm xoáy chịu 1 sát thương trực tiếp vào thân tàu và bị đẩy tịnh tiến 1 ô bên cạnh.
   */
  const applyMaelstromOnBoard = (
    boardState: PlayerBattleState,
    activeVortices: MaelstromCell[]
  ): {
    nextState: PlayerBattleState;
    hitLogs: string[];
  } => {
    if (activeVortices.length === 0) {
      return { nextState: boardState, hitLogs: [] };
    }
    let working = boardState;
    const hitLogs: string[] = [];

    for (const v of activeVortices) {
      const touched = working.ships.find(
        (s) => !s.sunk && s.cells.some((sc) => sc.r === v.r && sc.c === v.c)
      );
      if (!touched) continue;

      const vKey = coordKey(v.r, v.c);
      const damageKey = !touched.hits.includes(vKey)
        ? vKey
        : (() => {
            const unhit = touched.cells.find(
              (sc) => !touched.hits.includes(coordKey(sc.r, sc.c))
            );
            return unhit ? coordKey(unhit.r, unhit.c) : vKey;
          })();

      const nextShots = { ...working.receivedShots };
      let updatedShipRef: PlacedShip | null = null;
      const nextShips = working.ships.map((s) => {
        if (s.instanceId !== touched.instanceId) return s;
        const nextHits = s.hits.includes(damageKey)
          ? s.hits
          : [...s.hits, damageKey];
        const isNowSunk = nextHits.length >= s.cells.length;
        if (isNowSunk) {
          for (const sc of s.cells) {
            nextShots[coordKey(sc.r, sc.c)] = 'sunk';
          }
        } else {
          nextShots[damageKey] = 'hit';
        }
        const upd = { ...s, hits: nextHits, sunk: isNowSunk };
        updatedShipRef = upd;
        return upd;
      });

      working = {
        ...working,
        ships: nextShips,
        receivedShots: nextShots,
        totalShotsReceived: working.totalShotsReceived + 1,
        totalHitsReceived: working.totalHitsReceived + 1,
      };

      let pushedNote = '';
      if (updatedShipRef && !(updatedShipRef as PlacedShip).sunk) {
        const pushDirs: Coord[] = [
          { r: 0, c: 1 },
          { r: 1, c: 0 },
          { r: 0, c: -1 },
          { r: -1, c: 0 },
        ];
        const shipToPush = updatedShipRef as PlacedShip;
        for (const d of pushDirs) {
          const nr = shipToPush.anchor.r + d.r;
          const nc = shipToPush.anchor.c + d.c;
          const check = canPlaceShip(
            shipToPush.offsets,
            nr,
            nc,
            working.ships,
            rules.noTouch,
            shipToPush.instanceId,
            working.rocks
          );
          if (
            check.valid &&
            !check.cells.some((sc) =>
              activeVortices.some((av) => av.r === sc.r && av.c === sc.c)
            )
          ) {
            working = relocateShipWithRollback(
              working,
              shipToPush,
              { r: nr, c: nc },
              shipToPush.offsets,
              check.cells
            ).nextState;
            pushedNote = ` & bị đẩy sang ${formatCoordLabel(nr, nc)}`;
            break;
          }
        }
      }
      hitLogs.push(
        `${touched.name} trúng Xoáy @ ${formatCoordLabel(v.r, v.c)} (-1 thân${pushedNote})`
      );
    }

    return { nextState: working, hitLogs };
  };

  /**
   * Ghi nhận ký chiến đấu (tự động gắn ẩn Info Fog nếu phe địch đang bật Màn Sương Thông Tin)
   */
  const pushSideAwareLog = (
    attackerSide: 'P1' | 'P2',
    defenderState: PlayerBattleState,
    turnNo: number,
    entry: Omit<BattleLogEntry, 'id' | 'turn'>
  ) => {
    const isFogged = defenderState.infoFogTurns > 0;
    pushLog({
      ...entry,
      turn: turnNo,
      attackerSide,
      hiddenFromSide: isFogged ? attackerSide : undefined,
      hiddenUntilTurn: isFogged ? turnNo + defenderState.infoFogTurns : undefined,
    });
  };

  /**
   * Giải quyết 1 phát bắn theo thứ tự ưu tiên:
   * Đá ngầm -> Lưới EMP 2×2 -> Màn Khói (30% đơn mục tiêu) -> Mồi nhử -> Thủy lôi (+ Phản kích) ->
   * Khiên Năng Lượng -> Khiên Phản Xạ -> Giáp (Soái Hạm / Gia Cường) -> Phá hủy phân đoạn -> Mồi Nhử Tự Động
   */
  const resolveSingleImpact = (
    attacker: PlayerBattleState,
    defender: PlayerBattleState,
    r: number,
    c: number,
    _curTurn: number,
    options?: {
      bypassShields?: boolean;
      isAoe?: boolean;
      isSingleTarget?: boolean;
      damage?: number;
    }
  ): {
    nextAttacker: PlayerBattleState;
    nextDefender: PlayerBattleState;
    result: ShotResultStatus;
    sunkShipName?: string;
    detail?: string;
    mineCounterCoord?: Coord;
  } => {
    const key = coordKey(r, c);
    const existingShot = defender.receivedShots[key];
    if (existingShot && existingShot !== 'armor') {
      return {
        nextAttacker: attacker,
        nextDefender: defender,
        result: 'miss',
      };
    }

    const bypass = Boolean(options?.bypassShields);
    const isSingleTarget = options?.isSingleTarget ?? !options?.isAoe;
    const isCriticalBarrage =
      isSingleTarget &&
      !options?.isAoe &&
      defender.revealedCells.includes(key) &&
      hasPassive(attacker, 'critical_barrage') &&
      Math.random() < 0.3;
    const damage = (options?.damage ?? 1) + (isCriticalBarrage ? 1 : 0);

    let nextAttacker: PlayerBattleState = {
      ...attacker,
      jammedTiles: { ...attacker.jammedTiles },
    };
    let nextDefender: PlayerBattleState = {
      ...defender,
      receivedShots: { ...defender.receivedShots },
      shieldedShipIds: [...defender.shieldedShipIds],
      reflectiveShieldShipIds: [...defender.reflectiveShieldShipIds],
      mines: [...defender.mines],
      hiddenMapMines: [...defender.hiddenMapMines],
      decoys: [...defender.decoys],
      empGrids: [...defender.empGrids],
      revealedCells: defender.revealedCells.filter((ck) => ck !== key),
      revealedMineCells: defender.revealedMineCells.filter((mk) => mk !== key),
      hiddenHitMarks: { ...defender.hiddenHitMarks },
      jammedTiles: { ...defender.jammedTiles },
      burningCells: { ...defender.burningCells },
    };

    const nextShots = nextDefender.receivedShots;
    const notes: string[] = [];
    if (isCriticalBarrage) {
      notes.push('Loạt Đạn Chí Mạng (+1 sát thương vào ô đã lộ!)');
    }

    // 0. Check 1x1 Impassable Sea Rock Reef
    if (nextDefender.rocks.includes(key)) {
      nextShots[key] = 'rock';
      return {
        nextAttacker,
        nextDefender: {
          ...nextDefender,
          totalShotsReceived: nextDefender.totalShotsReceived + 1,
        },
        result: 'rock',
        detail: 'Va phải Đá ngầm 1×1!',
      };
    }

    // 0b. Check Lưới Điện Từ Ngầm 2×2 (#32) hoặc Mìn EMP Điểm Đơn 1×1 (#91)
    const triggeredGrid = nextDefender.empGrids.find((g) => {
      const sz = g.size ?? 2;
      return r >= g.topR && r < g.topR + sz && c >= g.leftC && c < g.leftC + sz;
    });
    if (triggeredGrid) {
      nextDefender.empGrids = nextDefender.empGrids.filter(
        (g) => g.id !== triggeredGrid.id
      );
      if (nextAttacker.empImmunityTurns > 0) {
        notes.push('Áp Chế EMP miễn nhiễm bẫy Lưới EMP!');
      } else {
        nextAttacker = {
          ...nextAttacker,
          empLockedTurns: Math.max(nextAttacker.empLockedTurns, 1),
        };
        notes.push(
          `Kích nổ bẫy EMP ${(triggeredGrid.size ?? 2) === 1 ? '1×1' : '2×2'} (khóa kỹ năng kẻ tấn công 1 lượt!)`
        );
      }
    }

    // 0c. 35. Check ô bị nhiễu bởi Thủy Lôi Phản Kích / Đèn Hiệu Siren
    if (!bypass && isSingleTarget && nextDefender.jammedTiles[key]) {
      delete nextDefender.jammedTiles[key];
      nextShots[key] = 'miss';
      return {
        nextAttacker,
        nextDefender: {
          ...nextDefender,
          totalShotsReceived: nextDefender.totalShotsReceived + 1,
        },
        result: 'miss',
        detail: 'Ô bị nhiễu từ Thủy Lôi Phản Kích làm lệch đạn!',
      };
    }

    // 1. 38. Check Smoke Screen evasion (30% deflect single-target shot, bypassed by Armor-Piercing)
    if (
      !bypass &&
      isSingleTarget &&
      nextDefender.smokeCells[key] &&
      Math.random() < 0.3
    ) {
      nextShots[key] = 'miss';
      return {
        nextAttacker,
        nextDefender: {
          ...nextDefender,
          totalShotsReceived: nextDefender.totalShotsReceived + 1,
        },
        result: 'miss',
        detail: notes.length
          ? `${notes[0]} · Màn khói làm lệch đạn!`
          : 'Màn khói ngụy trang làm lệch hướng đạn (30%)!',
      };
    }

    // 2. Check Decoy Ping (+ #97 Tiếng Vang Ảo Ảnh)
    if (nextDefender.decoys.includes(key)) {
      nextDefender.decoys = nextDefender.decoys.filter((d) => d !== key);
      nextShots[key] = 'miss';
      let phantomNote = 'Trúng tín hiệu radar giả!';
      if (hasPassive(nextDefender, 'phantom_echo_passive')) {
        const adj = [
          { r: r - 1, c },
          { r: r + 1, c },
          { r, c: c - 1 },
          { r, c: c + 1 },
        ].filter((pt) => {
          if (!inBounds(pt.r, pt.c)) return false;
          const pk = coordKey(pt.r, pt.c);
          return (
            !nextDefender.rocks.includes(pk) &&
            !nextDefender.receivedShots[pk] &&
            !nextDefender.decoys.includes(pk) &&
            !nextDefender.ships.some((s) =>
              s.cells.some((sc) => sc.r === pt.r && sc.c === pt.c)
            )
          );
        });
        if (adj.length > 0) {
          const pk = coordKey(adj[0].r, adj[0].c);
          nextDefender.decoys = [...nextDefender.decoys, pk];
          nextDefender.decoyExpiry = {
            ...nextDefender.decoyExpiry,
            [pk]: _curTurn + 1,
          };
          phantomNote += ' · Tiếng Vang Ảo Ảnh sinh thêm 1 mồi kề!';
        }
      }
      return {
        nextAttacker,
        nextDefender: {
          ...nextDefender,
          totalShotsReceived: nextDefender.totalShotsReceived + 1,
        },
        result: 'miss',
        detail: phantomNote,
      };
    }

    // 3. Check Sea Mine / Hidden Map Mine counter-strike (+ #35 Thủy Lôi Phản Kích + #98 Thủy Lôi Phá Hoại)
    let mineCounterCoord: Coord | undefined;
    const hitFriendlyMine = nextDefender.mines.includes(key);
    const hitHiddenMapMine = nextDefender.hiddenMapMines.includes(key);
    if (hitFriendlyMine || hitHiddenMapMine) {
      nextDefender.mines = nextDefender.mines.filter((m) => m !== key);
      nextDefender.hiddenMapMines = nextDefender.hiddenMapMines.filter(
        (m) => m !== key
      );
      const aliveAttackerCells: Coord[] = [];
      for (const s of nextAttacker.ships) {
        if (s.sunk) continue;
        for (const cell of s.cells) {
          const ck = coordKey(cell.r, cell.c);
          if (!nextAttacker.receivedShots[ck]) {
            aliveAttackerCells.push(cell);
          }
        }
      }
      if (aliveAttackerCells.length > 0) {
        const pick =
          aliveAttackerCells[
            Math.floor(Math.random() * aliveAttackerCells.length)
          ];
        mineCounterCoord = pick;
        const pk = coordKey(pick.r, pick.c);
        const attShots = { ...nextAttacker.receivedShots };
        const attShips = nextAttacker.ships.map((s) => {
          if (!s.cells.some((sc) => sc.r === pick.r && sc.c === pick.c)) {
            return s;
          }
          const updatedHits = s.hits.includes(pk) ? s.hits : [...s.hits, pk];
          const isNowSunk = updatedHits.length >= s.cells.length;
          if (isNowSunk) {
            for (const sc of s.cells) attShots[coordKey(sc.r, sc.c)] = 'sunk';
          } else {
            attShots[pk] = 'hit';
          }
          return { ...s, hits: updatedHits, sunk: isNowSunk };
        });
        nextAttacker = {
          ...nextAttacker,
          ships: attShips,
          receivedShots: attShots,
          totalShotsReceived: nextAttacker.totalShotsReceived + 1,
          totalHitsReceived: nextAttacker.totalHitsReceived + 1,
        };
        notes.push(`Mìn nổ phản @ ${formatCoordLabel(pick.r, pick.c)}!`);
      }

      // 35. Thủy Lôi Phản Kích (Bị động): 20% tạo ô nhiễu xung quanh ô vừa kích nổ
      if (hasPassive(nextDefender, 'counter_mine') && Math.random() < 0.2) {
        const adj = [
          { r: r - 1, c },
          { r: r + 1, c },
          { r, c: c - 1 },
          { r, c: c + 1 },
        ].filter(
          (pt) =>
            inBounds(pt.r, pt.c) && !nextDefender.receivedShots[coordKey(pt.r, pt.c)]
        );
        if (adj.length > 0) {
          const jPick = adj[Math.floor(Math.random() * adj.length)];
          nextDefender.jammedTiles[coordKey(jPick.r, jPick.c)] = 2;
          notes.push(
            `Thủy Lôi Phản Kích gây nhiễu @ ${formatCoordLabel(jPick.r, jPick.c)}`
          );
        }
      }

      // 98. Thủy Lôi Phá Hoại (Bị động): tăng +1 CD cho 1 kỹ năng sẵn sàng của kẻ bắn
      if (hasPassive(nextDefender, 'sabotage_mine')) {
        const readyActiveIds = nextAttacker.setup.skillIds.filter(
          (sid) =>
            SKILLS[sid]?.kind === 'ACTIVE' &&
            (nextAttacker.skillCooldowns[sid] ?? 0) === 0
        );
        if (readyActiveIds.length > 0) {
          const rSid =
            readyActiveIds[Math.floor(Math.random() * readyActiveIds.length)];
          nextAttacker = {
            ...nextAttacker,
            skillCooldowns: {
              ...nextAttacker.skillCooldowns,
              [rSid]: 1,
            },
          };
          notes.push(`Thủy Lôi Phá Hoại khóa +1 CD ${SKILLS[rSid].name}`);
        }
      }
    }

    // 4. Check Ship Hit
    const targetShip = nextDefender.ships.find((s) =>
      s.cells.some((cell) => cell.r === r && cell.c === c)
    );

    if (!targetShip) {
      nextShots[key] = 'miss';
      return {
        nextAttacker,
        nextDefender: {
          ...nextDefender,
          totalShotsReceived: nextDefender.totalShotsReceived + 1,
        },
        result: 'miss',
        detail: notes.length > 0 ? notes.join(' · ') : undefined,
        mineCounterCoord,
      };
    }

    // 4a. 37. Khiên Năng Lượng absorbs hit completely (unless Armor-Piercing)
    if (!bypass && nextDefender.shieldedShipIds.includes(targetShip.instanceId)) {
      nextDefender.shieldedShipIds = nextDefender.shieldedShipIds.filter(
        (id) => id !== targetShip.instanceId
      );
      return {
        nextAttacker,
        nextDefender,
        result: 'miss',
        detail: `Khiên Năng Lượng đỡ trọn @ ${formatCoordLabel(r, c)}!`,
        mineCounterCoord,
      };
    }

    // 4b. 41. Khiên Phản Xạ (hấp thụ 1 đòn đơn mục tiêu & phản dame lên tàu kẻ tấn công)
    if (
      !bypass &&
      isSingleTarget &&
      nextDefender.reflectiveShieldShipIds.includes(targetShip.instanceId)
    ) {
      nextDefender.reflectiveShieldShipIds =
        nextDefender.reflectiveShieldShipIds.filter(
          (id) => id !== targetShip.instanceId
        );
      const attAliveCells: Coord[] = [];
      for (const s of nextAttacker.ships) {
        if (s.sunk) continue;
        for (const sc of s.cells) {
          const sk = coordKey(sc.r, sc.c);
          if (!s.hits.includes(sk)) attAliveCells.push(sc);
        }
      }
      let reflectNote = `Khiên Phản Xạ chặn trọn @ ${formatCoordLabel(r, c)}`;
      if (attAliveCells.length > 0) {
        const counterCell =
          attAliveCells[Math.floor(Math.random() * attAliveCells.length)];
        const ck = coordKey(counterCell.r, counterCell.c);
        const attShots = { ...nextAttacker.receivedShots };
        const attShips = nextAttacker.ships.map((s) => {
          if (
            !s.cells.some(
              (sc) => sc.r === counterCell.r && sc.c === counterCell.c
            )
          ) {
            return s;
          }
          const uh = s.hits.includes(ck) ? s.hits : [...s.hits, ck];
          const sunk = uh.length >= s.cells.length;
          if (sunk) {
            for (const sc of s.cells) attShots[coordKey(sc.r, sc.c)] = 'sunk';
          } else {
            attShots[ck] = 'hit';
          }
          return { ...s, hits: uh, sunk };
        });
        nextAttacker = {
          ...nextAttacker,
          ships: attShips,
          receivedShots: attShots,
          totalShotsReceived: nextAttacker.totalShotsReceived + 1,
          totalHitsReceived: nextAttacker.totalHitsReceived + 1,
        };
        reflectNote += ` & dội sát thương @ ${formatCoordLabel(
          counterCell.r,
          counterCell.c
        )}!`;
      }
      return {
        nextAttacker,
        nextDefender,
        result: 'miss',
        detail: reflectNote,
        mineCounterCoord,
      };
    }

    // 5. Damage Resolution (Armor Layers, Reinforced Segment Armor, Improved Ammo +1 dmg, #74 Armor Shredder)
    let remainingDmg = damage;
    let currentArmor = targetShip.armorRemaining ?? 0;
    const nextSegHp = { ...(targetShip.segmentHp ?? {}) };
    const nextSegMax = { ...(targetShip.segmentMaxHp ?? {}) };
    let updatedHits = [...targetShip.hits];
    let result: ShotResultStatus = 'hit';
    let sunkShipName: string | undefined;

    while (remainingDmg > 0) {
      if (!bypass && currentArmor > 0) {
        currentArmor--;
        remainingDmg--;
        if (
          currentArmor > 0 &&
          hasPassive(nextAttacker, 'armor_shredder') &&
          Math.random() < 0.35
        ) {
          currentArmor--;
          notes.push('Phá Giáp Nặng bào mòn thêm +1 lớp giáp!');
        }
        result = updatedHits.includes(key) ? result : 'armor';
        continue;
      }

      const curCellHp = nextSegHp[key] ?? (updatedHits.includes(key) ? 0 : 1);
      if (curCellHp > 1 && !bypass) {
        nextSegHp[key] = curCellHp - 1;
        remainingDmg--;
        result = 'armor';
        continue;
      }

      if (!updatedHits.includes(key)) {
        nextSegHp[key] = 0;
        updatedHits.push(key);
        remainingDmg--;
        result = 'hit';
        continue;
      }

      // Đạn Dược Cải Tiến (+1 dmg) lan sang 1 phân đoạn kề chưa vỡ nếu còn sát thương dư
      const adjIntact = targetShip.cells.find((sc) => {
        const ak = coordKey(sc.r, sc.c);
        return (
          ak !== key &&
          !updatedHits.includes(ak) &&
          Math.abs(sc.r - r) + Math.abs(sc.c - c) === 1
        );
      });
      if (adjIntact) {
        const ak = coordKey(adjIntact.r, adjIntact.c);
        nextSegHp[ak] = 0;
        updatedHits.push(ak);
        nextShots[ak] = 'hit';
        notes.push(
          `Xuyên phá thêm phân đoạn kề @ ${formatCoordLabel(adjIntact.r, adjIntact.c)}`
        );
      }
      remainingDmg = 0;
    }

    const isNowSunk = updatedHits.length >= targetShip.cells.length;
    if (isNowSunk) {
      result = 'sunk';
      sunkShipName = targetShip.name;
      for (const sc of targetShip.cells) {
        const sk = coordKey(sc.r, sc.c);
        nextShots[sk] = 'sunk';
        delete nextDefender.burningCells[sk];
        delete nextDefender.hiddenHitMarks[sk];
      }
    } else if (updatedHits.includes(key)) {
      nextShots[key] = 'hit';
    } else {
      nextShots[key] = 'armor';
    }

    nextDefender.ships = nextDefender.ships.map((ship) =>
      ship.instanceId === targetShip.instanceId
        ? {
            ...ship,
            armorRemaining: currentArmor,
            hits: updatedHits,
            sunk: isNowSunk,
            segmentHp:
              Object.keys(nextSegHp).length > 0 ? nextSegHp : ship.segmentHp,
            segmentMaxHp:
              Object.keys(nextSegMax).length > 0
                ? nextSegMax
                : ship.segmentMaxHp,
          }
        : ship
    );

    nextDefender.tookDamageLastTurn = true;

    // 87. Dự Bị Chiến Thuật (Bị động): Khi 1 tàu nhà bị đánh chìm -> giảm ngay 1 CD toàn bộ kỹ năng đang hồi
    if (isNowSunk && hasPassive(nextDefender, 'tactical_reserve')) {
      const reducedCd = { ...nextDefender.skillCooldowns };
      for (const sid of nextDefender.setup.skillIds) {
        if ((reducedCd[sid] ?? 0) > 0) reducedCd[sid] -= 1;
      }
      nextDefender = { ...nextDefender, skillCooldowns: reducedCd };
      notes.push('Dự Bị Chiến Thuật: -1 CD toàn bộ kỹ năng nhà!');
    }

    // 64. Tình Báo Đánh Chìm (Bị động): Đánh chìm tàu -> lộ 1 ô tàu gần nhất còn sống
    if (isNowSunk && hasPassive(nextAttacker, 'sink_intel')) {
      const aliveEnemies = nextDefender.ships.filter((s) => !s.sunk);
      if (aliveEnemies.length > 0) {
        const nearest = [...aliveEnemies].sort((a, b) => {
          const da =
            Math.abs(a.anchor.r - r) + Math.abs(a.anchor.c - c);
          const db =
            Math.abs(b.anchor.r - r) + Math.abs(b.anchor.c - c);
          return da - db;
        })[0];
        const unhit = nearest.cells.find(
          (sc) => !nearest.hits.includes(coordKey(sc.r, sc.c))
        );
        if (unhit) {
          const uk = coordKey(unhit.r, unhit.c);
          if (!nextDefender.revealedCells.includes(uk)) {
            nextDefender.revealedCells = [...nextDefender.revealedCells, uk];
          }
          notes.push(
            `Tình Báo Đánh Chìm lộ ${nearest.name} @ ${formatCoordLabel(unhit.r, unhit.c)}!`
          );
        }
      }
    }

    // 63. Âm Vang Trúng Đạn (Bị động): 25% khi bắn thường trúng -> lộ 1 ô kề trên cùng tàu
    if (
      !isNowSunk &&
      isSingleTarget &&
      !options?.isAoe &&
      hasPassive(nextAttacker, 'hit_echo') &&
      Math.random() < 0.25
    ) {
      const adjCell = targetShip.cells.find((sc) => {
        const ak = coordKey(sc.r, sc.c);
        return (
          ak !== key &&
          !updatedHits.includes(ak) &&
          Math.abs(sc.r - r) + Math.abs(sc.c - c) === 1
        );
      });
      if (adjCell) {
        const ak = coordKey(adjCell.r, adjCell.c);
        if (!nextDefender.revealedCells.includes(ak)) {
          nextDefender.revealedCells = [...nextDefender.revealedCells, ak];
        }
        notes.push(
          `Âm Vang Trúng Đạn lộ thêm @ ${formatCoordLabel(adjCell.r, adjCell.c)}`
        );
      }
    }

    // 109. Giáp Phản Ứng Nội Tại (Bị động): 25% khi tàu nhà nhận sát thương đầu tiên -> bật đánh chặn tên lửa
    if (
      !isNowSunk &&
      targetShip.hits.length === 0 &&
      hasPassive(nextDefender, 'reactive_hull_passive') &&
      !nextDefender.interceptorReady &&
      Math.random() < 0.25
    ) {
      nextDefender = { ...nextDefender, interceptorReady: true };
      notes.push('Giáp Phản Ứng Nội Tại kích hoạt Đánh Chặn Tên Lửa!');
    }

    // 85. Hộ Vệ Soái Hạm (Bị động): Lần đầu Soái Hạm/tàu lớn nhất tụt < 50% HP -> tự hồi +1 HP/giáp
    if (!isNowSunk && hasPassive(nextDefender, 'flagship_aegis_passive')) {
      const biggestShip =
        nextDefender.ships.find((s) => s.isFlagship && !s.sunk) ??
        [...nextDefender.ships]
          .filter((s) => !s.sunk)
          .sort((a, b) => b.cells.length - a.cells.length)[0];
      if (
        biggestShip &&
        biggestShip.instanceId === targetShip.instanceId &&
        updatedHits.length >= Math.ceil(targetShip.cells.length / 2) &&
        !flagshipAegisUsedRef.current.has(targetShip.instanceId)
      ) {
        flagshipAegisUsedRef.current.add(targetShip.instanceId);
        const rep = repairOneSegmentOnShip(nextDefender, targetShip.instanceId);
        if (rep.repaired) {
          nextDefender = rep.nextState;
          notes.push(`Hộ Vệ Soái Hạm: ${rep.detail}`);
        }
      }
    }

    // 34. Mồi Nhử Tự Động (Bị động): Lần đầu 1 tàu bị bắn trúng -> ẩn dấu 'hit' trên giao diện địch 1 lượt
    if (
      hasPassive(nextDefender, 'auto_decoy') &&
      targetShip.hits.length === 0 &&
      result === 'hit'
    ) {
      nextDefender.hiddenHitMarks[key] = 2;
      notes.push('Mồi Nhử Tự Động tạm che dấu trúng đạn');
    }

    // 33. Màn Sương Thông Tin: che dấu bắn mới phát sinh
    if (nextDefender.infoFogTurns > 0 && !isNowSunk) {
      nextDefender.hiddenHitMarks[key] = Math.max(
        nextDefender.hiddenHitMarks[key] ?? 0,
        nextDefender.infoFogTurns + 1
      );
    }

    if (bypass) notes.unshift('Đạn Xuyên Giáp đánh thẳng thân tàu!');
    else if (result === 'armor') {
      notes.unshift(
        currentArmor > 0
          ? `Giáp chặn sát thương (còn ${currentArmor} lớp)`
          : 'Nứt giáp phân đoạn tàu!'
      );
    }

    return {
      nextAttacker,
      nextDefender: {
        ...nextDefender,
        totalShotsReceived: nextDefender.totalShotsReceived + 1,
        totalHitsReceived: nextDefender.totalHitsReceived + 1,
      },
      result,
      sunkShipName,
      detail: notes.length > 0 ? notes.join(' · ') : undefined,
      mineCounterCoord,
    };
  };

  /**
   * Thực thi kỹ năng chủ động trong 120 kỹ năng (+ kiểm tra bị động đi kèm)
   */
  const executeSkill = (
    attackerSide: 'P1' | 'P2',
    skillId: SkillId,
    opts: {
      targetCoord?: Coord;
      extraCoords?: Coord[];
      axis?: 'ROW' | 'COL';
      direction?: CardinalDirection;
      shipId?: string;
      secondShipId?: string;
      attackerOverride?: PlayerBattleState;
      defenderOverride?: PlayerBattleState;
      turnOverride?: number;
    }
  ): {
    nextAttacker: PlayerBattleState;
    nextDefender: PlayerBattleState;
    bonusShots: number;
    endedWinner: 'P1' | 'P2' | null;
  } => {
    const def = SKILLS[skillId];
    let att = opts.attackerOverride ?? (attackerSide === 'P1' ? p1 : p2);
    let dfd = opts.defenderOverride ?? (attackerSide === 'P1' ? p2 : p1);
    const activeTurnNo = opts.turnOverride ?? turnNumber;
    const defenderSide: 'P1' | 'P2' = attackerSide === 'P1' ? 'P2' : 'P1';
    const isDenseFog = activeTurnNo <= denseFogUntilTurn;
    const defenderStorms = (
      defenderSide === 'P1' ? stormBoardP1 : stormBoardP2
    ).filter((z) => z.expiresTurn >= activeTurnNo);
    const isInStorm = (r: number, c: number) =>
      defenderStorms.some(
        (z) => r >= z.topR && r < z.topR + 5 && c >= z.leftC && c < z.leftC + 5
      );
    const isInAirstrikeJam = (r: number, c: number) =>
      dfd.airstrikeJamZones.some(
        (z) =>
          z.expiresTurn >= activeTurnNo &&
          r >= z.topR &&
          r < z.topR + z.size &&
          c >= z.leftC &&
          c < z.leftC + z.size
      );

    // 27. Kỹ Thuật Viên Hải Quân (Bị động): 20% miễn CD cho kỹ năng nhánh Hỗ trợ
    const freeSupportCd =
      def.category === 'SUPPORT' &&
      hasPassive(att, 'naval_technician') &&
      Math.random() < 0.2;

    // 119. Hải Lưu Thuận Chiều (Bị động): 30% hoàn ngay 1 CD cho kỹ năng nhánh Điều Hướng
    const tailwindRefund =
      def.category === 'MOVEMENT' &&
      hasPassive(att, 'tailwind_propulsion') &&
      Math.random() < 0.3;

    const assignedCd = freeSupportCd
      ? 0
      : Math.max(
          0,
          def.cooldown +
            (isDenseFog && def.cooldown > 0 ? 1 : 0) -
            (tailwindRefund ? 1 : 0)
        );

    att = {
      ...att,
      skillUsesLeft: {
        ...att.skillUsesLeft,
        [skillId]: Math.max(0, (att.skillUsesLeft[skillId] ?? 1) - 1),
      },
      skillCooldowns: {
        ...att.skillCooldowns,
        [skillId]: assignedCd,
      },
    };

    const addSonarOverlay = (zone: SonarZone) => {
      if (attackerSide === 'P1') {
        setSonarZonesP1((prev) => [
          ...prev.filter((z) => z.expiresTurn >= activeTurnNo),
          zone,
        ]);
      } else {
        setSonarZonesP2((prev) => [
          ...prev.filter((z) => z.expiresTurn >= activeTurnNo),
          zone,
        ]);
      }
    };

    // #65 Quang Học Chống Nhiễu: bỏ qua Trạm Nhiễu Radar & giảm 50% tỉ lệ sương mù
    const hasCounterOptics = hasPassive(att, 'counter_jam_optics');
    const isReconBlocked = (withFogChance: boolean) => {
      if (!hasCounterOptics && dfd.radarJamTurns > 0) return 'RADAR';
      if (
        withFogChance &&
        isDenseFog &&
        Math.random() < (hasCounterOptics ? 0.22 : 0.45)
      ) {
        return 'FOG';
      }
      return null;
    };

    // #118 Dư Ảnh Hành Trình: để lại 1 Mồi Nhử (1 lượt) tại vị trí cũ khi di chuyển/xoay tàu
    const maybeDropAfterimage = (
      state: PlayerBattleState,
      oldCells: Coord[]
    ): PlayerBattleState => {
      if (!hasPassive(state, 'afterimage_trail') || oldCells.length === 0) {
        return state;
      }
      const nextOccupied = new Set(
        state.ships.flatMap((s) => s.cells.map((c) => coordKey(c.r, c.c)))
      );
      const spot = oldCells.find((oc) => {
        const ok = coordKey(oc.r, oc.c);
        return (
          !nextOccupied.has(ok) &&
          !state.rocks.includes(ok) &&
          !state.receivedShots[ok] &&
          !state.decoys.includes(ok)
        );
      });
      if (!spot) return state;
      const sk = coordKey(spot.r, spot.c);
      return {
        ...state,
        decoys: [...state.decoys, sk],
        decoyExpiry: { ...state.decoyExpiry, [sk]: activeTurnNo + 1 },
      };
    };

    let bonusShots = 0;

    // ==================== 1. NHÁNH TRINH SÁT (01–06 + 55–62) ====================
    if (
      (skillId === 'flare_shell' || skillId === 'deep_flare') &&
      opts.targetCoord
    ) {
      const t = opts.targetCoord;
      const tk = coordKey(t.r, t.c);
      const cLabel = formatCoordLabel(t.r, t.c);
      const blockedReason =
        skillId === 'deep_flare' ? null : isReconBlocked(true);
      if (blockedReason) {
        soundFX.playSplash();
        pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: cLabel,
          result: 'skill',
          detail:
            blockedReason === 'RADAR'
              ? `Trạm Nhiễu Radar chặn ${def.name}!`
              : `Sương Mù Dày Đặc dập tắt ${def.name}!`,
        });
      } else {
        const hitShip = dfd.ships.find(
          (s) =>
            !s.sunk && s.cells.some((sc) => sc.r === t.r && sc.c === t.c)
        );
        const bypassSmoke = skillId === 'deep_flare';
        if (hitShip && (bypassSmoke || !dfd.smokeCells[tk])) {
          soundFX.playHit();
          dfd = {
            ...dfd,
            revealedCells: dfd.revealedCells.includes(tk)
              ? dfd.revealedCells
              : [...dfd.revealedCells, tk],
          };
          att = recordSignalAnalysis(att, hitShip.instanceId, tk);
          att = applySweepingFrequency(att, skillId);
          pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
            attackerName: att.setup.name,
            attackerNation: att.setup.nationId,
            coordLabel: cLabel,
            result: 'skill',
            detail: `${def.name} lộ phân đoạn tàu ${hitShip.name} tại ${cLabel}!`,
          });
        } else {
          soundFX.playSplash();
          pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
            attackerName: att.setup.name,
            attackerNation: att.setup.nationId,
            coordLabel: cLabel,
            result: 'skill',
            detail: `${def.name}: vùng biển trống.`,
          });
        }
      }
    } else if (
      (skillId === 'sonar_ping' ||
        skillId === 'sonar_2x2' ||
        skillId === 'satellite_snapshot' ||
        skillId === 'triangulate_scan') &&
      opts.targetCoord
    ) {
      const center = opts.targetCoord;
      const blockedReason =
        skillId === 'satellite_snapshot' ? null : isReconBlocked(true);
      const is2x2 =
        skillId === 'sonar_2x2' || skillId === 'satellite_snapshot';
      const box2 = clampBoxOrigin(center.r, center.c, 2);
      const cells = is2x2
        ? getAreaCells(box2.topR, box2.leftC, 2)
        : skillId === 'triangulate_scan'
          ? getCrossCells(center)
          : getAreaCells(center.r - 1, center.c - 1, 3).filter(
              (pt) => !isInStorm(pt.r, pt.c)
            );
      const areaLabel = is2x2
        ? `2×2 @ ${formatCoordLabel(box2.topR, box2.leftC)}`
        : skillId === 'triangulate_scan'
          ? `+5 @ ${formatCoordLabel(center.r, center.c)}`
          : `3×3 @ ${formatCoordLabel(center.r, center.c)}`;

      if (
        blockedReason ||
        (skillId === 'sonar_ping' && isInStorm(center.r, center.c))
      ) {
        soundFX.playSplash();
        pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: areaLabel,
          result: 'skill',
          detail:
            blockedReason === 'RADAR'
              ? `Nhiễu Radar chặn ${def.name}!`
              : `Bão/Sương mù làm nhiễu ${def.name}!`,
        });
      } else {
        soundFX.playClick();
        let realHits = 0;
        let totalFound = 0;
        const shipCoordsFound: { shipId: string; k: string; label: string }[] = [];
        for (const pt of cells) {
          const k = coordKey(pt.r, pt.c);
          if (skillId !== 'satellite_snapshot' && dfd.smokeCells[k]) continue;
          const sh = dfd.ships.find(
            (s) =>
              !s.sunk && s.cells.some((sc) => sc.r === pt.r && sc.c === pt.c)
          );
          if (sh) {
            realHits++;
            totalFound++;
            att = recordSignalAnalysis(att, sh.instanceId, k);
            shipCoordsFound.push({
              shipId: sh.instanceId,
              k,
              label: formatCoordLabel(pt.r, pt.c),
            });
          } else if (dfd.decoys.includes(k)) {
            totalFound++;
          }
        }
        let extraNote = '';
        if (skillId === 'satellite_snapshot' && shipCoordsFound.length > 0) {
          const added = shipCoordsFound.map((x) => x.k);
          dfd = {
            ...dfd,
            revealedCells: Array.from(
              new Set([...dfd.revealedCells, ...added])
            ),
          };
          extraNote = ` (Lộ ${added.length} ô tàu!)`;
        } else if (
          skillId === 'triangulate_scan' &&
          shipCoordsFound.length > 0
        ) {
          const pick =
            shipCoordsFound[Math.floor(Math.random() * shipCoordsFound.length)];
          if (!dfd.revealedCells.includes(pick.k)) {
            dfd = {
              ...dfd,
              revealedCells: [...dfd.revealedCells, pick.k],
            };
          }
          extraNote = ` (Định vị lộ ${pick.label}!)`;
        }
        if (realHits > 0) att = applySweepingFrequency(att, skillId);
        addSonarOverlay({
          id: `${skillId}-${Date.now()}`,
          cells,
          detected: totalFound > 0,
          shipCellsFound: totalFound,
          label: totalFound > 0 ? `Có (${totalFound})` : 'Không',
          expiresTurn: activeTurnNo + 2,
        });
        pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: areaLabel,
          result: 'skill',
          detail: `${def.name}: ${totalFound > 0 ? `Phát hiện ${totalFound} ô mục tiêu` : 'Không thấy tàu'}${extraNote}`,
        });
      }
    } else if (skillId === 'recon_plane' && opts.targetCoord) {
      const axis = opts.axis ?? 'ROW';
      const idx = axis === 'ROW' ? opts.targetCoord.r : opts.targetCoord.c;
      const cLabel =
        axis === 'ROW' ? `Hàng ${idx + 1}` : `Cột ${COL_LABELS[idx]}`;
      if (isReconBlocked(true)) {
        soundFX.playSplash();
        pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: cLabel,
          result: 'skill',
          detail: 'Nhiễu Radar / Sương mù chặn Radar Tầm Xa!',
        });
      } else {
        soundFX.playClick();
        let realHits = 0;
        let totalFound = 0;
        for (let i = 0; i < GRID_SIZE; i++) {
          const rr = axis === 'ROW' ? idx : i;
          const cc = axis === 'COL' ? idx : i;
          const k = coordKey(rr, cc);
          if (dfd.smokeCells[k]) continue;
          const sh = dfd.ships.find(
            (s) => !s.sunk && s.cells.some((sc) => sc.r === rr && sc.c === cc)
          );
          if (sh) {
            realHits++;
            totalFound++;
            att = recordSignalAnalysis(att, sh.instanceId, k);
          } else if (dfd.decoys.includes(k)) {
            totalFound++;
          }
        }
        if (realHits > 0) att = applySweepingFrequency(att, 'recon_plane');
        const scan: ReconLineScan = {
          id: `recon-${Date.now()}`,
          axis,
          index: idx,
          shipCellsFound: totalFound,
          expiresTurn: activeTurnNo + 2,
        };
        if (attackerSide === 'P1') {
          setReconLinesP1((prev) => [
            ...prev.filter((l) => l.expiresTurn >= activeTurnNo),
            scan,
          ]);
        } else {
          setReconLinesP2((prev) => [
            ...prev.filter((l) => l.expiresTurn >= activeTurnNo),
            scan,
          ]);
        }
        pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: cLabel,
          result: 'skill',
          detail: `Radar Tầm Xa: ${totalFound > 0 ? `Phát hiện ${totalFound} ô mục tiêu` : 'Không có tín hiệu'}`,
        });
      }
    } else if (skillId === 'minesweeper' && opts.targetCoord) {
      const center = opts.targetCoord;
      const scannedKeys = new Set(
        getAreaCells(center.r - 1, center.c - 1, 3).map((pt) =>
          coordKey(pt.r, pt.c)
        )
      );
      const removedMines =
        att.mines.filter((m) => scannedKeys.has(m)).length +
        att.hiddenMapMines.filter((m) => scannedKeys.has(m)).length;
      att = {
        ...att,
        mines: att.mines.filter((m) => !scannedKeys.has(m)),
        hiddenMapMines: att.hiddenMapMines.filter((m) => !scannedKeys.has(m)),
      };
      soundFX.playClick();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: `3×3 @ ${formatCoordLabel(center.r, center.c)}`,
        result: 'skill',
        detail:
          removedMines > 0
            ? `Máy Quét Mìn rà & vô hiệu hóa ${removedMines} thủy lôi trên vùng nhà!`
            : 'Máy Quét Mìn: vùng 3×3 lưới nhà an toàn.',
      });
    } else if (skillId === 'enemy_mine_detector' && opts.targetCoord) {
      const center = opts.targetCoord;
      const cells = getAreaCells(center.r - 1, center.c - 1, 3);
      const foundKeys: string[] = [];
      for (const pt of cells) {
        const k = coordKey(pt.r, pt.c);
        if (dfd.mines.includes(k) || dfd.hiddenMapMines.includes(k)) {
          foundKeys.push(k);
        }
      }
      if (foundKeys.length > 0) {
        dfd = {
          ...dfd,
          revealedMineCells: Array.from(
            new Set([...dfd.revealedMineCells, ...foundKeys])
          ),
        };
      }
      soundFX.playClick();
      addSonarOverlay({
        id: `emine-${Date.now()}`,
        cells,
        detected: foundKeys.length > 0,
        shipCellsFound: foundKeys.length,
        label: foundKeys.length > 0 ? `Mìn (${foundKeys.length})` : 'Sạch',
        expiresTurn: activeTurnNo + 2,
      });
      pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: `3×3 @ ${formatCoordLabel(center.r, center.c)}`,
        result: 'skill',
        detail:
          foundKeys.length > 0
            ? `Định Vị Mìn Địch: phát hiện ${foundKeys.length} thủy lôi địch!`
            : 'Định Vị Mìn Địch: khu vực 3×3 không có thủy lôi.',
      });
    } else if (
      (skillId === 'directional_sonar' || skillId === 'diagonal_sweep') &&
      opts.targetCoord
    ) {
      const origin = opts.targetCoord;
      const dir = opts.direction ?? actionDirection;
      const cells =
        skillId === 'diagonal_sweep'
          ? getDiagonalLineCells(origin, dir, 5)
          : getDirectionalConeCells(origin, dir);
      const cLabel = `${formatCoordLabel(origin.r, origin.c)} (${dirLabelVi(dir)})`;
      if (isReconBlocked(true)) {
        soundFX.playSplash();
        pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: cLabel,
          result: 'skill',
          detail: `Nhiễu Radar chặn ${def.name}!`,
        });
      } else {
        soundFX.playClick();
        let realHits = 0;
        let totalFound = 0;
        for (const pt of cells) {
          const k = coordKey(pt.r, pt.c);
          if (dfd.smokeCells[k]) continue;
          const sh = dfd.ships.find(
            (s) => !s.sunk && s.cells.some((sc) => sc.r === pt.r && sc.c === pt.c)
          );
          if (sh) {
            realHits++;
            totalFound++;
            att = recordSignalAnalysis(att, sh.instanceId, k);
          } else if (dfd.decoys.includes(k)) {
            totalFound++;
          }
        }
        if (realHits > 0) att = applySweepingFrequency(att, skillId);
        addSonarOverlay({
          id: `${skillId}-${Date.now()}`,
          cells,
          detected: totalFound > 0,
          shipCellsFound: totalFound,
          label: totalFound > 0 ? `Có (${totalFound})` : 'Không',
          expiresTurn: activeTurnNo + 2,
        });
        pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: cLabel,
          result: 'skill',
          detail: `${def.name} (${cells.length} ô): ${totalFound > 0 ? `Có mục tiêu (${totalFound})` : 'Trống'}`,
        });
      }
    } else if (skillId === 'recon_drone' && opts.targetCoord) {
      const origin = opts.targetCoord;
      const dir = opts.direction ?? actionDirection;
      const cells = getLineCells(origin, dir, 4);
      const cLabel = `${formatCoordLabel(origin.r, origin.c)}→${dirLabelVi(dir)}`;
      if (isReconBlocked(true)) {
        soundFX.playSplash();
        pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: cLabel,
          result: 'skill',
          detail: 'Nhiễu Radar chặn Drone Trinh Sát!',
        });
      } else {
        const revealedNow: string[] = [];
        const newRevealedCells = [...dfd.revealedCells];
        for (const pt of cells) {
          const k = coordKey(pt.r, pt.c);
          if (dfd.smokeCells[k]) continue;
          const sh = dfd.ships.find(
            (s) => !s.sunk && s.cells.some((sc) => sc.r === pt.r && sc.c === pt.c)
          );
          if (sh) {
            if (!newRevealedCells.includes(k)) newRevealedCells.push(k);
            revealedNow.push(formatCoordLabel(pt.r, pt.c));
            att = recordSignalAnalysis(att, sh.instanceId, k);
          }
        }
        if (revealedNow.length > 0) {
          soundFX.playHit();
          dfd = { ...dfd, revealedCells: newRevealedCells };
          att = applySweepingFrequency(att, 'recon_drone');
        } else {
          soundFX.playClick();
        }
        addSonarOverlay({
          id: `drone-${Date.now()}`,
          cells,
          detected: revealedNow.length > 0,
          shipCellsFound: revealedNow.length,
          label: revealedNow.length > 0 ? `Lộ ${revealedNow.length}` : '0',
          expiresTurn: activeTurnNo + 2,
        });
        pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: cLabel,
          result: 'skill',
          detail:
            revealedNow.length > 0
              ? `Drone Trinh Sát làm lộ tọa độ tàu tại: ${revealedNow.join(', ')}!`
              : 'Drone Trinh Sát 4 ô: chưa thấy thân tàu.',
        });
      }
    } else if (skillId === 'flagship_tracker') {
      if (isReconBlocked(false)) {
        soundFX.playSplash();
        pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: 'Soái Hạm địch',
          result: 'skill',
          detail: 'Trạm Nhiễu Radar chặn Khóa Bóng Soái Hạm!',
        });
      } else {
        const targetFlag =
          dfd.ships.find((s) => s.isFlagship && !s.sunk) ??
          [...dfd.ships]
            .filter((s) => !s.sunk)
            .sort((a, b) => b.cells.length - a.cells.length)[0];
        const unhit = targetFlag?.cells.find(
          (sc) => !targetFlag.hits.includes(coordKey(sc.r, sc.c))
        );
        if (targetFlag && unhit) {
          const uk = coordKey(unhit.r, unhit.c);
          dfd = {
            ...dfd,
            revealedCells: dfd.revealedCells.includes(uk)
              ? dfd.revealedCells
              : [...dfd.revealedCells, uk],
          };
          att = recordSignalAnalysis(att, targetFlag.instanceId, uk);
          att = applySweepingFrequency(att, 'flagship_tracker');
          soundFX.playHit();
          pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
            attackerName: att.setup.name,
            attackerNation: att.setup.nationId,
            coordLabel: formatCoordLabel(unhit.r, unhit.c),
            result: 'skill',
            detail: `Khóa Bóng Soái Hạm lộ tọa độ ${targetFlag.name} @ ${formatCoordLabel(unhit.r, unhit.c)}!`,
          });
        } else {
          soundFX.playSplash();
        }
      }
    } else if (skillId === 'edge_patrol') {
      if (isReconBlocked(true)) {
        soundFX.playSplash();
        pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: 'Viền bản đồ',
          result: 'skill',
          detail: 'Nhiễu Radar / Sương mù chặn Tuần Tra Viền Biển!',
        });
      } else {
        let edgeSegs = 0;
        for (const s of dfd.ships) {
          if (s.sunk) continue;
          for (const sc of s.cells) {
            if (
              sc.r === 0 ||
              sc.r === GRID_SIZE - 1 ||
              sc.c === 0 ||
              sc.c === GRID_SIZE - 1
            ) {
              edgeSegs++;
              att = recordSignalAnalysis(att, s.instanceId, coordKey(sc.r, sc.c));
            }
          }
        }
        if (edgeSegs > 0) att = applySweepingFrequency(att, 'edge_patrol');
        soundFX.playClick();
        pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: '4 mép biển',
          result: 'skill',
          detail: `Tuần Tra Viền Biển: phát hiện ${edgeSegs} phân đoạn tàu dọc biên bản đồ địch.`,
        });
      }
    }

    // ==================== 2. NHÁNH TẤN CÔNG (10–15 + 66–73) ====================
    else if (
      skillId === 'air_strike' ||
      skillId === 'torpedo_run' ||
      skillId === 'artillery_barrage' ||
      skillId === 'carpet_bomb' ||
      skillId === 'cross_x_strike' ||
      skillId === 'railgun_pierce' ||
      skillId === 'cluster_missile' ||
      skillId === 'depth_charge'
    ) {
      let targets: Coord[] = [];
      let labelCoord = '';
      let extraNotes = '';
      const bypassForSkill = skillId === 'railgun_pierce';

      if (skillId === 'air_strike' && opts.targetCoord) {
        const p = opts.targetCoord;
        labelCoord = `+ @ ${formatCoordLabel(p.r, p.c)}`;
        targets = getCrossCells(p).filter((c) => {
          const st = dfd.receivedShots[coordKey(c.r, c.c)];
          return !st || st === 'armor';
        });
        if (hasPassive(att, 'artillery_expert') && Math.random() < 0.2) {
          const adjCands = [
            { r: p.r - 1, c: p.c - 1 },
            { r: p.r - 1, c: p.c + 1 },
            { r: p.r + 1, c: p.c - 1 },
            { r: p.r + 1, c: p.c + 1 },
          ].filter((pt) => {
            if (!inBounds(pt.r, pt.c)) return false;
            const st = dfd.receivedShots[coordKey(pt.r, pt.c)];
            return !st || st === 'armor';
          });
          if (adjCands.length > 0) {
            targets.push(adjCands[Math.floor(Math.random() * adjCands.length)]);
            extraNotes += ' · Chuyên Gia Pháo Binh (+1 ô)';
          }
        }
      } else if (skillId === 'cross_x_strike' && opts.targetCoord) {
        const p = opts.targetCoord;
        labelCoord = `× @ ${formatCoordLabel(p.r, p.c)}`;
        targets = getXCells(p).filter((c) => {
          const st = dfd.receivedShots[coordKey(c.r, c.c)];
          return !st || st === 'armor';
        });
      } else if (skillId === 'carpet_bomb' && opts.targetCoord) {
        const p = opts.targetCoord;
        labelCoord = `Rải thảm 3×3 @ ${formatCoordLabel(p.r, p.c)}`;
        const pool3x3 = getAreaCells(p.r - 1, p.c - 1, 3).filter((c) => {
          const st = dfd.receivedShots[coordKey(c.r, c.c)];
          return !st || st === 'armor';
        });
        for (let i = pool3x3.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool3x3[i], pool3x3[j]] = [pool3x3[j], pool3x3[i]];
        }
        targets = pool3x3.slice(0, 5);
      } else if (skillId === 'cluster_missile' && opts.targetCoord) {
        const box = clampBoxOrigin(opts.targetCoord.r, opts.targetCoord.c, 2);
        labelCoord = `Chùm 2×2 @ ${formatCoordLabel(box.topR, box.leftC)}`;
        targets = getAreaCells(box.topR, box.leftC, 2).filter((c) => {
          const st = dfd.receivedShots[coordKey(c.r, c.c)];
          return !st || st === 'armor';
        });
      } else if (skillId === 'depth_charge' && opts.targetCoord) {
        const p = opts.targetCoord;
        labelCoord = `Sâu 3×3 @ ${formatCoordLabel(p.r, p.c)}`;
        const zone = getAreaCells(p.r - 1, p.c - 1, 3);
        let clearedMines = 0;
        const nextMines = [...dfd.mines];
        const nextHidden = [...dfd.hiddenMapMines];
        for (const zc of zone) {
          if (clearedMines >= 2) break;
          const zk = coordKey(zc.r, zc.c);
          const mi = nextMines.indexOf(zk);
          if (mi >= 0) {
            nextMines.splice(mi, 1);
            clearedMines++;
          } else {
            const hi = nextHidden.indexOf(zk);
            if (hi >= 0) {
              nextHidden.splice(hi, 1);
              clearedMines++;
            }
          }
        }
        dfd = { ...dfd, mines: nextMines, hiddenMapMines: nextHidden };
        if (clearedMines > 0) {
          extraNotes += ` · Phá hủy ${clearedMines} thủy lôi địch`;
        }
        const stCenter = dfd.receivedShots[coordKey(p.r, p.c)];
        if (!stCenter || stCenter === 'armor') targets = [p];
      } else if (
        (skillId === 'torpedo_run' || skillId === 'railgun_pierce') &&
        opts.targetCoord
      ) {
        const p = opts.targetCoord;
        const dir = opts.direction ?? actionDirection;
        const lineLen = skillId === 'railgun_pierce' ? 6 : 5;
        const line = getLineCells(p, dir, lineLen);
        if (skillId === 'torpedo_run' && dfd.interceptorReady) {
          dfd = { ...dfd, interceptorReady: false };
          soundFX.playSplash();
          pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
            attackerName: att.setup.name,
            attackerNation: att.setup.nationId,
            coordLabel: `${formatCoordLabel(p.r, p.c)}→${dirLabelVi(dir)}`,
            result: 'skill',
            detail:
              'Lưới Đánh Chặn Tên Lửa đã vô hiệu hóa hoàn toàn Ngư Lôi Xuyên Phá!',
          });
          return {
            nextAttacker: att,
            nextDefender: dfd,
            bonusShots: 0,
            endedWinner: null,
          };
        }
        for (const pt of line) {
          const k = coordKey(pt.r, pt.c);
          if (dfd.rocks.includes(k)) {
            dfd = {
              ...dfd,
              receivedShots: { ...dfd.receivedShots, [k]: 'rock' },
            };
            extraNotes += ` · Dừng vì Đá ngầm @ ${formatCoordLabel(pt.r, pt.c)}`;
            break;
          }
          const st = dfd.receivedShots[k];
          if (!st || st === 'armor') targets.push(pt);
        }
        const end = targets[targets.length - 1] ?? p;
        labelCoord = `${formatCoordLabel(p.r, p.c)}→${formatCoordLabel(end.r, end.c)}`;
      } else if (skillId === 'artillery_barrage') {
        const avail: Coord[] = [];
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            const st = dfd.receivedShots[coordKey(r, c)];
            if (!st || st === 'armor') avail.push({ r, c });
          }
        }
        const barrageCount =
          hasPassive(att, 'artillery_expert') && Math.random() < 0.2 ? 5 : 4;
        if (barrageCount === 5) extraNotes += ' · Chuyên Gia Pháo Binh (+1 ô)';
        for (let i = 0; i < barrageCount && avail.length > 0; i++) {
          const idx = Math.floor(Math.random() * avail.length);
          targets.push(avail.splice(idx, 1)[0]);
        }
        labelCoord = targets.map((t) => formatCoordLabel(t.r, t.c)).join(', ');
      }

      // Lọc Bão Tụ 5x5, Vòm 2x2/3x3, Trạm Nhiễu Sóng Không Kích
      let blockedCount = 0;
      if (
        skillId !== 'torpedo_run' &&
        skillId !== 'railgun_pierce' &&
        skillId !== 'depth_charge'
      ) {
        const beforeLen = targets.length;
        targets = targets.filter((tc) => {
          const tk = coordKey(tc.r, tc.c);
          if (isInStorm(tc.r, tc.c)) return false;
          if (dfd.domeShieldCells[tk]) return false;
          if (
            (skillId === 'air_strike' ||
              skillId === 'carpet_bomb' ||
              skillId === 'cluster_missile') &&
            isInAirstrikeJam(tc.r, tc.c)
          ) {
            return false;
          }
          return true;
        });
        blockedCount = beforeLen - targets.length;
      }

      // 43. Hệ Thống CIWS (Bị động): loại bỏ 1 ô đánh trúng của kỹ năng AOE khi sẵn sàng
      let ciwsTriggered = false;
      if (dfd.ciwsReady && targets.length > 1) {
        ciwsTriggered = true;
        dfd = { ...dfd, ciwsReady: false };
        targets = targets.slice(0, targets.length - 1);
      }

      soundFX.playFire();
      let hitsCount = 0;
      let sunkName: string | undefined;
      const shotKeys: string[] = [];

      for (const tc of targets) {
        const res = resolveSingleImpact(att, dfd, tc.r, tc.c, activeTurnNo, {
          isAoe: skillId !== 'depth_charge',
          isSingleTarget: skillId === 'depth_charge',
          bypassShields: bypassForSkill,
        });
        att = res.nextAttacker;
        dfd = res.nextDefender;
        shotKeys.push(coordKey(tc.r, tc.c));
        if (
          res.result === 'hit' ||
          res.result === 'armor' ||
          res.result === 'sunk'
        ) {
          hitsCount++;
        }
        if (res.sunkShipName) sunkName = res.sunkShipName;
      }

      if (shotKeys.length > 0) {
        if (defenderSide === 'P2') setLastShotKeysP2(shotKeys);
        else setLastShotKeysP1(shotKeys);
      }

      if (hitsCount > 0) {
        triggerShake(defenderSide);
        if (sunkName) soundFX.playSunk();
        else soundFX.playHit();
      } else {
        soundFX.playSplash();
      }

      pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: labelCoord || '-',
        result: sunkName ? 'sunk' : hitsCount > 0 ? 'hit' : 'miss',
        sunkShipName: sunkName,
        detail: `${def.name}: Trúng ${hitsCount}/${targets.length}${ciwsTriggered ? ' · CIWS chặn 1 ô' : ''}${blockedCount > 0 ? ` · Chặn ${blockedCount} ô` : ''}${extraNotes}`,
      });
    } else if (
      (skillId === 'armor_piercing' ||
        skillId === 'execute_shot' ||
        skillId === 'shock_cannon') &&
      opts.targetCoord
    ) {
      const p = opts.targetCoord;
      const k = coordKey(p.r, p.c);
      const targetAlreadyDamagedShip = dfd.ships.some(
        (s) =>
          !s.sunk &&
          s.hits.length > 0 &&
          s.cells.some((sc) => sc.r === p.r && sc.c === p.c)
      );
      const execDamage =
        skillId === 'execute_shot' && targetAlreadyDamagedShip ? 2 : 1;

      soundFX.playFire();
      const res = resolveSingleImpact(att, dfd, p.r, p.c, activeTurnNo, {
        bypassShields: skillId === 'armor_piercing',
        isSingleTarget: true,
        damage: execDamage,
      });
      att = res.nextAttacker;
      dfd = res.nextDefender;

      let shockNote = '';
      if (
        skillId === 'shock_cannon' &&
        (res.result === 'hit' || res.result === 'armor' || res.result === 'sunk')
      ) {
        const readyEnemySkills = dfd.setup.skillIds.filter(
          (sid) =>
            SKILLS[sid]?.kind === 'ACTIVE' &&
            (dfd.skillCooldowns[sid] ?? 0) === 0
        );
        if (readyEnemySkills.length > 0) {
          const pickedSid =
            readyEnemySkills[Math.floor(Math.random() * readyEnemySkills.length)];
          dfd = {
            ...dfd,
            skillCooldowns: {
              ...dfd.skillCooldowns,
              [pickedSid]: 1,
            },
          };
          shockNote = ` · Xung Kích làm +1 CD ${SKILLS[pickedSid].name}!`;
        }
      }

      if (defenderSide === 'P2') setLastShotKeysP2([k]);
      else setLastShotKeysP1([k]);
      if (res.result === 'sunk') {
        soundFX.playSunk();
        triggerShake(defenderSide);
      } else if (res.result === 'hit' || res.result === 'armor') {
        soundFX.playHit();
        triggerShake(defenderSide);
      } else {
        soundFX.playSplash();
      }
      pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: formatCoordLabel(p.r, p.c),
        result: res.result,
        sunkShipName: res.sunkShipName,
        detail: `${def.name}${execDamage === 2 ? ' (×2 Kết Liễu!)' : ''}${shockNote}${res.detail ? ` · ${res.detail}` : ''}`,
      });
    } else if (
      (skillId === 'incendiary_shell' || skillId === 'ambush_mark') &&
      opts.targetCoord
    ) {
      const p = opts.targetCoord;
      const k = coordKey(p.r, p.c);
      soundFX.playFire();
      const res = resolveSingleImpact(att, dfd, p.r, p.c, activeTurnNo, {
        isSingleTarget: true,
      });
      att = res.nextAttacker;
      dfd = res.nextDefender;
      if (defenderSide === 'P2') setLastShotKeysP2([k]);
      else setLastShotKeysP1([k]);

      let ignitedCount = 0;
      let extraMsg = '';
      const hasIncMastery = hasPassive(att, 'incendiary_mastery');
      const hasFireproof = hasPassive(dfd, 'fireproof_bulkhead');

      if (res.result === 'hit' || res.result === 'armor') {
        const hitShip = dfd.ships.find(
          (s) => !s.sunk && s.cells.some((sc) => sc.r === p.r && sc.c === p.c)
        );
        if (hitShip) {
          if (skillId === 'ambush_mark') {
            const unhitSeg = hitShip.cells.find(
              (sc) => !hitShip.hits.includes(coordKey(sc.r, sc.c))
            );
            if (unhitSeg) {
              dfd = {
                ...dfd,
                burningCells: {
                  ...dfd.burningCells,
                  [coordKey(unhitSeg.r, unhitSeg.c)]: {
                    shipId: hitShip.instanceId,
                    turnsLeft: hasIncMastery ? 2 : 1,
                  },
                },
              };
              ignitedCount = 1;
            }
          } else {
            const maxIgnite = hasFireproof ? 1 : hasIncMastery ? 3 : 2;
            const adjToIgnite = hitShip.cells
              .filter((sc) => {
                const sk = coordKey(sc.r, sc.c);
                return (
                  !hitShip.hits.includes(sk) &&
                  Math.abs(sc.r - p.r) + Math.abs(sc.c - p.c) === 1
                );
              })
              .slice(0, maxIgnite);
            if (adjToIgnite.length > 0) {
              const nextBurning = { ...dfd.burningCells };
              for (const ac of adjToIgnite) {
                nextBurning[coordKey(ac.r, ac.c)] = {
                  shipId: hitShip.instanceId,
                  turnsLeft: hasIncMastery && maxIgnite === 2 ? 2 : 1,
                };
                ignitedCount++;
              }
              dfd = { ...dfd, burningCells: nextBurning };
            }
          }
        }
      } else if (skillId === 'ambush_mark' && res.result === 'miss') {
        att = {
          ...att,
          skillCooldowns: {
            ...att.skillCooldowns,
            ambush_mark: Math.max(0, (att.skillCooldowns.ambush_mark ?? 1) - 1),
          },
        };
        extraMsg = ' · Trượt hoàn lại 1 CD!';
      }

      if (res.result === 'sunk') {
        soundFX.playSunk();
        triggerShake(defenderSide);
      } else if (res.result === 'hit' || res.result === 'armor') {
        soundFX.playHit();
        triggerShake(defenderSide);
      } else {
        soundFX.playSplash();
      }
      pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: formatCoordLabel(p.r, p.c),
        result: res.result,
        sunkShipName: res.sunkShipName,
        detail: `${def.name}${ignitedCount > 0 ? ` · Cháy lan ${ignitedCount} phân đoạn!` : ''}${extraMsg}`,
      });
    } else if (skillId === 'heavy_artillery' && opts.targetCoord) {
      const box = clampBoxOrigin(opts.targetCoord.r, opts.targetCoord.c, 2);
      const triggerTurnNo = activeTurnNo + 1;
      const newStrike: PendingHeavyStrike = {
        id: `heavy-${Date.now()}`,
        topR: box.topR,
        leftC: box.leftC,
        triggerTurn: triggerTurnNo,
        targetBoard: defenderSide,
      };
      setPendingHeavyStrikes((prev) => [...prev, newStrike]);
      soundFX.playPlace();

      const hasEarlyWarning = hasPassive(dfd, 'early_warning');
      const boxStr = `${formatCoordLabel(box.topR, box.leftC)}–${formatCoordLabel(
        box.topR + 1,
        box.leftC + 1
      )}`;
      if (hasEarlyWarning) {
        setActiveEventBanner({
          title: 'Cảnh Báo Sớm · Pháo Hạng Nặng!',
          detail: `Phát hiện địch đánh dấu 2×2 tại ${boxStr}, sẽ nã đạn sau 1 lượt!`,
          turn: activeTurnNo,
        });
      }
      pushLog({
        turn: activeTurnNo,
        attackerSide,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: hasEarlyWarning ? `2×2 @ ${boxStr}` : '2×2 (Pending)',
        result: 'skill',
        detail: hasEarlyWarning
          ? `Pháo Hạng Nặng 2×2 bị Cảnh Báo Sớm phát hiện tại ${boxStr}!`
          : 'Pháo Hạng Nặng Cỡ Lớn 2×2 đã khóa tọa độ, chờ 1 lượt để khai hỏa!',
      });
    }

    // ==================== 3. NHÁNH HỖ TRỢ & SỬA CHỮA (19–24 + 77–84) ====================
    else if (
      skillId === 'emergency_repair' ||
      skillId === 'full_hull_overhaul'
    ) {
      const ship =
        att.ships.find((s) => s.instanceId === opts.shipId && !s.sunk) ??
        att.ships.find(
          (s) =>
            !s.sunk &&
            (s.hits.length > 0 || (s.armorRemaining ?? 0) < (s.armorMax ?? 0))
        );
      if (!ship) {
        soundFX.playSplash();
        pushLog({
          turn: activeTurnNo,
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: 'Hạm đội nhà',
          result: 'skill',
          detail: `${def.name}: chưa có tàu còn sống bị hư hại.`,
        });
      } else {
        const prefKey = opts.targetCoord
          ? coordKey(opts.targetCoord.r, opts.targetCoord.c)
          : undefined;
        let rep = repairOneSegmentOnShip(att, ship.instanceId, prefKey);
        att = rep.nextState;
        let repMsg = rep.detail;
        if (skillId === 'full_hull_overhaul' && rep.repaired) {
          const rep2 = repairOneSegmentOnShip(att, ship.instanceId);
          att = rep2.nextState;
          if (rep2.repaired) repMsg = `${repMsg} + ${rep2.detail}`;
        }
        if (rep.repaired) soundFX.playPlace();
        else soundFX.playSplash();
        pushLog({
          turn: activeTurnNo,
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: formatCoordLabel(ship.anchor.r, ship.anchor.c),
          result: 'skill',
          detail: `${repMsg}${freeSupportCd ? ' (Kỹ Thuật Viên miễn CD!)' : ''}`,
        });
      }
    } else if (skillId === 'flagship_overcharge') {
      const targetShip =
        att.ships.find((s) => s.isFlagship && !s.sunk) ??
        att.ships.find(
          (s) =>
            !s.sunk &&
            (s.hits.length > 0 || (s.armorRemaining ?? 0) < (s.armorMax ?? 0))
        );
      let repNote = 'Không cần sửa tàu';
      if (targetShip) {
        const rep = repairOneSegmentOnShip(att, targetShip.instanceId);
        att = rep.nextState;
        repNote = rep.detail;
      }
      const nextCd = { ...att.skillCooldowns };
      for (const sid of att.setup.skillIds) {
        if (SKILLS[sid]?.category === 'SHIELD' && (nextCd[sid] ?? 0) > 0) {
          nextCd[sid] = Math.max(0, nextCd[sid] - 1);
        }
      }
      att = { ...att, skillCooldowns: nextCd };
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: 'Soái Hạm & Khiên',
        result: 'skill',
        detail: `Cường Hóa Soái Hạm: ${repNote} · -1 CD kỹ năng nhánh Khiên!`,
      });
    } else if (skillId === 'rock_demolition' && opts.targetCoord) {
      const rk = coordKey(opts.targetCoord.r, opts.targetCoord.c);
      if (att.rocks.includes(rk)) {
        att = {
          ...att,
          rocks: att.rocks.filter((x) => x !== rk),
        };
        soundFX.playHit();
        pushLog({
          turn: activeTurnNo,
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: formatCoordLabel(opts.targetCoord.r, opts.targetCoord.c),
          result: 'skill',
          detail: `Phá Đá Ngầm 1×1 tại ${formatCoordLabel(opts.targetCoord.r, opts.targetCoord.c)} để mở luồng di chuyển!`,
        });
      } else {
        soundFX.playSplash();
        pushLog({
          turn: activeTurnNo,
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: formatCoordLabel(opts.targetCoord.r, opts.targetCoord.c),
          result: 'skill',
          detail: 'Phá Đá Ngầm: ô chọn không có Đá ngầm.',
        });
      }
    } else if (skillId === 'cooldown_surge') {
      const coolingIds = att.setup.skillIds
        .filter((sid) => sid !== 'cooldown_surge' && (att.skillCooldowns[sid] ?? 0) > 0)
        .sort((a, b) => (att.skillCooldowns[b] ?? 0) - (att.skillCooldowns[a] ?? 0));
      if (coolingIds.length > 0) {
        const topId = coolingIds[0];
        att = {
          ...att,
          skillCooldowns: {
            ...att.skillCooldowns,
            [topId]: Math.max(0, (att.skillCooldowns[topId] ?? 0) - 2),
          },
        };
        soundFX.playClick();
        pushLog({
          turn: activeTurnNo,
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: SKILLS[topId].name,
          result: 'skill',
          detail: `Xung Hồi Chiêu: -2 lượt CD cho ${SKILLS[topId].name}!`,
        });
      } else {
        soundFX.playClick();
        pushLog({
          turn: activeTurnNo,
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: 'Hệ thống',
          result: 'skill',
          detail: 'Xung Hồi Chiêu: tất cả kỹ năng đều đã sẵn sàng.',
        });
      }
    } else if (skillId === 'ammo_boost') {
      att = { ...att, improvedAmmoReady: true };
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: 'Pháo hạm đội',
        result: 'skill',
        detail: 'Nạp Đạn Đặc Chủng: phát bắn thường kế tiếp gây +1 sát thương (×2)!',
      });
    } else if (skillId === 'combat_surge') {
      bonusShots = 1;
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: '+1 Phát bắn',
        result: 'skill',
        detail: 'Tăng Tốc Khai Hỏa: cộng thêm +1 phát bắn thường ngay trong lượt này!',
      });
    } else if (skillId === 'sonar_calibration') {
      const nextCd = { ...att.skillCooldowns };
      let reduced = 0;
      for (const sid of att.setup.skillIds) {
        if (SKILLS[sid]?.category === 'RECON' && (nextCd[sid] ?? 0) > 0) {
          nextCd[sid] = Math.max(0, nextCd[sid] - 1);
          reduced++;
        }
      }
      att = { ...att, skillCooldowns: nextCd };
      dfd = { ...dfd, radarJamTurns: Math.max(0, dfd.radarJamTurns - 1) };
      soundFX.playClick();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: 'Trinh sát',
        result: 'skill',
        detail: `Hiệu Chuẩn Sonar: -1 CD cho ${reduced} kỹ năng Trinh sát & suy yếu nhiễu địch.`,
      });
    } else if (skillId === 'radar_jammer') {
      att = { ...att, radarJamTurns: 2 };
      soundFX.playClick();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: 'Vùng biển nhà',
        result: 'skill',
        detail: `Trạm Nhiễu Radar bật 2 lượt${freeSupportCd ? ' (Miễn CD!)' : ''}`,
      });
    } else if (skillId === 'emp_jamming') {
      if (dfd.empImmunityTurns > 0) {
        soundFX.playSplash();
        pushLog({
          turn: activeTurnNo,
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: 'Toàn hệ thống địch',
          result: 'skill',
          detail: 'Gây Nhiễu EMP bị chặn do đối phương đang miễn nhiễm EMP!',
        });
      } else {
        dfd = { ...dfd, empLockedTurns: Math.max(dfd.empLockedTurns, 1) };
        soundFX.playHit();
        pushLog({
          turn: activeTurnNo,
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: 'Toàn hệ thống địch',
          result: 'skill',
          detail: `Gây Nhiễu EMP khóa kỹ năng đối thủ 1 lượt!${freeSupportCd ? ' (Miễn CD!)' : ''}`,
        });
      }
    } else if (skillId === 'fire_suppression') {
      const targetShip = att.ships.find(
        (s) => s.instanceId === opts.shipId && !s.sunk
      );
      const nextBurning = { ...att.burningCells };
      let cleared = 0;
      for (const [bk, info] of Object.entries(nextBurning)) {
        if (!targetShip || info.shipId === targetShip.instanceId) {
          delete nextBurning[bk];
          cleared++;
        }
      }
      att = { ...att, burningCells: nextBurning };
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: targetShip ? targetShip.name : 'Hạm đội nhà',
        result: 'skill',
        detail: `Hệ Thống Dập Lửa xóa ${cleared} điểm cháy đang âm ỉ${freeSupportCd ? ' (Miễn CD!)' : ''}`,
      });
    } else if (skillId === 'frequency_restore' || skillId === 'emp_purge_aura') {
      att = {
        ...att,
        empLockedTurns: 0,
        jammedTiles: {},
        empImmunityTurns:
          skillId === 'emp_purge_aura'
            ? Math.max(att.empImmunityTurns, 1)
            : att.empImmunityTurns,
      };
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: 'Toàn đội hình',
        result: 'skill',
        detail:
          skillId === 'emp_purge_aura'
            ? 'Thanh Tẩy EMP: giải khóa EMP & miễn nhiễm EMP trong 1 lượt!'
            : `Khôi Phục Tần Số: hóa giải hoàn toàn khóa EMP!${freeSupportCd ? ' (Miễn CD!)' : ''}`,
      });
    } else if (skillId === 'fleet_maintenance') {
      const nextCd = { ...att.skillCooldowns };
      let reduced = 0;
      for (const sid of att.setup.skillIds) {
        if (sid !== 'fleet_maintenance' && (nextCd[sid] ?? 0) > 0) {
          nextCd[sid] = Math.max(0, nextCd[sid] - 1);
          reduced++;
        }
      }
      att = { ...att, skillCooldowns: nextCd };
      soundFX.playClick();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: 'Toàn hạm đội',
        result: 'skill',
        detail: `Bảo Trì Hạm Đội giảm 1 CD cho ${reduced} kỹ năng khác${freeSupportCd ? ' (Miễn CD!)' : ''}`,
      });
    }

    // ==================== 4. NHÁNH BẪY & MỒI NHỬ (28–33 + 88–95) ====================
    else if (skillId === 'sea_mine' && opts.targetCoord) {
      const p = opts.targetCoord;
      const k = coordKey(p.r, p.c);
      if (!att.mines.includes(k)) {
        att = { ...att, mines: [...att.mines, k] };
      }
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: attackerSide === 'P1' ? formatCoordLabel(p.r, p.c) : 'Bí mật',
        result: 'skill',
        detail: 'Thả Thủy Lôi Ngầm trên vùng biển nhà',
      });
    } else if (skillId === 'minefield_line' && opts.targetCoord) {
      const p = opts.targetCoord;
      const cand = [
        p,
        { r: p.r, c: p.c + 1 },
        { r: p.r, c: p.c - 1 },
        { r: p.r + 1, c: p.c },
        { r: p.r - 1, c: p.c },
      ];
      const nextMines = [...att.mines];
      const placed: string[] = [];
      for (const pt of cand) {
        if (placed.length >= 3) break;
        if (!inBounds(pt.r, pt.c)) continue;
        const pk = coordKey(pt.r, pt.c);
        const occ = att.ships.some((s) =>
          s.cells.some((sc) => sc.r === pt.r && sc.c === pt.c)
        );
        if (
          !occ &&
          !att.rocks.includes(pk) &&
          !att.receivedShots[pk] &&
          !nextMines.includes(pk)
        ) {
          nextMines.push(pk);
          placed.push(formatCoordLabel(pt.r, pt.c));
        }
      }
      att = { ...att, mines: nextMines };
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: attackerSide === 'P1' ? placed.join(', ') || '-' : 'Bí mật',
        result: 'skill',
        detail: `Giăng Bãi Thủy Lôi: thả ${placed.length} thủy lôi bảo vệ luồng biển!`,
      });
    } else if (skillId === 'magnetic_mine' && opts.targetCoord) {
      const center = opts.targetCoord;
      const area = getAreaCells(center.r - 1, center.c - 1, 3).filter((pt) => {
        const pk = coordKey(pt.r, pt.c);
        return (
          !att.rocks.includes(pk) &&
          !att.receivedShots[pk] &&
          !att.mines.includes(pk) &&
          !att.ships.some((s) =>
            s.cells.some((sc) => sc.r === pt.r && sc.c === pt.c)
          )
        );
      });
      const nextMines = [...att.mines];
      let added = 0;
      for (let i = 0; i < 2 && area.length > 0; i++) {
        const idx = Math.floor(Math.random() * area.length);
        const pt = area.splice(idx, 1)[0];
        nextMines.push(coordKey(pt.r, pt.c));
        added++;
      }
      att = { ...att, mines: nextMines };
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel:
          attackerSide === 'P1'
            ? `3×3 @ ${formatCoordLabel(center.r, center.c)}`
            : 'Bí mật',
        result: 'skill',
        detail: `Thủy Lôi Từ Tính: cài ${added} thủy lôi ngẫu nhiên trong vùng 3×3!`,
      });
    } else if (
      skillId === 'salvo_3' ||
      skillId === 'rapid_salvo_2' ||
      skillId === 'trap_salvo_2'
    ) {
      const coords =
        opts.extraCoords && opts.extraCoords.length > 0
          ? opts.extraCoords
          : opts.targetCoord
            ? [opts.targetCoord]
            : [];
      soundFX.playFire();
      let hits = 0;
      let sunkName: string | undefined;
      const shotKeys: string[] = [];
      for (const pt of coords) {
        const res = resolveSingleImpact(att, dfd, pt.r, pt.c, activeTurnNo, {
          isSingleTarget: false,
          isAoe: false,
        });
        att = res.nextAttacker;
        dfd = res.nextDefender;
        shotKeys.push(coordKey(pt.r, pt.c));
        if (
          res.result === 'hit' ||
          res.result === 'armor' ||
          res.result === 'sunk'
        ) {
          hits++;
        }
        if (res.sunkShipName) sunkName = res.sunkShipName;
      }
      let mineNote = '';
      if (skillId === 'trap_salvo_2' && hits > 0) {
        const emptyOwn: Coord[] = [];
        for (let rr = 0; rr < GRID_SIZE; rr++) {
          for (let cc = 0; cc < GRID_SIZE; cc++) {
            const k = coordKey(rr, cc);
            if (
              !att.rocks.includes(k) &&
              !att.receivedShots[k] &&
              !att.mines.includes(k) &&
              !att.ships.some((s) =>
                s.cells.some((sc) => sc.r === rr && sc.c === cc)
              )
            ) {
              emptyOwn.push({ r: rr, c: cc });
            }
          }
        }
        if (emptyOwn.length > 0) {
          const mp = emptyOwn[Math.floor(Math.random() * emptyOwn.length)];
          att = { ...att, mines: [...att.mines, coordKey(mp.r, mp.c)] };
          mineNote = ' · Cài thêm 1 Thủy Lôi bảo vệ lưới nhà!';
        }
      }
      if (shotKeys.length > 0) {
        if (defenderSide === 'P2') setLastShotKeysP2(shotKeys);
        else setLastShotKeysP1(shotKeys);
      }
      if (hits > 0) {
        triggerShake(defenderSide);
        if (sunkName) soundFX.playSunk();
        else soundFX.playHit();
      } else {
        soundFX.playSplash();
      }
      pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: coords.map((pt) => formatCoordLabel(pt.r, pt.c)).join(', '),
        result: sunkName ? 'sunk' : hits > 0 ? 'hit' : 'miss',
        sunkShipName: sunkName,
        detail: `${def.name} (${coords.length} ô): trúng ${hits}/${coords.length}${mineNote}`,
      });
    } else if (skillId === 'follow_up_shot') {
      att = { ...att, followUpReady: true };
      soundFX.playClick();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: 'Khai hỏa thường',
        result: 'skill',
        detail: 'Bắn Bồi kích hoạt: bắn trúng phát thường kế tiếp sẽ +1 phát bắn!',
      });
    } else if (
      (skillId === 'ghost_fleet' || skillId === 'decoy_flagship') &&
      opts.targetCoord
    ) {
      const p = opts.targetCoord;
      const candidates: Coord[] = [
        p,
        { r: p.r, c: p.c + 1 },
        { r: p.r + 1, c: p.c },
        { r: p.r, c: p.c - 1 },
        { r: p.r - 1, c: p.c },
        { r: p.r + 1, c: p.c + 1 },
      ];
      const maxCount = skillId === 'decoy_flagship' ? 4 : 3;
      const duration = skillId === 'decoy_flagship' ? 3 : 2;
      const nextDecoys = [...att.decoys];
      const nextExp = { ...att.decoyExpiry };
      const added: string[] = [];
      for (const cand of candidates) {
        if (added.length >= maxCount) break;
        if (!inBounds(cand.r, cand.c)) continue;
        const ck = coordKey(cand.r, cand.c);
        const occupied = att.ships.some((s) =>
          s.cells.some((sc) => sc.r === cand.r && sc.c === cand.c)
        );
        if (
          !occupied &&
          !att.rocks.includes(ck) &&
          !att.receivedShots[ck] &&
          !nextDecoys.includes(ck)
        ) {
          nextDecoys.push(ck);
          nextExp[ck] = activeTurnNo + duration;
          added.push(formatCoordLabel(cand.r, cand.c));
        }
      }
      att = { ...att, decoys: nextDecoys, decoyExpiry: nextExp };
      soundFX.playClick();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel:
          attackerSide === 'P1'
            ? added.join(', ') || formatCoordLabel(p.r, p.c)
            : 'Bí mật',
        result: 'skill',
        detail: `${def.name}: tạo ${added.length} tín hiệu radar giả (${duration} lượt)`,
      });
    } else if (
      (skillId === 'emp_grid' || skillId === 'emp_mine_single') &&
      opts.targetCoord
    ) {
      const sz = skillId === 'emp_mine_single' ? 1 : 2;
      const box = clampBoxOrigin(opts.targetCoord.r, opts.targetCoord.c, sz);
      att = {
        ...att,
        empGrids: [
          ...att.empGrids,
          { id: `emp-${Date.now()}`, topR: box.topR, leftC: box.leftC, size: sz },
        ],
      };
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel:
          attackerSide === 'P1'
            ? `${sz}×${sz} @ ${formatCoordLabel(box.topR, box.leftC)}`
            : 'Bí mật',
        result: 'skill',
        detail: `Đặt bẫy ${def.name} (${sz}×${sz}) trên vùng biển nhà`,
      });
    } else if (skillId === 'siren_beacon' && opts.targetCoord) {
      const box = clampBoxOrigin(opts.targetCoord.r, opts.targetCoord.c, 2);
      const area = getAreaCells(box.topR, box.leftC, 2);
      const nextDecoys = [...att.decoys];
      const nextExp = { ...att.decoyExpiry };
      const nextJammed = { ...att.jammedTiles };
      let dCount = 0;
      let jCount = 0;
      for (const pt of area) {
        const pk = coordKey(pt.r, pt.c);
        const occupied = att.ships.some((s) =>
          s.cells.some((sc) => sc.r === pt.r && sc.c === pt.c)
        );
        if (
          !occupied &&
          !att.rocks.includes(pk) &&
          !att.receivedShots[pk] &&
          !nextDecoys.includes(pk) &&
          dCount < 2
        ) {
          nextDecoys.push(pk);
          nextExp[pk] = activeTurnNo + 2;
          dCount++;
        } else if (!att.receivedShots[pk] && jCount < 2) {
          nextJammed[pk] = 2;
          jCount++;
        }
      }
      att = {
        ...att,
        decoys: nextDecoys,
        decoyExpiry: nextExp,
        jammedTiles: nextJammed,
      };
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel:
          attackerSide === 'P1'
            ? `2×2 @ ${formatCoordLabel(box.topR, box.leftC)}`
            : 'Bí mật',
        result: 'skill',
        detail: `Đèn Hiệu Siren: tạo ${dCount} mồi giả & ${jCount} ô nhiễu sóng (2 lượt)!`,
      });
    } else if (skillId === 'false_log_spoof') {
      const emptyOwn: Coord[] = [];
      for (let rr = 0; rr < GRID_SIZE; rr++) {
        for (let cc = 0; cc < GRID_SIZE; cc++) {
          const k = coordKey(rr, cc);
          if (
            !att.rocks.includes(k) &&
            !att.receivedShots[k] &&
            !att.decoys.includes(k) &&
            !att.ships.some((s) =>
              s.cells.some((sc) => sc.r === rr && sc.c === cc)
            )
          ) {
            emptyOwn.push({ r: rr, c: cc });
          }
        }
      }
      const nextDecoys = [...att.decoys];
      const nextExp = { ...att.decoyExpiry };
      if (emptyOwn.length > 0) {
        const dp = emptyOwn[Math.floor(Math.random() * emptyOwn.length)];
        const dk = coordKey(dp.r, dp.c);
        nextDecoys.push(dk);
        nextExp[dk] = activeTurnNo + 2;
      }
      att = {
        ...att,
        infoFogTurns: Math.max(att.infoFogTurns, 1),
        decoys: nextDecoys,
        decoyExpiry: nextExp,
      };
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: 'Nhật ký & Radar',
        result: 'skill',
        detail: 'Giả Mạo Tín Hiệu: che dấu kết quả 1 lượt & thả 1 mồi nhử!',
      });
    } else if (skillId === 'info_fog') {
      att = { ...att, infoFogTurns: 2 };
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: 'Toàn bảng địch',
        result: 'skill',
        detail:
          'Màn Sương Thông Tin: che toàn bộ tọa độ & kết quả bắn mới trong 2 lượt đối phương!',
      });
    }

    // ==================== 5. NHÁNH KHIÊN & ĐÁNH CHẶN (37–42 + 99–106) ====================
    else if (
      skillId === 'energy_shield' ||
      skillId === 'mirror_barrier' ||
      skillId === 'kevlar_bulkhead'
    ) {
      const ship =
        att.ships.find((s) => s.instanceId === opts.shipId && !s.sunk) ??
        [...att.ships]
          .filter((s) => !s.sunk)
          .sort((a, b) => b.cells.length - a.cells.length)[0];
      if (ship) {
        if (skillId === 'energy_shield') {
          att = {
            ...att,
            shieldedShipIds: att.shieldedShipIds.includes(ship.instanceId)
              ? att.shieldedShipIds
              : [...att.shieldedShipIds, ship.instanceId],
          };
        } else if (skillId === 'mirror_barrier') {
          att = {
            ...att,
            shieldedShipIds: att.shieldedShipIds.includes(ship.instanceId)
              ? att.shieldedShipIds
              : [...att.shieldedShipIds, ship.instanceId],
            reflectiveShieldShipIds: att.reflectiveShieldShipIds.includes(
              ship.instanceId
            )
              ? att.reflectiveShieldShipIds
              : [...att.reflectiveShieldShipIds, ship.instanceId],
          };
        } else {
          att = {
            ...att,
            ships: att.ships.map((s) =>
              s.instanceId === ship.instanceId
                ? {
                    ...s,
                    armorRemaining: (s.armorRemaining ?? 0) + 1,
                    armorMax: (s.armorMax ?? 0) + 1,
                  }
                : s
            ),
          };
        }
        soundFX.playPlace();
        pushLog({
          turn: activeTurnNo,
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: formatCoordLabel(ship.anchor.r, ship.anchor.c),
          result: 'skill',
          detail: `${def.name}: bảo vệ tàu ${ship.name}!`,
        });
      }
    } else if (
      (skillId === 'smoke_screen' ||
        skillId === 'reactive_smoke' ||
        skillId === 'fleet_smoke_wall') &&
      opts.targetCoord
    ) {
      const smokeBonus = hasPassive(att, 'smoke_affinity') ? 1 : 0;
      const nextSmoke = { ...att.smokeCells };
      let cells: Coord[] = [];
      let duration = 2 + smokeBonus;
      let label = '';
      if (skillId === 'smoke_screen') {
        cells = getAreaCells(
          opts.targetCoord.r - 1,
          opts.targetCoord.c - 1,
          3
        );
        label = `3×3 @ ${formatCoordLabel(opts.targetCoord.r, opts.targetCoord.c)}`;
      } else if (skillId === 'reactive_smoke') {
        const box = clampBoxOrigin(opts.targetCoord.r, opts.targetCoord.c, 2);
        cells = getAreaCells(box.topR, box.leftC, 2);
        duration = 3 + smokeBonus;
        label = `2×2 @ ${formatCoordLabel(box.topR, box.leftC)}`;
      } else {
        const dir = opts.direction ?? actionDirection;
        cells = getLineCells(opts.targetCoord, dir, 5);
        label = `5 ô @ ${formatCoordLabel(opts.targetCoord.r, opts.targetCoord.c)} (${dirLabelVi(dir)})`;
      }
      for (const pt of cells) {
        const k = coordKey(pt.r, pt.c);
        nextSmoke[k] = Math.max(nextSmoke[k] ?? 0, duration);
      }
      att = { ...att, smokeCells: nextSmoke };
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: label,
        result: 'skill',
        detail: `${def.name} (${cells.length} ô · ${duration} lượt${smokeBonus ? ' +1 Thông Thảo Khói' : ''})`,
      });
    } else if (
      (skillId === 'dome_shield' || skillId === 'aegis_dome_3x3') &&
      opts.targetCoord
    ) {
      const cells =
        skillId === 'aegis_dome_3x3'
          ? getAreaCells(opts.targetCoord.r - 1, opts.targetCoord.c - 1, 3)
          : (() => {
              const box = clampBoxOrigin(opts.targetCoord.r, opts.targetCoord.c, 2);
              return getAreaCells(box.topR, box.leftC, 2);
            })();
      const nextDome = { ...att.domeShieldCells };
      for (const pt of cells) {
        nextDome[coordKey(pt.r, pt.c)] = 1;
      }
      att = { ...att, domeShieldCells: nextDome };
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: `${skillId === 'aegis_dome_3x3' ? '3×3' : '2×2'} @ ${formatCoordLabel(opts.targetCoord.r, opts.targetCoord.c)}`,
        result: 'skill',
        detail: `${def.name}: chặn Không kích & Pháo kích 1 lượt!`,
      });
    } else if (skillId === 'flagship_bunker') {
      const ship =
        att.ships.find((s) => s.isFlagship && !s.sunk) ??
        [...att.ships]
          .filter((s) => !s.sunk)
          .sort((a, b) => b.cells.length - a.cells.length)[0];
      if (ship) {
        const box = clampBoxOrigin(ship.anchor.r, ship.anchor.c, 2);
        const nextDome = { ...att.domeShieldCells };
        for (const pt of getAreaCells(box.topR, box.leftC, 2)) {
          nextDome[coordKey(pt.r, pt.c)] = 1;
        }
        att = {
          ...att,
          shieldedShipIds: att.shieldedShipIds.includes(ship.instanceId)
            ? att.shieldedShipIds
            : [...att.shieldedShipIds, ship.instanceId],
          domeShieldCells: nextDome,
        };
        soundFX.playPlace();
        pushLog({
          turn: activeTurnNo,
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: ship.name,
          result: 'skill',
          detail: `Hầm Ngầm Soái Hạm: bọc Khiên Năng Lượng & Vòm 2×2 bảo vệ ${ship.name}!`,
        });
      }
    } else if (
      skillId === 'missile_interceptor' ||
      skillId === 'torpedo_net'
    ) {
      let nextCd = { ...att.skillCooldowns };
      let netNote = '';
      if (skillId === 'torpedo_net') {
        const shieldCool = att.setup.skillIds.find(
          (sid) =>
            sid !== 'torpedo_net' &&
            SKILLS[sid]?.category === 'SHIELD' &&
            (nextCd[sid] ?? 0) > 0
        );
        if (shieldCool) {
          nextCd[shieldCool] = Math.max(0, nextCd[shieldCool] - 1);
          netNote = ` & -1 CD ${SKILLS[shieldCool].name}`;
        }
      }
      att = { ...att, interceptorReady: true, skillCooldowns: nextCd };
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: 'Phòng không hạm đội',
        result: 'skill',
        detail: `${def.name}: sẵn sàng hủy Ngư Lôi hoặc Pháo Hạng Nặng kế tiếp${netNote}!`,
      });
    } else if (skillId === 'emp_deflector') {
      att = {
        ...att,
        empImmunityTurns: Math.max(att.empImmunityTurns, 1),
        ciwsReady: true,
      };
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: 'Toàn hạm đội',
        result: 'skill',
        detail: 'Áp Chế EMP: miễn nhiễm EMP 1 lượt & kích hoạt ngay CIWS chặn AoE!',
      });
    } else if (skillId === 'reflective_shield') {
      const ship =
        att.ships.find((s) => s.instanceId === opts.shipId && !s.sunk) ??
        [...att.ships]
          .filter((s) => !s.sunk)
          .sort((a, b) => b.cells.length - a.cells.length)[0];
      if (ship) {
        att = {
          ...att,
          reflectiveShieldShipIds: att.reflectiveShieldShipIds.includes(
            ship.instanceId
          )
            ? att.reflectiveShieldShipIds
            : [...att.reflectiveShieldShipIds, ship.instanceId],
        };
        soundFX.playPlace();
        pushLog({
          turn: activeTurnNo,
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: formatCoordLabel(ship.anchor.r, ship.anchor.c),
          result: 'skill',
          detail: `Khiên Phản Xạ bảo vệ ${ship.name} (chặn 1 đòn & dội ngược sát thương)`,
        });
      }
    } else if (skillId === 'airstrike_jammer' && opts.targetCoord) {
      const box = clampBoxOrigin(
        opts.targetCoord.r - 1,
        opts.targetCoord.c - 1,
        3
      );
      att = {
        ...att,
        airstrikeJamZones: [
          ...att.airstrikeJamZones,
          {
            id: `aj-${Date.now()}`,
            topR: box.topR,
            leftC: box.leftC,
            size: 3,
            expiresTurn: activeTurnNo + 2,
          },
        ],
      };
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: `3×3 @ ${formatCoordLabel(box.topR, box.leftC)}`,
        result: 'skill',
        detail:
          'Trạm Nhiễu Sóng Không Kích 3×3: chặn Không Kích & Pháo Hạng Nặng (2 lượt)',
      });
    }

    // ==================== 6. NHÁNH ĐỊNH VỊ & ĐIỀU HƯỚNG (46–51 + 110–117) ====================
    else if (skillId === 'tidal_shockwave' && opts.targetCoord) {
      const dir = opts.direction ?? actionDirection;
      const axis: 'ROW' | 'COL' =
        dir === 'LEFT' || dir === 'RIGHT' ? 'ROW' : 'COL';
      const lineIndex = axis === 'ROW' ? opts.targetCoord.r : opts.targetCoord.c;
      const res = executeTidalShockwaveLine(
        dfd,
        axis,
        lineIndex,
        dir,
        rules.noTouch
      );
      dfd = res.nextState;
      if (res.movedShipCount > 0 || res.mineHits.length > 0) {
        soundFX.playHit();
        triggerShake(defenderSide);
      } else {
        soundFX.playSplash();
      }
      pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: `${axis === 'ROW' ? `Hàng ${lineIndex + 1}` : `Cột ${COL_LABELS[lineIndex]}`} (${dirLabelVi(dir)})`,
        result: 'skill',
        detail: `Sóng Xung Kích: đẩy ${res.movedShipCount} tàu địch, trôi ${res.driftedMinesCount} mìn${res.mineHits.length > 0 ? `, nổ ${res.mineHits.length} mìn!` : ''}`,
      });
    } else if (skillId === 'rotate_ship' || skillId === 'flip_ship_180') {
      const ship = att.ships.find((s) => s.instanceId === opts.shipId && !s.sunk);
      if (ship) {
        const oldCells = [...ship.cells];
        const res =
          skillId === 'flip_ship_180'
            ? tryRotateOwnShip180(att, ship.instanceId, rules.noTouch)
            : tryRotateOwnShip90(att, ship.instanceId, rules.noTouch);
        if (res.rotated) {
          att = maybeDropAfterimage(res.nextState, oldCells);
          soundFX.playRotate();
          pushLog({
            turn: activeTurnNo,
            attackerName: att.setup.name,
            attackerNation: att.setup.nationId,
            coordLabel: formatCoordLabel(ship.anchor.r, ship.anchor.c),
            result: 'skill',
            detail: `${def.name}: xoay ${ship.name} ${skillId === 'flip_ship_180' ? '180°' : '90°'} & cập nhật vị trí mới`,
          });
        } else {
          soundFX.playSplash();
          pushLog({
            turn: activeTurnNo,
            attackerName: att.setup.name,
            attackerNation: att.setup.nationId,
            coordLabel: formatCoordLabel(ship.anchor.r, ship.anchor.c),
            result: 'skill',
            detail: `Không thể xoay ${ship.name}: ${res.reason}`,
          });
        }
      }
    } else if (
      skillId === 'strategic_relocation' ||
      skillId === 'turbo_dash_2'
    ) {
      const ship =
        att.ships.find((s) => s.instanceId === opts.shipId && !s.sunk) ??
        att.ships.find((s) => !s.sunk);
      if (ship) {
        const dir = opts.direction ?? actionDirection;
        const dr = dir === 'UP' ? -1 : dir === 'DOWN' ? 1 : 0;
        const dc = dir === 'LEFT' ? -1 : dir === 'RIGHT' ? 1 : 0;
        const steps = skillId === 'turbo_dash_2' ? 2 : 1;
        let workingShip = ship;
        let movedSteps = 0;
        let totalMines = 0;
        const origCells = [...ship.cells];

        for (let st = 0; st < steps; st++) {
          const nr = workingShip.anchor.r + dr;
          const nc = workingShip.anchor.c + dc;
          const check = canPlaceShip(
            workingShip.offsets,
            nr,
            nc,
            att.ships,
            rules.noTouch,
            workingShip.instanceId,
            att.rocks
          );
          if (!check.valid) break;
          const moved = relocateShipWithRollback(
            att,
            workingShip,
            { r: nr, c: nc },
            workingShip.offsets,
            check.cells
          );
          att = moved.nextState;
          totalMines += moved.detonatedCoords.length;
          movedSteps++;
          const updated = att.ships.find((s) => s.instanceId === ship.instanceId);
          if (!updated || updated.sunk) break;
          workingShip = updated;
        }

        if (movedSteps > 0) {
          att = maybeDropAfterimage(att, origCells);
          soundFX.playRotate();
          pushLog({
            turn: activeTurnNo,
            attackerName: att.setup.name,
            attackerNation: att.setup.nationId,
            coordLabel: `${formatCoordLabel(ship.anchor.r, ship.anchor.c)}→${formatCoordLabel(workingShip.anchor.r, workingShip.anchor.c)}`,
            result: 'skill',
            detail: `${def.name}: dời ${ship.name} ${movedSteps} ô (${dirLabelVi(dir)})${totalMines > 0 ? ` (chạm ${totalMines} mìn!)` : ''}`,
          });
        } else {
          soundFX.playSplash();
          pushLog({
            turn: activeTurnNo,
            attackerName: att.setup.name,
            attackerNation: att.setup.nationId,
            coordLabel: formatCoordLabel(ship.anchor.r, ship.anchor.c),
            result: 'skill',
            detail: `${def.name} thất bại (${ship.name} vướng biên/tàu/đá ngầm).`,
          });
        }
      }
    } else if (skillId === 'fleet_drift_shift') {
      const dirs: CardinalDirection[] = ['RIGHT', 'LEFT', 'DOWN', 'UP'];
      let bestDir: CardinalDirection = 'RIGHT';
      let bestCount = -1;
      for (const d of dirs) {
        const dr = d === 'UP' ? -1 : d === 'DOWN' ? 1 : 0;
        const dc = d === 'LEFT' ? -1 : d === 'RIGHT' ? 1 : 0;
        let cnt = 0;
        for (const s of att.ships) {
          if (s.sunk) continue;
          const chk = canPlaceShip(
            s.offsets,
            s.anchor.r + dr,
            s.anchor.c + dc,
            att.ships,
            rules.noTouch,
            s.instanceId,
            att.rocks
          );
          if (chk.valid) cnt++;
        }
        if (cnt > bestCount) {
          bestCount = cnt;
          bestDir = d;
        }
      }
      const dr = bestDir === 'UP' ? -1 : bestDir === 'DOWN' ? 1 : 0;
      const dc = bestDir === 'LEFT' ? -1 : bestDir === 'RIGHT' ? 1 : 0;
      let shifted = 0;
      for (const s of [...att.ships]) {
        if (s.sunk) continue;
        const live = att.ships.find((x) => x.instanceId === s.instanceId);
        if (!live || live.sunk) continue;
        const chk = canPlaceShip(
          live.offsets,
          live.anchor.r + dr,
          live.anchor.c + dc,
          att.ships,
          rules.noTouch,
          live.instanceId,
          att.rocks
        );
        if (chk.valid) {
          const oldCells = [...live.cells];
          att = relocateShipWithRollback(
            att,
            live,
            { r: live.anchor.r + dr, c: live.anchor.c + dc },
            live.offsets,
            chk.cells
          ).nextState;
          att = maybeDropAfterimage(att, oldCells);
          shifted++;
        }
      }
      soundFX.playRotate();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: `Toàn hạm đội (${dirLabelVi(bestDir)})`,
        result: 'skill',
        detail: `Chuyển Dịch Hạm Đội: dời ${shifted} chiến hạm 1 ô về hướng ${dirLabelVi(bestDir)}!`,
      });
    } else if (skillId === 'decoy_swap') {
      const ship =
        att.ships.find((s) => s.instanceId === opts.shipId && !s.sunk) ??
        att.ships.find((s) => !s.sunk);
      if (ship) {
        const oldCells = [...ship.cells];
        const offsets = [
          [0, 2],
          [0, -2],
          [2, 0],
          [-2, 0],
          [1, 1],
          [-1, 1],
          [1, -1],
          [-1, -1],
          [0, 1],
          [1, 0],
        ];
        let swapped = false;
        for (const [dr, dc] of offsets) {
          const nr = ship.anchor.r + dr;
          const nc = ship.anchor.c + dc;
          const chk = canPlaceShip(
            ship.offsets,
            nr,
            nc,
            att.ships,
            rules.noTouch,
            ship.instanceId,
            att.rocks
          );
          if (chk.valid) {
            att = relocateShipWithRollback(
              att,
              ship,
              { r: nr, c: nc },
              ship.offsets,
              chk.cells
            ).nextState;
            const occupied = new Set(
              att.ships.flatMap((s) => s.cells.map((c) => coordKey(c.r, c.c)))
            );
            const nextDecoys = [...att.decoys];
            const nextExp = { ...att.decoyExpiry };
            let dropped = 0;
            for (const oc of oldCells) {
              if (dropped >= 2) break;
              const ok = coordKey(oc.r, oc.c);
              if (
                !occupied.has(ok) &&
                !att.rocks.includes(ok) &&
                !att.receivedShots[ok] &&
                !nextDecoys.includes(ok)
              ) {
                nextDecoys.push(ok);
                nextExp[ok] = activeTurnNo + 2;
                dropped++;
              }
            }
            att = { ...att, decoys: nextDecoys, decoyExpiry: nextExp };
            swapped = true;
            soundFX.playRotate();
            pushLog({
              turn: activeTurnNo,
              attackerName: att.setup.name,
              attackerNation: att.setup.nationId,
              coordLabel: `${formatCoordLabel(ship.anchor.r, ship.anchor.c)}→${formatCoordLabel(nr, nc)}`,
              result: 'skill',
              detail: `Hoán Đổi Ảo Ảnh: dời ${ship.name} & rải ${dropped} mồi giả ở vị trí cũ!`,
            });
            break;
          }
        }
        if (!swapped) {
          soundFX.playSplash();
          pushLog({
            turn: activeTurnNo,
            attackerName: att.setup.name,
            attackerNation: att.setup.nationId,
            coordLabel: ship.name,
            result: 'skill',
            detail: `Hoán Đổi Ảo Ảnh thất bại (${ship.name} hết chỗ lách).`,
          });
        }
      }
    } else if (skillId === 'reposition_flagship') {
      const targetShip =
        att.ships.find((s) => s.isFlagship && !s.sunk) ??
        [...att.ships]
          .filter((s) => !s.sunk)
          .sort((a, b) => b.hits.length - a.hits.length)[0];
      if (targetShip) {
        const oldCells = [...targetShip.cells];
        const stepDirs: Coord[] = [
          { r: -1, c: 0 },
          { r: 1, c: 0 },
          { r: 0, c: -1 },
          { r: 0, c: 1 },
        ];
        let movedOk = false;
        for (const d of stepDirs) {
          const nr = targetShip.anchor.r + d.r;
          const nc = targetShip.anchor.c + d.c;
          const chk = canPlaceShip(
            targetShip.offsets,
            nr,
            nc,
            att.ships,
            rules.noTouch,
            targetShip.instanceId,
            att.rocks
          );
          if (chk.valid) {
            att = relocateShipWithRollback(
              att,
              targetShip,
              { r: nr, c: nc },
              targetShip.offsets,
              chk.cells
            ).nextState;
            att = maybeDropAfterimage(att, oldCells);
            movedOk = true;
            soundFX.playRotate();
            pushLog({
              turn: activeTurnNo,
              attackerName: att.setup.name,
              attackerNation: att.setup.nationId,
              coordLabel: formatCoordLabel(nr, nc),
              result: 'skill',
              detail: `Tái Định Vị Soái Hạm: rút nhanh ${targetShip.name} sang ${formatCoordLabel(nr, nc)}!`,
            });
            break;
          }
        }
        if (!movedOk) {
          soundFX.playSplash();
        }
      }
    } else if (skillId === 'evasive_maneuver_all') {
      const aliveIds = att.ships.filter((s) => !s.sunk).map((s) => s.instanceId);
      att = {
        ...att,
        evasionProtectedShipIds: Array.from(
          new Set([...att.evasionProtectedShipIds, ...aliveIds])
        ),
      };
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel: 'Toàn hạm đội',
        result: 'skill',
        detail: 'Lệnh Rẽ Sóng Tập Thể: toàn hạm đội miễn nhiễm ép dịch chuyển 1 lượt!',
      });
    } else if (
      (skillId === 'enemy_deviation' || skillId === 'crosswind_push') &&
      opts.targetCoord
    ) {
      const target = opts.targetCoord;
      const tk = coordKey(target.r, target.c);
      const isExposedCoord =
        dfd.receivedShots[tk] === 'hit' ||
        dfd.receivedShots[tk] === 'armor' ||
        dfd.revealedCells.includes(tk) ||
        dfd.revealedShipIds.some((id) =>
          dfd.ships
            .find((s) => s.instanceId === id)
            ?.cells.some((sc) => sc.r === target.r && sc.c === target.c)
        );
      const hitShip = dfd.ships.find(
        (s) =>
          !s.sunk &&
          s.cells.some((sc) => sc.r === target.r && sc.c === target.c)
      );
      if (!isExposedCoord || !hitShip) {
        soundFX.playSplash();
        pushLog({
          turn: activeTurnNo,
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: formatCoordLabel(target.r, target.c),
          result: 'skill',
          detail: `${def.name}: cần chọn phân đoạn tàu địch đã bị lộ/trúng.`,
        });
      } else if (
        hasPassive(dfd, 'formation_stability') ||
        dfd.evasionProtectedShipIds.includes(hitShip.instanceId)
      ) {
        soundFX.playSplash();
        pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: formatCoordLabel(target.r, target.c),
          result: 'skill',
          detail: `${def.name} bị vô hiệu hóa do mục tiêu miễn dịch dịch chuyển!`,
        });
      } else {
        const dir = opts.direction ?? actionDirection;
        const dr = dir === 'UP' ? -1 : dir === 'DOWN' ? 1 : 0;
        const dc = dir === 'LEFT' ? -1 : dir === 'RIGHT' ? 1 : 0;
        const steps = skillId === 'crosswind_push' ? 2 : 1;
        let workingEnemyShip = hitShip;
        let pushedSteps = 0;
        let totalMines = 0;

        for (let st = 0; st < steps; st++) {
          const nr = workingEnemyShip.anchor.r + dr;
          const nc = workingEnemyShip.anchor.c + dc;
          const check = canPlaceShip(
            workingEnemyShip.offsets,
            nr,
            nc,
            dfd.ships,
            rules.noTouch,
            workingEnemyShip.instanceId,
            dfd.rocks
          );
          if (!check.valid) break;
          const res = relocateShipWithRollback(
            dfd,
            workingEnemyShip,
            { r: nr, c: nc },
            workingEnemyShip.offsets,
            check.cells
          );
          dfd = res.nextState;
          totalMines += res.detonatedCoords.length;
          pushedSteps++;
          const upd = dfd.ships.find(
            (s) => s.instanceId === hitShip.instanceId
          );
          if (!upd || upd.sunk) break;
          workingEnemyShip = upd;
        }

        if (pushedSteps > 0) {
          soundFX.playHit();
          triggerShake(defenderSide);
          pushSideAwareLog(attackerSide, dfd, activeTurnNo, {
            attackerName: att.setup.name,
            attackerNation: att.setup.nationId,
            coordLabel: formatCoordLabel(target.r, target.c),
            result: 'skill',
            detail: `${def.name} đẩy tàu địch ${pushedSteps} ô (${dirLabelVi(dir)})${totalMines > 0 ? ` · Nổ ${totalMines} mìn!` : ''}`,
          });
        } else {
          soundFX.playSplash();
          pushLog({
            turn: activeTurnNo,
            attackerName: att.setup.name,
            attackerNation: att.setup.nationId,
            coordLabel: formatCoordLabel(target.r, target.c),
            result: 'skill',
            detail: `${def.name} không thành công (vướng đá/biên/tàu khác).`,
          });
        }
      }
    } else if (skillId === 'formation_swap' && opts.shipId && opts.secondShipId) {
      const res = trySwapTwoOwnShips(
        att,
        opts.shipId,
        opts.secondShipId,
        rules.noTouch
      );
      if (res.swapped) {
        att = res.nextState;
        soundFX.playRotate();
        pushLog({
          turn: activeTurnNo,
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: '2 chiến hạm',
          result: 'skill',
          detail: 'Tái Lập Đội Hình: hoán đổi vị trí thành công hai chiến hạm!',
        });
      } else {
        soundFX.playSplash();
        pushLog({
          turn: activeTurnNo,
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: 'Tái lập đội hình',
          result: 'skill',
          detail: `Không thể hoán đổi: ${res.reason}`,
        });
      }
    } else if (skillId === 'tactical_evasion' && opts.shipId) {
      const ship = att.ships.find((s) => s.instanceId === opts.shipId && !s.sunk);
      if (ship) {
        att = {
          ...att,
          evasionProtectedShipIds: att.evasionProtectedShipIds.includes(
            ship.instanceId
          )
            ? att.evasionProtectedShipIds
            : [...att.evasionProtectedShipIds, ship.instanceId],
        };
        soundFX.playPlace();
        pushLog({
          turn: activeTurnNo,
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: formatCoordLabel(ship.anchor.r, ship.anchor.c),
          result: 'skill',
          detail: `Né Tránh Chiến Thuật: ${ship.name} miễn nhiễm ép dịch chuyển 1 lượt`,
        });
      }
    } else if (skillId === 'mine_relocate' && opts.targetCoord) {
      const pk = coordKey(opts.targetCoord.r, opts.targetCoord.c);
      if (att.mines.length > 0) {
        const nearestMine = [...att.mines].sort((a, b) => {
          const [ar, ac] = a.split(',').map(Number);
          const [br, bc] = b.split(',').map(Number);
          return (
            Math.abs(ar - opts.targetCoord!.r) +
            Math.abs(ac - opts.targetCoord!.c) -
            (Math.abs(br - opts.targetCoord!.r) +
              Math.abs(bc - opts.targetCoord!.c))
          );
        })[0];
        att = {
          ...att,
          mines: [...att.mines.filter((m) => m !== nearestMine), pk],
        };
      } else {
        att = { ...att, mines: [...att.mines, pk] };
      }
      soundFX.playPlace();
      pushLog({
        turn: activeTurnNo,
        attackerName: att.setup.name,
        attackerNation: att.setup.nationId,
        coordLabel:
          attackerSide === 'P1'
            ? formatCoordLabel(opts.targetCoord.r, opts.targetCoord.c)
            : 'Bí mật',
        result: 'skill',
        detail: 'Dịch Chuyển Thủy Lôi tới vị trí phục kích mới!',
      });
    }

    // Kiểm tra tàu dịch chuyển có đi qua Vùng Nước Xoáy Ngầm đang hoạt động không
    const attVortices = (
      attackerSide === 'P1' ? maelstromBoardP1 : maelstromBoardP2
    ).filter((v) => v.expiresTurn >= activeTurnNo);
    const dfdVortices = (
      defenderSide === 'P1' ? maelstromBoardP1 : maelstromBoardP2
    ).filter((v) => v.expiresTurn >= activeTurnNo);

    if (attVortices.length > 0) {
      const mRes = applyMaelstromOnBoard(att, attVortices);
      att = mRes.nextState;
      for (const msg of mRes.hitLogs) {
        pushLog({
          turn: activeTurnNo,
          attackerName: att.setup.name,
          attackerNation: att.setup.nationId,
          coordLabel: 'Xoáy Ngầm',
          result: 'event',
          detail: msg,
        });
      }
    }
    if (dfdVortices.length > 0) {
      const mRes = applyMaelstromOnBoard(dfd, dfdVortices);
      dfd = mRes.nextState;
      for (const msg of mRes.hitLogs) {
        pushLog({
          turn: activeTurnNo,
          attackerName: dfd.setup.name,
          attackerNation: dfd.setup.nationId,
          coordLabel: 'Xoáy Ngầm',
          result: 'event',
          detail: msg,
        });
      }
    }

    let endedWinner: 'P1' | 'P2' | null = null;
    if (hasLostBattle(dfd, rules.battleGoal)) endedWinner = attackerSide;
    else if (hasLostBattle(att, rules.battleGoal)) endedWinner = defenderSide;

    return {
      nextAttacker: att,
      nextDefender: dfd,
      bonusShots,
      endedWinner,
    };
  };

  /**
   * Chuyển lượt chuẩn hóa: đốt cháy DoT chưa dập, giảm CD/hiệu ứng, kích hoạt bị động đầu lượt,
   * khai hỏa Pháo Hạng Nặng 2×2 đến hạn và kiểm tra điều kiện thắng.
   */
  const resolveTurnTransition = (
    endingSide: 'P1' | 'P2',
    currentTurnNo: number,
    endingRaw: PlayerBattleState,
    nextRaw: PlayerBattleState,
    currentPendingStrikes: PendingHeavyStrike[]
  ): {
    updatedEnding: PlayerBattleState;
    updatedNext: PlayerBattleState;
    updatedPending: PendingHeavyStrike[];
    nextTurnNo: number;
    nextTurnSide: 'P1' | 'P2';
    endedWinner: 'P1' | 'P2' | null;
    newShotKeysOnEnding: string[];
  } => {
    const nextTurnSide: 'P1' | 'P2' = endingSide === 'P1' ? 'P2' : 'P1';
    const nextTurnNo = nextTurnSide === 'P1' ? currentTurnNo + 1 : currentTurnNo;
    const newShotKeysOnEnding: string[] = [];

    let workingEnding = endingRaw;
    let workingNext = nextRaw;

    // 1. Sát thương cháy lan (14. Đạn Cháy Nổ Lớn) nếu phe vừa kết thúc lượt không dùng Dập Lửa
    const burningEntries = Object.entries(workingEnding.burningCells);
    if (burningEntries.length > 0) {
      const nextBurning: Record<string, { shipId: string; turnsLeft: number }> =
        {};
      let burnDamageCount = 0;
      let burnSunkName: string | undefined;
      for (const [bk, info] of burningEntries) {
        if (info.turnsLeft > 1) {
          nextBurning[bk] = { ...info, turnsLeft: info.turnsLeft - 1 };
          continue;
        }
        const [br, bc] = bk.split(',').map(Number);
        const shipAlive = workingEnding.ships.some(
          (s) =>
            !s.sunk &&
            s.instanceId === info.shipId &&
            s.cells.some((sc) => sc.r === br && sc.c === bc)
        );
        if (!shipAlive) continue;
        const bRes = resolveSingleImpact(
          workingNext,
          workingEnding,
          br,
          bc,
          currentTurnNo,
          { bypassShields: true, isAoe: true, damage: 1 }
        );
        workingNext = bRes.nextAttacker;
        workingEnding = bRes.nextDefender;
        newShotKeysOnEnding.push(bk);
        if (
          bRes.result === 'hit' ||
          bRes.result === 'armor' ||
          bRes.result === 'sunk'
        ) {
          burnDamageCount++;
        }
        if (bRes.sunkShipName) burnSunkName = bRes.sunkShipName;
      }
      workingEnding = { ...workingEnding, burningCells: nextBurning };
      if (burnDamageCount > 0) {
        soundFX.playHit();
        triggerShake(endingSide);
        pushSideAwareLog(nextTurnSide, workingEnding, currentTurnNo, {
          attackerName: workingNext.setup.name,
          attackerNation: workingNext.setup.nationId,
          coordLabel: 'Cháy lan DoT',
          result: burnSunkName ? 'sunk' : 'hit',
          sunkShipName: burnSunkName,
          detail: `Ngọn lửa cháy lan gây sát thương ${burnDamageCount} phân đoạn tàu ${workingEnding.setup.name}!`,
        });
      }
    }

    // 2. Kết thúc bộ đếm lượt phe vừa đánh & giảm thời hạn phòng thủ phe sắp đánh
    workingEnding = finishOwnTurnCounters(workingEnding);
    const decayRes = decayDefenseOnEnemyTurnEnd(workingNext, currentTurnNo);
    workingNext = decayRes.nextState;
    if (decayRes.selfRepairedMsg) {
      pushLog({
        turn: currentTurnNo,
        attackerName: workingNext.setup.name,
        attackerNation: workingNext.setup.nationId,
        coordLabel: 'Giáp tự phục hồi',
        result: 'skill',
        detail: decayRes.selfRepairedMsg,
      });
    }

    // 3. Bị động đầu lượt cho phe sắp hành động (nextTurnSide)
    // 25. Hậu Cần Vững Mạnh (-1 CD SUPPORT)
    if (hasPassive(workingNext, 'strong_logistics')) {
      const nextCd = { ...workingNext.skillCooldowns };
      for (const sid of workingNext.setup.skillIds) {
        if (SKILLS[sid]?.category === 'SUPPORT' && (nextCd[sid] ?? 0) > 0) {
          nextCd[sid] = Math.max(0, nextCd[sid] - 1);
        }
      }
      workingNext = { ...workingNext, skillCooldowns: nextCd };
    }

    // 52. Luồng Nước Sâu (-1 CD MOVEMENT)
    if (hasPassive(workingNext, 'deep_water_current')) {
      const nextCd = { ...workingNext.skillCooldowns };
      for (const sid of workingNext.setup.skillIds) {
        if (SKILLS[sid]?.category === 'MOVEMENT' && (nextCd[sid] ?? 0) > 0) {
          nextCd[sid] = Math.max(0, nextCd[sid] - 1);
        }
      }
      workingNext = { ...workingNext, skillCooldowns: nextCd };
    }

    // 18. Đạn Dược Cải Tiến (sau mỗi 5 lượt -> +1 sát thương phát thường kế tiếp)
    if (hasPassive(workingNext, 'improved_ammo') && nextTurnNo % 5 === 0) {
      if (!workingNext.improvedAmmoReady) {
        workingNext = { ...workingNext, improvedAmmoReady: true };
        pushLog({
          turn: nextTurnNo,
          attackerName: workingNext.setup.name,
          attackerNation: workingNext.setup.nationId,
          coordLabel: 'Đạn cải tiến',
          result: 'skill',
          detail: 'Đạn Dược Cải Tiến sẵn sàng (+1 sát thương phát bắn thường kế tiếp)!',
        });
      }
    }

    // 43. Hệ Thống CIWS (sau mỗi 5 lượt -> sẵn sàng đánh chặn 1 ô AoE)
    if (hasPassive(workingNext, 'ciws') && nextTurnNo % 5 === 0) {
      workingNext = { ...workingNext, ciwsReady: true };
    }

    // 07. Mắt Thần Hải Quân (cứ 10 lượt -> hé lộ 1 ô trống ở biên bản đồ địch, hoặc ô trống bất kỳ)
    if (hasPassive(workingNext, 'naval_allseeing_eye') && nextTurnNo % 10 === 0) {
      const edgeEmpty: Coord[] = [];
      const anyEmpty: Coord[] = [];
      for (let rr = 0; rr < GRID_SIZE; rr++) {
        for (let cc = 0; cc < GRID_SIZE; cc++) {
          const k = coordKey(rr, cc);
          if (workingEnding.receivedShots[k] || workingEnding.rocks.includes(k)) {
            continue;
          }
          const hasShip = workingEnding.ships.some((s) =>
            s.cells.some((sc) => sc.r === rr && sc.c === cc)
          );
          if (!hasShip) {
            if (rr === 0 || rr === GRID_SIZE - 1 || cc === 0 || cc === GRID_SIZE - 1) {
              edgeEmpty.push({ r: rr, c: cc });
            }
            anyEmpty.push({ r: rr, c: cc });
          }
        }
      }
      const pool = edgeEmpty.length > 0 ? edgeEmpty : anyEmpty;
      if (pool.length > 0) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        const pk = coordKey(pick.r, pick.c);
        workingEnding = {
          ...workingEnding,
          receivedShots: { ...workingEnding.receivedShots, [pk]: 'miss' },
        };
        pushLog({
          turn: nextTurnNo,
          attackerName: workingNext.setup.name,
          attackerNation: workingNext.setup.nationId,
          coordLabel: formatCoordLabel(pick.r, pick.c),
          result: 'skill',
          detail: `Mắt Thần Hải Quân hé lộ ô biên trống @ ${formatCoordLabel(pick.r, pick.c)}.`,
        });
      }
    }

    // 36. Chiến Thuật Nghi Binh (mỗi 8 lượt -> tạo 1 tín hiệu giả trên bản đồ nhà trong 1 lượt)
    if (hasPassive(workingNext, 'deception_tactics') && nextTurnNo % 8 === 0) {
      const emptyOwn: Coord[] = [];
      for (let rr = 0; rr < GRID_SIZE; rr++) {
        for (let cc = 0; cc < GRID_SIZE; cc++) {
          const k = coordKey(rr, cc);
          if (
            workingNext.rocks.includes(k) ||
            workingNext.receivedShots[k] ||
            workingNext.mines.includes(k) ||
            workingNext.decoys.includes(k)
          ) {
            continue;
          }
          const hasShip = workingNext.ships.some((s) =>
            s.cells.some((sc) => sc.r === rr && sc.c === cc)
          );
          if (!hasShip) emptyOwn.push({ r: rr, c: cc });
        }
      }
      if (emptyOwn.length > 0) {
        const dPick = emptyOwn[Math.floor(Math.random() * emptyOwn.length)];
        const dk = coordKey(dPick.r, dPick.c);
        workingNext = {
          ...workingNext,
          decoys: [...workingNext.decoys, dk],
          decoyExpiry: { ...workingNext.decoyExpiry, [dk]: nextTurnNo + 1 },
        };
        pushLog({
          turn: nextTurnNo,
          attackerName: workingNext.setup.name,
          attackerNation: workingNext.setup.nationId,
          coordLabel:
            nextTurnSide === 'P1' ? formatCoordLabel(dPick.r, dPick.c) : 'Bí mật',
          result: 'skill',
          detail: 'Chiến Thuật Nghi Binh tạo 1 tín hiệu radar giả trên vùng biển nhà (1 lượt).',
        });
      }
    }

    // 96. Thủy Lôi Tái Tạo (Bị động): Mỗi 7 lượt tự động thả 1 Thủy Lôi lên ô biển nhà an toàn
    if (hasPassive(workingNext, 'mine_replenish') && nextTurnNo % 7 === 0) {
      const emptyOwn: Coord[] = [];
      for (let rr = 0; rr < GRID_SIZE; rr++) {
        for (let cc = 0; cc < GRID_SIZE; cc++) {
          const k = coordKey(rr, cc);
          if (
            workingNext.rocks.includes(k) ||
            workingNext.receivedShots[k] ||
            workingNext.mines.includes(k) ||
            workingNext.ships.some((s) =>
              s.cells.some((sc) => sc.r === rr && sc.c === cc)
            )
          ) {
            continue;
          }
          emptyOwn.push({ r: rr, c: cc });
        }
      }
      if (emptyOwn.length > 0) {
        const mPick = emptyOwn[Math.floor(Math.random() * emptyOwn.length)];
        const mk = coordKey(mPick.r, mPick.c);
        workingNext = {
          ...workingNext,
          mines: [...workingNext.mines, mk],
        };
        pushLog({
          turn: nextTurnNo,
          attackerName: workingNext.setup.name,
          attackerNation: workingNext.setup.nationId,
          coordLabel:
            nextTurnSide === 'P1' ? formatCoordLabel(mPick.r, mPick.c) : 'Bí mật',
          result: 'skill',
          detail: 'Thủy Lôi Tái Tạo tự động gài thêm 1 thủy lôi bảo vệ lưới nhà.',
        });
      }
    }

    // 4. Kích nổ Pháo Hạng Nặng Cỡ Lớn 2×2 (15) đã đủ 1 lượt chờ đối phương
    const dueStrikes = currentPendingStrikes.filter(
      (s) => s.targetBoard === endingSide && s.triggerTurn <= nextTurnNo
    );
    const updatedPending = currentPendingStrikes.filter(
      (s) => !(s.targetBoard === endingSide && s.triggerTurn <= nextTurnNo)
    );
    if (dueStrikes.length > 0) {
      const endingStorms = (
        endingSide === 'P1' ? stormBoardP1 : stormBoardP2
      ).filter((z) => z.expiresTurn >= nextTurnNo);
      for (const strike of dueStrikes) {
        const areaStr = `${formatCoordLabel(strike.topR, strike.leftC)}–${formatCoordLabel(
          strike.topR + 1,
          strike.leftC + 1
        )}`;
        if (workingEnding.interceptorReady) {
          workingEnding = { ...workingEnding, interceptorReady: false };
          soundFX.playSplash();
          pushSideAwareLog(nextTurnSide, workingEnding, nextTurnNo, {
            attackerName: workingNext.setup.name,
            attackerNation: workingNext.setup.nationId,
            coordLabel: areaStr,
            result: 'skill',
            detail:
              'Lưới Đánh Chặn Tên Lửa vô hiệu hóa hoàn toàn Pháo Hạng Nặng 2×2!',
          });
          continue;
        }
        let targets = getAreaCells(strike.topR, strike.leftC, 2).filter((pt) => {
          const pk = coordKey(pt.r, pt.c);
          const st = workingEnding.receivedShots[pk];
          if (st && st !== 'armor') return false;
          if (workingEnding.domeShieldCells[pk]) return false;
          if (
            endingStorms.some(
              (z) =>
                pt.r >= z.topR &&
                pt.r < z.topR + 5 &&
                pt.c >= z.leftC &&
                pt.c < z.leftC + 5
            )
          ) {
            return false;
          }
          if (
            workingEnding.airstrikeJamZones.some(
              (z) =>
                z.expiresTurn >= nextTurnNo &&
                pt.r >= z.topR &&
                pt.r < z.topR + z.size &&
                pt.c >= z.leftC &&
                pt.c < z.leftC + z.size
            )
          ) {
            return false;
          }
          return true;
        });
        let ciwsBlocked = false;
        if (workingEnding.ciwsReady && targets.length > 1) {
          ciwsBlocked = true;
          workingEnding = { ...workingEnding, ciwsReady: false };
          targets = targets.slice(0, targets.length - 1);
        }

        let hits = 0;
        let sunkName: string | undefined;
        soundFX.playFire();
        for (const tc of targets) {
          const hRes = resolveSingleImpact(
            workingNext,
            workingEnding,
            tc.r,
            tc.c,
            nextTurnNo,
            { isAoe: true }
          );
          workingNext = hRes.nextAttacker;
          workingEnding = hRes.nextDefender;
          newShotKeysOnEnding.push(coordKey(tc.r, tc.c));
          if (
            hRes.result === 'hit' ||
            hRes.result === 'armor' ||
            hRes.result === 'sunk'
          ) {
            hits++;
          }
          if (hRes.sunkShipName) sunkName = hRes.sunkShipName;
        }
        if (hits > 0) {
          triggerShake(endingSide);
          if (sunkName) soundFX.playSunk();
          else soundFX.playHit();
        } else {
          soundFX.playSplash();
        }
        pushSideAwareLog(nextTurnSide, workingEnding, nextTurnNo, {
          attackerName: workingNext.setup.name,
          attackerNation: workingNext.setup.nationId,
          coordLabel: areaStr,
          result: sunkName ? 'sunk' : hits > 0 ? 'hit' : 'miss',
          sunkShipName: sunkName,
          detail: `Pháo Hạng Nặng Cỡ Lớn 2×2 khai hỏa: trúng ${hits}/${targets.length}${ciwsBlocked ? ' · CIWS chặn 1 ô' : ''}`,
        });
      }
    }

    let endedWinner: 'P1' | 'P2' | null = null;
    if (hasLostBattle(workingEnding, rules.battleGoal)) {
      endedWinner = nextTurnSide;
    } else if (hasLostBattle(workingNext, rules.battleGoal)) {
      endedWinner = endingSide;
    }

    return {
      updatedEnding: workingEnding,
      updatedNext: workingNext,
      updatedPending,
      nextTurnNo,
      nextTurnSide,
      endedWinner,
      newShotKeysOnEnding,
    };
  };

  /**
   * Người chơi bấm ô trên bàn cờ địch (Bắn đạn hoặc thi triển Skill ngắm địch)
   */
  const handleEnemyCellClick = (r: number, c: number) => {
    if (winner || isAIThinking || privacyShieldFor) return;

    const attackerSide = rules.mode === 'VS_AI' ? 'P1' : activeTurn;
    const defenderSide: 'P1' | 'P2' = attackerSide === 'P1' ? 'P2' : 'P1';
    if (activeTurn !== attackerSide) return;

    const attacker = attackerSide === 'P1' ? p1 : p2;
    const defender = defenderSide === 'P2' ? p2 : p1;
    const key = coordKey(r, c);

    // If targeting an enemy-side skill
    if (activeSkillId) {
      const def = SKILLS[activeSkillId];
      if (
        def.targetMode === 'ENEMY_3_CELLS' ||
        def.targetMode === 'ENEMY_2_CELLS'
      ) {
        const needed = def.targetMode === 'ENEMY_2_CELLS' ? 2 : 3;
        const existing = defender.receivedShots[key];
        if (existing && existing !== 'armor') return;
        const alreadyIdx = salvoQueuedCoords.findIndex(
          (pt) => pt.r === r && pt.c === c
        );
        if (alreadyIdx >= 0) {
          soundFX.playClick();
          setSalvoQueuedCoords((prev) => prev.filter((_, i) => i !== alreadyIdx));
          return;
        }
        const nextQueue = [...salvoQueuedCoords, { r, c }];
        if (nextQueue.length < needed) {
          soundFX.playClick();
          setSalvoQueuedCoords(nextQueue);
          return;
        }
        const res = executeSkill(attackerSide, activeSkillId, {
          extraCoords: nextQueue,
        });
        if (attackerSide === 'P1') {
          setP1(res.nextAttacker);
          setP2(res.nextDefender);
        } else {
          setP2(res.nextAttacker);
          setP1(res.nextDefender);
        }
        setSalvoQueuedCoords([]);
        setActiveSkillId(null);
        setUsedActiveSkillThisTurn(true);
        if (res.endedWinner) {
          setWinner(res.endedWinner);
          window.setTimeout(() => soundFX.playVictory(), 280);
        }
        return;
      }

      if (
        def.targetMode === 'ENEMY_CELL' ||
        def.targetMode === 'ENEMY_2X2' ||
        def.targetMode === 'ENEMY_CROSS' ||
        def.targetMode === 'ENEMY_X' ||
        def.targetMode === 'ENEMY_3X3' ||
        def.targetMode === 'ENEMY_CONE' ||
        def.targetMode === 'ENEMY_DIAG' ||
        def.targetMode === 'ENEMY_LINE' ||
        def.targetMode === 'ENEMY_LINE_4' ||
        def.targetMode === 'ENEMY_LINE_6' ||
        def.targetMode === 'ENEMY_FULL_LINE' ||
        def.targetMode === 'ENEMY_SHIP_DIR'
      ) {
        const res = executeSkill(attackerSide, activeSkillId, {
          targetCoord: { r, c },
          axis: skillAxis,
          direction: actionDirection,
        });
        if (attackerSide === 'P1') {
          setP1(res.nextAttacker);
          setP2(res.nextDefender);
        } else {
          setP2(res.nextAttacker);
          setP1(res.nextDefender);
        }
        setActiveSkillId(null);
        setSalvoQueuedCoords([]);
        setSwapFirstShipId(null);
        setUsedActiveSkillThisTurn(true);
        if (res.endedWinner) {
          setWinner(res.endedWinner);
          window.setTimeout(() => soundFX.playVictory(), 280);
        }
        return;
      }
    }

    // Standard shot (allows re-shooting cracked 'armor' cells on Flagship/Reinforced)
    const existingShot = defender.receivedShots[key];
    if (existingShot && existingShot !== 'armor') return;

    const shotDamage = attacker.improvedAmmoReady ? 2 : 1;
    const preAttacker = attacker.improvedAmmoReady
      ? { ...attacker, improvedAmmoReady: false }
      : attacker;

    soundFX.playFire();
    const outcome = resolveSingleImpact(preAttacker, defender, r, c, turnNumber, {
      isSingleTarget: true,
      damage: shotDamage,
    });

    let workingAttacker = outcome.nextAttacker;
    const workingDefender = outcome.nextDefender;

    window.setTimeout(() => {
      if (outcome.result === 'sunk') {
        soundFX.playSunk();
        triggerShake(defenderSide);
      } else if (outcome.result === 'hit' || outcome.result === 'armor') {
        soundFX.playHit();
        triggerShake(defenderSide);
      } else {
        soundFX.playSplash();
      }
    }, 80);

    const isRealHit =
      outcome.result === 'hit' ||
      outcome.result === 'armor' ||
      outcome.result === 'sunk';

    // 30. Bắn Bồi (followUpReady): bắn trúng phát thường -> thưởng +1 phát bắn
    let grantExtraShot = false;
    let bonusDetail = outcome.detail ?? '';
    if (workingAttacker.followUpReady) {
      workingAttacker = { ...workingAttacker, followUpReady: false };
      if (isRealHit) {
        grantExtraShot = true;
        bonusDetail = bonusDetail
          ? `${bonusDetail} · Bắn Bồi (+1 phát!)`
          : 'Bắn Bồi trúng đích (+1 phát!)';
      }
    }

    // 16. Hỏa Lực Sơ Cấp (Bị động): 20% xác suất +1 phát bắn khi phát thường trúng tàu (max 1/lượt)
    if (
      !grantExtraShot &&
      isRealHit &&
      !primaryFirepowerUsedThisTurn &&
      hasPassive(workingAttacker, 'primary_firepower') &&
      Math.random() < 0.2
    ) {
      setPrimaryFirepowerUsedThisTurn(true);
      grantExtraShot = true;
      bonusDetail = bonusDetail
        ? `${bonusDetail} · Hỏa Lực Sơ Cấp (+1 phát!)`
        : 'Hỏa Lực Sơ Cấp kích hoạt (+1 phát!)';
    }

    if (defenderSide === 'P2') {
      setP1(workingAttacker);
      setP2(workingDefender);
      setLastShotKeysP2([key]);
      if (outcome.mineCounterCoord) {
        setLastShotKeysP1([
          coordKey(outcome.mineCounterCoord.r, outcome.mineCounterCoord.c),
        ]);
      }
    } else {
      setP2(workingAttacker);
      setP1(workingDefender);
      setLastShotKeysP1([key]);
      if (outcome.mineCounterCoord) {
        setLastShotKeysP2([
          coordKey(outcome.mineCounterCoord.r, outcome.mineCounterCoord.c),
        ]);
      }
    }

    pushSideAwareLog(attackerSide, workingDefender, turnNumber, {
      attackerName: workingAttacker.setup.name,
      attackerNation: workingAttacker.setup.nationId,
      coordLabel: formatCoordLabel(r, c),
      result: outcome.result,
      sunkShipName: outcome.sunkShipName,
      detail:
        shotDamage > 1
          ? `[Đạn Cải Tiến ×2] ${bonusDetail}`.trim()
          : bonusDetail || undefined,
    });

    if (hasLostBattle(workingDefender, rules.battleGoal)) {
      setWinner(attackerSide);
      window.setTimeout(() => soundFX.playVictory(), 280);
      return;
    }
    if (hasLostBattle(workingAttacker, rules.battleGoal)) {
      setWinner(defenderSide);
      window.setTimeout(() => soundFX.playDefeat(), 280);
      return;
    }

    // Bonus shot via Bắn Bồi / Hỏa Lực Sơ Cấp / STREAK rule
    if (grantExtraShot) {
      return;
    }
    if (isRealHit && rules.firingRule === 'STREAK') {
      return;
    }

    if (shotsRemaining > 1) {
      setShotsRemaining((prev) => prev - 1);
      return;
    }

    // Kết thúc lượt & chuyển sang phe kế tiếp
    const trans = resolveTurnTransition(
      attackerSide,
      turnNumber,
      workingAttacker,
      workingDefender,
      pendingHeavyStrikes
    );

    if (attackerSide === 'P1') {
      setP1(trans.updatedEnding);
      setP2(trans.updatedNext);
      if (trans.newShotKeysOnEnding.length > 0) {
        setLastShotKeysP1(trans.newShotKeysOnEnding);
      }
    } else {
      setP2(trans.updatedEnding);
      setP1(trans.updatedNext);
      if (trans.newShotKeysOnEnding.length > 0) {
        setLastShotKeysP2(trans.newShotKeysOnEnding);
      }
    }
    setPendingHeavyStrikes(trans.updatedPending);
    setUsedActiveSkillThisTurn(false);
    setPrimaryFirepowerUsedThisTurn(false);
    setActiveSkillId(null);
    setSalvoQueuedCoords([]);
    setSwapFirstShipId(null);

    if (trans.endedWinner) {
      setWinner(trans.endedWinner);
      window.setTimeout(
        () =>
          trans.endedWinner === 'P1' || rules.mode === 'PASS_AND_PLAY'
            ? soundFX.playVictory()
            : soundFX.playDefeat(),
        280
      );
      return;
    }

    const nextShotsCount = getShotsPerTurn(
      rules.firingRule,
      trans.updatedNext.ships
    );
    if (trans.nextTurnSide === 'P1') {
      setTurnNumber(trans.nextTurnNo);
    }

    if (rules.mode === 'PASS_AND_PLAY') {
      setActiveTurn(trans.nextTurnSide);
      setShotsRemaining(nextShotsCount);
      setPrivacyShieldFor(trans.nextTurnSide);
    } else {
      setActiveTurn('P2');
      setShotsRemaining(nextShotsCount);
    }
  };

  /**
   * Người chơi bấm ô trên bàn cờ nhà (dùng cho Skill Màn khói, Thủy lôi, Tín hiệu giả, Khiên, Cơ động, Hoán đổi)
   */
  const handleOwnCellClick = (r: number, c: number) => {
    if (!activeSkillId || winner || isAIThinking || privacyShieldFor) return;
    const def = SKILLS[activeSkillId];
    const attackerSide = rules.mode === 'VS_AI' ? 'P1' : activeTurn;
    const own = attackerSide === 'P1' ? p1 : p2;

    if (def.targetMode === 'OWN_TWO_SHIPS') {
      const clickedShip = own.ships.find(
        (s) => !s.sunk && s.cells.some((sc) => sc.r === r && sc.c === c)
      );
      if (!clickedShip) return;
      if (!swapFirstShipId) {
        soundFX.playClick();
        setSwapFirstShipId(clickedShip.instanceId);
        return;
      }
      if (swapFirstShipId === clickedShip.instanceId) {
        soundFX.playClick();
        setSwapFirstShipId(null);
        return;
      }
      const res = executeSkill(attackerSide, activeSkillId, {
        shipId: swapFirstShipId,
        secondShipId: clickedShip.instanceId,
      });
      if (attackerSide === 'P1') {
        setP1(res.nextAttacker);
        setP2(res.nextDefender);
      } else {
        setP2(res.nextAttacker);
        setP1(res.nextDefender);
      }
      setSwapFirstShipId(null);
      setActiveSkillId(null);
      setUsedActiveSkillThisTurn(true);
      return;
    }

    if (
      def.targetMode === 'OWN_SHIP' ||
      def.targetMode === 'OWN_SEGMENT' ||
      def.targetMode === 'OWN_SHIP_DIR'
    ) {
      const clickedShip = own.ships.find(
        (s) => !s.sunk && s.cells.some((sc) => sc.r === r && sc.c === c)
      );
      if (!clickedShip) return;
      const res = executeSkill(attackerSide, activeSkillId, {
        shipId: clickedShip.instanceId,
        targetCoord: { r, c },
        direction: actionDirection,
      });
      if (attackerSide === 'P1') {
        setP1(res.nextAttacker);
        setP2(res.nextDefender);
      } else {
        setP2(res.nextAttacker);
        setP1(res.nextDefender);
      }
      setActiveSkillId(null);
      setUsedActiveSkillThisTurn(true);
      if (res.endedWinner) {
        setWinner(res.endedWinner);
        window.setTimeout(() => soundFX.playVictory(), 280);
      }
      return;
    }

    if (
      def.targetMode === 'OWN_2X2' ||
      def.targetMode === 'OWN_3X3' ||
      def.targetMode === 'OWN_CELL'
    ) {
      if (def.targetMode === 'OWN_CELL') {
        const k = coordKey(r, c);
        if (activeSkillId === 'rock_demolition') {
          if (!own.rocks.includes(k)) return;
        } else {
          const occupied = own.ships.some((s) =>
            s.cells.some((sc) => sc.r === r && sc.c === c)
          );
          if (occupied || own.rocks.includes(k) || own.receivedShots[k]) return;
        }
      }
      const res = executeSkill(attackerSide, activeSkillId, {
        targetCoord: { r, c },
        direction: actionDirection,
      });
      if (attackerSide === 'P1') {
        setP1(res.nextAttacker);
        setP2(res.nextDefender);
      } else {
        setP2(res.nextAttacker);
        setP1(res.nextDefender);
      }
      setActiveSkillId(null);
      setUsedActiveSkillThisTurn(true);
    }
  };

  const handleActivateSkillButton = (skillId: SkillId) => {
    if (winner || isAIThinking || privacyShieldFor) return;
    const attackerSide = rules.mode === 'VS_AI' ? 'P1' : activeTurn;
    if (activeTurn !== attackerSide) return;

    const def = SKILLS[skillId];
    const own = attackerSide === 'P1' ? p1 : p2;
    if (def.kind === 'PASSIVE') return;
    if (usedActiveSkillThisTurn) return;
    // 23. Khôi Phục Tần Số & 82. Thanh Tẩy EMP được phép dùng ngay cả khi đang bị EMP khóa
    if (
      own.empLockedTurns > 0 &&
      skillId !== 'frequency_restore' &&
      skillId !== 'emp_purge_aura'
    ) {
      return;
    }
    if ((own.skillCooldowns[skillId] ?? 0) > 0) return;

    if (activeSkillId === skillId) {
      setActiveSkillId(null);
      setSalvoQueuedCoords([]);
      setSwapFirstShipId(null);
      return;
    }

    if (def.targetMode === 'INSTANT') {
      const res = executeSkill(attackerSide, skillId, {});
      if (attackerSide === 'P1') {
        setP1(res.nextAttacker);
        setP2(res.nextDefender);
      } else {
        setP2(res.nextAttacker);
        setP1(res.nextDefender);
      }
      setActiveSkillId(null);
      setSalvoQueuedCoords([]);
      setSwapFirstShipId(null);
      setUsedActiveSkillThisTurn(true);
      if (res.bonusShots > 0) {
        setShotsRemaining((prev) => prev + res.bonusShots);
      }
      if (res.endedWinner) {
        setWinner(res.endedWinner);
        window.setTimeout(() => soundFX.playVictory(), 280);
      }
      return;
    }

    soundFX.playClick();
    setSalvoQueuedCoords([]);
    setSwapFirstShipId(null);
    setActiveSkillId(skillId);
  };

  // Automated AI Turn Loop (Uses tactical AI skills + smart shots + passives)
  useEffect(() => {
    if (rules.mode !== 'VS_AI' || activeTurn !== 'P2' || winner) return;

    setIsAIThinking(true);
    let cancelled = false;

    const runAITurn = (
      currentP1: PlayerBattleState,
      currentP2: PlayerBattleState,
      shotsLeft: number,
      currentTurnNo: number,
      usedSkillThisTurn: boolean,
      usedPrimaryPassThisTurn: boolean,
      currentPendingQueue: PendingHeavyStrike[]
    ) => {
      if (cancelled) return;
      aiTimerRef.current = window.setTimeout(() => {
        if (cancelled) return;

        let workingP1 = currentP1;
        let workingP2 = currentP2;
        let updatedShotsLeft = shotsLeft;
        let pendingQueue = currentPendingQueue;
        let skillJustUsed = usedSkillThisTurn;
        let primaryUsed = usedPrimaryPassThisTurn;

        // AI tries 1 tactical active skill per turn according to its difficulty brain
        if (!skillJustUsed) {
          const decision = chooseAISkillAction(
            rules.aiDifficulty,
            workingP2,
            workingP1,
            rules.noTouch,
            rules.battleGoal
          );
          if (decision) {
            skillJustUsed = true;
            // Keep pending strikes synced if AI casts heavy_artillery
            if (decision.skillId === 'heavy_artillery' && decision.targetCoord) {
              const box = clampBoxOrigin(
                decision.targetCoord.r,
                decision.targetCoord.c,
                2
              );
              pendingQueue = [
                ...pendingQueue,
                {
                  id: `heavy-ai-${Date.now()}`,
                  topR: box.topR,
                  leftC: box.leftC,
                  triggerTurn: currentTurnNo + 1,
                  targetBoard: 'P1',
                },
              ];
            }
            const skillRes = executeSkill('P2', decision.skillId, {
              targetCoord: decision.targetCoord,
              extraCoords: decision.extraCoords,
              axis: decision.axis,
              direction: decision.direction,
              shipId: decision.shipId,
              secondShipId: decision.secondShipId,
              attackerOverride: workingP2,
              defenderOverride: workingP1,
              turnOverride: currentTurnNo,
            });
            workingP2 = skillRes.nextAttacker;
            workingP1 = skillRes.nextDefender;
            setP1(workingP1);
            setP2(workingP2);
            updatedShotsLeft += skillRes.bonusShots;

            if (skillRes.endedWinner) {
              setIsAIThinking(false);
              setWinner(skillRes.endedWinner);
              window.setTimeout(
                () =>
                  skillRes.endedWinner === 'P2'
                    ? soundFX.playDefeat()
                    : soundFX.playVictory(),
                280
              );
              return;
            }
          }
        }

        const targetCoord = chooseAIShot(
          rules.aiDifficulty,
          workingP1.receivedShots,
          workingP1.ships,
          rules.noTouch,
          workingP1.decoys,
          rules.battleGoal
        );
        const key = coordKey(targetCoord.r, targetCoord.c);
        const aiDamage = workingP2.improvedAmmoReady ? 2 : 1;
        if (workingP2.improvedAmmoReady) {
          workingP2 = { ...workingP2, improvedAmmoReady: false };
        }

        soundFX.playFire();
        const outcome = resolveSingleImpact(
          workingP2,
          workingP1,
          targetCoord.r,
          targetCoord.c,
          currentTurnNo,
          { isSingleTarget: true, damage: aiDamage }
        );
        workingP2 = outcome.nextAttacker;
        workingP1 = outcome.nextDefender;

        const aiRealHit =
          outcome.result === 'hit' ||
          outcome.result === 'armor' ||
          outcome.result === 'sunk';

        let aiExtraShot = false;
        if (workingP2.followUpReady) {
          workingP2 = { ...workingP2, followUpReady: false };
          if (aiRealHit) aiExtraShot = true;
        }
        if (
          !aiExtraShot &&
          aiRealHit &&
          !primaryUsed &&
          hasPassive(workingP2, 'primary_firepower') &&
          Math.random() < 0.2
        ) {
          primaryUsed = true;
          aiExtraShot = true;
        }

        window.setTimeout(() => {
          if (outcome.result === 'sunk') {
            soundFX.playSunk();
            triggerShake('P1');
          } else if (outcome.result === 'hit' || outcome.result === 'armor') {
            soundFX.playHit();
            triggerShake('P1');
          } else {
            soundFX.playSplash();
          }
        }, 70);

        setP1(workingP1);
        setP2(workingP2);
        setLastShotKeysP1([key]);
        if (outcome.mineCounterCoord) {
          setLastShotKeysP2([
            coordKey(outcome.mineCounterCoord.r, outcome.mineCounterCoord.c),
          ]);
        }

        pushSideAwareLog('P2', workingP1, currentTurnNo, {
          attackerName: workingP2.setup.name,
          attackerNation: workingP2.setup.nationId,
          coordLabel: formatCoordLabel(targetCoord.r, targetCoord.c),
          result: outcome.result,
          sunkShipName: outcome.sunkShipName,
          detail: outcome.detail,
        });

        if (hasLostBattle(workingP1, rules.battleGoal)) {
          setIsAIThinking(false);
          setWinner('P2');
          window.setTimeout(() => soundFX.playDefeat(), 280);
          return;
        }
        if (hasLostBattle(workingP2, rules.battleGoal)) {
          setIsAIThinking(false);
          setWinner('P1');
          window.setTimeout(() => soundFX.playVictory(), 280);
          return;
        }

        if (aiExtraShot) {
          runAITurn(
            workingP1,
            workingP2,
            updatedShotsLeft,
            currentTurnNo,
            skillJustUsed,
            primaryUsed,
            pendingQueue
          );
          return;
        }

        if (aiRealHit && rules.firingRule === 'STREAK') {
          runAITurn(
            workingP1,
            workingP2,
            1,
            currentTurnNo,
            skillJustUsed,
            primaryUsed,
            pendingQueue
          );
          return;
        }

        const remainingCells =
          TOTAL_CELLS - Object.keys(workingP1.receivedShots).length;
        if (updatedShotsLeft > 1 && remainingCells > 0) {
          setShotsRemaining(updatedShotsLeft - 1);
          runAITurn(
            workingP1,
            workingP2,
            updatedShotsLeft - 1,
            currentTurnNo,
            skillJustUsed,
            primaryUsed,
            pendingQueue
          );
          return;
        }

        const trans = resolveTurnTransition(
          'P2',
          currentTurnNo,
          workingP2,
          workingP1,
          pendingQueue
        );
        setP2(trans.updatedEnding);
        setP1(trans.updatedNext);
        setPendingHeavyStrikes(trans.updatedPending);
        if (trans.newShotKeysOnEnding.length > 0) {
          setLastShotKeysP2(trans.newShotKeysOnEnding);
        }
        setUsedActiveSkillThisTurn(false);
        setPrimaryFirepowerUsedThisTurn(false);
        setIsAIThinking(false);

        if (trans.endedWinner) {
          setWinner(trans.endedWinner);
          window.setTimeout(
            () =>
              trans.endedWinner === 'P1'
                ? soundFX.playVictory()
                : soundFX.playDefeat(),
            280
          );
          return;
        }

        setActiveTurn('P1');
        setTurnNumber(trans.nextTurnNo);
        setShotsRemaining(
          getShotsPerTurn(rules.firingRule, trans.updatedNext.ships)
        );
      }, 480);
    };

    runAITurn(
      p1,
      p2,
      shotsRemaining,
      turnNumber,
      false,
      false,
      pendingHeavyStrikes
    );

    return () => {
      cancelled = true;
      if (aiTimerRef.current) {
        window.clearTimeout(aiTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTurn, rules.mode, winner]);

  // Kích hoạt các Sự Kiện Đại Dương ngẫu nhiên đúng lượt & rải trên 2 bàn
  useEffect(() => {
    if (!rules.randomEventsEnabled || winner) return;
    const dueEvents = scheduledEventsRef.current.filter(
      (ev) =>
        !ev.triggered &&
        ev.triggerTurn === turnNumber &&
        ev.triggerSide === activeTurn
    );
    if (dueEvents.length === 0) return;

    let nextP1 = p1;
    let nextP2 = p2;
    let p1Changed = false;
    let p2Changed = false;
    let newBanner: { title: string; detail: string; turn: number } | null = null;

    for (const ev of dueEvents) {
      ev.triggered = true;
      const meta = OCEAN_EVENTS[ev.id];
      const boardLabel = (side: 'P1' | 'P2') =>
        side === 'P1' ? nextP1.setup.name : nextP2.setup.name;

      if (ev.id === 'SATELLITE_UPLINK') {
        const box = randomCorner6x6();
        const zone: SatelliteRevealZone = {
          id: `sat-${turnNumber}-${Date.now()}`,
          topR: box.topR,
          leftC: box.leftC,
          expiresTurn: turnNumber,
        };
        const targetB =
          rules.mode === 'VS_AI'
            ? 'P2'
            : ev.triggerSide === 'P1'
              ? 'P2'
              : 'P1';
        if (targetB === 'P1') {
          setSatelliteBoardP1((prev) => [
            ...prev.filter((z) => z.expiresTurn >= turnNumber),
            zone,
          ]);
        } else {
          setSatelliteBoardP2((prev) => [
            ...prev.filter((z) => z.expiresTurn >= turnNumber),
            zone,
          ]);
        }
        const cStart = formatCoordLabel(box.topR, box.leftC);
        const cEnd = formatCoordLabel(
          Math.min(GRID_SIZE - 1, box.topR + 5),
          Math.min(GRID_SIZE - 1, box.leftC + 5)
        );
        const detail = `Vệ tinh mở khóa 6×6 (${cStart}–${cEnd}) trên vùng biển ${boardLabel(targetB)} trong lượt ${turnNumber}!`;
        newBanner = { title: meta.name, detail, turn: turnNumber };
        pushLog({
          turn: turnNumber,
          attackerName: 'Hệ Thống Vệ Tinh',
          attackerNation: ev.triggerSide === 'P1' ? p1.setup.nationId : p2.setup.nationId,
          coordLabel: `${cStart}–${cEnd}`,
          result: 'event',
          detail: `${meta.name}: ${detail}`,
        });
      } else if (ev.id === 'MAELSTROM_VORTEX') {
        const targetB: 'P1' | 'P2' =
          ev.targetBoard === 'BOTH' ? 'P1' : ev.targetBoard;
        const boardState = targetB === 'P1' ? nextP1 : nextP2;
        const cands: Coord[] = [];
        for (let rr = 2; rr < GRID_SIZE - 2; rr++) {
          for (let cc = 2; cc < GRID_SIZE - 2; cc++) {
            const k = coordKey(rr, cc);
            if (!boardState.rocks.includes(k)) cands.push({ r: rr, c: cc });
          }
        }
        const center =
          cands[Math.floor(Math.random() * cands.length)] ?? { r: 8, c: 8 };
        const cellObj: MaelstromCell = {
          r: center.r,
          c: center.c,
          expiresTurn: turnNumber + 1,
        };
        if (targetB === 'P1') {
          setMaelstromBoardP1((prev) => [
            ...prev.filter((m) => m.expiresTurn >= turnNumber),
            cellObj,
          ]);
        } else {
          setMaelstromBoardP2((prev) => [
            ...prev.filter((m) => m.expiresTurn >= turnNumber),
            cellObj,
          ]);
        }
        const impact = applyMaelstromOnBoard(boardState, [cellObj]);
        if (targetB === 'P1') {
          nextP1 = impact.nextState;
          p1Changed = true;
        } else {
          nextP2 = impact.nextState;
          p2Changed = true;
        }
        const vCoord = formatCoordLabel(center.r, center.c);
        const detail =
          impact.hitLogs.length > 0
            ? `${boardLabel(targetB)}: ${impact.hitLogs.join('; ')}`
            : `Hố Xoáy Tử Thần xuất hiện tại ${vCoord} (${boardLabel(targetB)}) · duy trì 2 lượt!`;
        newBanner = { title: meta.name, detail, turn: turnNumber };
        pushLog({
          turn: turnNumber,
          attackerName: 'Thiên Tai Đại Dương',
          attackerNation: boardState.setup.nationId,
          coordLabel: vCoord,
          result: 'event',
          detail: `${meta.name}: ${detail}`,
        });
      } else if (ev.id === 'FUEL_LEAK') {
        const targetB: 'P1' | 'P2' =
          ev.targetBoard === 'BOTH' ? 'P2' : ev.targetBoard;
        const boardState = targetB === 'P1' ? nextP1 : nextP2;
        const aliveShips = boardState.ships.filter((s) => !s.sunk);
        if (aliveShips.length > 0) {
          const ship =
            aliveShips[Math.floor(Math.random() * aliveShips.length)];
          const origin =
            ship.cells[Math.floor(Math.random() * ship.cells.length)];
          const adjOptions: Coord[] = [
            { r: origin.r, c: origin.c + 1 },
            { r: origin.r + 1, c: origin.c },
            { r: origin.r, c: origin.c - 1 },
            { r: origin.r - 1, c: origin.c },
          ].filter(
            (pt) =>
              pt.r >= 0 && pt.r < GRID_SIZE && pt.c >= 0 && pt.c < GRID_SIZE
          );
          const second = adjOptions[0] ?? origin;
          const leakCells =
            second.r === origin.r && second.c === origin.c
              ? [origin]
              : [origin, second];
          const leakZone: FuelLeakZone = {
            id: `leak-${turnNumber}-${Date.now()}`,
            cells: leakCells,
            expiresTurn: turnNumber,
          };
          if (targetB === 'P1') {
            setFuelLeakBoardP1((prev) => [
              ...prev.filter((z) => z.expiresTurn >= turnNumber),
              leakZone,
            ]);
          } else {
            setFuelLeakBoardP2((prev) => [
              ...prev.filter((z) => z.expiresTurn >= turnNumber),
              leakZone,
            ]);
          }
          const coordsStr = leakCells
            .map((pt) => formatCoordLabel(pt.r, pt.c))
            .join(', ');
          const detail = `Tàu bên ${boardLabel(targetB)} rò rỉ vệt dầu sáng tại ${coordsStr} trong lượt ${turnNumber}!`;
          newBanner = { title: meta.name, detail, turn: turnNumber };
          pushLog({
            turn: turnNumber,
            attackerName: 'Cảnh Báo Nhiên Liệu',
            attackerNation: boardState.setup.nationId,
            coordLabel: coordsStr,
            result: 'event',
            detail: `${meta.name}: ${detail}`,
          });
        }
      } else if (ev.id === 'DENSE_FOG') {
        setDenseFogUntilTurn(turnNumber + 1);
        const bumpCooldowns = (s: PlayerBattleState): PlayerBattleState => {
          const nextCd: Record<string, number> = {};
          for (const [k, v] of Object.entries(s.skillCooldowns)) {
            nextCd[k] = v > 0 ? v + 1 : 0;
          }
          return { ...s, skillCooldowns: nextCd };
        };
        nextP1 = bumpCooldowns(nextP1);
        nextP2 = bumpCooldowns(nextP2);
        p1Changed = true;
        p2Changed = true;
        const detail = `Sương Mù Dày Đặc phủ 2 lượt (${turnNumber}–${turnNumber + 1}): +1 CD kỹ năng hai bên & nhiễu trinh sát!`;
        newBanner = { title: meta.name, detail, turn: turnNumber };
        pushLog({
          turn: turnNumber,
          attackerName: 'Thời Tiết Đại Dương',
          attackerNation: p1.setup.nationId,
          coordLabel: 'Toàn chiến trường',
          result: 'event',
          detail: `${meta.name}: ${detail}`,
        });
      } else if (ev.id === 'SUDDEN_STORM') {
        const targetB: 'P1' | 'P2' =
          ev.targetBoard === 'BOTH' ? 'P2' : ev.targetBoard;
        const maxTop = Math.max(0, GRID_SIZE - 5);
        const topR = Math.floor(Math.random() * (maxTop + 1));
        const leftC = Math.floor(Math.random() * (maxTop + 1));
        const zone: StormZone = {
          id: `storm-${turnNumber}-${Date.now()}`,
          topR,
          leftC,
          expiresTurn: turnNumber + 1,
        };
        if (targetB === 'P1') {
          setStormBoardP1((prev) => [
            ...prev.filter((z) => z.expiresTurn >= turnNumber),
            zone,
          ]);
        } else {
          setStormBoardP2((prev) => [
            ...prev.filter((z) => z.expiresTurn >= turnNumber),
            zone,
          ]);
        }
        const sStart = formatCoordLabel(topR, leftC);
        const sEnd = formatCoordLabel(topR + 4, leftC + 4);
        const detail = `Vùng Bão 5×5 (${sStart}–${sEnd}) tại bàn ${boardLabel(targetB)} · Pháo kích, Không kích & Sonar vào vùng này bị trượt!`;
        newBanner = { title: meta.name, detail, turn: turnNumber };
        pushLog({
          turn: turnNumber,
          attackerName: 'Bão Tụ Đại Dương',
          attackerNation:
            targetB === 'P1' ? p1.setup.nationId : p2.setup.nationId,
          coordLabel: `${sStart}–${sEnd}`,
          result: 'event',
          detail: `${meta.name}: ${detail}`,
        });
      } else if (ev.id === 'SOLAR_FLARE_EMP') {
        nextP1 = { ...nextP1, empLockedTurns: Math.max(nextP1.empLockedTurns, 1) };
        nextP2 = { ...nextP2, empLockedTurns: Math.max(nextP2.empLockedTurns, 1) };
        p1Changed = true;
        p2Changed = true;
        setActiveSkillId(null);
        const detail =
          'Bão Điện Từ Mặt Trời khóa cứng kỹ năng chủ động của cả 2 phe trong lượt này!';
        newBanner = { title: meta.name, detail, turn: turnNumber };
        pushLog({
          turn: turnNumber,
          attackerName: 'Bão Điện Từ',
          attackerNation: p1.setup.nationId,
          coordLabel: 'EMP Toàn Cầu',
          result: 'event',
          detail: `${meta.name}: ${detail}`,
        });
      } else if (ev.id === 'CURRENT_DRIFT') {
        const targetB: 'P1' | 'P2' =
          ev.targetBoard === 'BOTH' ? 'P1' : ev.targetBoard;
        const dc = Math.random() < 0.5 ? 1 : -1;
        const dirName = dc > 0 ? 'Đông (+1 cột)' : 'Tây (-1 cột)';
        const shiftKeys = (keys: string[], rocksList: string[]) => {
          const rockSet = new Set(rocksList);
          const out = new Set<string>();
          for (const k of keys) {
            const [r, c] = k.split(',').map(Number);
            const nc = Math.max(0, Math.min(GRID_SIZE - 1, c + dc));
            const nk = coordKey(r, nc);
            out.add(rockSet.has(nk) ? k : nk);
          }
          return Array.from(out);
        };
        if (targetB === 'P1') {
          nextP1 = {
            ...nextP1,
            mines: shiftKeys(nextP1.mines, nextP1.rocks),
            hiddenMapMines: shiftKeys(nextP1.hiddenMapMines, nextP1.rocks),
            decoys: shiftKeys(nextP1.decoys, nextP1.rocks),
          };
          p1Changed = true;
        } else {
          nextP2 = {
            ...nextP2,
            mines: shiftKeys(nextP2.mines, nextP2.rocks),
            hiddenMapMines: shiftKeys(nextP2.hiddenMapMines, nextP2.rocks),
            decoys: shiftKeys(nextP2.decoys, nextP2.rocks),
          };
          p2Changed = true;
        }
        const detail = `Hải lưu cuốn toàn bộ Thủy lôi ngầm & Tín hiệu giả bên ${boardLabel(targetB)} sang hướng ${dirName}!`;
        newBanner = { title: meta.name, detail, turn: turnNumber };
        pushLog({
          turn: turnNumber,
          attackerName: 'Dòng Hải Lưu',
          attackerNation:
            targetB === 'P1' ? p1.setup.nationId : p2.setup.nationId,
          coordLabel: dirName,
          result: 'event',
          detail: `${meta.name}: ${detail}`,
        });
      }
    }

    if (p1Changed) setP1(nextP1);
    if (p2Changed) setP2(nextP2);
    if (newBanner) {
      soundFX.playClick();
      setActiveEventBanner(newBanner);
    }
    setTriggeredEventsCount(
      scheduledEventsRef.current.filter((e) => e.triggered).length
    );

    if (hasLostBattle(nextP2, rules.battleGoal)) {
      setWinner('P1');
      window.setTimeout(() => soundFX.playVictory(), 280);
    } else if (hasLostBattle(nextP1, rules.battleGoal)) {
      setWinner('P2');
      window.setTimeout(() => soundFX.playDefeat(), 280);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnNumber, activeTurn, winner, rules.randomEventsEnabled]);

  const p1Alive = p1.ships.filter((s) => !s.sunk).length;
  const p2Alive = p2.ships.filter((s) => !s.sunk).length;

  const p1Accuracy =
    p2.totalShotsReceived > 0
      ? Math.round((p2.totalHitsReceived / p2.totalShotsReceived) * 100)
      : 0;
  const p2Accuracy =
    p1.totalShotsReceived > 0
      ? Math.round((p1.totalHitsReceived / p1.totalShotsReceived) * 100)
      : 0;

  const viewingPlayer: 'P1' | 'P2' =
    rules.mode === 'VS_AI' ? 'P1' : activeTurn;

  const ownState = viewingPlayer === 'P1' ? p1 : p2;
  const enemyState = viewingPlayer === 'P1' ? p2 : p1;
  const activeSonarZones = viewingPlayer === 'P1' ? sonarZonesP1 : sonarZonesP2;
  const activeReconLines = viewingPlayer === 'P1' ? reconLinesP1 : reconLinesP2;
  const isDenseFogActive = turnNumber <= denseFogUntilTurn;

  const enemySatelliteZones = (
    viewingPlayer === 'P1' ? satelliteBoardP2 : satelliteBoardP1
  ).filter((z) => z.expiresTurn >= turnNumber);
  const enemyStormZones = (
    viewingPlayer === 'P1' ? stormBoardP2 : stormBoardP1
  ).filter((z) => z.expiresTurn >= turnNumber);
  const enemyFuelLeakZones = (
    viewingPlayer === 'P1' ? fuelLeakBoardP2 : fuelLeakBoardP1
  ).filter((z) => z.expiresTurn >= turnNumber);
  const enemyMaelstromCells = (
    viewingPlayer === 'P1' ? maelstromBoardP2 : maelstromBoardP1
  ).filter((m) => m.expiresTurn >= turnNumber);

  const ownSatelliteZones = (
    viewingPlayer === 'P1' ? satelliteBoardP1 : satelliteBoardP2
  ).filter((z) => z.expiresTurn >= turnNumber);
  const ownStormZones = (
    viewingPlayer === 'P1' ? stormBoardP1 : stormBoardP2
  ).filter((z) => z.expiresTurn >= turnNumber);
  const ownFuelLeakZones = (
    viewingPlayer === 'P1' ? fuelLeakBoardP1 : fuelLeakBoardP2
  ).filter((z) => z.expiresTurn >= turnNumber);
  const ownMaelstromCells = (
    viewingPlayer === 'P1' ? maelstromBoardP1 : maelstromBoardP2
  ).filter((m) => m.expiresTurn >= turnNumber);

  const aiLabel = useMemo(() => {
    const mode = AI_MODES.find((m) => m.level === rules.aiDifficulty);
    return mode ? `${mode.level}. ${mode.name}` : 'AI';
  }, [rules.aiDifficulty]);

  const ownAliveCount = ownState.ships.filter((s) => !s.sunk).length;
  const enemyAliveCount = enemyState.ships.filter((s) => !s.sunk).length;

  // Compute live hover skill preview cells + Bản Đồ Thủy Văn warning
  const { enemySkillPreview, ownSkillPreview, hydrographicWarning } = useMemo(() => {
    const enemyCells: Coord[] = [];
    const ownCells: Coord[] = [];
    let hydroWarning: string | null = null;
    if (!activeSkillId) {
      return {
        enemySkillPreview: enemyCells,
        ownSkillPreview: ownCells,
        hydrographicWarning: hydroWarning,
      };
    }
    const def = SKILLS[activeSkillId];

    if (hoverEnemyCell) {
      const p = hoverEnemyCell;
      if (def.targetMode === 'ENEMY_3X3') {
        enemyCells.push(...getAreaCells(p.r - 1, p.c - 1, 3));
      } else if (def.targetMode === 'ENEMY_2X2') {
        const box = clampBoxOrigin(p.r, p.c, 2);
        enemyCells.push(...getAreaCells(box.topR, box.leftC, 2));
      } else if (def.targetMode === 'ENEMY_CROSS') {
        enemyCells.push(...getCrossCells(p));
      } else if (def.targetMode === 'ENEMY_X') {
        enemyCells.push(...getXCells(p));
      } else if (def.targetMode === 'ENEMY_CONE') {
        enemyCells.push(...getDirectionalConeCells(p, actionDirection));
      } else if (def.targetMode === 'ENEMY_DIAG') {
        enemyCells.push(...getDiagonalLineCells(p, actionDirection, 5));
      } else if (def.targetMode === 'ENEMY_LINE') {
        enemyCells.push(...getLineCells(p, actionDirection, 5));
      } else if (def.targetMode === 'ENEMY_LINE_4') {
        enemyCells.push(...getLineCells(p, actionDirection, 4));
      } else if (def.targetMode === 'ENEMY_LINE_6') {
        enemyCells.push(...getLineCells(p, actionDirection, 6));
      } else if (def.targetMode === 'ENEMY_FULL_LINE') {
        const axisForLine =
          activeSkillId === 'tidal_shockwave'
            ? actionDirection === 'LEFT' || actionDirection === 'RIGHT'
              ? 'ROW'
              : 'COL'
            : skillAxis;
        for (let i = 0; i < GRID_SIZE; i++) {
          enemyCells.push(
            axisForLine === 'ROW' ? { r: p.r, c: i } : { r: i, c: p.c }
          );
        }
      } else if (
        def.targetMode === 'ENEMY_CELL' ||
        def.targetMode === 'ENEMY_2_CELLS' ||
        def.targetMode === 'ENEMY_3_CELLS' ||
        def.targetMode === 'ENEMY_SHIP_DIR'
      ) {
        enemyCells.push(p);
      }
    }

    if (hoverOwnCell) {
      const p = hoverOwnCell;
      if (def.targetMode === 'OWN_2X2') {
        const box = clampBoxOrigin(p.r, p.c, 2);
        ownCells.push(...getAreaCells(box.topR, box.leftC, 2));
      } else if (def.targetMode === 'OWN_3X3') {
        ownCells.push(...getAreaCells(p.r - 1, p.c - 1, 3));
      } else if (def.targetMode === 'OWN_CELL') {
        if (activeSkillId === 'fleet_smoke_wall') {
          ownCells.push(...getLineCells(p, actionDirection, 5));
        } else {
          ownCells.push(p);
        }
      } else if (
        def.targetMode === 'OWN_SHIP' ||
        def.targetMode === 'OWN_SEGMENT' ||
        def.targetMode === 'OWN_SHIP_DIR' ||
        def.targetMode === 'OWN_TWO_SHIPS'
      ) {
        const match = ownState.ships.find(
          (s) => !s.sunk && s.cells.some((sc) => sc.r === p.r && sc.c === p.c)
        );
        if (match) {
          ownCells.push(...match.cells);
          if (hasPassive(ownState, 'hydrographic_map')) {
            if (activeSkillId === 'strategic_relocation') {
              const dr =
                actionDirection === 'UP' ? -1 : actionDirection === 'DOWN' ? 1 : 0;
              const dc =
                actionDirection === 'LEFT'
                  ? -1
                  : actionDirection === 'RIGHT'
                    ? 1
                    : 0;
              const destCells = match.cells.map((sc) => ({
                r: sc.r + dr,
                c: sc.c + dc,
              }));
              const chk = canPlaceShip(
                match.offsets,
                match.anchor.r + dr,
                match.anchor.c + dc,
                ownState.ships,
                rules.noTouch,
                match.instanceId,
                ownState.rocks
              );
              const hazards = checkHydrographicHazards(ownState, destCells, false);
              if (!chk.valid) {
                hydroWarning = `Bản Đồ Thủy Văn: Không thể dời sang ${dirLabelVi(actionDirection)}${hazards.length > 0 ? ` (${hazards[0]})` : ' (vướng biên/đá/tàu)'}.`;
              } else if (hazards.length > 0) {
                hydroWarning = `Cảnh báo Thủy Văn: ${hazards.join(', ')}!`;
              }
            } else if (activeSkillId === 'rotate_ship') {
              const rotatedOffsets = match.offsets.map(
                ([dr, dc]) => [dc, -dr] as [number, number]
              );
              const chk = canPlaceShip(
                rotatedOffsets,
                match.anchor.r,
                match.anchor.c,
                ownState.ships,
                rules.noTouch,
                match.instanceId,
                ownState.rocks
              );
              if (!chk.valid) {
                const rotCells = rotatedOffsets.map(([dr, dc]) => ({
                  r: match.anchor.r + dr,
                  c: match.anchor.c + dc,
                }));
                const hazards = checkHydrographicHazards(ownState, rotCells, false);
                hydroWarning = `Bản Đồ Thủy Văn: Không thể xoay 90° (${hazards[0] ?? 'vướng biên/đá/tàu khác'}).`;
              }
            }
          }
        }
      }
    }

    return {
      enemySkillPreview: enemyCells,
      ownSkillPreview: ownCells,
      hydrographicWarning: hydroWarning,
    };
  }, [
    activeSkillId,
    hoverEnemyCell,
    hoverOwnCell,
    skillAxis,
    actionDirection,
    ownState,
    rules.noTouch,
  ]);

  const visibleBattleLog = useMemo(() => {
    if (winner) return battleLog;
    return battleLog.filter(
      (entry) =>
        !entry.hiddenFromSide ||
        entry.hiddenFromSide !== viewingPlayer ||
        turnNumber >= (entry.hiddenUntilTurn ?? 0)
    );
  }, [battleLog, viewingPlayer, turnNumber, winner]);

  const activeSkillDef = activeSkillId ? SKILLS[activeSkillId] : null;
  const targetIsOwnBoard = Boolean(
    activeSkillDef && activeSkillDef.targetMode.startsWith('OWN')
  );
  const needsDirectionControls = Boolean(
    activeSkillDef &&
      (activeSkillId === 'tidal_shockwave' ||
        activeSkillId === 'fleet_smoke_wall' ||
        activeSkillDef.targetMode === 'ENEMY_LINE' ||
        activeSkillDef.targetMode === 'ENEMY_LINE_4' ||
        activeSkillDef.targetMode === 'ENEMY_LINE_6' ||
        activeSkillDef.targetMode === 'ENEMY_DIAG' ||
        activeSkillDef.targetMode === 'ENEMY_CONE' ||
        activeSkillDef.targetMode === 'OWN_SHIP_DIR' ||
        activeSkillDef.targetMode === 'ENEMY_SHIP_DIR')
  );

  return (
    <div className="min-h-screen w-full flex flex-col px-3 py-3 sm:px-5 sm:py-4">
      <div className="max-w-[1540px] w-full mx-auto flex-1 flex flex-col">
        {/* Command HUD Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-sky-400/20">
          {/* Player 1 */}
          <div className="flex items-center gap-3">
            <NationFlag nationId={p1.setup.nationId} className="w-8 h-5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg sm:text-xl font-bold text-white">
                  {p1.setup.name}
                </span>
                {activeTurn === 'P1' && !winner && (
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    · Lượt bắn
                  </span>
                )}
              </div>
              <div className="text-xs font-mono-tabular text-sky-300">
                {NATIONS[p1.setup.nationId].name} · {p1Alive}/{p1.ships.length} tàu
              </div>
            </div>
          </div>

          {/* Center Turn & Firing Counter */}
          <div className="flex items-center gap-4 px-4 py-1.5 rounded-xl bg-[#0B2242]/95 border border-sky-400/30 shadow-md">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Lượt
              </div>
              <div className="font-mono-tabular text-lg font-bold text-white leading-none">
                {turnNumber}
              </div>
            </div>
            <div className="h-6 w-px bg-sky-400/25" />
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                {FIRING_RULES.find((f) => f.id === rules.firingRule)?.name}
              </div>
              <div className="font-mono-tabular text-xs font-bold text-amber-300">
                {isAIThinking
                  ? 'AI đang khóa mục tiêu...'
                  : `Còn ${shotsRemaining} phát bắn`}
              </div>
            </div>
          </div>

          {/* Opponent + Quick View Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-right">
              <div>
                <div className="flex items-center justify-end gap-2">
                  {activeTurn === 'P2' && !winner && (
                    <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">
                      Lượt bắn ·
                    </span>
                  )}
                  <span className="font-display text-lg sm:text-xl font-bold text-white">
                    {p2.setup.name}
                  </span>
                </div>
                <div className="text-xs font-mono-tabular text-orange-300">
                  {rules.mode === 'VS_AI'
                    ? aiLabel
                    : NATIONS[p2.setup.nationId].name}{' '}
                  · {p2Alive}/{p2.ships.length} tàu
                </div>
              </div>
              <NationFlag nationId={p2.setup.nationId} className="w-8 h-5" />
            </div>

            <div className="flex items-center gap-1.5">
              {rules.battleGoal === 'FLAGSHIP_HUNT' && (
                <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-amber-500/15 border border-amber-400/50 text-xs font-bold text-amber-300">
                  <Crown className="w-3.5 h-3.5" />
                  <span>Săn Soái Hạm</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setShowGuide(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[#0D2548] border border-amber-400/40 text-xs font-semibold text-amber-200 hover:bg-[#143566] cursor-pointer whitespace-nowrap shrink-0"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Hướng dẫn</span>
              </button>
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                className="w-9 h-9 rounded-lg bg-[#0D2548] border border-sky-400/25 flex items-center justify-center text-sky-200 hover:bg-[#143566] cursor-pointer"
              >
                {muted ? (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-sky-300" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  onExitToSetup();
                }}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[#0D2548] border border-rose-400/30 text-xs font-medium text-rose-200 hover:bg-rose-950/60 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Đổi trận</span>
              </button>
            </div>
          </div>
        </header>

        {/* 10-SKILL TACTICAL BAR */}
        <div className="mt-3 p-2.5 rounded-2xl bg-[#0D213B]/95 border border-sky-300/20 flex flex-col gap-2 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 px-1 text-xs font-bold text-amber-300 uppercase tracking-wider shrink-0">
              <Sparkles className="w-4 h-4" />
              <span>Kỹ năng ({ownState.setup.skillIds.length}):</span>
            </div>
            {usedActiveSkillThisTurn && !activeSkillDef && (
              <span className="text-[11px] font-mono-tabular text-slate-400 px-2">
                Đã dùng kỹ năng chủ động trong lượt này
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 w-full">
            {ownState.setup.skillIds.map((sid) => {
              const def = SKILLS[sid];
              if (!def) return null;
              const cd = ownState.skillCooldowns[sid] ?? 0;
              const isPassive = def.kind === 'PASSIVE';
              const isEmpBlocked =
                !isPassive &&
                ownState.empLockedTurns > 0 &&
                sid !== 'frequency_restore' &&
                sid !== 'emp_purge_aura';
              const isTurnLimitBlocked = !isPassive && usedActiveSkillThisTurn;
              const isReady =
                !isPassive &&
                !isEmpBlocked &&
                !isTurnLimitBlocked &&
                cd === 0 &&
                activeTurn === viewingPlayer &&
                !isAIThinking &&
                !winner;
              const selected = activeSkillId === sid;

              return (
                <button
                  key={sid}
                  type="button"
                  disabled={!isReady}
                  onClick={() => handleActivateSkillButton(sid)}
                  title={def.shortDesc}
                  className={`px-2.5 py-1.5 rounded-xl border text-left transition-all flex items-center gap-1.5 min-w-0 ${
                    selected
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md scale-[1.01]'
                      : isPassive
                        ? 'bg-[#07152B]/80 border-cyan-500/40 text-cyan-200 cursor-default'
                        : isReady
                          ? 'bg-[#0E2B54] hover:bg-[#17417D] border-sky-400/45 text-white cursor-pointer'
                          : 'bg-[#071326]/70 border-slate-700/60 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <div className="min-w-0 w-full">
                    <div className="text-xs font-bold leading-tight truncate">
                      <span className="font-mono-tabular opacity-70 mr-1">
                        #{String(def.code).padStart(2, '0')}
                      </span>
                      {def.name}
                    </div>
                    <div
                      className={`text-[10px] font-mono-tabular truncate ${
                        selected
                          ? 'text-slate-900'
                          : isPassive
                            ? 'text-cyan-400'
                            : isEmpBlocked
                              ? 'text-rose-400'
                              : isTurnLimitBlocked
                                ? 'text-slate-400'
                                : cd > 0
                                  ? 'text-amber-400'
                                  : 'text-emerald-300'
                      }`}
                    >
                      {isPassive
                        ? 'Bị động'
                        : isEmpBlocked
                          ? 'Bị EMP khóa'
                          : isTurnLimitBlocked
                            ? 'Đã dùng 1/lượt'
                            : cd > 0
                              ? `Hồi ${cd} lượt`
                              : `Sẵn sàng · CD ${def.cooldown}`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {activeSkillDef && (
            <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/60 text-xs text-amber-100 shrink-0">
              <span>
                <strong>{activeSkillDef.name}:</strong>{' '}
                {activeSkillDef.targetMode === 'ENEMY_3_CELLS'
                  ? `Chọn 3 ô trên lưới ĐỊCH (${salvoQueuedCoords.length}/3)`
                  : activeSkillDef.targetMode === 'ENEMY_2_CELLS'
                    ? `Chọn 2 ô trên lưới ĐỊCH (${salvoQueuedCoords.length}/2)`
                    : activeSkillDef.id === 'formation_swap'
                      ? swapFirstShipId
                        ? 'Chọn tàu NHÀ thứ 2 để hoán đổi'
                        : 'Chọn tàu NHÀ thứ 1 (chưa chìm)'
                      : targetIsOwnBoard
                        ? activeSkillId === 'rock_demolition'
                          ? 'Bấm vào Đá ngầm trên bàn cờ NHÀ (bên phải)'
                          : 'Bấm lên bàn cờ NHÀ (bên phải)'
                        : 'Bấm lên bàn cờ ĐỊCH (bên trái)'}
              </span>
              {activeSkillId === 'recon_plane' && (
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playRotate();
                    setSkillAxis((a) => (a === 'ROW' ? 'COL' : 'ROW'));
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-sky-500/25 border border-sky-400/50 text-sky-200 font-bold cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>{skillAxis === 'ROW' ? 'Ngang' : 'Dọc'} (R)</span>
                </button>
              )}
              {needsDirectionControls && (
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playRotate();
                    setActionDirection((prev) => {
                      const idx = DIR_CYCLE.indexOf(prev);
                      return DIR_CYCLE[(idx + 1) % DIR_CYCLE.length];
                    });
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-sky-500/25 border border-sky-400/50 text-sky-200 font-bold cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Hướng: {dirLabelVi(actionDirection)} (R)</span>
                </button>
              )}
              {hydrographicWarning && (
                <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-400/60 text-rose-200 font-semibold">
                  {hydrographicWarning}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveSkillId(null);
                  setSalvoQueuedCoords([]);
                  setSwapFirstShipId(null);
                }}
                className="p-1 rounded hover:bg-white/10 text-amber-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* RANDOM OCEAN EVENT BANNER & ACTIVE INDICATORS */}
        {rules.randomEventsEnabled && (
          <div className="mt-2.5 px-3.5 py-2 rounded-xl bg-[#102642]/90 border border-indigo-300/25 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded bg-indigo-500/25 border border-indigo-300/40 font-mono-tabular font-bold text-indigo-200 shrink-0">
                Sự Kiện Đại Dương ({triggeredEventsCount}/{ALL_OCEAN_EVENT_IDS.length})
              </span>
              {activeEventBanner ? (
                <span className="text-slate-100 truncate">
                  <strong className="text-amber-300">
                    L{activeEventBanner.turn} · {activeEventBanner.title}:
                  </strong>{' '}
                  {activeEventBanner.detail}
                </span>
              ) : (
                <span className="text-slate-300">
                  Xuất hiện cả {ALL_OCEAN_EVENT_IDS.length} sự kiện ngẫu nhiên · Bắt đầu lượt 10–20 · Cách nhau 8–15 lượt trên 2 bàn.
                </span>
              )}
            </div>
            {isDenseFogActive && (
              <span className="px-2 py-0.5 rounded bg-slate-600/40 border border-slate-300/35 text-slate-100 font-semibold shrink-0">
                Sương mù dày (+1 CD · Nhiễu trinh sát)
              </span>
            )}
          </div>
        )}

        {/* 3-COLUMN ARENA: Enemy Board | Center Combat Log & Flagship Intel | Own Board */}
        <div className="py-3.5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_315px_minmax(0,1fr)] gap-4 items-start">
          {/* LEFT: Primary Attack Board */}
          <section className="flex flex-col items-center">
            <div className="w-full max-w-[585px]">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-300">
                  <Crosshair className="w-4 h-4" />
                  <span>Tấn công: {enemyState.setup.name}</span>
                </div>
                <span className="text-xs font-mono-tabular text-slate-300">
                  Chính xác: {viewingPlayer === 'P1' ? p1Accuracy : p2Accuracy}%
                </span>
              </div>

              <div
                className={`rounded-2xl transition-all ${
                  activeTurn === viewingPlayer && !isAIThinking && !winner
                    ? 'ring-2 ring-amber-400/70 shadow-[0_0_24px_rgba(251,191,36,0.18)]'
                    : ''
                }`}
              >
                <TacticalGrid
                  nationId={enemyState.setup.nationId}
                  ships={enemyState.ships}
                  shots={enemyState.receivedShots}
                  rocks={winner ? enemyState.rocks : []}
                  showAllShips={Boolean(winner)}
                  interactive={
                    activeTurn === viewingPlayer &&
                    !isAIThinking &&
                    !winner &&
                    !privacyShieldFor &&
                    !targetIsOwnBoard
                  }
                  lastShotKeys={
                    viewingPlayer === 'P1' ? lastShotKeysP2 : lastShotKeysP1
                  }
                  shaking={
                    shakeBoard === (viewingPlayer === 'P1' ? 'P2' : 'P1')
                  }
                  revealedShipIds={enemyState.revealedShipIds}
                  revealedCells={winner ? [] : enemyState.revealedCells}
                  revealedMineCells={winner ? [] : enemyState.revealedMineCells}
                  hiddenHitMarks={winner ? {} : enemyState.hiddenHitMarks}
                  queuedCells={
                    activeSkillDef &&
                    (activeSkillDef.targetMode === 'ENEMY_3_CELLS' ||
                      activeSkillDef.targetMode === 'ENEMY_2_CELLS')
                      ? salvoQueuedCoords
                      : []
                  }
                  infoFogActive={!winner && enemyState.infoFogTurns > 0}
                  jammedTiles={enemyState.jammedTiles}
                  pendingHeavyZones={pendingHeavyStrikes.filter(
                    (p) =>
                      p.targetBoard === (viewingPlayer === 'P1' ? 'P2' : 'P1')
                  )}
                  shieldedShipIds={
                    winner ? enemyState.shieldedShipIds : []
                  }
                  domeShieldCells={winner ? enemyState.domeShieldCells : {}}
                  sonarZones={activeSonarZones.filter(
                    (z) => z.expiresTurn >= turnNumber
                  )}
                  reconLines={activeReconLines.filter(
                    (l) => l.expiresTurn >= turnNumber
                  )}
                  satelliteZones={enemySatelliteZones}
                  stormZones={enemyStormZones}
                  fuelLeakZones={enemyFuelLeakZones}
                  maelstromCells={enemyMaelstromCells}
                  denseFogActive={isDenseFogActive}
                  skillPreviewCells={enemySkillPreview}
                  onCellClick={handleEnemyCellClick}
                  onCellHover={(r, c) => setHoverEnemyCell({ r, c })}
                  onGridLeave={() => setHoverEnemyCell(null)}
                  onContextRotate={() => {
                    if (activeSkillId === 'recon_plane') {
                      setSkillAxis((a) => (a === 'ROW' ? 'COL' : 'ROW'));
                    } else if (needsDirectionControls) {
                      setActionDirection((prev) => {
                        const idx = DIR_CYCLE.indexOf(prev);
                        return DIR_CYCLE[(idx + 1) % DIR_CYCLE.length];
                      });
                    }
                  }}
                  label={`Mục tiêu · Còn ${enemyAliveCount}/${enemyState.ships.length} tàu`}
                />
              </div>
            </div>
          </section>

          {/* CENTER: Flagship Status (when Flagship Hunt) + Combat Log with Coordinates */}
          <aside className="w-full flex flex-col gap-3.5 xl:sticky xl:top-3">
            {rules.battleGoal === 'FLAGSHIP_HUNT' && (
              <div className="p-3.5 rounded-2xl bg-[#0D213B]/95 border border-amber-400/40 shadow-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-amber-400/20 pb-2">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <h2 className="font-display text-lg font-bold text-amber-300 tracking-wide uppercase">
                      Săn Soái Hạm
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono-tabular text-amber-200/80">
                    Hạ là thắng ngay
                  </span>
                </div>

                {(() => {
                  const enemyFlagship = enemyState.ships.find((s) => s.isFlagship);
                  const ownFlagship = ownState.ships.find((s) => s.isFlagship);
                  return (
                    <div className="space-y-2 text-xs">
                      {enemyFlagship && (
                        <div className="p-2.5 rounded-xl bg-[#06142A] border border-orange-400/35">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-orange-300 truncate">
                              Địch: {enemyFlagship.name}
                            </span>
                            <span className="font-mono-tabular text-[11px] font-bold text-amber-300 shrink-0">
                              {enemyFlagship.sunk
                                ? 'ĐÃ CHÌM'
                                : `Giáp ${enemyFlagship.armorRemaining ?? 0}/${enemyFlagship.armorMax ?? 3}`}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                            Kích thước: {enemyFlagship.cells.length} ô · Thân còn{' '}
                            {enemyFlagship.cells.length - enemyFlagship.hits.length}/
                            {enemyFlagship.cells.length}
                          </div>
                        </div>
                      )}
                      {ownFlagship && (
                        <div className="p-2.5 rounded-xl bg-[#06142A] border border-sky-400/35">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sky-300 truncate">
                              Nhà: {ownFlagship.name}
                            </span>
                            <span className="font-mono-tabular text-[11px] font-bold text-amber-300 shrink-0">
                              {ownFlagship.sunk
                                ? 'ĐÃ CHÌM'
                                : `Giáp ${ownFlagship.armorRemaining ?? 0}/${ownFlagship.armorMax ?? 3}`}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                            Kích thước: {ownFlagship.cells.length} ô · Thân còn{' '}
                            {ownFlagship.cells.length - ownFlagship.hits.length}/
                            {ownFlagship.cells.length}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Center Combat Log (Always shows exact coordinates) */}
            <div className="p-3.5 rounded-2xl bg-[#0D213B]/95 border border-sky-300/25 shadow-xl flex flex-col">
              <div className="flex items-center justify-between border-b border-sky-400/15 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-sky-400" />
                  <h2 className="font-display text-lg font-bold text-white tracking-wide uppercase">
                    Diễn Biến &amp; Tọa Độ
                  </h2>
                </div>
                <span className="text-[11px] font-mono-tabular text-slate-400">
                  {visibleBattleLog.length} mục
                </span>
              </div>

              {visibleBattleLog.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  Chọn tọa độ trên bàn cờ trái để khai hỏa.
                </p>
              ) : (
                <div
                  className={`space-y-1.5 overflow-y-auto pr-1 ${
                    rules.battleGoal === 'FLAGSHIP_HUNT'
                      ? 'max-h-[300px]'
                      : 'max-h-[440px]'
                  }`}
                >
                  {visibleBattleLog.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-2 rounded-lg text-[11px] border ${
                        entry.result === 'sunk'
                          ? 'bg-red-950/40 border-red-500/40'
                          : entry.result === 'armor'
                            ? 'bg-amber-950/40 border-amber-400/50'
                            : entry.result === 'hit'
                              ? 'bg-amber-950/30 border-amber-400/35'
                              : entry.result === 'rock'
                                ? 'bg-stone-900/65 border-stone-500/45'
                                : entry.result === 'skill'
                                  ? 'bg-cyan-950/35 border-cyan-400/35'
                                  : entry.result === 'event'
                                    ? 'bg-indigo-950/45 border-indigo-400/45'
                                    : 'bg-[#0B1B30]/85 border-slate-700/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono-tabular text-slate-400 shrink-0">
                            L{entry.turn}
                          </span>
                          <NationFlag
                            nationId={entry.attackerNation}
                            className="w-3.5 h-2.5"
                          />
                          <span className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-sky-400/30 font-mono-tabular font-bold text-amber-300 shrink-0">
                            {entry.coordLabel}
                          </span>
                        </div>
                        <span
                          className={`font-semibold truncate text-right ${
                            entry.result === 'sunk'
                              ? 'text-red-400'
                              : entry.result === 'armor'
                                ? 'text-amber-300'
                                : entry.result === 'hit'
                                  ? 'text-orange-300'
                                  : entry.result === 'rock'
                                    ? 'text-stone-300'
                                    : entry.result === 'skill'
                                      ? 'text-cyan-300'
                                      : entry.result === 'event'
                                        ? 'text-indigo-300'
                                        : 'text-sky-300/75'
                          }`}
                        >
                          {entry.result === 'sunk'
                            ? `Chìm ${entry.sunkShipName ?? 'tàu'}!`
                            : entry.result === 'armor'
                              ? 'Giáp dày!'
                              : entry.result === 'hit'
                                ? 'TRÚNG'
                                : entry.result === 'rock'
                                  ? 'Đá ngầm!'
                                  : entry.result === 'skill'
                                    ? 'Kỹ năng'
                                    : entry.result === 'event'
                                      ? 'Sự kiện'
                                      : 'Trượt'}
                        </span>
                      </div>
                      {entry.detail && (
                        <div className="text-[10px] text-slate-200 mt-0.5 truncate">
                          {entry.detail}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* RIGHT: Secondary Defense Board (Own Fleet) */}
          <section className="flex flex-col items-center">
            <div className="w-full max-w-[585px]">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-sky-300">
                  <Shield className="w-4 h-4" />
                  <span>Phòng thủ: {ownState.setup.name}</span>
                </div>
                <span className="text-xs font-mono-tabular text-slate-300">
                  Còn {ownAliveCount}/{ownState.ships.length} tàu
                </span>
              </div>

              <div
                className={`rounded-2xl transition-all ${
                  targetIsOwnBoard
                    ? 'ring-2 ring-cyan-400/80 shadow-[0_0_24px_rgba(34,211,238,0.2)]'
                    : ''
                }`}
              >
                <TacticalGrid
                  nationId={ownState.setup.nationId}
                  ships={ownState.ships}
                  shots={ownState.receivedShots}
                  rocks={ownState.rocks}
                  showAllShips={true}
                  interactive={targetIsOwnBoard}
                  lastShotKeys={
                    viewingPlayer === 'P1' ? lastShotKeysP1 : lastShotKeysP2
                  }
                  shaking={shakeBoard === viewingPlayer}
                  shieldedShipIds={ownState.shieldedShipIds}
                  reflectiveShieldShipIds={ownState.reflectiveShieldShipIds}
                  evasionProtectedShipIds={ownState.evasionProtectedShipIds}
                  smokeCells={ownState.smokeCells}
                  domeShieldCells={ownState.domeShieldCells}
                  airstrikeJamZones={ownState.airstrikeJamZones.filter(
                    (z) => z.expiresTurn >= turnNumber
                  )}
                  empGrids={ownState.empGrids}
                  burningCells={ownState.burningCells}
                  jammedTiles={ownState.jammedTiles}
                  pendingHeavyZones={
                    hasPassive(ownState, 'early_warning') || winner
                      ? pendingHeavyStrikes.filter(
                          (z) => z.targetBoard === viewingPlayer
                        )
                      : []
                  }
                  mines={ownState.mines}
                  decoys={ownState.decoys}
                  satelliteZones={ownSatelliteZones}
                  stormZones={ownStormZones}
                  fuelLeakZones={ownFuelLeakZones}
                  maelstromCells={ownMaelstromCells}
                  denseFogActive={isDenseFogActive}
                  skillPreviewCells={ownSkillPreview}
                  onCellClick={targetIsOwnBoard ? handleOwnCellClick : undefined}
                  onCellHover={(r, c) => setHoverOwnCell({ r, c })}
                  onGridLeave={() => setHoverOwnCell(null)}
                  onContextRotate={() => {
                    if (needsDirectionControls) {
                      setActionDirection((prev) => {
                        const idx = DIR_CYCLE.indexOf(prev);
                        return DIR_CYCLE[(idx + 1) % DIR_CYCLE.length];
                      });
                    }
                  }}
                  label={`Hạm đội nhà · ${NATIONS[ownState.setup.nationId].name}`}
                />
              </div>
            </div>
          </section>
        </div>

        {/* BELOW BOTH BOARDS: Remaining Ships Panel (Số Tàu Còn Lại) */}
        <section className="pb-4">
          <div className="p-4 rounded-2xl bg-[#0D213B]/95 border border-sky-300/25 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-400/15 pb-2.5">
              <div className="flex items-center gap-2">
                <Anchor className="w-4 h-4 text-amber-400" />
                <h2 className="font-display text-xl font-bold text-white tracking-wide uppercase">
                  Bảng Số Tàu Còn Lại (2 Hạm Đội)
                </h2>
              </div>
              <div className="text-xs font-mono-tabular text-sky-300">
                {rules.battleGoal === 'FLAGSHIP_HUNT'
                  ? 'Chế độ Săn Soái Hạm · Đánh chìm tàu có vương miện là thắng'
                  : `Địch còn ${enemyAliveCount}/${enemyState.ships.length} · Nhà còn ${ownAliveCount}/${ownState.ships.length}`}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Bottom: Enemy Fleet Ships */}
              <div className="p-3 rounded-xl bg-[#06142A]/90 border border-orange-400/25 space-y-2">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <NationFlag
                      nationId={enemyState.setup.nationId}
                      className="w-5 h-3.5"
                    />
                    <span className="font-bold text-orange-300 truncate">
                      {enemyState.setup.name} (Địch)
                    </span>
                  </div>
                  <span className="font-mono-tabular font-bold text-white shrink-0">
                    Còn {enemyAliveCount}/{enemyState.ships.length} tàu
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {enemyState.ships.map((ship) => (
                    <div
                      key={ship.instanceId}
                      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] transition-opacity ${
                        ship.sunk
                          ? 'bg-red-950/35 border-red-500/30 text-slate-500 line-through opacity-60'
                          : ship.isFlagship
                            ? 'bg-amber-950/35 border-amber-400/55 text-amber-100'
                            : 'bg-[#081934]/90 border-slate-700/60 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ShipMiniPreview
                          offsets={ship.offsets}
                          nationId={enemyState.setup.nationId}
                          isFlagship={Boolean(ship.isFlagship)}
                          size={6}
                        />
                        {ship.isFlagship && (
                          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                        <span className="truncate">{ship.name}</span>
                      </div>
                      <span
                        className={`font-mono-tabular text-[10px] font-bold shrink-0 ${
                          ship.sunk
                            ? 'text-red-400'
                            : ship.isFlagship
                              ? 'text-amber-300'
                              : 'text-emerald-400'
                        }`}
                      >
                        {ship.sunk
                          ? 'CHÌM'
                          : ship.isFlagship
                            ? `Giáp ${ship.armorRemaining ?? 0}/${ship.armorMax ?? 3}`
                            : `${ship.cells.length}ô`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Bottom: Own Fleet Ships */}
              <div className="p-3 rounded-xl bg-[#06142A]/90 border border-sky-400/25 space-y-2">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <NationFlag
                      nationId={ownState.setup.nationId}
                      className="w-5 h-3.5"
                    />
                    <span className="font-bold text-sky-300 truncate">
                      {ownState.setup.name} (Nhà)
                    </span>
                  </div>
                  <span className="font-mono-tabular font-bold text-white shrink-0">
                    Còn {ownAliveCount}/{ownState.ships.length} tàu
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {ownState.ships.map((ship) => {
                    const hpLeft = ship.cells.length - ship.hits.length;
                    const damaged = !ship.sunk && ship.hits.length > 0;
                    const shielded = ownState.shieldedShipIds.includes(
                      ship.instanceId
                    );
                    return (
                      <div
                        key={ship.instanceId}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] ${
                          ship.sunk
                            ? 'bg-red-950/35 border-red-500/30 text-slate-500 line-through opacity-60'
                            : shielded
                              ? 'bg-cyan-950/35 border-cyan-400/50 text-cyan-100'
                              : ship.isFlagship
                                ? 'bg-amber-950/35 border-amber-400/55 text-amber-100'
                                : damaged
                                  ? 'bg-amber-950/30 border-amber-500/45 text-amber-100'
                                  : 'bg-[#081934]/90 border-slate-700/60 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ShipMiniPreview
                            offsets={ship.offsets}
                            nationId={ownState.setup.nationId}
                            isFlagship={Boolean(ship.isFlagship)}
                            size={6}
                          />
                          {ship.isFlagship && (
                            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          <span className="truncate">{ship.name}</span>
                        </div>
                        <span
                          className={`font-mono-tabular text-[10px] font-bold shrink-0 ${
                            ship.sunk
                              ? 'text-red-400'
                              : shielded
                                ? 'text-cyan-300'
                                : ship.isFlagship
                                  ? 'text-amber-300'
                                  : damaged
                                    ? 'text-orange-300'
                                    : 'text-sky-300'
                          }`}
                        >
                          {ship.sunk
                            ? 'CHÌM'
                            : shielded
                              ? 'Khiên'
                              : ship.isFlagship
                                ? `G${ship.armorRemaining ?? 0}·${hpLeft}/${ship.cells.length}`
                                : `${hpLeft}/${ship.cells.length}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 2-Player Pass & Play Privacy Handoff Curtain */}
      {privacyShieldFor && !winner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#040E1E]/95 p-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-md w-full p-7 rounded-2xl bg-[#0B2040] border border-sky-400/35 text-center space-y-5 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-sky-400">
              <Eye className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-mono-tabular uppercase tracking-wider text-sky-300">
                Đổi lượt chỉ huy
              </div>
              <h2 className="font-display text-3xl font-bold text-white">
                Đến lượt{' '}
                {privacyShieldFor === 'P1' ? p1.setup.name : p2.setup.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                setPrivacyShieldFor(null);
              }}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display text-xl font-bold tracking-wide cursor-pointer"
            >
              Mở bản đồ
            </button>
          </div>
        </div>
      )}

      {/* Victory / Defeat Modal */}
      {winner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-lg w-full p-7 rounded-2xl bg-[#0B2040] border border-amber-400/45 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-400/45 flex items-center justify-center text-amber-400">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-mono-tabular uppercase tracking-wider text-amber-300">
                Tổng kết · {turnNumber} lượt
              </div>
              <h2 className="font-display text-4xl font-extrabold text-white tracking-wide">
                {winner === 'P1'
                  ? `${p1.setup.name} Thắng!`
                  : `${p2.setup.name} Thắng!`}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3.5 rounded-xl bg-[#07162E] border border-sky-400/20">
                <div className="flex items-center gap-2 mb-1">
                  <NationFlag
                    nationId={p1.setup.nationId}
                    className="w-5 h-3.5"
                  />
                  <span className="text-sm font-semibold text-white truncate">
                    {p1.setup.name}
                  </span>
                </div>
                <div className="text-xs font-mono-tabular text-sky-300">
                  Còn: {p1Alive}/{p1.ships.length} · {p1Accuracy}%
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#07162E] border border-orange-400/20">
                <div className="flex items-center gap-2 mb-1">
                  <NationFlag
                    nationId={p2.setup.nationId}
                    className="w-5 h-3.5"
                  />
                  <span className="text-sm font-semibold text-white truncate">
                    {p2.setup.name}
                  </span>
                </div>
                <div className="text-xs font-mono-tabular text-orange-300">
                  Còn: {p2Alive}/{p2.ships.length} · {p2Accuracy}%
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  onRematch();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display text-lg font-bold tracking-wide cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Chơi lại</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  onExitToSetup();
                }}
                className="flex-1 py-3 px-5 rounded-xl bg-[#0D2850] border border-sky-400/30 hover:bg-[#14376B] text-white font-semibold text-sm cursor-pointer whitespace-nowrap"
              >
                Đổi đội hình
              </button>
            </div>
          </div>
        </div>
      )}
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
};
