import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Crown,
  ArrowLeft,
  ArrowRight,
  BookmarkCheck,
  CheckCircle2,
  FolderOpen,
  GripVertical,
  Hand,
  RotateCw,
  Shuffle,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  GRID_SIZE,
  NATIONS,
  ensureFlagshipTemplates,
  getFormationShips,
} from '../data/nationsAndFleets';
import {
  Coord,
  GameRules,
  PlacedShip,
  PlayerSetup,
  RelativeOffset,
  ShipTemplate,
} from '../types/game';
import {
  autoPlaceFleet,
  canPlaceShip,
  coordKey,
  getShipBounds,
  rotateOffsetsCW,
} from '../utils/fleetLogic';
import { NationFlag } from './NationFlag';
import { ShipMiniPreview } from './ShipGraphic';
import { TacticalGrid } from './TacticalGrid';
import { soundFX } from '../utils/sound';

interface PlacementPhaseProps {
  playerSetup: PlayerSetup;
  playerNumber: 1 | 2;
  rules: GameRules;
  initialShips?: PlacedShip[];
  overrideTemplates?: ShipTemplate[];
  placementContextLabel?: string;
  confirmButtonLabel?: string;
  onBack: () => void;
  onConfirmFleet: (ships: PlacedShip[]) => void;
  onSelectFlagshipIndex?: (shipIndex: number) => void;
}

interface ActiveDragState {
  slotKey: string;
  tpl: ShipTemplate;
  offsets: RelativeOffset[];
  rotationSteps: 0 | 1 | 2 | 3;
  grabOffset: Coord;
  originShip: PlacedShip | null;
  startX: number;
  startY: number;
  curX: number;
  curY: number;
  moved: boolean;
}

