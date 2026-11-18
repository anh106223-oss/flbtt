import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bomb,
  CheckCircle2,
  Mountain,
  Shuffle,
  Trash2,
} from 'lucide-react';
import {
  COL_LABELS,
  GRID_SIZE,
  MAX_MAP_MINES,
  MAX_MAP_ROCKS,
} from '../data/nationsAndFleets';
import { PlayerSetup } from '../types/game';
import { coordKey, generateRandomHazards } from '../utils/fleetLogic';
import { NationFlag } from './NationFlag';
import { soundFX } from '../utils/sound';

interface HazardPlacementPhaseProps {
  placerSetup: PlayerSetup;
  targetSetup: PlayerSetup;
  initialRocks?: string[];
  initialMines?: string[];
  isVsAI: boolean;
  onBack: () => void;
  onConfirmHazards: (rocks: string[], mapMines: string[]) => void;
}

export const HazardPlacementPhase: React.FC<HazardPlacementPhaseProps> = ({
  placerSetup,
  targetSetup,
  initialRocks = [],
  initialMines = [],
  isVsAI,
  onBack,
  onConfirmHazards,
}) => {
  const [rocks, setRocks] = useState<string[]>(initialRocks);
  const [mapMines, setMapMines] = useState<string[]>(initialMines);
  const [brush, setBrush] = useState<'ROCK' | 'MINE'>('ROCK');
  const [hovered, setHovered] = useState<{ r: number; c: number } | null>(null);

  const handleToggleCell = (r: number, c: number) => {
    const k = coordKey(r, c);
    const hasRock = rocks.includes(k);
    const hasMine = mapMines.includes(k);

    if (brush === 'ROCK') {
      if (hasRock) {
        soundFX.playClick();
        setRocks((prev) => prev.filter((x) => x !== k));
      } else if (rocks.length < MAX_MAP_ROCKS) {
        soundFX.playPlace();
        setRocks((prev) => [...prev, k]);
        if (hasMine) setMapMines((prev) => prev.filter((x) => x !== k));
        if (rocks.length + 1 === MAX_MAP_ROCKS && mapMines.length < MAX_MAP_MINES) {
          setBrush('MINE');
        }
      }
    } else {
      if (hasMine) {
        soundFX.playClick();
        setMapMines((prev) => prev.filter((x) => x !== k));
      } else if (mapMines.length < MAX_MAP_MINES) {
        soundFX.playPlace();
        setMapMines((prev) => [...prev, k]);
        if (hasRock) setRocks((prev) => prev.filter((x) => x !== k));
      }
    }
  };

  const handleRandomFill = () => {
    soundFX.playPlace();
    const h = generateRandomHazards(MAX_MAP_ROCKS, MAX_MAP_MINES);
    setRocks(h.rocks);
    setMapMines(h.mapMines);
  };

  const handleClearAll = () => {
    soundFX.playClick();
    setRocks([]);
    setMapMines([]);
    setBrush('ROCK');
  };

  const ready = rocks.length === MAX_MAP_ROCKS && mapMines.length === MAX_MAP_MINES;

  return (
    <div className="min-h-screen w-full flex flex-col px-4 py-4 sm:px-8 sm:py-5">
      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col">
        {/* Header */}
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

            <div className="flex items-center gap-3">
              <NationFlag nationId={placerSetup.nationId} className="w-9 h-6" />
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                  Bước 1: Xếp Địa Hình Lên Bản Đồ {targetSetup.name}
                </h1>
                <p className="text-xs text-slate-300">
                  {placerSetup.name} chọn {MAX_MAP_ROCKS} ô Đá 1×1 &amp; {MAX_MAP_MINES} ô Thủy Lôi 1×1 trước khi xếp tàu.
                  {isVsAI
                    ? ' (AI đồng thời bí mật rải 8 đá + 8 thủy lôi lên bản đồ của bạn)'
                    : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRandomFill}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0D2548] border border-emerald-400/40 text-xs font-semibold text-emerald-200 hover:bg-[#143566] cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Rải nhanh 8+8</span>
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0D2548] border border-slate-600/60 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Xóa hết</span>
            </button>
          </div>
        </header>

        {/* Main Workspace */}
        <div className="flex-1 py-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: 18x18 Hazard Map Grid */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full max-w-[600px] space-y-2.5">
              <div className="relative h-9 w-full overflow-hidden rounded-t-2xl bg-gradient-to-b from-[#071D3B] via-[#0B2A54] to-[#0E3668] border-x border-t border-sky-400/35 flex items-center justify-between px-3.5">
                <span className="text-xs font-display font-bold tracking-wider uppercase text-sky-100 truncate">
                  Bản đồ {targetSetup.name} · {GRID_SIZE}×{GRID_SIZE}
                </span>
                <span className="text-xs font-mono-tabular font-bold text-amber-300">
                  {hovered ? `${COL_LABELS[hovered.c]}${hovered.r + 1}` : `${GRID_SIZE}×${GRID_SIZE}`}
                </span>
              </div>

              <div
                className="relative p-2 sm:p-2.5 rounded-b-2xl bg-gradient-to-b from-[#0A264A]/95 to-[#061831]/95 border border-sky-400/35 shadow-[0_18px_45px_rgba(0,0,0,0.65)] -mt-2.5 select-none"
                onMouseLeave={() => setHovered(null)}
              >
                <div className="grid grid-cols-[20px_1fr] sm:grid-cols-[24px_1fr] gap-1 mb-1">
                  <div />
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                    }}
                  >
                    {COL_LABELS.map((col, idx) => (
                      <div
                        key={col}
                        className={`text-center font-mono-tabular text-[10px] font-bold leading-none ${
                          hovered?.c === idx ? 'text-amber-300' : 'text-sky-300/75'
                        }`}
                      >
                        {col}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-[20px_1fr] sm:grid-cols-[24px_1fr] gap-1">
                  <div
                    className="grid"
                    style={{
                      gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                    }}
                  >
                    {Array.from({ length: GRID_SIZE }, (_, r) => (
                      <div
                        key={r}
                        className={`flex items-center justify-center font-mono-tabular text-[10px] font-bold leading-none ${
                          hovered?.r === r ? 'text-amber-300' : 'text-sky-300/75'
                        }`}
                      >
                        {r + 1}
                      </div>
                    ))}
                  </div>

                  <div
                    className="grid aspect-square w-full bg-gradient-to-br from-[#0F427A] via-[#0B305C] to-[#061E3F] rounded-xl overflow-hidden border border-sky-300/45 shadow-[inset_0_0_24px_rgba(2,12,27,0.65)]"
                    style={{
                      gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                    }}
                  >
                    {Array.from({ length: GRID_SIZE }, (_, r) =>
                      Array.from({ length: GRID_SIZE }, (_, c) => {
                        const k = coordKey(r, c);
                        const isRock = rocks.includes(k);
                        const isMine = mapMines.includes(k);
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => handleToggleCell(r, c)}
                            onMouseEnter={() => setHovered({ r, c })}
                            className={`border-[0.5px] border-sky-300/18 flex items-center justify-center transition-colors cursor-pointer ${
                              isRock
                                ? 'bg-stone-800/75 hover:bg-stone-700/80'
                                : isMine
                                  ? 'bg-rose-950/60 hover:bg-rose-900/70'
                                  : brush === 'ROCK'
                                    ? 'hover:bg-stone-400/25'
                                    : 'hover:bg-rose-400/25'
                            }`}
                          >
                            {isRock && (
                              <svg viewBox="0 0 24 24" className="w-[84%] h-[84%] drop-shadow">
                                <polygon
                                  points="4,19 2,13 7,5 15,3 21,9 22,17 16,21 7,21"
                                  fill="#57534E"
                                  stroke="#A8A29E"
                                  strokeWidth="1.5"
                                />
                                <polygon points="7,6 14,4 18,10 12,13 6,11" fill="#78716C" />
                              </svg>
                            )}
                            {isMine && (
                              <svg viewBox="0 0 24 24" className="w-[74%] h-[74%] drop-shadow-[0_0_5px_rgba(244,63,94,0.85)]">
                                <line x1="12" y1="2" x2="12" y2="22" stroke="#FDA4AF" strokeWidth="2" strokeLinecap="round" />
                                <line x1="2" y1="12" x2="22" y2="12" stroke="#FDA4AF" strokeWidth="2" strokeLinecap="round" />
                                <line x1="5" y1="5" x2="19" y2="19" stroke="#FDA4AF" strokeWidth="1.8" strokeLinecap="round" />
                                <line x1="19" y1="5" x2="5" y2="19" stroke="#FDA4AF" strokeWidth="1.8" strokeLinecap="round" />
                                <circle cx="12" cy="12" r="5.5" fill="#E11D48" stroke="#FFE4E6" strokeWidth="1.5" />
                              </svg>
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

          {/* Right: Controls & Rules */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0B2040]/95 border border-sky-400/25 shadow-xl space-y-4">
              <h2 className="font-display text-2xl font-bold text-white tracking-wide">
                Chọn Loại Địa Hình (Bấm Lên Lưới)
              </h2>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    setBrush('ROCK');
                  }}
                  className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    brush === 'ROCK'
                      ? 'bg-stone-600/35 border-stone-200 shadow-md'
                      : 'bg-[#07152B]/85 border-slate-700/70 hover:border-stone-400/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-400/50 flex items-center justify-center text-stone-200 shrink-0">
                      <Mountain className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">
                        1. Đá Ngầm 1×1 (Hiển thị)
                      </div>
                      <div className="text-xs text-stone-300">
                        Chặn không cho tàu đặt lên ô này
                      </div>
                    </div>
                  </div>
                  <span
                    className={`font-mono-tabular text-lg font-bold ${
                      rocks.length === MAX_MAP_ROCKS ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {rocks.length}/{MAX_MAP_ROCKS}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    setBrush('MINE');
                  }}
                  className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    brush === 'MINE'
                      ? 'bg-rose-500/20 border-rose-400 shadow-md'
                      : 'bg-[#07152B]/85 border-slate-700/70 hover:border-rose-400/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-400/60 flex items-center justify-center text-rose-300 shrink-0">
                      <Bomb className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">
                        2. Thủy Lôi 1×1 (Ẩn đi khi xếp tàu)
                      </div>
                      <div className="text-xs text-rose-200/90">
                        Đối phương đặt tàu đè trúng sẽ nổ &amp; bị bắn trúng khi vào trận
                      </div>
                    </div>
                  </div>
                  <span
                    className={`font-mono-tabular text-lg font-bold ${
                      mapMines.length === MAX_MAP_MINES ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {mapMines.length}/{MAX_MAP_MINES}
                  </span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[#07152B]/90 border border-sky-400/20 text-xs text-slate-300 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-sky-200">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Quy tắc địa hình trước trận:</span>
                </div>
                <p>• Bạn xếp 8 Đá &amp; 8 Thủy Lôi lên bản đồ của {targetSetup.name}.</p>
                <p>• Khi chuyển sang bước Xếp Tàu: <strong>Đá hiển thị</strong> trên lưới, còn <strong>Thủy lôi sẽ được ẩn hoàn toàn</strong>.</p>
                <p>• Nếu tàu đặt nhầm đè lên thủy lôi ẩn, các ô đó sẽ hiển thị <strong>bị bắn trúng</strong> ngay lúc vào trận!</p>
              </div>

              <button
                type="button"
                disabled={!ready}
                onClick={() => {
                  soundFX.playClick();
                  onConfirmHazards(rocks, mapMines);
                }}
                className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400 text-slate-950 font-display text-xl font-bold tracking-wide shadow-lg cursor-pointer disabled:cursor-not-allowed transition-all"
              >
                <span>
                  {ready
                    ? 'Xác nhận địa hình · Sang Xếp Tàu'
                    : `Cần xếp đủ ${MAX_MAP_ROCKS} Đá & ${MAX_MAP_MINES} Thủy lôi`}
                </span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
