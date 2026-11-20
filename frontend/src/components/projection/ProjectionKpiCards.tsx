'use client';

import React from 'react';
import { ProjectionComputed } from '@/lib/projection/types';
import { useI18n } from '@/lib/i18n';

interface ProjectionKpiCardsProps {
  computed: ProjectionComputed;
}

export default function ProjectionKpiCards({ computed: c }: ProjectionKpiCardsProps) {
  const { t, language } = useI18n();
  const isEn = language === 'en';
  const meterUnit = isEn ? 'm' : 'м';

  let luxColor = 'text-emerald-400';
  let luxDotClass = 'w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]';
  if (c.realLux < c.targetLux * 0.7) {
    luxColor = 'text-rose-400';
    luxDotClass = 'w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]';
  } else if (c.realLux < c.targetLux * 0.95) {
    luxColor = 'text-amber-400';
    luxDotClass = 'w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]';
  }

  return (
    <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-300">
          {t('projection.kpi.summary')}
        </span>
        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
            c.verdict.status === 'optimal'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          }`}
        >
          {c.verdict.badge}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Metric 1: Fleet */}
        <div className="bg-[#141721] border border-white/[0.06] rounded-lg p-2.5 space-y-0.5">
          <div className="text-[10px] uppercase tracking-wider text-neutral-400">
            {t('projection.kpi.totalProjectors')}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold font-mono text-white">{c.totalPhysicalProjectors}</span>
            <span className="text-xs text-neutral-400">{t('projection.kpi.unitProj')}</span>
            <span className="text-xs font-mono text-cyan-400 font-semibold ml-auto">{c.cols}×{c.rows}</span>
          </div>
          <div className="text-[10px] font-mono text-neutral-500 truncate">
            1x: {c.singleW.toFixed(2)}×{c.singleH.toFixed(2)} {meterUnit}
          </div>
        </div>

        {/* Metric 2: Illuminance */}
        <div className="bg-[#141721] border border-white/[0.06] rounded-lg p-2.5 space-y-0.5">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-neutral-400">
            <span>{t('projection.kpi.illuminance')}</span>
            <span className={luxDotClass} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-lg font-bold font-mono ${luxColor}`}>{Math.round(c.realLux)}</span>
            <span className="text-xs text-neutral-400">lx</span>
            <span className="text-neutral-600 text-xs mx-0.5">/</span>
            <span className="text-sm font-semibold font-mono text-white">{c.realNits.toFixed(0)}</span>
            <span className="text-[10px] text-neutral-400">nit</span>
          </div>
          <div className="text-[10px] font-mono text-neutral-500 truncate">
            {isEn ? 'Target' : 'Цель'}: {c.targetLux} lx ({Math.round((c.realLux / c.targetLux) * 100)}%)
          </div>
        </div>

        {/* Metric 3: Composite Canvas */}
        <div className="bg-[#141721] border border-white/[0.06] rounded-lg p-2.5 space-y-0.5">
          <div className="text-[10px] uppercase tracking-wider text-neutral-400">
            {t('projection.kpi.compositeCanvas')}
          </div>
          <div className="text-sm font-bold font-mono text-white truncate">
            {c.totalCanvasPxW} × {c.totalCanvasPxH}
          </div>
          <div className="text-[10px] font-mono text-neutral-500 truncate">
            {t('projection.kpi.activeArea')}: {c.activeWallPxW}×{c.activeWallPxH} px
          </div>
        </div>

        {/* Metric 4: Pixel Density */}
        <div className="bg-[#141721] border border-white/[0.06] rounded-lg p-2.5 space-y-0.5">
          <div className="text-[10px] uppercase tracking-wider text-neutral-400">
            {t('projection.kpi.pixelDensity')}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold font-mono text-white">{c.pixelPitchMm.toFixed(2)}</span>
            <span className="text-[10px] font-mono text-cyan-400">{isEn ? 'mm/px' : 'мм/px'}</span>
          </div>
          <div className="text-[10px] font-mono text-neutral-500 truncate">
            {Math.round(c.pxPerMeter)} px/{meterUnit} • {(c.totalFleetLumens / 1000).toFixed(0)}k lm
          </div>
        </div>
      </div>
    </div>
  );
}