export const PlacementPhase: React.FC<PlacementPhaseProps> = ({
  playerSetup,
  playerNumber,
  rules,
  initialShips,
  overrideTemplates,
  placementContextLabel,
  confirmButtonLabel,
  onBack,
  onConfirmFleet,
  onSelectFlagshipIndex,
}) => {
  const rawTemplates = useMemo(() => {
    const base =
      overrideTemplates ??
      getFormationShips(
        playerSetup.formationId,
        playerSetup.customShipIds,
        playerSetup.nationId,
        playerSetup.bonusShipIds ?? []
      );
    return ensureFlagshipTemplates(
      base,
      playerSetup.nationId,
      rules.battleGoal,
      overrideTemplates ? undefined : playerSetup.flagshipIndex
    );
  }, [
    overrideTemplates,
    playerSetup.formationId,
    playerSetup.customShipIds,
    playerSetup.nationId,
    playerSetup.bonusShipIds,
    playerSetup.flagshipIndex,
    rules.battleGoal,
  ]);

  const [flagshipSlotIdx, setFlagshipSlotIdx] = useState<number>(() => {
    const idx = rawTemplates.findIndex((t) => t.isFlagship);
    return idx >= 0 ? idx : 0;
  });

  const templates = useMemo(() => {
    if (rules.battleGoal !== 'FLAGSHIP_HUNT') {
      return rawTemplates.map((t) => ({ ...t, isFlagship: false }));
    }
    const safeIdx =
      flagshipSlotIdx >= 0 && flagshipSlotIdx < rawTemplates.length
        ? flagshipSlotIdx
        : Math.max(0, rawTemplates.findIndex((t) => t.isFlagship));
    return rawTemplates.map((t, idx) => ({
      ...t,
      isFlagship: idx === safeIdx,
    }));
  }, [rawTemplates, rules.battleGoal, flagshipSlotIdx]);

  const shipSlots = useMemo(
    () =>
      templates.map((tpl, idx) => ({
        slotKey: `${tpl.id}_${idx}`,
        tpl,
        idx,
      })),
    [templates]
  );

  const validSlotKeys = useMemo(
    () => new Set(shipSlots.map((s) => s.slotKey)),
    [shipSlots]
  );

  const activeRocks = useMemo(
    () => (rules.mapMode === 'CUSTOM_HAZARDS' ? playerSetup.rocks : []),
    [rules.mapMode, playerSetup.rocks]
  );

  const [placedShips, setPlacedShips] = useState<PlacedShip[]>(() => {
    const rockSet = new Set(activeRocks);
    if (
      initialShips &&
      initialShips.length === shipSlots.length &&
      initialShips.every(
        (s) =>
          validSlotKeys.has(s.instanceId) &&
          !s.cells.some((c) => rockSet.has(coordKey(c.r, c.c)))
      )
    ) {
      return initialShips;
    }
    return autoPlaceFleet(templates, rules.noTouch, activeRocks, []);
  });

  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [rotationSteps, setRotationSteps] = useState<0 | 1 | 2 | 3>(0);
  const [hoverCoord, setHoverCoord] = useState<Coord | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const [dragState, setDragState] = useState<ActiveDragState | null>(null);
  const dragRef = useRef<ActiveDragState | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const storageKey = `fleet_battle_v3_${playerSetup.id}_${playerSetup.nationId}_${playerSetup.formationId}`;
  const [hasSavedPreset, setHasSavedPreset] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem(storageKey));
    } catch {
      return false;
    }
  });

  const placedKeySet = useMemo(
    () => new Set(placedShips.map((s) => s.instanceId)),
    [placedShips]
  );

  const unplacedSlots = useMemo(
    () => shipSlots.filter((slot) => !placedKeySet.has(slot.slotKey)),
    [shipSlots, placedKeySet]
  );

  const activeSlotKey: string | null = useMemo(() => {
    if (selectedSlotKey && !placedKeySet.has(selectedSlotKey)) {
      return selectedSlotKey;
    }
    return unplacedSlots[0]?.slotKey ?? null;
  }, [selectedSlotKey, placedKeySet, unplacedSlots]);

  const activeTemplate: ShipTemplate | null = useMemo(() => {
    if (!activeSlotKey) return null;
    return shipSlots.find((s) => s.slotKey === activeSlotKey)?.tpl ?? null;
  }, [activeSlotKey, shipSlots]);

  const rotatedOffsets: RelativeOffset[] | null = useMemo(() => {
    if (!activeTemplate) return null;
    return rotateOffsetsCW(activeTemplate.offsets, rotationSteps);
  }, [activeTemplate, rotationSteps]);

  const getCellFromClientPoint = useCallback(
    (clientX: number, clientY: number): Coord | null => {
      const el = gridRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX >= rect.right ||
        clientY < rect.top ||
        clientY >= rect.bottom
      ) {
        return null;
      }
      const c = Math.floor(((clientX - rect.left) / rect.width) * GRID_SIZE);
      const r = Math.floor(((clientY - rect.top) / rect.height) * GRID_SIZE);
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return null;
      return { r, c };
    },
    []
  );

  const handleRotate = useCallback(() => {
    if (dragRef.current) {
      soundFX.playRotate();
      const cur = dragRef.current;
      const nextStep = ((cur.rotationSteps + 1) % 4) as 0 | 1 | 2 | 3;
      const nextOffsets = rotateOffsetsCW(cur.tpl.offsets, nextStep);
      const bounds = getShipBounds(nextOffsets);
      const nextDrag: ActiveDragState = {
        ...cur,
        rotationSteps: nextStep,
        offsets: nextOffsets,
        grabOffset: {
          r: Math.min(cur.grabOffset.r, bounds.rows - 1),
          c: Math.min(cur.grabOffset.c, bounds.cols - 1),
        },
      };
      dragRef.current = nextDrag;
      setDragState(nextDrag);
      return;
    }

    if (!activeTemplate) return;
    soundFX.playRotate();
    setRotationSteps((prev) => ((prev + 1) % 4) as 0 | 1 | 2 | 3);
  }, [activeTemplate]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        if (!activeTemplate && !dragRef.current) return;
        e.preventDefault();
        handleRotate();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTemplate, handleRotate]);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const cur = dragRef.current;
      if (!cur) return;
      const dist = Math.hypot(e.clientX - cur.startX, e.clientY - cur.startY);
      const moved = cur.moved || dist > 5;
      const next: ActiveDragState = {
        ...cur,
        curX: e.clientX,
        curY: e.clientY,
        moved,
      };
      dragRef.current = next;
      setDragState(next);

      const cell = getCellFromClientPoint(e.clientX, e.clientY);
      setHoverCoord(cell);
    };

    const handlePointerUp = (e: PointerEvent) => {
      const cur = dragRef.current;
      dragRef.current = null;
      setDragState(null);
      if (!cur) return;

      const cell = getCellFromClientPoint(e.clientX, e.clientY);

      if (!cur.moved && cur.originShip) {
        soundFX.playClick();
        setPlacedShips((prev) =>
          prev.filter((s) => s.instanceId !== cur.originShip!.instanceId)
        );
        setSelectedSlotKey(cur.originShip.instanceId);
        setRotationSteps(((cur.originShip.rotation / 90) % 4) as 0 | 1 | 2 | 3);
        return;
      }

      if (!cur.moved && !cur.originShip) {
        soundFX.playClick();
        setSelectedSlotKey(cur.slotKey);
        return;
      }

      if (cell) {
        const anchorR = cell.r - cur.grabOffset.r;
        const anchorC = cell.c - cur.grabOffset.c;
        const check = canPlaceShip(
          cur.offsets,
          anchorR,
          anchorC,
          placedShips,
          rules.noTouch,
          cur.slotKey,
          activeRocks
        );

        if (check.valid) {
          soundFX.playPlace();
          const isChosenFlagship =
            rules.battleGoal === 'FLAGSHIP_HUNT' &&
            shipSlots[flagshipSlotIdx]?.slotKey === cur.slotKey;
          const newShip: PlacedShip = {
            instanceId: cur.slotKey,
            templateId: cur.tpl.id,
            name: cur.tpl.name,
            offsets: cur.offsets,
            anchor: { r: anchorR, c: anchorC },
            cells: check.cells,
            rotation: ((cur.rotationSteps * 90) % 360) as 0 | 90 | 180 | 270,
            hits: [],
            sunk: false,
            isFlagship: isChosenFlagship || Boolean(cur.tpl.isFlagship),
          };
          setPlacedShips((prev) => [
            ...prev.filter((s) => s.instanceId !== cur.slotKey),
            newShip,
          ]);
          setSelectedSlotKey(null);
          return;
        }
      }

      if (!cur.originShip) {
        setSelectedSlotKey(cur.slotKey);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragState !== null, getCellFromClientPoint, placedShips, rules.noTouch, activeRocks]);

  const handleAutoPlace = () => {
    soundFX.playPlace();
    const auto = autoPlaceFleet(templates, rules.noTouch, activeRocks, []);
    setPlacedShips(auto);
    setSelectedSlotKey(null);
  };

  const handleClear = () => {
    soundFX.playClick();
    setPlacedShips([]);
    setSelectedSlotKey(shipSlots[0]?.slotKey ?? null);
    setRotationSteps(0);
  };

  const handlePickUpShip = (ship: PlacedShip) => {
    soundFX.playClick();
    setPlacedShips((prev) =>
      prev.filter((s) => s.instanceId !== ship.instanceId)
    );
    setSelectedSlotKey(ship.instanceId);
    setRotationSteps(((ship.rotation / 90) % 4) as 0 | 1 | 2 | 3);
  };

  const handleChooseFlagship = (slotKey: string, idx: number) => {
    if (rules.battleGoal !== 'FLAGSHIP_HUNT') return;
    soundFX.playClick();
    setFlagshipSlotIdx(idx);
    setPlacedShips((prev) =>
      prev.map((s) => ({
        ...s,
        isFlagship: s.instanceId === slotKey,
      }))
    );
    if (dragRef.current) {
      const updatedDrag: ActiveDragState = {
        ...dragRef.current,
        tpl: {
          ...dragRef.current.tpl,
          isFlagship: dragRef.current.slotKey === slotKey,
        },
      };
      dragRef.current = updatedDrag;
      setDragState(updatedDrag);
    }
    onSelectFlagshipIndex?.(idx);
  };

  const handleGridPointerDown = (
    r: number,
    c: number,
    e: React.PointerEvent
  ) => {
    if (e.button === 2) {
      e.preventDefault();
      handleRotate();
      return;
    }
    if (e.button !== 0) return;

    const hitShip = placedShips.find((s) =>
      s.cells.some((cell) => cell.r === r && cell.c === c)
    );
    if (!hitShip) return;

    const slot = shipSlots.find((s) => s.slotKey === hitShip.instanceId);
    if (!slot) return;

    e.preventDefault();
    const rotStep = ((hitShip.rotation / 90) % 4) as 0 | 1 | 2 | 3;
    const nextDrag: ActiveDragState = {
      slotKey: hitShip.instanceId,
      tpl: slot.tpl,
      offsets: hitShip.offsets,
      rotationSteps: rotStep,
      grabOffset: {
        r: r - hitShip.anchor.r,
        c: c - hitShip.anchor.c,
      },
      originShip: hitShip,
      startX: e.clientX,
      startY: e.clientY,
      curX: e.clientX,
      curY: e.clientY,
      moved: false,
    };
    dragRef.current = nextDrag;
    setDragState(nextDrag);
    setHoverCoord({ r, c });
  };

  const handleDockPointerDown = (
    slotKey: string,
    tpl: ShipTemplate,
    placedMatch: PlacedShip | undefined,
    e: React.PointerEvent
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const step: 0 | 1 | 2 | 3 = placedMatch
      ? (((placedMatch.rotation / 90) % 4) as 0 | 1 | 2 | 3)
      : activeSlotKey === slotKey
        ? rotationSteps
        : 0;
    const offsets = placedMatch
      ? placedMatch.offsets
      : rotateOffsetsCW(tpl.offsets, step);
    const bounds = getShipBounds(offsets);

    const nextDrag: ActiveDragState = {
      slotKey,
      tpl,
      offsets,
      rotationSteps: step,
      grabOffset: {
        r: Math.floor(bounds.rows / 2),
        c: Math.floor(bounds.cols / 2),
      },
      originShip: placedMatch ?? null,
      startX: e.clientX,
      startY: e.clientY,
      curX: e.clientX,
      curY: e.clientY,
      moved: false,
    };
    dragRef.current = nextDrag;
    setDragState(nextDrag);
  };

  const handleCellClick = (r: number, c: number) => {
    if (dragRef.current) return;

    const clickedShip = placedShips.find((s) =>
      s.cells.some((cell) => cell.r === r && cell.c === c)
    );
    if (clickedShip) return;

    if (!activeTemplate || !activeSlotKey || !rotatedOffsets) return;
    if (placedKeySet.has(activeSlotKey)) return;

    const check = canPlaceShip(
      rotatedOffsets,
      r,
      c,
      placedShips,
      rules.noTouch,
      activeSlotKey,
      activeRocks
    );
    if (!check.valid) return;

    soundFX.playPlace();
    const newShip: PlacedShip = {
      instanceId: activeSlotKey,
      templateId: activeTemplate.id,
      name: activeTemplate.name,
      offsets: rotatedOffsets,
      anchor: { r, c },
      cells: check.cells,
      rotation: ((rotationSteps * 90) % 360) as 0 | 90 | 180 | 270,
      hits: [],
      sunk: false,
      isFlagship: Boolean(activeTemplate.isFlagship),
    };

    setPlacedShips((prev) => [...prev, newShip]);
    setSelectedSlotKey(null);
  };

  const handleSavePreset = () => {
    if (placedShips.length !== shipSlots.length) return;
    soundFX.playClick();
    try {
      localStorage.setItem(storageKey, JSON.stringify(placedShips));
      setHasSavedPreset(true);
      setSavedToast('Đã lưu!');
      setTimeout(() => setSavedToast(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleLoadPreset = () => {
    soundFX.playPlace();
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PlacedShip[];
      if (
        Array.isArray(parsed) &&
        parsed.length === shipSlots.length &&
        parsed.every((s) => validSlotKeys.has(s.instanceId))
      ) {
        const flagshipKey = shipSlots[flagshipSlotIdx]?.slotKey;
        setPlacedShips(
          parsed.map((s) => ({
            ...s,
            isFlagship:
              rules.battleGoal === 'FLAGSHIP_HUNT' &&
              s.instanceId === flagshipKey,
          }))
        );
        setSelectedSlotKey(null);
      }
    } catch {
      // ignore
    }
  };

  const ghost = useMemo(() => {
    if (dragState && hoverCoord) {
      const anchorR = hoverCoord.r - dragState.grabOffset.r;
      const anchorC = hoverCoord.c - dragState.grabOffset.c;
      const check = canPlaceShip(
        dragState.offsets,
        anchorR,
        anchorC,
        placedShips,
        rules.noTouch,
        dragState.slotKey,
        activeRocks
      );
      return {
        offsets: dragState.offsets,
        anchor: { r: anchorR, c: anchorC },
        valid: check.valid,
      };
    }

    if (!hoverCoord || !rotatedOffsets || !activeSlotKey) return null;
    const check = canPlaceShip(
      rotatedOffsets,
      hoverCoord.r,
      hoverCoord.c,
      placedShips,
      rules.noTouch,
      activeSlotKey,
      activeRocks
    );
    return {
      offsets: rotatedOffsets,
      anchor: hoverCoord,
      valid: check.valid,
    };
  }, [
    dragState,
    hoverCoord,
    rotatedOffsets,
    activeSlotKey,
    placedShips,
    rules.noTouch,
    activeRocks,
  ]);

  const allPlaced = placedShips.length === shipSlots.length;
  const nation = NATIONS[playerSetup.nationId];
  const pointerOutsideGrid = Boolean(
    dragState && dragState.moved && !hoverCoord
  );
  const totalCells = templates.reduce((s, t) => s + t.offsets.length, 0);

  return (
    <div className="min-h-screen w-full flex flex-col px-4 py-4 sm:px-8 sm:py-5">
      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col">
        {/* Top Header */}
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
              <span>Trở lại</span>
            </button>

            <div className="flex items-center gap-3">
              <NationFlag nationId={playerSetup.nationId} className="w-9 h-6" />
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                  {placementContextLabel ?? `Xếp Hạm Đội · ${playerSetup.name}`}
                </h1>
                <p className="text-xs text-slate-400">
                  {placementContextLabel
                    ? `${playerSetup.name} · ${shipSlots.length} tàu (${totalCells} ô)`
                    : `Người chơi ${playerNumber} · ${nation.name} · ${shipSlots.length} tàu (${totalCells} ô)`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {savedToast && (
              <span className="text-xs font-semibold text-emerald-400">
                {savedToast}
              </span>
            )}
            <button
              type="button"
              onClick={handleSavePreset}
              disabled={!allPlaced}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0D2548] border border-sky-400/25 text-xs font-medium text-slate-200 hover:bg-[#143566] disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              <BookmarkCheck className="w-4 h-4 text-emerald-400" />
              <span>Lưu vị trí</span>
            </button>
            {hasSavedPreset && (
              <button
                type="button"
                onClick={handleLoadPreset}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0D2548] border border-sky-400/25 text-xs font-medium text-slate-200 hover:bg-[#143566] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <FolderOpen className="w-4 h-4 text-sky-400" />
                <span>Tải vị trí</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Workspace */}
        <div className="flex-1 py-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: 15x15 Placement Board */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full max-w-[600px] space-y-3">
              <div
                className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border transition-colors ${
                  dragState || activeTemplate
                    ? 'bg-amber-500/12 border-amber-400/50 text-amber-100'
                    : 'bg-emerald-500/12 border-emerald-400/45 text-emerald-100'
                }`}
              >
                {dragState ? (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Hand className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="text-xs font-semibold truncate">
                        Đang kéo:{' '}
                        <span className="text-amber-300">
                          {dragState.tpl.name}
                        </span>
                        <span className="text-slate-300 font-normal">
                          {' '}
                          · Thả để đặt · Phím R xoay
                        </span>
                      </div>
                    </div>
                    <ShipMiniPreview
                      offsets={dragState.offsets}
                      nationId={playerSetup.nationId}
                      isFlagship={Boolean(dragState.tpl.isFlagship)}
                      size={10}
                    />
                  </>
                ) : activeTemplate && rotatedOffsets ? (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Hand className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="text-xs font-semibold truncate">
                        Đang giữ:{' '}
                        <span className="text-amber-300">
                          {activeTemplate.name}
                        </span>
                        <span className="text-slate-300 font-normal">
                          {' '}
                          · Kéo/bấm lên lưới · R xoay
                        </span>
                      </div>
                    </div>
                    <ShipMiniPreview
                      offsets={rotatedOffsets}
                      nationId={playerSetup.nationId}
                      isFlagship={Boolean(activeTemplate.isFlagship)}
                      size={10}
                    />
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Đủ {shipSlots.length}/{shipSlots.length} tàu ({totalCells}{' '}
                      ô) · Kéo tàu trên lưới để chỉnh lại
                    </span>
                  </div>
                )}
              </div>

              {rules.mapMode === 'CUSTOM_HAZARDS' && activeRocks.length > 0 && (
                <div className="px-4 py-2 rounded-xl bg-sky-950/65 border border-sky-400/35 text-xs text-sky-200">
                  Địa hình: <strong>{activeRocks.length} Đá ngầm</strong> đang hiển thị (chặn đặt tàu) · <strong>8 Thủy lôi</strong> đang ẩn trên vùng biển này!
                </div>
              )}

              <TacticalGrid
                nationId={playerSetup.nationId}
                ships={placedShips}
                shots={{}}
                rocks={activeRocks}
                showAllShips={true}
                ghost={ghost}
                gridRef={gridRef}
                draggingShipId={dragState?.moved ? dragState.slotKey : null}
                onCellClick={handleCellClick}
                onCellPointerDown={handleGridPointerDown}
                onCellHover={(r, c) => setHoverCoord({ r, c })}
                onGridLeave={() => {
                  if (!dragRef.current) setHoverCoord(null);
                }}
                onContextRotate={handleRotate}
                label={`Bàn cờ ${GRID_SIZE}×${GRID_SIZE} · ${placedShips.length}/${shipSlots.length} chiến hạm`}
              />

              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRotate}
                    disabled={!activeTemplate && !dragState}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D2548] border border-sky-400/35 text-xs sm:text-sm font-semibold text-sky-200 hover:bg-[#143566] disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                  >
                    <RotateCw className="w-4 h-4 text-sky-400" />
                    <span>Xoay 90° (R)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoPlace}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/20 border border-sky-400/50 text-xs sm:text-sm font-semibold text-sky-100 hover:bg-sky-500/30 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Shuffle className="w-4 h-4 text-sky-300" />
                    <span>Xếp ngẫu nhiên</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/60 text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/80 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Gỡ hết tàu</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Draggable Fleet Dock */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0B2040]/95 border border-sky-400/25 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-white tracking-wide">
                  Chiến Hạm ({shipSlots.length} tàu · {totalCells} ô)
                </h2>
                <span className="text-xs font-mono-tabular text-sky-300">
                  {rules.noTouch ? 'Không chạm tàu' : 'Đặt sát tự do'}
                </span>
              </div>

              {rules.battleGoal === 'FLAGSHIP_HUNT' && (
                <div className="px-3.5 py-2 rounded-xl bg-amber-500/12 border border-amber-400/40 text-xs text-amber-100 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Chế độ <strong>Săn Soái Hạm</strong>: Bấm{' '}
                    <strong className="text-amber-300">Chọn Soái Hạm</strong> trên
                    chiến hạm bạn muốn bảo vệ (nhận{' '}
                    <strong>3 lớp giáp dày</strong>).
                  </span>
                </div>
              )}

              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {shipSlots.map(({ slotKey, tpl, idx }) => {
                  const placedMatch = placedShips.find(
                    (s) => s.instanceId === slotKey
                  );
                  const isPlaced = Boolean(placedMatch);
                  const isActive =
                    dragState?.slotKey === slotKey || activeSlotKey === slotKey;
                  const isFlagship = Boolean(tpl.isFlagship);

                  return (
                    <div
                      key={slotKey}
                      onPointerDown={(e) =>
                        handleDockPointerDown(slotKey, tpl, placedMatch, e)
                      }
                      className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all select-none touch-none cursor-grab active:cursor-grabbing ${
                        isActive
                          ? 'bg-amber-500/15 border-amber-400/85 shadow-sm'
                          : isFlagship
                            ? 'bg-amber-950/25 border-amber-400/55 hover:border-amber-300'
                            : isPlaced
                              ? 'bg-emerald-950/30 border-emerald-500/35 hover:border-emerald-400/60'
                              : 'bg-[#07152B]/85 border-slate-700/70 hover:border-amber-400/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <GripVertical className="w-4 h-4 text-slate-500 shrink-0" />
                        <div className="w-16 h-10 flex items-center justify-center shrink-0 rounded-lg bg-[#051022]/80 border border-slate-700/50">
                          <ShipMiniPreview
                            offsets={
                              dragState?.slotKey === slotKey
                                ? dragState.offsets
                                : isActive && rotatedOffsets
                                  ? rotatedOffsets
                                  : placedMatch
                                    ? placedMatch.offsets
                                    : tpl.offsets
                            }
                            nationId={playerSetup.nationId}
                            isFlagship={isFlagship}
                            size={10}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {isFlagship && (
                              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            <span className="text-xs sm:text-sm font-semibold text-white truncate">
                              {tpl.name}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono-tabular text-slate-400">
                            {tpl.offsets.length} ô
                            {isFlagship ? ' · SOÁI HẠM (Giáp +3)' : ''}
                            {' · '}
                            {isActive
                              ? 'Kéo lên lưới'
                              : isPlaced
                                ? 'Đã đặt'
                                : 'Chưa đặt'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {rules.battleGoal === 'FLAGSHIP_HUNT' && (
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => handleChooseFlagship(slotKey, idx)}
                            className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                              isFlagship
                                ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                                : 'bg-slate-800/80 border-slate-600/60 text-slate-300 hover:text-amber-200 hover:border-amber-400/60'
                            }`}
                          >
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>{isFlagship ? 'Soái Hạm' : 'Chọn'}</span>
                          </button>
                        )}

                        {isPlaced && placedMatch ? (
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => handlePickUpShip(placedMatch)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-amber-500/20 border border-slate-600/60 hover:border-amber-400/50 text-[11px] font-semibold text-emerald-300 hover:text-amber-200 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                          >
                            <Undo2 className="w-3 h-3" />
                            <span>Nhấc ra</span>
                          </button>
                        ) : (
                          <span
                            className={`text-[11px] font-mono-tabular font-semibold shrink-0 px-2 ${
                              isActive ? 'text-amber-300' : 'text-slate-400'
                            }`}
                          >
                            {isActive ? 'Đang cầm' : 'Kéo đặt'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  disabled={!allPlaced}
                  onClick={() => {
                    soundFX.playClick();
                    onConfirmFleet(placedShips);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400 text-slate-950 font-display text-xl font-bold tracking-wide shadow-lg cursor-pointer disabled:cursor-not-allowed transition-all"
                >
                  <span>
                    {confirmButtonLabel ??
                      (rules.mode === 'PASS_AND_PLAY' && playerNumber === 1
                        ? 'Xác nhận & Giao máy cho Người chơi 2'
                        : 'Bắt đầu Khai Hỏa')}
                  </span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {pointerOutsideGrid && dragState && (
        <div
          style={{
            left: dragState.curX + 12,
            top: dragState.curY + 12,
          }}
          className="fixed z-50 pointer-events-none p-2 rounded-xl bg-[#0B2040]/90 border border-amber-400/80 shadow-2xl"
        >
          <ShipMiniPreview
            offsets={dragState.offsets}
            nationId={playerSetup.nationId}
            isFlagship={Boolean(dragState.tpl.isFlagship)}
            size={16}
          />
        </div>
      )}
    </div>
  );
};
