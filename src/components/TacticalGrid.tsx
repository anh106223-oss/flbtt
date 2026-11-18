import React, { useState } from 'react';
import { COL_LABELS, GRID_SIZE } from '../data/nationsAndFleets';
import {
  AreaEffectZone,
  Coord,
  EmpGridTrap,
  FuelLeakZone,
  MaelstromCell,
  NationId,
  PendingHeavyStrike,
  PlacedShip,
  ReconLineScan,
  RelativeOffset,
  SatelliteRevealZone,
  ShotResultStatus,
  SonarZone,
  StormZone,
} from '../types/game';
import { coordKey, getShipBounds } from '../utils/fleetLogic';
import { ShipGraphic } from './ShipGraphic';

interface GhostPreview {
  offsets: RelativeOffset[];
  anchor: Coord;
  valid: boolean;
}

interface TacticalGridProps {
  nationId: NationId;
  ships: PlacedShip[];
  shots: Record<string, ShotResultStatus>;
  showAllShips: boolean;
  interactive?: boolean;
  ghost?: GhostPreview | null;
  lastShotKeys?: string[];
  selectedShipId?: string | null;
  draggingShipId?: string | null;
  shaking?: boolean;
  // Tactical skill & map hazard overlays
  rocks?: string[];
  shieldedShipIds?: string[];
  reflectiveShieldShipIds?: string[];
  evasionProtectedShipIds?: string[];
  revealedShipIds?: string[];
  revealedCells?: string[];
  revealedMineCells?: string[];
  smokeCells?: Record<string, number>;
  domeShieldCells?: Record<string, number>;
  airstrikeJamZones?: AreaEffectZone[];
  empGrids?: EmpGridTrap[];
  pendingHeavyZones?: PendingHeavyStrike[];
  burningCells?: Record<string, { shipId: string; turnsLeft: number }>;
  hiddenHitMarks?: Record<string, number>;
  jammedTiles?: Record<string, number>;
  queuedCells?: Coord[];
  infoFogActive?: boolean;
  mines?: string[];
  decoys?: string[];
  sonarZones?: SonarZone[];
  reconLines?: ReconLineScan[];
  skillPreviewCells?: Coord[];
  // Ocean Random Event Overlays
  satelliteZones?: SatelliteRevealZone[];
  stormZones?: StormZone[];
  fuelLeakZones?: FuelLeakZone[];
  maelstromCells?: MaelstromCell[];
  denseFogActive?: boolean;
  gridRef?: React.RefObject<HTMLDivElement | null>;
  onCellClick?: (r: number, c: number) => void;
  onCellPointerDown?: (r: number, c: number, e: React.PointerEvent) => void;
  onCellHover?: (r: number, c: number) => void;
  onGridLeave?: () => void;
  onContextRotate?: () => void;
  label?: string;
}

