import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Code2,
  Sliders,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import navalFleetHeroImg from '../assets/images/naval_fleet_island_hero_1794923914170.jpg';
import {
  ALL_SHIP_TEMPLATES,
  GRID_SIZE,
  MAX_CUSTOM_CELLS,
} from '../data/nationsAndFleets';
import { GameMode } from '../types/game';
import { soundFX } from '../utils/sound';
import { GuideModal } from './GuideModal';

interface TitleScreenProps {
  onSelectMode: (mode: GameMode) => void;
  onOpenPythonModal: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onSelectMode,
  onOpenPythonModal,
  muted,
  onToggleMute,
}) => {
  const [showGuide, setShowGuide] = useState<boolean>(false);

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden px-4 py-5 sm:px-8 sm:py-7">
      {/* Top minimal utility strip */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between gap-3">
        <div className="text-xs font-medium tracking-wider text-sky-200/90 uppercase drop-shadow">
          Hải chiến {GRID_SIZE}×{GRID_SIZE} · 15 Quốc gia
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              setShowGuide(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F2744]/90 border border-amber-400/45 text-xs font-semibold text-amber-200 hover:bg-[#16355C] hover:border-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Hướng dẫn</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onOpenPythonModal();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0F2744]/90 border border-sky-300/30 text-xs font-medium text-sky-200 hover:bg-[#16355C] hover:border-sky-300/50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Code2 className="w-4 h-4 text-sky-400" />
            <span>Tải Dự Án · VS Code</span>
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#0F2744]/90 border border-sky-300/30 text-sky-200 hover:bg-[#16355C] transition-colors cursor-pointer shrink-0"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-slate-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-sky-300" />
            )}
          </button>
        </div>
      </div>

      {/* Main Focal Anchor */}
      <main className="max-w-5xl w-full mx-auto py-5 flex flex-col items-center text-center">
        {/* Photorealistic Naval Fleet & Island Strategic Showcase */}
        <div className="w-full max-w-3xl mb-5 relative rounded-2xl overflow-hidden border border-sky-300/25 shadow-[0_22px_50px_rgba(4,12,24,0.7)] bg-[#0A192E]">
          <img
            src={navalFleetHeroImg}
            alt="Biên đội tàu chiến hiện đại tuần tra qua đảo quân sự chiến lược"
            referrerPolicy="no-referrer"
            className="w-full aspect-[16/9] max-h-[300px] object-cover object-center brightness-95 contrast-[1.03] select-none"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B1726] via-transparent to-[#0B1726]/35"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0B1726]/45 via-transparent to-[#0B1726]/45"
          />
        </div>

        {/* Brand Lockup */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-2.5">
          <h1 className="font-display text-5xl sm:text-7xl font-extrabold tracking-tight text-white leading-none uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
            FLEET BATTLE
          </h1>
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-3.5 py-1.5 rounded-md shadow-lg transform -skew-x-6">
            <span className="font-display text-lg sm:text-xl font-bold text-slate-950 tracking-wider uppercase block skew-x-6">
              15 Quốc Gia · {ALL_SHIP_TEMPLATES.length} Dáng Tàu
            </span>
          </div>
        </div>

        <p className="max-w-2xl text-slate-200 text-sm sm:text-base mb-6 drop-shadow">
          Bàn cờ {GRID_SIZE}×{GRID_SIZE} · Tối đa {MAX_CUSTOM_CELLS} ô (Mặc định + tàu phụ không giới hạn / Tự chọn) · Săn Soái Hạm · Đá ngầm &amp; Thủy lôi · 7 Sự kiện Đại dương.
        </p>

        {/* Strictly 2 Game Modes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onSelectMode('VS_AI');
            }}
            className="group relative text-left p-5 rounded-2xl bg-gradient-to-b from-[#122D4E]/95 to-[#0C1F38]/95 border border-sky-300/30 hover:border-amber-400/80 hover:from-[#173961] hover:to-[#0F2644] transition-all duration-200 shadow-2xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono-tabular font-semibold text-amber-300">
                5 Cấp độ AI
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white tracking-wide mb-1.5">
              Chơi với Máy (AI)
            </h2>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
              <span>Thiết lập trận đấu</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onSelectMode('PASS_AND_PLAY');
            }}
            className="group relative text-left p-5 rounded-2xl bg-gradient-to-b from-[#122D4E]/95 to-[#0C1F38]/95 border border-sky-300/30 hover:border-sky-400/90 hover:from-[#173961] hover:to-[#0F2644] transition-all duration-200 shadow-2xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-400/35 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono-tabular font-semibold text-sky-300">
                1 Thiết bị · 2 Người
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white tracking-wide mb-1.5">
              Hai Người Chơi
            </h2>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-sky-400 group-hover:translate-x-1 transition-transform">
              <span>Tùy chỉnh 2 hạm đội</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* Hint + Quick Guide Button */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>Kéo thả trực tiếp trên bàn cờ · Phím R để xoay tàu · Chọn Soái Hạm theo ý muốn</span>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              setShowGuide(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-400/45 text-amber-200 font-semibold hover:bg-amber-500/25 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Mở Bảng Hướng Dẫn</span>
          </button>
        </div>
      </main>

      <div className="h-2" />

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
};
