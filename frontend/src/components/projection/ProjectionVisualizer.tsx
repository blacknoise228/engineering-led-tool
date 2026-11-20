'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ProjectionComputed, CanvasTab, ProjectionColorConfig } from '@/lib/projection/types';
import {
  renderVisualizerCanvas,
  DEFAULT_PROJECTION_COLORS,
  exportVisualizerSchemePNG,
  copyVisualizerSchemeImage,
} from '@/lib/projection/canvas-visualizer';
import ProjectionColorPopover from './ProjectionColorPopover';
import { useI18n } from '@/lib/i18n';

interface ProjectionVisualizerProps {
  computed: ProjectionComputed;
  activeTab: CanvasTab;
  eventName?: string;
}

export default function ProjectionVisualizer({
  computed: c,
  activeTab,
  eventName = '',
}: ProjectionVisualizerProps) {
  const { t, language } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [colors, setColors] = useState<ProjectionColorConfig>(DEFAULT_PROJECTION_COLORS);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('elt_projection_colors');
        if (saved) {
          setColors(JSON.parse(saved));
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const saveColors = (newColors: ProjectionColorConfig) => {
    setColors(newColors);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('elt_projection_colors', JSON.stringify(newColors));
      } catch {
        // ignore
      }
    }
  };

  const handleResetColors = () => {
    saveColors(DEFAULT_PROJECTION_COLORS);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('elt_projection_colors');
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const update = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderVisualizerCanvas(ctx, c, rect.width, rect.height, activeTab, language, colors);
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [c, activeTab, language, colors]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#07080b]">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Action Controls Top-Right */}
      <div className="absolute top-16 right-4 flex items-center gap-2 z-20">
        <ProjectionColorPopover
          colors={colors}
          slices={c.slices}
          onChange={(u) => saveColors({ ...colors, ...u })}
          onReset={handleResetColors}
        />

        {/* Copy Scheme Button */}
        <button
          type="button"
          onClick={() => copyVisualizerSchemeImage(c, activeTab, language, colors, eventName)}
          title={t('projection.action.copyScheme')}
          className="p-2 rounded-xl bg-[#0c0d14]/85 hover:bg-[#141622] hover:text-white text-neutral-300 border border-white/[0.08] shadow-lg transition flex items-center justify-center"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>

        {/* Export Scheme PNG Button */}
        <button
          type="button"
          onClick={() => exportVisualizerSchemePNG(c, activeTab, language, colors, eventName)}
          title={t('projection.action.exportSchemeTitle')}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 text-xs font-semibold transition flex items-center gap-1.5 active:scale-[0.99]"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="hidden sm:inline">{t('projection.action.exportScheme')}</span>
        </button>
      </div>

      {/* Dynamic Legend Badge Top-Left */}
      <div className="absolute top-16 left-4 pointer-events-none flex items-center gap-3 bg-[#0c0d14]/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/[0.08] text-[10px] font-mono text-neutral-400 shadow-xl">
        <span className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 inline-block rounded-sm border border-white/30"
            style={{ backgroundColor: colors.wallColor }}
          />
          <span>{language === 'en' ? 'Wall' : 'Стена'}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 inline-block rounded-sm border border-white/30"
            style={{ backgroundColor: colors.beamColor }}
          />
          <span>{language === 'en' ? 'Beam' : 'Луч'}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 inline-block rounded-sm border border-white/30"
            style={{ backgroundColor: colors.blendColor }}
          />
          <span>{language === 'en' ? 'Blend' : 'Сшивка'}</span>
        </span>
      </div>
    </div>
  );
}
