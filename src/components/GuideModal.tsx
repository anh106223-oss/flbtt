import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Bot,
  Compass,
  Crown,
  Flame,
  Shield,
  Sparkles,
  Waves,
  X,
} from 'lucide-react';
import {
  AI_MODES,
  ALL_SHIP_TEMPLATES,
  BATTLE_GOALS,
  FIRING_RULES,
  MAP_MODES,
  MAX_CUSTOM_CELLS,
} from '../data/nationsAndFleets';
import { ALL_OCEAN_EVENT_IDS, OCEAN_EVENTS } from '../data/oceanEvents';
import { ALL_SKILLS, SKILL_CATEGORY_LABELS } from '../data/skills';
import { SkillCategory } from '../types/game';
import { soundFX } from '../utils/sound';

interface GuideModalProps {
  onClose: () => void;
  initialTab?: GuideTab;
}

export type GuideTab = 'MODES' | 'HOW_TO' | 'SKILLS' | 'EVENTS';

export const GuideModal: React.FC<GuideModalProps> = ({
  onClose,
  initialTab = 'MODES',
}) => {
  const [guideTab, setGuideTab] = useState<GuideTab>(initialTab);
  const [skillCat, setSkillCat] = useState<SkillCategory | 'ALL'>('ALL');

  const filteredSkills = useMemo(() => {
    if (skillCat === 'ALL') return ALL_SKILLS;
    return ALL_SKILLS.filter((s) => s.category === skillCat);
  }, [skillCat]);

  const oceanEventList = useMemo(() => Object.values(OCEAN_EVENTS), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          soundFX.playClick();
          onClose();
        }
      }}
    >
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0D213B] border border-sky-300/30 shadow-2xl overflow-hidden text-left">
        {/* Modal Header */}
        <div className="px-5 py-3.5 flex items-center justify-between gap-3 bg-[#102745] border-b border-sky-300/20 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h2
                id="guide-modal-title"
                className="font-display text-xl sm:text-2xl font-bold text-white tracking-wide uppercase leading-none truncate"
              >
                Hướng Dẫn Chỉ Huy · Chế Độ &amp; {ALL_SKILLS.length} Kỹ Năng
              </h2>
              <p className="text-xs text-slate-300 mt-1 truncate">
                Luật xếp tàu, Săn Soái Hạm, Bản đồ Địa hình, {ALL_SKILLS.length} Kỹ năng (6 nhánh) &amp; {ALL_OCEAN_EVENT_IDS.length} Sự kiện Đại dương
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            aria-label="Đóng hướng dẫn"
            className="w-9 h-9 rounded-lg bg-[#09182C] border border-sky-300/25 flex items-center justify-center text-slate-300 hover:text-white hover:border-amber-400/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Guide Navigation Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-[#09182C] border border-sky-300/20">
            {(
              [
                { id: 'MODES', label: '1. Các Chế Độ Đấu', Icon: Crown },
                { id: 'HOW_TO', label: '2. Xếp Tàu & Bản Đồ', Icon: Compass },
                {
                  id: 'SKILLS',
                  label: `3. ${ALL_SKILLS.length} Kỹ Năng Chiến Thuật`,
                  Icon: Sparkles,
                },
                {
                  id: 'EVENTS',
                  label: `4. ${ALL_OCEAN_EVENT_IDS.length} Sự Kiện Đại Dương`,
                  Icon: Waves,
                },
              ] as const
            ).map((t) => {
              const active = guideTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    setGuideTab(t.id);
                  }}
                  className={`flex-1 min-w-[155px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <t.Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: MODES */}
          {guideTab === 'MODES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#0B1C31] border border-amber-400/30 space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
                  <Crown className="w-4 h-4" />
                  <span>Mục Tiêu Chiến Thắng</span>
                </div>
                {BATTLE_GOALS.map((g) => (
                  <div
                    key={g.id}
                    className="p-2.5 rounded-lg bg-[#091527] border border-slate-700/60"
                  >
                    <div className="font-bold text-white">{g.name}</div>
                    <div className="text-slate-300 mt-0.5 leading-relaxed">
                      {g.desc}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-[#0B1C31] border border-emerald-400/30 space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                  <Shield className="w-4 h-4" />
                  <span>2 Chế Độ Bản Đồ</span>
                </div>
                {MAP_MODES.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg bg-[#091527] border border-slate-700/60"
                  >
                    <div className="font-bold text-white">{m.name}</div>
                    <div className="text-slate-300 mt-0.5 leading-relaxed">
                      {m.desc}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-[#0B1C31] border border-sky-400/30 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-sky-300">
                  <Flame className="w-4 h-4" />
                  <span>4 Luật Khai Hỏa</span>
                </div>
                <ul className="space-y-1.5 text-slate-200">
                  {FIRING_RULES.map((fr) => (
                    <li
                      key={fr.id}
                      className="p-2 rounded-lg bg-[#091527] border border-slate-700/50"
                    >
                      <strong className="text-sky-200">{fr.name}</strong>
                      <span className="text-slate-300 block text-[11px] mt-0.5">
                        {fr.id === 'SINGLE'
                          ? 'Mỗi lượt bắn 1 phát duy nhất trước khi đổi lượt.'
                          : fr.id === 'STREAK'
                            ? 'Bắn trúng tàu/giáp được quyền bắn tiếp liên tục cho tới khi trượt.'
                            : fr.id === 'SALVO_3'
                              ? 'Khai hỏa tối đa 3 phát mỗi lượt (tùy số tàu còn sống).'
                              : 'Hỏa lực dồn dập tối đa 5 phát mỗi lượt.'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#0B1C31] border border-indigo-400/30 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-300">
                  <Bot className="w-4 h-4" />
                  <span>5 Cấp Độ AI &amp; Cân Bằng</span>
                </div>
                <div className="space-y-1.5">
                  {AI_MODES.map((ai) => (
                    <div
                      key={ai.level}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#091527] border border-slate-700/50"
                    >
                      <span className="font-bold text-white">
                        {ai.level}. {ai.name}
                      </span>
                      <span className="text-[11px] font-mono-tabular text-sky-300 text-right">
                        {ai.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HOW TO PLAY & FLEET RULES */}
          {guideTab === 'HOW_TO' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#0B1C31] border border-sky-300/25 space-y-2.5">
                <h3 className="text-sm font-bold text-amber-300">
                  Quy Tắc Đội Hình Tàu (Mặc Định vs Tự Chọn)
                </h3>
                <div className="p-3 rounded-lg bg-[#091527] border border-slate-700/60 space-y-1">
                  <div className="font-bold text-white">
                    1. Đội hình Mặc định quốc gia (Khóa gốc · Max {MAX_CUSTOM_CELLS} ô)
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Các tàu mặc định của quốc gia (~59–62 ô) được{' '}
                    <strong className="text-amber-300">cố định không thể gỡ bỏ</strong>.
                    Bạn có thể thêm{' '}
                    <strong className="text-emerald-300">
                      không giới hạn số lượng tàu phụ bên dưới
                    </strong>{' '}
                    sao cho tổng số ô toàn hạm đội không vượt quá{' '}
                    <strong className="text-sky-300">{MAX_CUSTOM_CELLS} ô</strong>.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#091527] border border-slate-700/60 space-y-1">
                  <div className="font-bold text-white">
                    2. Tự chọn tàu tự do (Max {MAX_CUSTOM_CELLS} ô)
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Tự do thêm/bớt bất kỳ mẫu tàu nào trong{' '}
                    <strong className="text-sky-300">
                      {ALL_SHIP_TEMPLATES.length} dáng tàu (từ 1 đến 8 ô)
                    </strong>{' '}
                    đến tối đa {MAX_CUSTOM_CELLS} ô. AI tự động cân bằng số tàu &amp; tổng số ô tương đương bạn.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0B1C31] border border-sky-300/25 space-y-2.5">
                <h3 className="text-sm font-bold text-sky-300">
                  Trình Tự Vào Trận &amp; Chọn Soái Hạm
                </h3>
                <ul className="space-y-2 text-slate-300 leading-relaxed">
                  <li className="p-2.5 rounded-lg bg-[#091527] border border-slate-700/60">
                    <strong className="text-white">Bước 1 · Chọn Soái Hạm (Nếu bật Săn Soái Hạm):</strong>{' '}
                    Bấm nút <strong className="text-amber-300">Chọn Soái Hạm 👑</strong> ngay tại danh sách tàu ở Thiết lập hoặc màn hình Xếp tàu để chỉ định chiến hạm giữ 3 lớp giáp dày.
                  </li>
                  <li className="p-2.5 rounded-lg bg-[#091527] border border-slate-700/60">
                    <strong className="text-white">Bước 2 · Đặt Địa hình (Chế độ Địa Hình):</strong>{' '}
                    Mỗi bên đặt 8 Đá ngầm 1×1 (hiển thị, chặn tàu) &amp; 8 Thủy lôi 1×1 (ẩn) lên vùng biển đối phương.
                  </li>
                  <li className="p-2.5 rounded-lg bg-[#091527] border border-slate-700/60">
                    <strong className="text-white">Bước 3 · Xếp Tàu &amp; Khai Hỏa:</strong>{' '}
                    Kéo thả trực tiếp tàu từ danh sách hoặc ngay trên lưới 18×18, bấm <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-amber-300">R</kbd> hoặc chuột phải để xoay 90°.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: 120 TACTICAL SKILLS */}
          {guideTab === 'SKILLS' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-300">
                  Mỗi trận bạn mang theo <strong>10 kỹ năng</strong> chọn tự do từ <strong>{ALL_SKILLS.length} kỹ năng</strong> thuộc 6 nhánh chiến thuật (mỗi nhánh 14 chủ động + 6 bị động):
                </span>
                <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#09182C] border border-slate-700/70">
                  <button
                    type="button"
                    onClick={() => setSkillCat('ALL')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                      skillCat === 'ALL'
                        ? 'bg-sky-400 text-slate-950'
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
                        onClick={() => setSkillCat(cat)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                          skillCat === cat
                            ? 'bg-amber-400 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {SKILL_CATEGORY_LABELS[cat]}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                {filteredSkills.map((sk) => (
                  <div
                    key={sk.id}
                    className="p-3 rounded-xl bg-[#0B1C31] border border-sky-300/20 flex flex-col justify-between gap-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-xs text-white leading-snug">
                        <span className="text-sky-300 font-mono-tabular mr-1">
                          #{String(sk.code).padStart(2, '0')}
                        </span>
                        {sk.name}
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono-tabular font-bold shrink-0 ${
                          sk.kind === 'PASSIVE'
                            ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-200'
                            : 'bg-amber-500/20 border border-amber-400/40 text-amber-200'
                        }`}
                      >
                        {sk.kind === 'PASSIVE'
                          ? 'Bị động'
                          : `CD ${sk.cooldown}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      {sk.shortDesc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: 7 OCEAN EVENTS */}
          {guideTab === 'EVENTS' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-200 leading-relaxed">
                Khi bật <strong>Sự Kiện Đại Dương Ngẫu Nhiên</strong>,{' '}
                <strong className="text-amber-300">cả {ALL_OCEAN_EVENT_IDS.length} sự kiện</strong>{' '}
                đều sẽ xuất hiện ngẫu nhiên trong cùng 1 ván đấu, bắt đầu từ lượt{' '}
                <strong className="text-sky-300">10–20</strong> và các sự kiện kế tiếp cách nhau ngẫu nhiên{' '}
                <strong className="text-emerald-300">8–15 lượt</strong> trên 2 bàn:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {oceanEventList.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-[#0B1C31] border border-indigo-300/25 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">
                        {ev.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/25 border border-indigo-300/35 text-[10px] font-mono-tabular text-indigo-200 shrink-0">
                        {ev.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      {ev.shortDesc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
