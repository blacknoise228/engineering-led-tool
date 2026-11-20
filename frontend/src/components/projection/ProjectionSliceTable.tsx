'use client';

import React from 'react';
import { ProjectionComputed } from '@/lib/projection/types';
import { useI18n } from '@/lib/i18n';

interface ProjectionSliceTableProps {
  computed: ProjectionComputed;
}

export default function ProjectionSliceTable({ computed: c }: ProjectionSliceTableProps) {
  const { t, language } = useI18n();
  const meterUnit = language === 'en' ? 'm' : 'м';

  return (
    <div className="p-4 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
            {t('projection.slices.title')}
          </h3>
        </div>
        <span className="text-[11px] font-mono text-neutral-400">
          {t('projection.slices.subtitle')}
        </span>
      </div>

      <div className="overflow-x-auto max-h-72">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] text-neutral-400 uppercase bg-[#090a0f]">
              <th className="py-2 px-3">{t('projection.slices.colId')}</th>
              <th className="py-2 px-3">Stack</th>
              <th className="py-2 px-3">{t('projection.slices.colSize')}</th>
              <th className="py-2 px-3">X (px)</th>
              <th className="py-2 px-3">Y (px)</th>
              <th className="py-2 px-3">{t('projection.slices.colPhysical')}</th>
              <th className="py-2 px-3">Blend L / R</th>
              <th className="py-2 px-3">Blend T / B</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-neutral-300">
            {c.slices.map((s) => (
              <tr key={s.zoneId} className="hover:bg-white/[0.02] transition">
                <td className="py-2 px-3 font-semibold text-cyan-400">{s.zoneId}</td>
                <td className="py-2 px-3 text-neutral-400">{s.stackMultiplier}x</td>
                <td className="py-2 px-3">{s.width}×{s.height}</td>
                <td className="py-2 px-3 text-blue-400 font-semibold">{s.startX}</td>
                <td className="py-2 px-3 text-blue-400 font-semibold">{s.startY}</td>
                <td className="py-2 px-3 text-neutral-400">{s.sizeM_W.toFixed(2)} × {s.sizeM_H.toFixed(2)} {meterUnit}</td>
                <td className="py-2 px-3 text-cyan-300">{s.blendL} / {s.blendR} px</td>
                <td className="py-2 px-3 text-cyan-300">{s.blendT} / {s.blendB} px</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
