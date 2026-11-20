'use client';

import React, { useRef, useEffect } from 'react';
import { ProjectionComputed, CanvasTab } from '@/lib/projection/types';
import { renderVisualizerCanvas } from '@/lib/projection/canvas-visualizer';
import { useI18n } from '@/lib/i18n';

interface ProjectionVisualizerProps {
  computed: ProjectionComputed;
  activeTab: CanvasTab;
}

export default function ProjectionVisualizer({
  computed: c,
  activeTab,
}: ProjectionVisualizerProps) {
  const { language } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
      renderVisualizerCanvas(ctx, c, rect.width, rect.height, activeTab, language);
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [c, activeTab, language]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#07080b]">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Legend Badge Top-Right */}
      <div className="absolute top-16 right-4 pointer-events-none flex items-center gap-3 bg-[#0c0d14]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/[0.08] text-[10px] font-mono text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 inline-block border border-white/60 bg-white/10 rounded-sm" />
          <span>{language === 'en' ? 'Wall' : 'Стена'}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 inline-block border border-cyan-400/80 bg-cyan-400/15 rounded-sm" />
          <span>{language === 'en' ? 'Projector' : 'Проектор'}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 inline-block border border-amber-400/80 bg-amber-400/20 rounded-sm" />
          <span>{language === 'en' ? 'Edge Blend' : 'Сшивка'}</span>
        </span>
      </div>
    </div>
  );
}
