'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  MaskLogoConfig,
  DEFAULT_MASK_LOGO_CONFIG,
  DEFAULT_MASK_LOGO_URL,
} from '@/lib/led-editor-svg/types';
import { computeBadgeLogoRect, OCT_POINTS } from '@/lib/led-editor-svg/mask-contour';
import { showToast } from '@/lib/desktop';
import { useI18n } from '@/lib/i18n';

interface MaskLogoModalProps {
  open: boolean;
  onClose: () => void;
  config: MaskLogoConfig;
  onSaveConfig: (newConfig: MaskLogoConfig) => void;
}

export default function MaskLogoModal({
  open,
  onClose,
  config,
  onSaveConfig,
}: MaskLogoModalProps) {
  const { language, t } = useI18n();
  const [draft, setDraft] = useState<MaskLogoConfig>(config);
  const draftRef = useRef<MaskLogoConfig>(config);
  draftRef.current = draft;
  const [initialConfig, setInitialConfig] = useState<MaskLogoConfig>(config);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  useEffect(() => {
    if (open) {
      const normalized: MaskLogoConfig = {
        ...DEFAULT_MASK_LOGO_CONFIG,
        ...config,
      };
      draftRef.current = normalized;
      setDraft(normalized);
      setInitialConfig(normalized);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSaveConfig(initialConfig);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, initialConfig, onSaveConfig, onClose]);

  const updateDraft = (patch: Partial<MaskLogoConfig>) => {
    const prev = draftRef.current;
    const next: MaskLogoConfig = {
      ...prev,
      ...patch,
      scale: Math.max(0.2, Math.min(3.0, Math.round(((patch.scale ?? prev.scale) || 1) * 100) / 100)),
      offsetX: Math.max(-45, Math.min(45, Math.round(patch.offsetX ?? prev.offsetX))),
      offsetY: Math.max(-20, Math.min(60, Math.round(patch.offsetY ?? prev.offsetY))),
    };
    draftRef.current = next;
    setDraft(next);
    onSaveConfig(next);
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast(t('toast.selectImageWarning'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (dataUrl) {
        updateDraft({
          customLogoDataUrl: dataUrl,
          customLogoFileName: file.name,
        });
        showToast(t('toast.customLogoSet'));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetToAppLogo = () => {
    updateDraft({
      customLogoDataUrl: '',
      customLogoFileName: '',
    });
    showToast(t('toast.defaultLogoRestored'));
  };

  const handleResetTransform = () => {
    updateDraft({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });
  };

  const previewW = 320;
  const previewH = 320;
  const octSide = 220;
  const baseFs = Math.round(octSide / 9);
  const badgeCx = previewW / 2;
  const badgeCy = previewH / 2;
  const ox = badgeCx - octSide / 2;
  const oy = badgeCy - octSide / 2;

  const octPointsStr = OCT_POINTS
    .map(([px, py]) => `${ox + px * octSide},${oy + py * octSide}`)
    .join(' ');

  const logoRect = computeBadgeLogoRect(octSide, badgeCx, oy, draft);
  const hasCustomLogo = Boolean(draft.customLogoDataUrl && draft.customLogoDataUrl.trim());

  const onLogoMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLogo(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startOffsetX: draft.offsetX,
      startOffsetY: draft.offsetY,
    };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragStartRef.current || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = previewW / (rect.width || previewW);
      const scaleY = previewH / (rect.height || previewH);

      const dxSvg = (ev.clientX - dragStartRef.current.clientX) * scaleX;
      const dySvg = (ev.clientY - dragStartRef.current.clientY) * scaleY;

      const dOffsetX = (dxSvg / octSide) * 100;
      const dOffsetY = (dySvg / octSide) * 100;

      updateDraft({
        offsetX: dragStartRef.current.startOffsetX + dOffsetX,
        offsetY: dragStartRef.current.startOffsetY + dOffsetY,
      });
    };

    const onMouseUp = () => {
      setIsDraggingLogo(false);
      dragStartRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onPreviewWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    updateDraft({ scale: draft.scale + delta });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={() => {
        onSaveConfig(draft);
        onClose();
      }}
    >
      <div
        className="relative flex flex-col w-full max-w-3xl bg-[#0c0e14] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#090a0f]">
          <div>
            <h2 className="text-base font-semibold text-white">
              {t('logo.modalTitle')}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {t('logo.modalSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onSaveConfig(draft);
              onClose();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.08] transition text-lg"
            title={t('presets.close')}
          >
            ✕
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto max-h-[80vh]">
          <div className="md:col-span-6 flex flex-col items-center justify-between bg-[#07080b] border border-white/[0.07] rounded-2xl p-4">
            <div className="w-full flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
                {t('logo.previewBadge')}
              </span>
              <span className="text-[11px] text-cyan-400 font-mono">
                {Math.round(draft.scale * 100)}% • X:{draft.offsetX > 0 ? `+${draft.offsetX}` : draft.offsetX}% Y:{draft.offsetY > 0 ? `+${draft.offsetY}` : draft.offsetY}%
              </span>
            </div>

            <div
              className="relative w-full aspect-square max-w-[300px] flex items-center justify-center rounded-xl overflow-hidden border border-white/[0.06] bg-[#0b0d13] select-none"
              onWheel={onPreviewWheel}
            >
              <svg ref={svgRef} viewBox={`0 0 ${previewW} ${previewH}`} className="w-full h-full">
                <defs>
                  <pattern id="preview-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                    <rect width="16" height="16" fill="#121622" />
                    <rect x="16" width="16" height="16" fill="#0d1018" />
                    <rect y="16" width="16" height="16" fill="#0d1018" />
                    <rect x="16" y="16" width="16" height="16" fill="#121622" />
                    <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  </pattern>
                  <clipPath id="preview-badge-clip">
                    <polygon points={octPointsStr} />
                  </clipPath>
                </defs>
                <rect width={previewW} height={previewH} fill="url(#preview-grid)" />
                <g stroke="rgba(255,255,255,0.22)" strokeWidth="1">
                  <line x1={0} y1={0} x2={previewW} y2={previewH} />
                  <line x1={previewW} y1={0} x2={0} y2={previewH} />
                  <line x1={badgeCx} y1={0} x2={badgeCx} y2={previewH} />
                  <line x1={0} y1={badgeCy} x2={previewW} y2={badgeCy} />
                </g>
                <polygon points={octPointsStr} fill="rgba(8, 9, 11, 0.92)" stroke="#ffffff" strokeWidth={2} />
                <g clipPath="url(#preview-badge-clip)">
                  <g onMouseDown={onLogoMouseDown} className="cursor-grab active:cursor-grabbing">
                    <title>{t('logo.dragHint')}</title>
                    <rect
                      x={logoRect.x}
                      y={logoRect.y}
                      width={logoRect.width}
                      height={logoRect.height}
                      fill="transparent"
                      stroke={isDraggingLogo ? '#38bdf8' : 'rgba(56, 189, 248, 0.35)'}
                      strokeWidth={1.2}
                      strokeDasharray="4 3"
                      rx={4}
                    />
                    <image
                      href={logoRect.href}
                      x={logoRect.x}
                      y={logoRect.y}
                      width={logoRect.width}
                      height={logoRect.height}
                      preserveAspectRatio="xMidYMid meet"
                      pointerEvents="none"
                    />
                  </g>
                  <text x={badgeCx} y={badgeCy} textAnchor="middle" fill="#ffffff" fontSize={baseFs * 1.15} fontWeight="bold" fontFamily="sans-serif" pointerEvents="none">
                    1920×1080 px
                  </text>
                  <text x={badgeCx} y={oy + octSide * 0.62} textAnchor="middle" fill="rgba(255, 255, 255, 0.85)" fontSize={baseFs * 0.9} fontFamily="sans-serif" pointerEvents="none">
                    4×2.5 {language === 'en' ? 'm' : 'м'}
                  </text>
                  <text x={badgeCx} y={oy + octSide * 0.77} textAnchor="middle" fill="#ffffff" fontSize={baseFs * 0.85} fontWeight="bold" fontFamily="sans-serif" pointerEvents="none">
                    Screen 1
                  </text>
                </g>
              </svg>
            </div>

            <p className="text-[11px] text-neutral-400 text-center mt-2.5 leading-relaxed">
              {t('logo.dragInstruction')}
            </p>
          </div>
          <div className="md:col-span-6 flex flex-col justify-between space-y-4">
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDraggingFile(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className={[
                'p-4 rounded-xl border transition space-y-3',
                isDraggingFile
                  ? 'border-cyan-400 bg-cyan-500/10'
                  : 'border-white/[0.08] bg-[#10121a]',
              ].join(' ')}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
                  {t('logo.logoImage')}
                </span>
                <span
                  className={[
                    'px-2 py-0.5 rounded-md text-[10px] font-medium border',
                    hasCustomLogo
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                      : 'bg-white/[0.05] text-neutral-400 border-white/[0.08]',
                  ].join(' ')}
                >
                  {hasCustomLogo ? t('logo.customLogoBadge') : t('logo.appLogoBadge')}
                </span>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#090a0f] border border-white/[0.06]">
                <div className="w-16 h-12 rounded-lg bg-[#141722] border border-white/[0.06] flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={hasCustomLogo ? draft.customLogoDataUrl : DEFAULT_MASK_LOGO_URL}
                    alt="Current Mask Logo"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-white truncate">
                    {hasCustomLogo
                      ? (draft.customLogoFileName || t('logo.customLogoName'))
                      : t('logo.defaultLogoName')}
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    {hasCustomLogo
                      ? t('logo.customLogoDesc')
                      : t('logo.defaultLogoDesc')}
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/15 transition flex items-center justify-center gap-1.5"
                >
                  <span>{hasCustomLogo ? t('logo.replaceLogo') : t('logo.chooseLogo')}</span>
                </button>
                {hasCustomLogo && (
                  <button
                    type="button"
                    onClick={handleResetToAppLogo}
                    className="py-2 px-3 rounded-xl text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 transition"
                    title={t('logo.resetToAppLogoTitle')}
                  >
                    {t('logo.resetToAppLogo')}
                  </button>
                )}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#10121a] border border-white/[0.08] space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
                  {t('logo.sizeAndPosition')}
                </span>
                {(draft.scale !== 1 || draft.offsetX !== 0 || draft.offsetY !== 0) && (
                  <button
                    type="button"
                    onClick={handleResetTransform}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 transition"
                  >
                    {t('logo.resetTransform')}
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">{t('logo.logoSize')}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateDraft({ scale: draft.scale - 0.05 })}
                      className="w-6 h-6 rounded bg-[#181a24] hover:bg-[#222534] border border-white/[0.08] text-neutral-300 text-xs flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="font-mono text-cyan-400 w-12 text-center font-medium">
                      {Math.round(draft.scale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => updateDraft({ scale: draft.scale + 0.05 })}
                      className="w-6 h-6 rounded bg-[#181a24] hover:bg-[#222534] border border-white/[0.08] text-neutral-300 text-xs flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={20}
                  max={250}
                  step={5}
                  value={Math.round(draft.scale * 100)}
                  onChange={e => updateDraft({ scale: Number(e.target.value) / 100 })}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#181a24] rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">{t('logo.offsetX')}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateDraft({ offsetX: draft.offsetX - 1 })}
                      className="w-6 h-6 rounded bg-[#181a24] hover:bg-[#222534] border border-white/[0.08] text-neutral-300 text-xs flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="font-mono text-cyan-400 w-12 text-center font-medium">
                      {draft.offsetX > 0 ? `+${draft.offsetX}%` : `${draft.offsetX}%`}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateDraft({ offsetX: draft.offsetX + 1 })}
                      className="w-6 h-6 rounded bg-[#181a24] hover:bg-[#222534] border border-white/[0.08] text-neutral-300 text-xs flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={-45}
                  max={45}
                  step={1}
                  value={draft.offsetX}
                  onChange={e => updateDraft({ offsetX: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#181a24] rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">{t('logo.offsetY')}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateDraft({ offsetY: draft.offsetY - 1 })}
                      className="w-6 h-6 rounded bg-[#181a24] hover:bg-[#222534] border border-white/[0.08] text-neutral-300 text-xs flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="font-mono text-cyan-400 w-12 text-center font-medium">
                      {draft.offsetY > 0 ? `+${draft.offsetY}%` : `${draft.offsetY}%`}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateDraft({ offsetY: draft.offsetY + 1 })}
                      className="w-6 h-6 rounded bg-[#181a24] hover:bg-[#222534] border border-white/[0.08] text-neutral-300 text-xs flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={-20}
                  max={60}
                  step={1}
                  value={draft.offsetY}
                  onChange={e => updateDraft({ offsetY: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#181a24] rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#090a0f] flex items-center justify-between gap-3">
          <div className="text-[11px] text-neutral-400">
            {t('logo.bottomNote')}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                onSaveConfig(initialConfig);
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[#141620] hover:bg-[#1a1d28] text-neutral-300 hover:text-white border border-white/[0.08] transition"
            >
              {t('presets.cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                onSaveConfig(draft);
                showToast(t('logo.savedToast'));
                onClose();
              }}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition"
            >
              {t('logo.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
