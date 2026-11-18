import React, { useState } from 'react';
import { X, Copy, Check, Download, Terminal, FolderArchive } from 'lucide-react';
import pythonAiSource from '../../python_ai/fleet_battle_ai.py?raw';
import { downloadFullVSCodeProjectZip } from '../utils/zipExporter';
import { soundFX } from '../utils/sound';

interface PythonAiModalProps {
  onClose: () => void;
}

const VSCODE_QUICKSTART = `# Bấm nút RUN trên VS Code là tự động mở Web chạy luôn:
#
# Cách 1 (Nhanh nhất): Mở thư mục dự án trong VS Code -> nhấn F5
#   (hoặc bấm nút ▶ "Chạy Web Fleet Battle" trong mục Run & Debug)
#
# Cách 2: Mở file CHAY_WEB_NGAY.py -> bấm nút ▶ (Run) ở góc trên phải
#   -> Tự động cài đặt (lần đầu), bật server & mở trình duyệt vào thẳng game!
#
# Cách 3 (Không cần Node.js): Mở python_ai/fleet_battle_ai.py -> bấm ▶`;

export const PythonAiModal: React.FC<PythonAiModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const [zipStatus, setZipStatus] = useState<string | null>(null);

  const handleCopyCommand = async () => {
    soundFX.playClick();
    try {
      await navigator.clipboard.writeText('node scripts/start-vscode.mjs');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleDownloadPython = () => {
    soundFX.playClick();
    const blob = new Blob([pythonAiSource], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fleet_battle_ai.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadProjectZip = async () => {
    soundFX.playClick();
    const count = await downloadFullVSCodeProjectZip();
    setZipStatus(`Đã đóng gói ${count} file dự án vào fleet-battle-vscode.zip`);
    setTimeout(() => setZipStatus(null), 3500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="python-modal-title"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#0B1E3B] border border-sky-400/30 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-400/20">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-sky-400" />
            <h2 id="python-modal-title" className="font-display text-2xl font-bold text-white tracking-wide">
              Tải Dự Án · Bấm Run Trên VS Code Là Chơi Ngay
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Gói tải về đã tích hợp sẵn file tự khởi động{' '}
            <code className="font-mono-tabular text-amber-300 bg-slate-900/80 px-1.5 py-0.5 rounded">
              CHAY_WEB_NGAY.py
            </code>{' '}
            và{' '}
            <code className="font-mono-tabular text-amber-300 bg-slate-900/80 px-1.5 py-0.5 rounded">
              .vscode/launch.json
            </code>
            . Chỉ cần mở thư mục trong VS Code rồi nhấn <strong>F5</strong> hoặc bấm nút <strong>▶ Run</strong>, máy sẽ tự cài đặt (lần đầu) và mở trình duyệt web vào thẳng game.
          </p>

          <pre className="p-4 rounded-xl bg-[#050E1D] border border-slate-700/80 text-xs font-mono-tabular text-sky-200 overflow-x-auto leading-relaxed">
            {VSCODE_QUICKSTART}
          </pre>

          {zipStatus && (
            <div className="text-xs font-semibold text-emerald-400">
              {zipStatus}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleCopyCommand}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 border border-slate-600/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-sky-400" />}
              <span>{copied ? 'Đã sao chép lệnh' : 'Sao chép lệnh chạy'}</span>
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadPython}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#12305C] hover:bg-[#19407A] text-xs font-semibold text-sky-100 border border-sky-400/35 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4 text-sky-300" />
                <span>Chỉ tải file Python AI</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadProjectZip}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-xs font-bold text-slate-950 shadow-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <FolderArchive className="w-4 h-4" />
                <span>Tải Trọn Bộ Dự Án (.zip)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