export const TacticalGrid: React.FC<TacticalGridProps> = ({
  nationId,
  ships,
  shots,
  showAllShips,
  interactive = false,
  ghost = null,
  lastShotKeys = [],
  selectedShipId = null,
  draggingShipId = null,
  shaking = false,
  rocks = [],
  shieldedShipIds = [],
  reflectiveShieldShipIds = [],
  evasionProtectedShipIds = [],
  revealedShipIds = [],
  revealedCells = [],
  revealedMineCells = [],
  smokeCells = {},
  domeShieldCells = {},
  airstrikeJamZones = [],
  empGrids = [],
  pendingHeavyZones = [],
  burningCells = {},
  hiddenHitMarks = {},
  jammedTiles = {},
  queuedCells = [],
  infoFogActive = false,
  mines = [],
  decoys = [],
  sonarZones = [],
  reconLines = [],
  skillPreviewCells = [],
  satelliteZones = [],
  stormZones = [],
  fuelLeakZones = [],
  maelstromCells = [],
  denseFogActive = false,
  gridRef,
  onCellClick,
  onCellPointerDown,
  onCellHover,
  onGridLeave,
  onContextRotate,
  label,
}) => {
  const [hovered, setHovered] = useState<Coord | null>(null);
  const lastShotSet = new Set(lastShotKeys);
  const rockSet = new Set(rocks);
  const shieldedSet = new Set(shieldedShipIds);
  const reflectiveSet = new Set(reflectiveShieldShipIds);
  const evasionSet = new Set(evasionProtectedShipIds);
  const revealedSet = new Set(revealedShipIds);
  const revealedCellSet = new Set(revealedCells);
  const revealedMineSet = new Set(revealedMineCells);
  const mineSet = new Set(mines);
  const decoySet = new Set(decoys);
  const skillPreviewSet = new Set(
    skillPreviewCells.map((c) => coordKey(c.r, c.c))
  );
  const queuedIndexMap = new Map<string, number>();
  queuedCells.forEach((qc, idx) => {
    queuedIndexMap.set(coordKey(qc.r, qc.c), idx + 1);
  });

  const satelliteCellSet = new Set<string>();
  for (const sz of satelliteZones) {
    for (let r = sz.topR; r < Math.min(GRID_SIZE, sz.topR + 6); r++) {
      for (let c = sz.leftC; c < Math.min(GRID_SIZE, sz.leftC + 6); c++) {
        satelliteCellSet.add(coordKey(r, c));
      }
    }
  }

  const stormCellSet = new Set<string>();
  for (const stz of stormZones) {
    for (let r = stz.topR; r < Math.min(GRID_SIZE, stz.topR + 5); r++) {
      for (let c = stz.leftC; c < Math.min(GRID_SIZE, stz.leftC + 5); c++) {
        stormCellSet.add(coordKey(r, c));
      }
    }
  }

  const fuelLeakCellSet = new Set<string>();
  for (const fl of fuelLeakZones) {
    for (const fc of fl.cells) {
      fuelLeakCellSet.add(coordKey(fc.r, fc.c));
    }
  }

  const maelstromCellSet = new Set<string>();
  for (const mc of maelstromCells) {
    maelstromCellSet.add(coordKey(mc.r, mc.c));
  }

  const allEnemyShipCellSet = new Set<string>();
  for (const s of ships) {
    if (!s.sunk) {
      for (const sc of s.cells) {
        allEnemyShipCellSet.add(coordKey(sc.r, sc.c));
      }
    }
  }

  // Ships visible: on own board showAllShips=true; on enemy board show sunk OR flare-revealed ships!
  const visibleShips = showAllShips
    ? ships
    : ships.filter((s) => s.sunk || revealedSet.has(s.instanceId));

  const ghostBounds = ghost ? getShipBounds(ghost.offsets) : null;
  const cellPct = 100 / GRID_SIZE;

  const sonarHighlightedCells = new Set<string>();
  for (const z of sonarZones) {
    for (const cell of z.cells) {
      if (cell.r >= 0 && cell.r < GRID_SIZE && cell.c >= 0 && cell.c < GRID_SIZE) {
        sonarHighlightedCells.add(coordKey(cell.r, cell.c));
      }
    }
  }

  return (
    <div className={`select-none ${shaking ? 'animate-hit-shake' : ''}`}>
      {/* Distant Horizon Header */}
      <div className="relative h-9 w-full overflow-hidden rounded-t-2xl bg-gradient-to-b from-[#071D3B] via-[#0B2A54] to-[#0E3668] border-x border-t border-sky-400/35 flex items-end justify-between px-3.5">
        <svg
          viewBox="0 0 420 40"
          className="absolute inset-x-0 bottom-0 w-full h-full opacity-80 pointer-events-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="horizonIsle15v2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2F4A43" />
              <stop offset="100%" stopColor="#122127" />
            </linearGradient>
          </defs>
          <path
            d="M30,40 L72,16 L108,24 L145,7 L182,25 L212,18 L248,40 Z"
            fill="url(#horizonIsle15v2)"
          />
          <path
            d="M278,40 L314,18 L342,26 L370,12 L406,40 Z"
            fill="#16292B"
          />
          <rect x="143" y="2" width="3" height="6" fill="#94A3B8" />
          <circle cx="144.5" cy="2" r="1.5" fill="#FACC15" />
        </svg>

        {label && (
          <span className="relative z-10 text-xs font-display font-bold tracking-wider uppercase text-sky-100 pb-1.5 drop-shadow truncate pr-2">
            {label}
          </span>
        )}
        <div className="relative z-10 flex items-center gap-2 pb-1.5 shrink-0">
          {hovered ? (
            <span className="text-xs font-mono-tabular font-bold text-amber-300 bg-[#051226]/70 px-1.5 py-0.5 rounded border border-amber-400/30">
              {COL_LABELS[hovered.c]}
              {hovered.r + 1}
            </span>
          ) : (
            <span className="text-[10px] font-mono-tabular text-sky-300/60">
              {GRID_SIZE}×{GRID_SIZE}
            </span>
          )}
        </div>
      </div>

      {/* Main Board Frame */}
      <div
        className="relative p-2 sm:p-2.5 rounded-b-2xl bg-gradient-to-b from-[#0F2642]/95 to-[#0A1B31]/95 border border-sky-300/25 shadow-[0_14px_38px_rgba(0,0,0,0.5)]"
        onMouseLeave={() => {
          setHovered(null);
          onGridLeave?.();
        }}
        onContextMenu={(e) => {
          if (onContextRotate) {
            e.preventDefault();
            onContextRotate();
          }
        }}
      >
        {/* Top Column Coordinates A - R */}
        <div className="grid grid-cols-[20px_1fr] sm:grid-cols-[24px_1fr] gap-1 mb-1">
          <div />
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            }}
          >
            {COL_LABELS.map((col, idx) => {
              const isColActive = hovered?.c === idx;
              return (
                <div
                  key={col}
                  className={`text-center font-mono-tabular text-[10px] sm:text-[11px] font-bold transition-colors leading-none ${
                    isColActive ? 'text-amber-300' : 'text-slate-300/80'
                  }`}
                >
                  {col}
                </div>
              );
            })}
          </div>
        </div>

        {/* Left Row Numbers + 18x18 Ocean Grid */}
        <div className="grid grid-cols-[20px_1fr] sm:grid-cols-[24px_1fr] gap-1">
          <div
            className="grid"
            style={{
              gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: GRID_SIZE }, (_, r) => {
              const isRowActive = hovered?.r === r;
              return (
                <div
                  key={r}
                  className={`flex items-center justify-center font-mono-tabular text-[10px] sm:text-[11px] font-bold transition-colors leading-none ${
                    isRowActive ? 'text-amber-300' : 'text-slate-300/80'
                  }`}
                >
                  {r + 1}
                </div>
              );
            })}
          </div>

          {/* 18x18 Ocean Playfield */}
          <div
            ref={gridRef}
            className={`relative aspect-square w-full bg-gradient-to-br from-[#133D66] via-[#0F3153] to-[#0B243F] rounded-xl overflow-hidden border border-sky-300/35 shadow-[inset_0_0_24px_rgba(4,16,32,0.55)] ${
              onCellPointerDown ? 'touch-none' : ''
            }`}
          >
            {/* Subtle Radial Sea Depth Highlight */}
            <div
              className="absolute inset-0 pointer-events-none opacity-35"
              style={{
                background:
                  'radial-gradient(circle at 30% 25%, rgba(56, 189, 248, 0.20), transparent 62%)',
              }}
            />
            {denseFogActive && (
              <div className="absolute inset-0 pointer-events-none z-20 bg-slate-300/14 backdrop-blur-[0.5px]" />
            )}

            {infoFogActive && !showAllShips && (
              <div className="absolute top-1.5 left-1.5 pointer-events-none z-40 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-400/50 text-[10px] font-bold text-slate-200 shadow">
                Màn Sương Thông Tin đang che kết quả mới
              </div>
            )}

            {/* Satellite 6x6 Reveal Frames */}
            {satelliteZones.map((sz) => (
              <div
                key={sz.id}
                style={{
                  left: `${sz.leftC * cellPct}%`,
                  top: `${sz.topR * cellPct}%`,
                  width: `${Math.min(6, GRID_SIZE - sz.leftC) * cellPct}%`,
                  height: `${Math.min(6, GRID_SIZE - sz.topR) * cellPct}%`,
                }}
                className="absolute pointer-events-none z-20 border-2 border-cyan-300/90 bg-cyan-400/10 shadow-[inset_0_0_16px_rgba(34,211,238,0.28)]"
              />
            ))}

            {/* Storm 5x5 Jamming Zones */}
            {stormZones.map((stz) => (
              <div
                key={stz.id}
                style={{
                  left: `${stz.leftC * cellPct}%`,
                  top: `${stz.topR * cellPct}%`,
                  width: `${Math.min(5, GRID_SIZE - stz.leftC) * cellPct}%`,
                  height: `${Math.min(5, GRID_SIZE - stz.topR) * cellPct}%`,
                }}
                className="absolute pointer-events-none z-20 border-2 border-dashed border-indigo-300/85 bg-indigo-500/20 shadow-[inset_0_0_18px_rgba(99,102,241,0.35)]"
              />
            ))}

            {/* 42. Trạm Nhiễu Sóng Không Kích 3x3 (Own Board) */}
            {airstrikeJamZones.map((jz) => (
              <div
                key={jz.id}
                style={{
                  left: `${jz.leftC * cellPct}%`,
                  top: `${jz.topR * cellPct}%`,
                  width: `${Math.min(jz.size, GRID_SIZE - jz.leftC) * cellPct}%`,
                  height: `${Math.min(jz.size, GRID_SIZE - jz.topR) * cellPct}%`,
                }}
                className="absolute pointer-events-none z-20 border-2 border-dashed border-sky-300/80 bg-sky-500/10"
              />
            ))}

            {/* 32 & 91. Lưới Điện Từ Ngầm 2x2 / 1x1 (Own Board) */}
            {empGrids.map((eg) => {
              const sz = eg.size ?? 2;
              return (
                <div
                  key={eg.id}
                  style={{
                    left: `${eg.leftC * cellPct}%`,
                    top: `${eg.topR * cellPct}%`,
                    width: `${Math.min(sz, GRID_SIZE - eg.leftC) * cellPct}%`,
                    height: `${Math.min(sz, GRID_SIZE - eg.topR) * cellPct}%`,
                  }}
                  className="absolute pointer-events-none z-20 border-2 border-dashed border-fuchsia-400/85 bg-fuchsia-500/15"
                />
              );
            })}

            {/* 15 & 45. Cảnh báo vùng 2x2 Pháo Hạng Nặng Pending */}
            {pendingHeavyZones.map((ph) => (
              <div
                key={ph.id}
                style={{
                  left: `${ph.leftC * cellPct}%`,
                  top: `${ph.topR * cellPct}%`,
                  width: `${Math.min(2, GRID_SIZE - ph.leftC) * cellPct}%`,
                  height: `${Math.min(2, GRID_SIZE - ph.topR) * cellPct}%`,
                }}
                className="absolute pointer-events-none z-30 border-2 border-dashed border-rose-400 bg-rose-500/20 animate-pulse"
              />
            ))}

            {/* Recon Plane Line Highlights */}
            {reconLines.map((line) => (
              <div
                key={line.id}
                style={
                  line.axis === 'ROW'
                    ? {
                        left: 0,
                        top: `${line.index * cellPct}%`,
                        width: '100%',
                        height: `${cellPct}%`,
                      }
                    : {
                        left: `${line.index * cellPct}%`,
                        top: 0,
                        width: `${cellPct}%`,
                        height: '100%',
                      }
                }
                className="absolute pointer-events-none z-10 bg-cyan-400/15 border border-cyan-300/40 flex items-center justify-end p-0.5"
              >
                <span className="px-1 py-0.2 rounded bg-cyan-950/90 border border-cyan-300/60 text-[9px] font-mono-tabular font-bold text-cyan-200 leading-tight shadow">
                  {line.shipCellsFound}
                </span>
              </div>
            ))}

            {/* Sonar / Directional / Drone / Intel Detection Badges */}
            {sonarZones.map((zone) => {
              const anchorCell =
                zone.cells[Math.floor(zone.cells.length / 2)] ?? zone.cells[0];
              if (!anchorCell) return null;
              return (
                <div
                  key={zone.id}
                  style={{
                    left: `${anchorCell.c * cellPct}%`,
                    top: `${anchorCell.r * cellPct}%`,
                    width: `${cellPct}%`,
                    height: `${cellPct}%`,
                  }}
                  className="absolute pointer-events-none z-20 flex items-center justify-center"
                >
                  <span
                    className={`px-1 rounded border text-[9px] font-mono-tabular font-bold shadow whitespace-nowrap ${
                      zone.detected
                        ? 'bg-emerald-950/95 border-emerald-300/80 text-emerald-200'
                        : 'bg-cyan-950/90 border-cyan-300/75 text-cyan-200'
                    }`}
                  >
                    {zone.label}
                  </span>
                </div>
              );
            })}

            {/* Layer 1: Visible Ships (Own / Sunk / Flare-Revealed) */}
            <div className="absolute inset-0 pointer-events-none z-10">
              {visibleShips.map((ship) => {
                const bounds = getShipBounds(ship.offsets);
                const isSelected = selectedShipId === ship.instanceId;
                const isDragging = draggingShipId === ship.instanceId;
                const isShielded =
                  shieldedSet.has(ship.instanceId) ||
                  reflectiveSet.has(ship.instanceId);
                const isEvasion = evasionSet.has(ship.instanceId);
                const isRevealedOnly =
                  !showAllShips && !ship.sunk && revealedSet.has(ship.instanceId);

                return (
                  <div
                    key={ship.instanceId}
                    style={{
                      left: `${ship.anchor.c * cellPct}%`,
                      top: `${ship.anchor.r * cellPct}%`,
                      width: `${bounds.cols * cellPct}%`,
                      height: `${bounds.rows * cellPct}%`,
                    }}
                    className={`absolute transition-all duration-150 ${
                      isDragging
                        ? 'opacity-25 scale-95'
                        : isSelected
                          ? 'ring-2 ring-amber-400 rounded-md z-20 drop-shadow-[0_0_8px_rgba(251,191,36,0.65)]'
                          : isEvasion && showAllShips
                            ? 'ring-1 ring-emerald-300/80 rounded-md'
                            : ''
                    } ${isRevealedOnly ? 'opacity-75' : ''}`}
                  >
                    <ShipGraphic
                      offsets={ship.offsets}
                      nationId={nationId}
                      sunk={ship.sunk}
                      shielded={isShielded}
                      revealed={isRevealedOnly}
                      isFlagship={Boolean(ship.isFlagship)}
                      hasArmor={(ship.armorRemaining ?? 0) > 0}
                    />
                  </div>
                );
              })}
            </div>

            {/* Layer 2: Placement Ghost Preview */}
            {ghost && ghostBounds && (
              <div
                style={{
                  left: `${ghost.anchor.c * cellPct}%`,
                  top: `${ghost.anchor.r * cellPct}%`,
                  width: `${ghostBounds.cols * cellPct}%`,
                  height: `${ghostBounds.rows * cellPct}%`,
                }}
                className="absolute pointer-events-none z-20 transition-all duration-75"
              >
                <ShipGraphic
                  offsets={ghost.offsets}
                  nationId={nationId}
                  isGhost
                  ghostValid={ghost.valid}
                />
              </div>
            )}

            {/* Layer 3: Interactive Cells & Shot/Skill Markers */}
            <div
              className="relative z-30 grid w-full h-full"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: GRID_SIZE }, (_, r) =>
                Array.from({ length: GRID_SIZE }, (_, c) => {
                  const key = coordKey(r, c);
                  const rawShot = shots[key];
                  // 34. Mồi Nhử Tự Động: ẩn dấu hit trong 1 lượt trên góc nhìn đối phương
                  const isMaskedHit =
                    !showAllShips &&
                    Boolean(hiddenHitMarks[key]) &&
                    (rawShot === 'hit' || rawShot === 'armor');
                  const shot: ShotResultStatus | undefined = isMaskedHit
                    ? 'miss'
                    : rawShot;
                  const isRecent = lastShotSet.has(key);
                  const isCrosshair =
                    hovered && (hovered.r === r || hovered.c === c);
                  const clickable = interactive && (!rawShot || rawShot === 'armor');
                  const hasShipAtCell =
                    showAllShips &&
                    ships.some((s) =>
                      s.cells.some((cell) => cell.r === r && cell.c === c)
                    );
                  const isSmoke = Boolean(smokeCells[key]);
                  const isDome = Boolean(domeShieldCells[key]);
                  const isRock = (showAllShips && rockSet.has(key)) || rawShot === 'rock';
                  const isMine = showAllShips && mineSet.has(key) && !rawShot;
                  const isRevealedMine =
                    !showAllShips && revealedMineSet.has(key) && !rawShot;
                  const isRevealedCell =
                    !showAllShips && revealedCellSet.has(key) && !rawShot;
                  const isBurning = Boolean(burningCells[key]);
                  const isJammedTile = Boolean(jammedTiles[key]);
                  const queuedOrder = queuedIndexMap.get(key);
                  const isDecoy = showAllShips && decoySet.has(key) && !rawShot;
                  const isSonarZone = sonarHighlightedCells.has(key);
                  const isSkillPreview = skillPreviewSet.has(key);
                  const inSatelliteZone = satelliteCellSet.has(key);
                  const hasSatelliteShipReveal =
                    !showAllShips &&
                    inSatelliteZone &&
                    allEnemyShipCellSet.has(key) &&
                    !rawShot;
                  const inStormZone = stormCellSet.has(key);
                  const isFuelLeak = fuelLeakCellSet.has(key);
                  const isMaelstrom = maelstromCellSet.has(key);

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={
                        !interactive && !onCellClick && !onCellPointerDown
                      }
                      onClick={() => onCellClick?.(r, c)}
                      onPointerDown={(e) => {
                        onCellPointerDown?.(r, c, e);
                      }}
                      onMouseEnter={() => {
                        setHovered({ r, c });
                        onCellHover?.(r, c);
                      }}
                      onFocus={() => {
                        setHovered({ r, c });
                        onCellHover?.(r, c);
                      }}
                      aria-label={`Ô ${COL_LABELS[c]}${r + 1}${
                        shot ? ` - ${shot}` : isRock ? ' - đá ngầm' : ''
                      }`}
                      className={`relative border-[0.5px] border-sky-200/16 flex items-center justify-center transition-colors duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:z-40 ${
                        queuedOrder
                          ? 'bg-orange-500/35 ring-2 ring-inset ring-amber-300'
                          : isSkillPreview
                            ? 'bg-amber-400/35 ring-1 ring-inset ring-amber-300'
                            : isMaelstrom
                              ? 'bg-violet-600/35 ring-1 ring-inset ring-violet-300'
                              : isFuelLeak
                                ? 'bg-amber-500/25 ring-1 ring-inset ring-amber-300/80'
                                : isSonarZone
                                  ? 'bg-cyan-400/15'
                                  : isRock
                                    ? 'bg-stone-900/55 cursor-not-allowed'
                                    : clickable
                                      ? 'hover:bg-amber-400/25 cursor-crosshair'
                                      : onCellPointerDown
                                        ? hasShipAtCell
                                          ? 'cursor-grab active:cursor-grabbing hover:bg-amber-300/15'
                                          : 'cursor-pointer hover:bg-sky-300/15'
                                        : onCellClick
                                          ? 'cursor-pointer hover:bg-sky-300/15'
                                          : 'cursor-default'
                      } ${
                        isCrosshair &&
                        !isSkillPreview &&
                        !isRock &&
                        (clickable || onCellPointerDown)
                          ? 'bg-sky-300/[0.06]'
                          : ''
                      }`}
                    >
                      {/* 1x1 Impassable Sea Rock Reef */}
                      {isRock && (
                        <div
                          title="Đá ngầm 1×1 (Không thể đặt tàu)"
                          className="relative w-full h-full flex items-center justify-center p-[1px] pointer-events-none"
                        >
                          <svg viewBox="0 0 24 24" className="w-[88%] h-[88%] drop-shadow">
                            <polygon
                              points="4,19 2,13 7,5 15,3 21,9 22,17 16,21 7,21"
                              fill="#57534E"
                              stroke="#A8A29E"
                              strokeWidth="1.5"
                            />
                            <polygon
                              points="7,6 14,4 18,10 12,13 6,11"
                              fill="#78716C"
                            />
                            <polygon
                              points="12,13 18,10 21,16 15,20 8,19"
                              fill="#44403C"
                            />
                          </svg>
                        </div>
                      )}

                      {/* Smoke Screen Fog Overlay */}
                      {isSmoke && (
                        <span className="absolute inset-0 bg-slate-300/35 backdrop-blur-[1px] pointer-events-none border border-slate-200/30" />
                      )}

                      {/* 2x2 Local Dome Shield Overlay */}
                      {isDome && (
                        <span
                          title="Vòm Phòng Thủ 2×2"
                          className="absolute inset-0 bg-emerald-400/20 pointer-events-none border border-emerald-300/75 shadow-[inset_0_0_8px_rgba(52,211,153,0.45)]"
                        />
                      )}

                      {/* 01/06/07 Revealed Segment Indicator */}
                      {(isRevealedCell || hasSatelliteShipReveal) && (
                        <span
                          title="Lộ phân đoạn tàu địch!"
                          className="w-[62%] h-[62%] rounded-[3px] bg-cyan-300/85 border border-white shadow-[0_0_8px_rgba(34,211,238,0.95)] pointer-events-none z-20"
                        />
                      )}

                      {/* Spotted Enemy Sea Mine */}
                      {isRevealedMine && (
                        <span
                          title="Phát hiện Thủy lôi địch!"
                          className="w-[54%] h-[54%] rounded-full bg-rose-500/75 border border-rose-200 pointer-events-none z-20"
                        />
                      )}

                      {/* 2-Cell Fuel Leak Warning Glow */}
                      {isFuelLeak && !rawShot && (
                        <span
                          title="Vệt tràn nhiên liệu (tàu địch ở ngay sát)"
                          className="absolute inset-[2px] rounded-full bg-amber-400/50 border border-amber-200 animate-pulse pointer-events-none z-20"
                        />
                      )}

                      {/* Maelstrom Vortex Swirl Marker */}
                      {isMaelstrom && !rawShot && (
                        <span
                          title="Vùng Nước Xoáy Ngầm"
                          className="w-[70%] h-[70%] rounded-full border-2 border-dashed border-violet-300 bg-violet-900/60 pointer-events-none z-20"
                        />
                      )}

                      {/* Jammed / Counter-Mine Interference Tile */}
                      {isJammedTile && (
                        <span
                          title="Ô bị nhiễu phản kích"
                          className="absolute inset-0 bg-indigo-400/25 border border-indigo-300/65 pointer-events-none z-10"
                        />
                      )}

                      {/* Queued Salvo_3 Target Index */}
                      {queuedOrder && (
                        <span className="relative z-30 px-1 rounded bg-amber-400 text-slate-950 font-mono-tabular text-[9px] font-extrabold leading-tight pointer-events-none">
                          {queuedOrder}
                        </span>
                      )}

                      {/* Burning Segment DoT Indicator */}
                      {isBurning && (
                        <span
                          title="Đang cháy (chịu sát thương cuối lượt)"
                          className="absolute top-[1px] left-[1px] w-2 h-2 rounded-full bg-orange-400 border border-amber-100 animate-pulse pointer-events-none z-30"
                        />
                      )}

                      {/* Storm Cell Subtle Indicator */}
                      {inStormZone && !rawShot && !isRock && (
                        <span className="absolute top-[1px] right-[1px] w-1.5 h-1.5 rounded-full bg-indigo-300/65 pointer-events-none" />
                      )}

                      {/* Sea Mine Marker (Own Board Only) */}
                      {isMine && (
                        <span
                          title="Thủy lôi"
                          className="relative flex items-center justify-center w-[72%] h-[72%] pointer-events-none z-20"
                        >
                          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-[0_0_5px_rgba(244,63,94,0.85)]">
                            <line x1="12" y1="2" x2="12" y2="22" stroke="#FDA4AF" strokeWidth="2" strokeLinecap="round" />
                            <line x1="2" y1="12" x2="22" y2="12" stroke="#FDA4AF" strokeWidth="2" strokeLinecap="round" />
                            <line x1="5" y1="5" x2="19" y2="19" stroke="#FDA4AF" strokeWidth="1.8" strokeLinecap="round" />
                            <line x1="19" y1="5" x2="5" y2="19" stroke="#FDA4AF" strokeWidth="1.8" strokeLinecap="round" />
                            <circle cx="12" cy="12" r="5.5" fill="#E11D48" stroke="#FFE4E6" strokeWidth="1.5" />
                            <circle cx="10.5" cy="10.5" r="1.4" fill="#FFE4E6" />
                          </svg>
                        </span>
                      )}

                      {/* Decoy Ping Marker (Own Board Only) */}
                      {isDecoy && (
                        <span
                          title="Tín hiệu radar giả"
                          className="w-2.5 h-2.5 rounded-full border-2 border-cyan-300 animate-sonar-pulse pointer-events-none"
                        />
                      )}

                      {/* Recent Target Highlight Ring */}
                      {isRecent && (
                        <span className="absolute inset-[1px] rounded-[3px] border border-amber-300 pointer-events-none shadow-[0_0_8px_rgba(252,211,77,0.75)]" />
                      )}

                      {/* Miss: Crisp Water Splash / Cross */}
                      {shot === 'miss' && (
                        <div className="relative flex items-center justify-center w-full h-full">
                          {isRecent && (
                            <span className="absolute w-5 h-5 rounded-full border-2 border-sky-200 animate-water-ripple pointer-events-none" />
                          )}
                          <svg
                            viewBox="0 0 24 24"
                            className="w-3/5 h-3/5 text-sky-200/75"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="6.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeDasharray="2 2"
                              opacity="0.6"
                            />
                            <path
                              d="M7.5 7.5 L16.5 16.5 M16.5 7.5 L7.5 16.5"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      )}

                      {/* Armor Impact: Flagship Heavy Armor Plate Cracked (still shootable!) */}
                      {shot === 'armor' && (
                        <div className="relative flex items-center justify-center w-full h-full bg-amber-500/15">
                          {isRecent && (
                            <span className="absolute w-6 h-6 rounded-full border-2 border-amber-300 animate-explosion-burst pointer-events-none" />
                          )}
                          <svg
                            viewBox="0 0 24 24"
                            className="w-[62%] h-[62%] text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]"
                          >
                            <path
                              d="M12 3L4 6.5V12c0 4.8 3.4 8.6 8 9.8 4.6-1.2 8-5 8-9.8V6.5L12 3z"
                              fill="rgba(217,119,6,0.45)"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                            <path
                              d="M9 10l3 3 3-3"
                              fill="none"
                              stroke="#FEF08A"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      )}

                      {/* Hit: Explosion Burst & Fiery Impact Marker */}
                      {shot === 'hit' && (
                        <div className="relative flex items-center justify-center w-full h-full">
                          {isRecent && (
                            <span className="absolute w-6 h-6 rounded-full bg-amber-400/70 animate-explosion-burst pointer-events-none" />
                          )}
                          <span className="w-[58%] h-[58%] rounded-full bg-gradient-to-br from-amber-300 via-orange-500 to-red-600 shadow-[0_0_10px_rgba(239,68,68,0.95)] border border-amber-100 flex items-center justify-center">
                            <span className="w-[35%] h-[35%] rounded-full bg-white" />
                          </span>
                        </div>
                      )}

                      {/* Sunk: Destroyed Crosshair */}
                      {shot === 'sunk' && (
                        <div className="relative flex items-center justify-center w-full h-full bg-red-950/45">
                          {isRecent && (
                            <span className="absolute w-7 h-7 rounded-full bg-red-500/75 animate-explosion-burst pointer-events-none" />
                          )}
                          <svg
                            viewBox="0 0 24 24"
                            className="w-[65%] h-[65%] text-red-400"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="7"
                              fill="rgba(185,28,28,0.55)"
                              stroke="currentColor"
                              strokeWidth="2.2"
                            />
                            <path
                              d="M8.5 8.5 L15.5 15.5 M15.5 8.5 L8.5 15.5"
                              stroke="#FCA5A5"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
