// src/components/led-editor-svg/MaskPreviewModal.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { Panel, ScreenGroup } from '@/lib/led-editor-svg/types';
import { renderFullMaskCanvas, exportMaskPNG, exportMaskZIP, ScreenRenderData } from '@/lib/led-editor-svg/mask-export';
import { formatMeters } from '@/lib/led-editor-svg/mask-contour';
import { BuildLegendParams } from '@/lib/led-editor-svg/utils';

interface MaskPreviewModalProps {
  open: boolean;
  onClose: () => void;
  panels: Panel[];
  groups: ScreenGroup[];
  eventName: string;
  pageName?: string;
  legendParams?: Partial<BuildLegendParams>;
}

export default function MaskPreviewModal({
  open,
  onClose,
  panels,
  groups,
  eventName,
  pageName,
  legendParams,
}: MaskPreviewModalProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [totalW, setTotalW] = useState(0);
  const [totalH, setTotalH] = useState(0);
  const [screens, setScreens] = useState<ScreenRenderData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setImgUrl(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    renderFullMaskCanvas(panels, groups).then(res => {
      if (!isMounted) return;
      setImgUrl(res.canvas.toDataURL('image/png'));
      setTotalW(res.totalW);
      setTotalH(res.totalH);
      setScreens(res.screens);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to generate mask preview', err);
      setLoading(false);
    });

    return () => { isMounted = false; };
  }, [open, panels, groups]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative flex flex-col max-w-5xl w-full max-h-[90vh] bg-[#0c0e14] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#090a0f]">
          <div>
            <h2 className="text-base font-semibold text-white">Предпросмотр маски {pageName ? `(${pageName})` : 'экранов'}</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Холст: <span className="font-mono text-cyan-400 font-semibold">{totalW} × {totalH} px</span> • Экранов: {screens.length} • {eventName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.08] transition text-lg"
          >
            ✕
          </button>
        </div>

        {/* Область изображения */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-[#07080b] min-h-[350px]">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-neutral-400 text-xs">
              <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              Генерация маски...
            </div>
          ) : imgUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imgUrl}
              alt="Mask Preview"
              className="max-h-[60vh] max-w-full object-contain rounded-lg border border-white/[0.08] shadow-2xl"
            />
          ) : (
            <div className="text-xs text-neutral-500">Нет данных для отображения</div>
          )}
        </div>

        {/* Список экранов и действия */}
        <div className="px-6 py-3.5 border-t border-white/[0.08] bg-[#090a0f] flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2 text-xs text-neutral-300">
            {screens.map((s, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-lg bg-[#141620] border border-white/[0.06] text-[11px]">
                {s.group.name}: <span className="text-cyan-400 font-mono font-medium">{s.wPx}×{s.hPx} px</span> ({formatMeters(s.wM)}×{formatMeters(s.hM)} м)
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => exportMaskPNG(panels, groups, eventName, pageName)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition flex items-center gap-2"
            >
              Скачать PNG
            </button>
            <button
              onClick={() => exportMaskZIP(panels, groups, eventName, legendParams, pageName)}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[#141620] hover:bg-[#1a1d28] text-white border border-white/[0.08] shadow-sm transition flex items-center gap-2"
            >
              Скачать ZIP
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs text-neutral-400 hover:text-white hover:bg-white/[0.05] transition"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
