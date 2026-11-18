import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  Crown,
  Dices,
  Hand,
  Lock,
  Map as MapIcon,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Shuffle,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import {
  AI_MODES,
  ALL_SHIP_TEMPLATES,
  BATTLE_GOALS,
  FIRING_RULES,
  GRID_SIZE,
  MAP_MODES,
  MAX_CUSTOM_CELLS,
  NATION_LIST,
  NATIONS,
  getDefaultFlagshipIndex,
  getDefaultPlayerName,
  getFormationShips,
  isDefaultPlayerName,
} from '../data/nationsAndFleets';
import {
  ALL_SKILLS,
  SKILL_CATEGORY_LABELS,
  SKILLS,
  getAISkillsForDifficulty,
  getRandomSkills,
} from '../data/skills';
import {
  AIDifficulty,
  AIPlacementMode,
  BattleGoal,
  FiringRule,
  FleetFormationId,
  GameRules,
  MapMode,
  NationId,
  PlayerSetup,
  SkillCategory,
  SkillId,
} from '../types/game';
import { NationFlag } from './NationFlag';
import { ShipMiniPreview } from './ShipGraphic';
import { soundFX } from '../utils/sound';

interface SetupScreenProps {
  rules: GameRules;
  player1: PlayerSetup;
  player2: PlayerSetup;
  onUpdateRules: (next: GameRules) => void;
  onUpdatePlayer: (which: 'P1' | 'P2', next: PlayerSetup) => void;
  onBack: () => void;
  onContinue: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({
  rules,
  player1,
  player2,
  onUpdateRules,
  onUpdatePlayer,
  onBack,
  onContinue,
}) => {
  const [activeTab, setActiveTab] = useState<'RULES' | 'P1' | 'P2'>('RULES');
  const [shipFilter, setShipFilter] = useState<
    'ALL' | 'LINEAR' | 'EXOTIC_SMALL' | 'EXOTIC_MEGA'
  >('ALL');
  const [skillFilter, setSkillFilter] = useState<SkillCategory | 'ALL'>('ALL');
  const [subPanel, setSubPanel] = useState<'FLEET' | 'SKILLS'>('FLEET');

  const activePlayer = activeTab === 'P2' ? player2 : player1;
  const activePlayerKey: 'P1' | 'P2' = activeTab === 'P2' ? 'P2' : 'P1';
  const isActiveAI = rules.mode === 'VS_AI' && activePlayerKey === 'P2';

  const handleSetNation = (nationId: NationId) => {
    soundFX.playClick();
    const shouldAutoRename = isDefaultPlayerName(activePlayer.name);
    onUpdatePlayer(activePlayerKey, {
      ...activePlayer,
      nationId,
      formationId: 'NATIONAL',
      bonusShipIds: [],
      flagshipIndex: undefined,
      name: shouldAutoRename
        ? getDefaultPlayerName(nationId, isActiveAI)
        : activePlayer.name,
    });
  };

  const handleSetFormation = (formationId: FleetFormationId) => {
    soundFX.playClick();
    onUpdatePlayer(activePlayerKey, {
      ...activePlayer,
      formationId,
      bonusShipIds:
        formationId === 'NATIONAL' ? (activePlayer.bonusShipIds ?? []) : [],
      customShipIds:
        formationId === 'CUSTOM' && activePlayer.customShipIds.length === 0
          ? [
              ...NATIONS[activePlayer.nationId].signatureShipIds,
              ...(activePlayer.bonusShipIds ?? []),
            ]
          : activePlayer.customShipIds,
      flagshipIndex: undefined,
    });
  };

  const p1Ships = getFormationShips(
    player1.formationId,
    player1.customShipIds,
    player1.nationId,
    player1.bonusShipIds ?? []
  );
  const p2Ships = getFormationShips(
    player2.formationId,
    player2.customShipIds,
    player2.nationId,
    player2.bonusShipIds ?? []
  );
  const activeShips = activeTab === 'P2' ? p2Ships : p1Ships;
  const activeCells = activeShips.reduce((sum, s) => sum + s.offsets.length, 0);

  const isDefaultMode = activePlayer.formationId === 'NATIONAL';
  const baseDefaultCount =
    NATIONS[activePlayer.nationId].signatureShipIds.length;
  const bonusShipIds = isDefaultMode ? (activePlayer.bonusShipIds ?? []) : [];
  const currentMaxCells = MAX_CUSTOM_CELLS;

  const effectiveFlagshipIndex =
    activePlayer.flagshipIndex !== undefined &&
    activePlayer.flagshipIndex >= 0 &&
    activePlayer.flagshipIndex < activeShips.length
      ? activePlayer.flagshipIndex
      : getDefaultFlagshipIndex(activeShips);

  const adjustFlagshipAfterRemoval = (
    removedIdx: number,
    nextLen: number
  ): number | undefined => {
    if (activePlayer.flagshipIndex === undefined) return undefined;
    if (removedIdx === activePlayer.flagshipIndex || activePlayer.flagshipIndex >= nextLen) {
      return undefined;
    }
    return removedIdx < activePlayer.flagshipIndex
      ? activePlayer.flagshipIndex - 1
      : activePlayer.flagshipIndex;
  };

  const handleAddShip = (shipId: string, cellCost: number) => {
    if (activeCells + cellCost > MAX_CUSTOM_CELLS) return;
    if (isDefaultMode) {
      soundFX.playClick();
      onUpdatePlayer(activePlayerKey, {
        ...activePlayer,
        bonusShipIds: [...bonusShipIds, shipId],
      });
      return;
    }

    soundFX.playClick();
    onUpdatePlayer(activePlayerKey, {
      ...activePlayer,
      customShipIds: [...activePlayer.customShipIds, shipId],
    });
  };

  const handleRemoveShipById = (shipId: string) => {
    if (isDefaultMode) {
      const bIdx = bonusShipIds.lastIndexOf(shipId);
      if (bIdx === -1) return;
      soundFX.playClick();
      const nextBonus = [...bonusShipIds];
      nextBonus.splice(bIdx, 1);
      const removedGlobalIdx = baseDefaultCount + bIdx;
      onUpdatePlayer(activePlayerKey, {
        ...activePlayer,
        bonusShipIds: nextBonus,
        flagshipIndex: adjustFlagshipAfterRemoval(
          removedGlobalIdx,
          baseDefaultCount + nextBonus.length
        ),
      });
      return;
    }

    const baseIds = [...activePlayer.customShipIds];
    const idx = baseIds.lastIndexOf(shipId);
    if (idx === -1 || baseIds.length <= 1) return;
    soundFX.playClick();
    baseIds.splice(idx, 1);
    onUpdatePlayer(activePlayerKey, {
      ...activePlayer,
      customShipIds: baseIds,
      flagshipIndex: adjustFlagshipAfterRemoval(idx, baseIds.length),
    });
  };

  const handleRemoveShipAtIndex = (index: number) => {
    if (isDefaultMode) {
      // Tàu mặc định không thể bỏ; tàu phụ thêm tự do và gỡ được thoải mái
      if (index < baseDefaultCount) return;
      const bIdx = index - baseDefaultCount;
      if (bIdx < 0 || bIdx >= bonusShipIds.length) return;
      soundFX.playClick();
      const nextBonus = [...bonusShipIds];
      nextBonus.splice(bIdx, 1);
      onUpdatePlayer(activePlayerKey, {
        ...activePlayer,
        bonusShipIds: nextBonus,
        flagshipIndex: adjustFlagshipAfterRemoval(
          index,
          baseDefaultCount + nextBonus.length
        ),
      });
      return;
    }

    const baseIds = [...activePlayer.customShipIds];
    if (baseIds.length <= 1 || index < 0 || index >= baseIds.length) return;
    soundFX.playClick();
    baseIds.splice(index, 1);
    onUpdatePlayer(activePlayerKey, {
      ...activePlayer,
      customShipIds: baseIds,
      flagshipIndex: adjustFlagshipAfterRemoval(index, baseIds.length),
    });
  };

  const handleSelectFlagship = (index: number) => {
    if (index < 0 || index >= activeShips.length) return;
    soundFX.playClick();
    onUpdatePlayer(activePlayerKey, {
      ...activePlayer,
      flagshipIndex: index,
    });
  };

  const handleToggleSkill = (skillId: SkillId) => {
    soundFX.playClick();
    const current = activePlayer.skillIds;
    if (current.includes(skillId)) {
      if (current.length <= 1) return;
      onUpdatePlayer(activePlayerKey, {
        ...activePlayer,
        skillIds: current.filter((id) => id !== skillId),
      });
    } else if (current.length < 10) {
      onUpdatePlayer(activePlayerKey, {
        ...activePlayer,
        skillIds: [...current, skillId],
      });
    }
  };

  const handleRandomSkills = () => {
    soundFX.playClick();
    onUpdatePlayer(activePlayerKey, {
      ...activePlayer,
      skillIds: getRandomSkills(10),
    });
  };

  const filteredCatalog = useMemo(() => {
    if (shipFilter === 'LINEAR') {
      return ALL_SHIP_TEMPLATES.filter((t) => !t.isExotic);
    }
    if (shipFilter === 'EXOTIC_SMALL') {
      return ALL_SHIP_TEMPLATES.filter((t) => t.isExotic && t.offsets.length <= 5);
    }
    if (shipFilter === 'EXOTIC_MEGA') {
      return ALL_SHIP_TEMPLATES.filter((t) => t.offsets.length >= 6);
    }
    return ALL_SHIP_TEMPLATES;
  }, [shipFilter]);

  const filteredSkills = useMemo(() => {
    if (skillFilter === 'ALL') return ALL_SKILLS;
    return ALL_SKILLS.filter((s) => s.category === skillFilter);
  }, [skillFilter]);

  const handleSelectMapMode = (mode: MapMode) => {
    soundFX.playClick();
    onUpdateRules({ ...rules, mapMode: mode });
  };

  return (
    <div className="min-h-screen w-full flex flex-col px-4 py-4 sm:px-8 sm:py-5">
      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col">
        {/* Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-sky-400/20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                onBack();
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0D2548] border border-sky-400/25 text-sm font-medium text-slate-200 hover:bg-[#143566] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-wide">
              Thiết Lập · {GRID_SIZE}×{GRID_SIZE} · Tối Đa {MAX_CUSTOM_CELLS} Ô
            </h1>
          </div>

          {/* Segmented Section Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#071832] border border-sky-400/25 shadow-inner">
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                setActiveTab('RULES');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'RULES'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              1. Luật &amp; AI
            </button>
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                setActiveTab('P1');
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'P1'
                  ? 'bg-sky-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <NationFlag nationId={player1.nationId} className="w-4 h-3" />
              <span>2. {player1.name}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                setActiveTab('P2');
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'P2'
                  ? 'bg-orange-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <NationFlag nationId={player2.nationId} className="w-4 h-3" />
              <span>3. {player2.name}</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 py-5">
          {activeTab === 'RULES' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: AI Settings / 2-Player Overview */}
              <div className="lg:col-span-7 space-y-5">
                {rules.mode === 'VS_AI' ? (
                  <>
                    <section className="p-5 rounded-2xl bg-[#0B2040]/95 border border-sky-400/25 shadow-xl">
                      <div className="flex items-center justify-between gap-2 mb-3.5">
                        <div className="flex items-center gap-2.5">
                          <Bot className="w-5 h-5 text-amber-400" />
                          <h2 className="font-display text-2xl font-bold text-white tracking-wide">
                            5 Cấp Độ AI (Chiến Thuật &amp; Kỹ Năng Riêng)
                          </h2>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {AI_MODES.map((ai) => {
                          const selected = rules.aiDifficulty === ai.level;
                          return (
                            <button
                              key={ai.level}
                              type="button"
                              onClick={() => {
                                soundFX.playClick();
                                const nextDiff = ai.level as AIDifficulty;
                                onUpdateRules({
                                  ...rules,
                                  aiDifficulty: nextDiff,
                                });
                                onUpdatePlayer('P2', {
                                  ...player2,
                                  skillIds: getAISkillsForDifficulty(nextDiff),
                                });
                              }}
                              className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                selected
                                  ? 'bg-amber-500/15 border-amber-400/85 shadow-md'
                                  : 'bg-[#081730]/80 border-slate-700/60 hover:border-sky-400/40'
                              }`}
                            >
                              <div>
                                <div
                                  className={`font-display text-lg font-bold leading-tight ${
                                    selected ? 'text-amber-300' : 'text-white'
                                  }`}
                                >
                                  {ai.level}. {ai.name}
                                </div>
                                <div className="text-xs font-mono-tabular text-sky-300/90 mt-0.5">
                                  {ai.tag}
                                </div>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                                  selected
                                    ? 'bg-amber-500 border-amber-400 text-slate-950'
                                    : 'border-slate-600 text-transparent'
                                }`}
                              >
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section className="p-5 rounded-2xl bg-[#0B2040]/95 border border-sky-400/25 shadow-xl space-y-3.5">
                      <h2 className="font-display text-2xl font-bold text-white tracking-wide">
                        Cách Xếp Tàu AI
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(
                          [
                            {
                              id: 'RANDOM' as AIPlacementMode,
                              title: '1. Ngẫu nhiên (Tự cân bằng)',
                              sub: 'AI tự xếp bí mật ngang số tàu & ô với bạn',
                              Icon: Shuffle,
                            },
                            {
                              id: 'MANUAL' as AIPlacementMode,
                              title: '2. Tự xếp cho AI',
                              sub: 'Kéo thả tàu của AI thủ công',
                              Icon: Hand,
                            },
                          ] as const
                        ).map((opt) => {
                          const active = rules.aiPlacementMode === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                soundFX.playClick();
                                onUpdateRules({
                                  ...rules,
                                  aiPlacementMode: opt.id,
                                });
                              }}
                              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                                active
                                  ? 'bg-sky-500/20 border-sky-400 shadow-sm'
                                  : 'bg-[#081730]/80 border-slate-700/60 hover:border-sky-400/40'
                              }`}
                            >
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                  active
                                    ? 'bg-sky-400 text-slate-950'
                                    : 'bg-slate-800 text-sky-300'
                                }`}
                              >
                                <opt.Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-white">
                                  {opt.title}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {opt.sub}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  </>
                ) : (
                  <section className="p-6 rounded-2xl bg-[#0B2040]/95 border border-sky-400/25 shadow-xl space-y-4">
                    <div className="flex items-center gap-2.5">
                      <User className="w-5 h-5 text-sky-400" />
                      <h2 className="font-display text-2xl font-bold text-white tracking-wide">
                        2 Người Chơi · 1 Thiết Bị
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playClick();
                          setActiveTab('P1');
                        }}
                        className="p-4 rounded-xl bg-[#081730] border border-sky-400/30 hover:border-sky-400 text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 mb-2">
                          <NationFlag nationId={player1.nationId} className="w-6 h-4" />
                          <span className="font-semibold text-white">{player1.name}</span>
                        </div>
                        <div className="text-xs font-mono-tabular text-slate-400">
                          {p1Ships.length} tàu ({p1Ships.reduce((s, x) => s + x.offsets.length, 0)} ô) · {player1.skillIds.length} kỹ năng
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playClick();
                          setActiveTab('P2');
                        }}
                        className="p-4 rounded-xl bg-[#081730] border border-orange-400/30 hover:border-orange-400 text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 mb-2">
                          <NationFlag nationId={player2.nationId} className="w-6 h-4" />
                          <span className="font-semibold text-white">{player2.name}</span>
                        </div>
                        <div className="text-xs font-mono-tabular text-slate-400">
                          {p2Ships.length} tàu ({p2Ships.reduce((s, x) => s + x.offsets.length, 0)} ô) · {player2.skillIds.length} kỹ năng
                        </div>
                      </button>
                    </div>
                  </section>
                )}

                {/* Dedicated Map Mode Selector (Separated into 2 clear options) */}
                <section className="p-5 rounded-2xl bg-[#0B2040]/95 border border-sky-400/25 shadow-xl space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <MapIcon className="w-5 h-5 text-emerald-400" />
                      <h2 className="font-display text-2xl font-bold text-white tracking-wide">
                        Chọn Chế Độ Bản Đồ (2 Lựa Chọn)
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MAP_MODES.map((mm) => {
                      const selected = rules.mapMode === mm.id;
                      return (
                        <button
                          key={mm.id}
                          type="button"
                          onClick={() => handleSelectMapMode(mm.id)}
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            selected
                              ? 'bg-emerald-500/15 border-emerald-400/85 shadow-md'
                              : 'bg-[#081730]/80 border-slate-700/60 hover:border-sky-400/40'
                          }`}
                        >
                          <div>
                            <div
                              className={`text-sm font-bold ${
                                selected ? 'text-emerald-300' : 'text-white'
                              }`}
                            >
                              {mm.name}
                            </div>
                            <div className="text-[11px] text-slate-300/85 mt-1 leading-snug">
                              {mm.desc}
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                              selected
                                ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                : 'border-slate-600 text-transparent'
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* Right Column: Battle Goal (Flagship Hunt / Annihilation), Firing Rules & Summary */}
              <div className="lg:col-span-5 space-y-5">
                <section className="p-5 rounded-2xl bg-[#0B2040]/95 border border-sky-400/25 shadow-xl space-y-4">
                  {/* Battle Goal: Annihilation vs Flagship Hunt */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <h2 className="font-display text-2xl font-bold text-white tracking-wide">
                        Mục Tiêu Chiến Thắng
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {BATTLE_GOALS.map((goal) => {
                        const active = rules.battleGoal === goal.id;
                        return (
                          <button
                            key={goal.id}
                            type="button"
                            onClick={() => {
                              soundFX.playClick();
                              onUpdateRules({
                                ...rules,
                                battleGoal: goal.id as BattleGoal,
                              });
                            }}
                            className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                              active
                                ? 'bg-amber-500/15 border-amber-400/85 shadow-sm'
                                : 'bg-[#081730]/80 border-slate-700/60 hover:border-sky-400/40'
                            }`}
                          >
                            <div>
                              <div
                                className={`text-sm font-bold ${
                                  active ? 'text-amber-300' : 'text-white'
                                }`}
                              >
                                {goal.name}
                              </div>
                              <div className="text-[11px] text-slate-300/85 mt-0.5 leading-snug">
                                {goal.desc}
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                                active
                                  ? 'bg-amber-500 border-amber-400 text-slate-950'
                                  : 'border-slate-600 text-transparent'
                              }`}
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Firing Rules */}
                  <div className="pt-2 border-t border-slate-700/60 space-y-2">
                    <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Luật Khai Hỏa
                    </h3>
                    <div className="space-y-2">
                      {FIRING_RULES.map((fr) => {
                        const active = rules.firingRule === fr.id;
                        return (
                          <button
                            key={fr.id}
                            type="button"
                            onClick={() => {
                              soundFX.playClick();
                              onUpdateRules({
                                ...rules,
                                firingRule: fr.id as FiringRule,
                              });
                            }}
                            className={`w-full text-left px-4 py-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between ${
                              active
                                ? 'bg-sky-500/15 border-sky-400/80 text-white'
                                : 'bg-[#081730]/80 border-slate-700/60 text-slate-300 hover:border-sky-400/40'
                            }`}
                          >
                            <span className="text-sm font-semibold">{fr.name}</span>
                            {active && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* No-Touch Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      onUpdateRules({ ...rules, noTouch: !rules.noTouch });
                    }}
                    className="w-full flex items-center justify-between gap-4 p-3 rounded-xl bg-[#0B1C34]/90 border border-slate-600/60 hover:border-sky-400/40 transition-colors cursor-pointer text-left"
                  >
                    <span className="text-sm font-semibold text-white">
                      Không chạm nhau (Cách ≥ 1 ô)
                    </span>
                    <div
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
                        rules.noTouch ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          rules.noTouch ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </button>

                  {/* Random Ocean Events Mode Toggle (3 out of 7 events per match across both boards) */}
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      onUpdateRules({
                        ...rules,
                        randomEventsEnabled: !rules.randomEventsEnabled,
                      });
                    }}
                    className={`w-full flex items-center justify-between gap-4 p-3 rounded-xl border transition-colors cursor-pointer text-left ${
                      rules.randomEventsEnabled
                        ? 'bg-cyan-500/12 border-cyan-400/70'
                        : 'bg-[#0B1C34]/90 border-slate-600/60 hover:border-sky-400/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">
                        Sự Kiện Đại Dương Ngẫu Nhiên
                      </div>
                      <div className="text-[11px] text-slate-300/85 mt-0.5 leading-snug">
                        Xuất hiện cả 7 sự kiện ngẫu nhiên mỗi ván (Vệ tinh 6×6, Xoáy ngầm, Tràn dầu, Sương mù, Bão 5×5, Bão EMP, Hải lưu), bắt đầu lượt 10–20 và cách nhau 8–15 lượt trên 2 bàn.
                      </div>
                    </div>
                    <div
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
                        rules.randomEventsEnabled
                          ? 'bg-cyan-500'
                          : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          rules.randomEventsEnabled
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </button>
                </section>

                {/* Dual Fleet + Skills Summary */}
                <section className="p-4 rounded-2xl bg-[#0B2040]/95 border border-sky-400/25 shadow-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold text-white tracking-wide">
                      Tóm Tắt 2 Bên
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playClick();
                        setActiveTab('P1');
                      }}
                      className="text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
                    >
                      Chỉnh tàu &amp; 10 kỹ năng →
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-700/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <NationFlag nationId={player1.nationId} className="w-6 h-4" />
                      <span className="font-medium text-white truncate">{player1.name}</span>
                    </div>
                    <span className="text-xs font-mono-tabular text-sky-300 shrink-0">
                      {p1Ships.length} tàu ({p1Ships.reduce((s, x) => s + x.offsets.length, 0)} ô) · {player1.skillIds.length} skill
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <NationFlag nationId={player2.nationId} className="w-6 h-4" />
                      <span className="font-medium text-white truncate">{player2.name}</span>
                    </div>
                    <span className="text-xs font-mono-tabular text-orange-300 shrink-0">
                      {rules.mode === 'VS_AI' && rules.autoBalanceAI
                        ? `Cân bằng (${p1Ships.length} tàu) · ${player2.skillIds.length} skill`
                        : `${p2Ships.length} tàu (${p2Ships.reduce((s, x) => s + x.offsets.length, 0)} ô) · ${player2.skillIds.length} skill`}
                    </span>
                  </div>
                </section>
              </div>
            </div>
          ) : (
            /* PER-PLAYER TAB: 15 NATIONS + (FLEET vs 5 SKILLS) */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Commander Name + 15 Nations */}
              <div className="lg:col-span-5 space-y-4">
                <section className="p-5 rounded-2xl bg-[#0B2040]/95 border border-sky-400/25 shadow-xl space-y-4">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                      Tên Chỉ Huy ({activePlayerKey === 'P1' ? 'Người chơi 1' : isActiveAI ? 'AI' : 'Người chơi 2'})
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={28}
                        value={activePlayer.name}
                        onChange={(e) =>
                          onUpdatePlayer(activePlayerKey, {
                            ...activePlayer,
                            name: e.target.value,
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-lg bg-[#07152B] border border-sky-400/35 text-sm font-semibold text-white focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        title="Đặt lại tên mặc định"
                        onClick={() => {
                          soundFX.playClick();
                          onUpdatePlayer(activePlayerKey, {
                            ...activePlayer,
                            name: getDefaultPlayerName(
                              activePlayer.nationId,
                              isActiveAI
                            ),
                          });
                        }}
                        className="p-2 rounded-lg bg-[#07152B] border border-sky-400/25 text-sky-300 hover:text-white hover:border-sky-400 cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </label>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        15 Quốc Gia (~60 ô mặc định)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2 max-h-[430px] overflow-y-auto pr-1">
                      {NATION_LIST.map((nat) => {
                        const selected = activePlayer.nationId === nat.id;
                        return (
                          <button
                            key={nat.id}
                            type="button"
                            onClick={() => handleSetNation(nat.id)}
                            className={`flex flex-col gap-1.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              selected
                                ? 'bg-sky-500/20 border-sky-400 shadow-md'
                                : 'bg-[#07152B]/80 border-slate-700/60 hover:border-sky-400/45'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <NationFlag nationId={nat.id} className="w-7 h-4.5" />
                              <span className="text-[10px] font-mono-tabular text-slate-400">
                                {nat.signatureShipIds.length} tàu
                              </span>
                            </div>
                            <div className="text-xs font-bold text-white truncate">
                              {nat.name}
                            </div>
                            <div className="text-[10px] text-sky-300/80 truncate">
                              {nat.signatureFleetName}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>
              </div>

              {/* Right: Sub-switcher [Đội hình Tàu (Max 74 ô)] | [10 Kỹ năng] */}
              <div className="lg:col-span-7 space-y-4">
                {/* Sub-panel Switcher */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#071832] border border-sky-400/25">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      setSubPanel('FLEET');
                    }}
                    className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-colors truncate ${
                      subPanel === 'FLEET'
                        ? 'bg-sky-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Đội Hình Tàu ({activeCells}/{currentMaxCells} ô)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      setSubPanel('SKILLS');
                    }}
                    className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 truncate ${
                      subPanel === 'SKILLS'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>10 Kỹ Năng Chiến Thuật ({activePlayer.skillIds.length}/10)</span>
                  </button>
                </div>

                {subPanel === 'FLEET' ? (
                  <section className="p-5 rounded-2xl bg-[#0D213B]/95 border border-sky-300/25 shadow-xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="grid grid-cols-2 gap-2 flex-1 min-w-[260px]">
                        <button
                          type="button"
                          onClick={() => handleSetFormation('NATIONAL')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isDefaultMode
                              ? 'bg-amber-500/15 border-amber-400/85'
                              : 'bg-[#09182D]/80 border-slate-700/60 hover:border-sky-400/45'
                          }`}
                        >
                          <div className="text-xs sm:text-sm font-bold text-white truncate">
                            1. Mặc định {NATIONS[activePlayer.nationId].name}
                          </div>
                          <div className="text-[11px] text-amber-300/90 truncate">
                            Khóa gốc + thêm tàu phụ (≤ {MAX_CUSTOM_CELLS} ô)
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetFormation('CUSTOM')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            !isDefaultMode
                              ? 'bg-sky-500/20 border-sky-400/85'
                              : 'bg-[#09182D]/80 border-slate-700/60 hover:border-sky-400/45'
                          }`}
                        >
                          <div className="text-xs sm:text-sm font-bold text-white">
                            2. Tự chọn tàu
                          </div>
                          <div className="text-[11px] text-sky-300">
                            Tối đa {MAX_CUSTOM_CELLS} ô · Tự do thêm bớt
                          </div>
                        </button>
                      </div>

                      <div className="px-3.5 py-2 rounded-xl bg-[#09182C] border border-sky-400/25 text-right shrink-0">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">
                          {isDefaultMode
                            ? `Mặc định · +${bonusShipIds.length} tàu phụ`
                            : 'Tự chọn · Tổng ô tàu'}
                        </div>
                        <div
                          className={`font-mono-tabular text-base font-bold ${
                            activeCells >= currentMaxCells
                              ? 'text-amber-400'
                              : 'text-emerald-300'
                          }`}
                        >
                          {activeCells}/{currentMaxCells} ô · {activeShips.length} tàu
                        </div>
                      </div>
                    </div>

                    {/* Active Roster Strip */}
                    <div className="p-3 rounded-xl bg-[#09182C] border border-sky-400/20 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-slate-200">
                            Đội hình hiện tại:
                          </span>
                          {isDefaultMode && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/90 border border-slate-600/60 text-[10px] text-slate-300">
                              <Lock className="w-2.5 h-2.5 text-amber-300" />
                              Tàu gốc cố định · Thêm tàu phụ không giới hạn (≤ {MAX_CUSTOM_CELLS} ô)
                            </span>
                          )}
                        </div>
                        {!isDefaultMode ? (
                          <button
                            type="button"
                            onClick={() => handleSetFormation('NATIONAL')}
                            className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
                          >
                            Khôi phục mặc định
                          </button>
                        ) : bonusShipIds.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.playClick();
                              onUpdatePlayer(activePlayerKey, {
                                ...activePlayer,
                                bonusShipIds: [],
                                flagshipIndex: undefined,
                              });
                            }}
                            className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 cursor-pointer"
                          >
                            Xóa {bonusShipIds.length} tàu phụ
                          </button>
                        ) : null}
                      </div>

                      {rules.battleGoal === 'FLAGSHIP_HUNT' && (
                        <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/12 border border-amber-400/40 text-[11px] text-amber-200 flex items-center gap-2">
                          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            <strong>Săn Soái Hạm:</strong> Bấm nút vương miện 👑 dưới tàu để chọn Soái Hạm (3 lớp giáp dày).
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-stretch gap-2 max-h-64 overflow-y-auto py-1.5 pr-1">
                        {activeShips.map((tpl, i) => {
                          const isLockedDefault =
                            isDefaultMode && i < baseDefaultCount;
                          const isBonusShip =
                            isDefaultMode && i >= baseDefaultCount;
                          const isFlagship =
                            rules.battleGoal === 'FLAGSHIP_HUNT' &&
                            i === effectiveFlagshipIndex;

                          return (
                            <div
                              key={`${tpl.id}-${i}`}
                              className={`group relative flex flex-col items-center justify-between gap-1 p-2 rounded-lg border min-w-[84px] max-w-[118px] transition-colors ${
                                isFlagship
                                  ? 'bg-amber-500/15 border-amber-400/85'
                                  : isBonusShip
                                    ? 'bg-emerald-950/35 border-emerald-400/55'
                                    : 'bg-[#102644]/95 border-slate-600/60'
                              }`}
                            >
                              {isLockedDefault ? (
                                <span
                                  title="Tàu mặc định quốc gia (không thể bỏ)"
                                  className="absolute top-1 right-1 text-slate-400/80"
                                >
                                  <Lock className="w-2.5 h-2.5" />
                                </span>
                              ) : (
                                activeShips.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveShipAtIndex(i)}
                                    title={`Gỡ ${tpl.name}`}
                                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 flex items-center justify-center transition-opacity cursor-pointer shadow"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                )
                              )}

                              {isBonusShip && (
                                <span className="self-start px-1 py-0.2 rounded bg-emerald-500/20 text-[8px] font-bold text-emerald-300 uppercase">
                                  +Phụ
                                </span>
                              )}

                              <div className="flex-1 flex items-center justify-center py-0.5">
                                <ShipMiniPreview
                                  offsets={tpl.offsets}
                                  nationId={activePlayer.nationId}
                                  isFlagship={isFlagship}
                                  size={9}
                                />
                              </div>

                              <span className="text-[9px] text-center text-slate-200 font-medium leading-tight line-clamp-1">
                                {tpl.name}
                              </span>

                              {rules.battleGoal === 'FLAGSHIP_HUNT' && (
                                <button
                                  type="button"
                                  onClick={() => handleSelectFlagship(i)}
                                  className={`w-full inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                                    isFlagship
                                      ? 'bg-amber-400 text-slate-950'
                                      : 'bg-slate-800/90 hover:bg-amber-500/25 text-slate-300 hover:text-amber-200 border border-slate-600/60'
                                  }`}
                                >
                                  <Crown className="w-2.5 h-2.5 shrink-0" />
                                  <span>{isFlagship ? 'Soái Hạm' : 'Chọn'}</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Ship Catalog */}
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                          {isDefaultMode
                            ? `Thêm tàu phụ không giới hạn (đã thêm ${bonusShipIds.length} tàu · Còn ${Math.max(0, MAX_CUSTOM_CELLS - activeCells)} ô)`
                            : `Kho tàu (${ALL_SHIP_TEMPLATES.length} mẫu · Tối đa 8 ô)`}
                        </span>
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#09182D] border border-slate-700/70">
                          {(
                            [
                              { id: 'ALL', label: 'Tất cả' },
                              { id: 'LINEAR', label: 'Thẳng' },
                              { id: 'EXOTIC_SMALL', label: 'Dị 3–5' },
                              { id: 'EXOTIC_MEGA', label: 'Dị 6–8' },
                            ] as const
                          ).map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                soundFX.playClick();
                                setShipFilter(f.id);
                              }}
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                                shipFilter === f.id
                                  ? 'bg-sky-500 text-slate-950'
                                  : 'text-slate-300 hover:text-white'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                        {filteredCatalog.map((tpl) => {
                          const totalCount = activeShips.filter(
                            (s) => s.id === tpl.id
                          ).length;
                          const bonusCount = isDefaultMode
                            ? bonusShipIds.filter((id) => id === tpl.id).length
                            : totalCount;
                          const activeItem = totalCount > 0;
                          const cellCost = tpl.offsets.length;
                          const overCellLimit =
                            activeCells + cellCost > currentMaxCells;
                          const cannotAdd = overCellLimit;
                          const cannotRemove = isDefaultMode
                            ? bonusCount === 0
                            : totalCount === 0 || activeShips.length <= 1;

                          return (
                            <div
                              key={tpl.id}
                              className={`flex items-center justify-between gap-2.5 p-2 rounded-xl border transition-colors ${
                                bonusCount > 0 && isDefaultMode
                                  ? 'bg-emerald-950/35 border-emerald-400/50'
                                  : activeItem
                                    ? 'bg-sky-950/45 border-sky-400/45'
                                    : 'bg-[#09182D]/90 border-slate-700/60'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-12 h-10 flex items-center justify-center shrink-0 rounded-lg bg-[#071323] border border-slate-800">
                                  <ShipMiniPreview
                                    offsets={tpl.offsets}
                                    nationId={activePlayer.nationId}
                                    size={9}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-white truncate">
                                    {NATIONS[activePlayer.nationId]
                                      .nationalShipNames[tpl.id] ??
                                      tpl.shortName}
                                  </div>
                                  <div className="text-[11px] font-mono-tabular text-sky-300/80">
                                    {cellCost} ô
                                    {isDefaultMode && bonusCount > 0 && (
                                      <span className="text-emerald-300 ml-1">
                                        (+{bonusCount} phụ)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveShipById(tpl.id)}
                                  disabled={cannotRemove}
                                  title={
                                    isDefaultMode && bonusCount === 0 && totalCount > 0
                                      ? 'Tàu mặc định không thể bỏ'
                                      : 'Gỡ tàu'
                                  }
                                  className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30 flex items-center justify-center text-slate-200 cursor-pointer disabled:cursor-not-allowed"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span
                                  className={`w-5 text-center text-xs font-mono-tabular font-bold ${
                                    activeItem
                                      ? 'text-amber-300'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {totalCount}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAddShip(tpl.id, cellCost)
                                  }
                                  disabled={cannotAdd}
                                  title={
                                    overCellLimit
                                      ? `Vượt giới hạn ${currentMaxCells} ô`
                                      : 'Thêm tàu'
                                  }
                                  className="w-7 h-7 rounded-md bg-sky-500/25 hover:bg-sky-500/45 disabled:opacity-30 border border-sky-400/45 flex items-center justify-center text-sky-100 cursor-pointer disabled:cursor-not-allowed"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                ) : (
                  /* 10 TACTICAL SKILLS SELECTOR */
                  <section className="p-5 rounded-2xl bg-[#0B2040]/95 border border-sky-400/25 shadow-xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="font-display text-2xl font-bold text-white tracking-wide">
                          Chọn 10 Kỹ Năng ({activePlayer.skillIds.length}/10 · {ALL_SKILLS.length} kỹ năng)
                        </h2>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActiveAI && (
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.playClick();
                              onUpdatePlayer('P2', {
                                ...player2,
                                skillIds: getAISkillsForDifficulty(
                                  rules.aiDifficulty
                                ),
                              });
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#081730] border border-sky-400/35 text-xs font-semibold text-sky-200 hover:bg-[#12305C] cursor-pointer"
                          >
                            <Bot className="w-3.5 h-3.5 text-sky-400" />
                            <span>Theo cấp {rules.aiDifficulty}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleRandomSkills}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/60 text-xs font-bold text-amber-200 hover:bg-amber-500/30 cursor-pointer"
                        >
                          <Dices className="w-3.5 h-3.5 text-amber-300" />
                          <span>Chọn ngẫu nhiên 10</span>
                        </button>
                      </div>
                    </div>

                    {/* Selected 10 Slots Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-2.5 rounded-xl bg-[#06142A] border border-sky-400/20">
                      {Array.from({ length: 10 }, (_, idx) => {
                        const sid = activePlayer.skillIds[idx];
                        const def = sid ? SKILLS[sid] : null;
                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={!def || activePlayer.skillIds.length <= 1}
                            onClick={() => def && handleToggleSkill(def.id)}
                            title={def ? `Bấm để bỏ ${def.name}` : undefined}
                            className={`p-2 rounded-lg border text-center flex flex-col justify-center min-h-[52px] transition-colors ${
                              def
                                ? 'bg-amber-500/15 border-amber-400/60 text-white hover:bg-rose-950/40 hover:border-rose-400/60 cursor-pointer'
                                : 'bg-[#081730]/60 border-dashed border-slate-700 text-slate-500 cursor-default'
                            }`}
                          >
                            {def ? (
                              <>
                                <div className="text-[11px] font-bold leading-tight line-clamp-2">
                                  {def.name}
                                </div>
                                <div className="text-[9px] font-mono-tabular text-amber-300 mt-0.5">
                                  {def.kind === 'PASSIVE'
                                    ? 'Bị động'
                                    : `CD ${def.cooldown} lượt`}
                                </div>
                              </>
                            ) : (
                              <span className="text-[10px]">Ô #{idx + 1}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Category Filter */}
                    <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#07152B] border border-slate-700/70">
                      <button
                        type="button"
                        onClick={() => setSkillFilter('ALL')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          skillFilter === 'ALL'
                            ? 'bg-sky-500 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        Tất cả ({ALL_SKILLS.length})
                      </button>
                      {(Object.keys(SKILL_CATEGORY_LABELS) as SkillCategory[]).map(
                        (cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSkillFilter(cat)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                              skillFilter === cat
                                ? 'bg-sky-500 text-slate-950'
                                : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            {SKILL_CATEGORY_LABELS[cat]}
                          </button>
                        )
                      )}
                    </div>

                    {/* Skill Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                      {filteredSkills.map((sk) => {
                        const selected = activePlayer.skillIds.includes(sk.id);
                        const full =
                          !selected && activePlayer.skillIds.length >= 10;
                        return (
                          <button
                            key={sk.id}
                            type="button"
                            disabled={full}
                            onClick={() => handleToggleSkill(sk.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-start justify-between gap-2 ${
                              selected
                                ? 'bg-amber-500/15 border-amber-400/85'
                                : 'bg-[#07152B]/85 border-slate-700/60 hover:border-sky-400/45'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white truncate">
                                  <span className="font-mono-tabular text-sky-300/90 mr-1">
                                    #{String(sk.code).padStart(2, '0')}
                                  </span>
                                  {sk.name}
                                </span>
                                <span className="text-[10px] font-mono-tabular text-sky-300 shrink-0">
                                  {sk.kind === 'PASSIVE'
                                    ? 'Bị động'
                                    : `CD ${sk.cooldown}`}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                                {sk.shortDesc}
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
                                selected
                                  ? 'bg-amber-500 border-amber-400 text-slate-950'
                                  : 'border-slate-600 text-transparent'
                              }`}
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Primary CTA Bar */}
        <footer className="pt-4 border-t border-sky-400/20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {rules.mode === 'VS_AI'
                ? `${AI_MODES[rules.aiDifficulty - 1].name} · Tự cân bằng tàu AI`
                : '2 Người chơi'}
              {' · '}
              {rules.mapMode === 'CUSTOM_HAZARDS'
                ? 'Địa hình (8 Đá + 8 Thủy lôi)'
                : 'Biển Mở'}
              {' · '}
              {rules.battleGoal === 'FLAGSHIP_HUNT'
                ? 'Săn Soái Hạm (5–8 ô)'
                : 'Hủy diệt toàn hạm đội'}
              {' · '}
              {rules.randomEventsEnabled ? '7 Sự kiện ngẫu nhiên' : 'Không sự kiện'}
              {' · '}
              {FIRING_RULES.find((f) => f.id === rules.firingRule)?.name}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onContinue();
            }}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display text-xl font-bold tracking-wide shadow-lg cursor-pointer transition-transform active:scale-[0.98] whitespace-nowrap shrink-0"
          >
            <span>
              {rules.mapMode === 'CUSTOM_HAZARDS'
                ? 'Bước 1: Xếp Đá & Thủy Lôi'
                : 'Tiếp tục xếp hạm đội'}
            </span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </footer>
      </div>
    </div>
  );
};
