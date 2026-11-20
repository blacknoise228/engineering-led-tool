'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ProjectionComputed, MaskExportConfig, MaskExportStyle } from '@/lib/projection/types';
import {
  renderFullCanvasMask,
  renderProjectorSliceMask,
  exportCanvasPNG,
  exportSlicePNG,
  exportAllMasksZIP,
} from '@/lib/projection/projection-mask-export';
import { useI18n } from '@/lib/i18n';

interface ProjectionMaskModalProps {
  computed: ProjectionComputed;
  isOpen: boolean;
  onClose: () => void;
  eventName?: string;
  onEventNameChange?: (name: string) => void;
}

export default function ProjectionMaskModal({
  computed,
  isOpen,
  onClose,
  eventName = '',
  onEventNameChange,
}: ProjectionMaskModalProps) {
  const { t, language } = useI18n();
  const [selectedTarget, setSelectedTarget] = useState<'canvas' | string>('canvas');
  const [style, setStyle] = useState<MaskExportStyle>('engineering');
  const [showGrid, setShowGrid] = useState(true);
  const [showTargets, setShowTargets] = useState(true);
  const [showBlendZones, setShowBlendZones] = useState(true);
  const [showWallBounds, setShowWallBounds] = useState(true);
  const [showSliceLabels, setShowSliceLabels] = useState(true);
  const [showInfoStamp, setShowInfoStamp] = useState(true);
  const [customEvent, setCustomEvent] = useState(eventName);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setCustomEvent(eventName);
  }, [eventName]);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const config: MaskExportConfig = useMemo(
    () => ({
      style,
      showGrid,
      showTargets,
      showBlendZones,
      showWallBounds,
      showSliceLabels,
      showInfoStamp,
      eventName: customEvent,
      lang: language,
    }),
    [style, showGrid, showTargets, showBlendZones, showWallBounds, showSliceLabels, showInfoStamp, customEvent, language]
  );

  useEffect(() => {
    if (!isOpen || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (selectedTarget === 'canvas') {
      canvas.width = computed.totalCanvasPxW;
      canvas.height = computed.totalCanvasPxH;
      renderFullCanvasMask(ctx, computed, config);
    } else {
      const slice = computed.slices.find((s) => s.zoneId === selectedTarget);
      if (slice) {
        canvas.width = slice.width;
        canvas.height = slice.height;
        renderProjectorSliceMask(ctx, slice, computed, config);
      }
    }
  }, [isOpen, selectedTarget, config, computed]);

  if (!isOpen) return null;

  const currentSlice = computed.slices.find((s) => s.zoneId === selectedTarget);

  const handleExportCanvas = async () => {
    setIsExporting(true);
    try {
      await exportCanvasPNG(computed, config);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSlice = async () => {
    if (!currentSlice) return;
    setIsExporting(true);
    try {
      await exportSlicePNG(currentSlice, computed, config);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportZIP = async () => {
    setIsExporting(true);
    try {
      await exportAllMasksZIP(computed, config);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
      <div className="bg-[#0c0e14] border border-white/[0.1] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#090a0f]">
          <div>
            <h2 className="text-base font-semibold text-white">
              {t('projection.mask.title')}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {t('projection.kpi.compositeCanvas')}: {computed.totalCanvasPxW}×{computed.totalCanvasPxH} px • {computed.cols}×{computed.rows} ({computed.totalPhysicalProjectors} {language === 'en' ? 'units' : 'шт.'})
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.08] transition text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 bg-[#0c0e14]">
          {/* Controls Column */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="bg-[#10121a] border border-white/[0.06] rounded-xl p-3.5 space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 block">
                {t('projection.mask.selectSlice')}
              </label>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                className="w-full bg-[#141721] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-cyan-500/50"
              >
                <option value="canvas">
                  {t('projection.mask.downloadCanvas')} ({computed.totalCanvasPxW}×{computed.totalCanvasPxH} px)
                </option>
                {computed.slices.map((s) => (
                  <option key={s.zoneId} value={s.zoneId}>
                    {s.zoneId} ({s.width}×{s.height} px, [{s.startX}, {s.startY}])
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-[#10121a] border border-white/[0.06] rounded-xl p-3.5 space-y-2">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 block">
                {t('projection.mask.style')}:
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-[11px] font-medium">
                {(['engineering', 'alpha', 'blendRamp'] as MaskExportStyle[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStyle(st)}
                    className={`py-1.5 px-2 rounded-lg border text-center transition ${
                      style === st
                        ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 font-semibold shadow-sm'
                        : 'bg-[#141620] text-neutral-400 border-white/[0.06] hover:text-white'
                    }`}
                  >
                    {st === 'engineering'
                      ? t('projection.mask.styleEng')
                      : st === 'alpha'
                      ? t('projection.mask.styleMatte')
                      : t('projection.mask.styleBlend')}
                  </button>
                ))}
              </div>
            </div>

            {style !== 'alpha' && (
              <div className="bg-[#10121a] border border-white/[0.06] rounded-xl p-3.5 space-y-2 text-xs">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1">
                  {t('projection.mask.layers')}:
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white">
                  <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} className="rounded border-white/20 bg-neutral-900 text-blue-500 focus:ring-0" />
                  <span>{t('projection.mask.layerGrid')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white">
                  <input type="checkbox" checked={showTargets} onChange={(e) => setShowTargets(e.target.checked)} className="rounded border-white/20 bg-neutral-900 text-blue-500 focus:ring-0" />
                  <span>{t('projection.mask.layerCircles')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white">
                  <input type="checkbox" checked={showBlendZones} onChange={(e) => setShowBlendZones(e.target.checked)} className="rounded border-white/20 bg-neutral-900 text-blue-500 focus:ring-0" />
                  <span>{t('projection.mask.layerBlend')} ({computed.blendPxW} px)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white">
                  <input type="checkbox" checked={showWallBounds} onChange={(e) => setShowWallBounds(e.target.checked)} className="rounded border-white/20 bg-neutral-900 text-blue-500 focus:ring-0" />
                  <span>{t('projection.mask.layerOutline')} ({computed.wallW}×{computed.wallH} {language === 'en' ? 'm' : 'м'})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white">
                  <input type="checkbox" checked={showSliceLabels} onChange={(e) => setShowSliceLabels(e.target.checked)} className="rounded border-white/20 bg-neutral-900 text-blue-500 focus:ring-0" />
                  <span>{t('projection.mask.layerIds')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white">
                  <input type="checkbox" checked={showInfoStamp} onChange={(e) => setShowInfoStamp(e.target.checked)} className="rounded border-white/20 bg-neutral-900 text-blue-500 focus:ring-0" />
                  <span>{t('projection.mask.layerBadge')}</span>
                </label>
              </div>
            )}

            <div className="bg-[#10121a] border border-white/[0.06] rounded-xl p-3.5 space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 block">Project / Event Name:</label>
              <input
                type="text"
                value={customEvent}
                onChange={(e) => {
                  setCustomEvent(e.target.value);
                  onEventNameChange?.(e.target.value);
                }}
                placeholder="Show / Event Name"
                className="w-full bg-[#141721] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
          {/* Preview Column */}
          <div className="lg:col-span-7 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
              <span>Preview:</span>
              <span className="text-cyan-400 font-semibold">
                {selectedTarget === 'canvas'
                  ? `${computed.totalCanvasPxW} × ${computed.totalCanvasPxH} px`
                  : `${currentSlice?.width} × ${currentSlice?.height} px (${selectedTarget})`}
              </span>
            </div>

            <div className="w-full h-[320px] sm:h-[380px] bg-[#07080b] rounded-xl border border-white/[0.08] flex items-center justify-center p-3 overflow-hidden relative shadow-inner">
              <canvas
                ref={previewCanvasRef}
                className="max-w-full max-h-full object-contain rounded border border-white/[0.06] shadow-xl"
              />
            </div>

            <div className="p-3 bg-[#10121a] rounded-xl border border-white/[0.06] text-xs text-neutral-400 leading-relaxed space-y-1">
              <div>
                • <b className="text-neutral-200">{t('projection.mask.downloadCanvas')}</b>: {language === 'en' ? 'Single composite canvas for Resolume Arena / disguise.' : 'Единая маска всего холста для медиасервера.'}
              </div>
              <div>
                • <b className="text-neutral-200">{t('projection.mask.downloadZip')}</b>: {language === 'en' ? 'All projector slices + composite + specification txt.' : 'Все слайсы проекторов + общий холст + ТЗ спецификация.'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 bg-[#090a0f]">
          <div className="text-xs font-mono text-neutral-500">
            PNG 24-bit RGB
          </div>

          <div className="flex items-center gap-2.5">
            {selectedTarget !== 'canvas' && currentSlice && (
              <button
                type="button"
                onClick={handleExportSlice}
                disabled={isExporting}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-[#141620] hover:bg-[#1b1e2b] text-neutral-200 border border-white/[0.08] transition disabled:opacity-50"
              >
                {t('projection.mask.downloadSlice', { name: currentSlice.zoneId })}
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCanvas}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[#141620] hover:bg-[#1b1e2b] text-neutral-200 border border-white/[0.08] transition disabled:opacity-50"
            >
              {t('projection.mask.downloadCanvas')}
            </button>

            <button
              type="button"
              onClick={handleExportZIP}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>{t('projection.mask.downloadZip')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
