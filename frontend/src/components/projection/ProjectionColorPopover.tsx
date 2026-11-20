'use client';

import React, { useState } from 'react';
import { ProjectionColorConfig, SliceData } from '@/lib/projection/types';
import { useI18n } from '@/lib/i18n';

interface Props {
  colors: ProjectionColorConfig;
  slices: SliceData[];
  onChange: (u: Partial<ProjectionColorConfig>) => void;
  onReset: () => void;
}

export default function ProjectionColorPopover({ colors, slices, onChange, onReset }: Props) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState('');

  const activeZoneId = selectedZone || slices[0]?.zoneId || 'P1.1';
  const activeZoneColor = colors.customProjectorColors?.[activeZoneId] || colors.beamColor;

  const setProjColor = (id: string, val: string) => {
    const updated = { ...(colors.customProjectorColors || {}) };
    if (!val || val === colors.beamColor) delete updated[id];
    else updated[id] = val;
    onChange({ customProjectorColors: updated });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className={`px-3 py-1.5 rounded-xl border text-xs font-medium backdrop-blur-md transition flex items-center gap-1.5 shadow-lg ${
          isOpen
            ? 'bg-blue-600/40 border-blue-400 text-white'
            : 'bg-[#0c0d14]/85 border-white/[0.08] text-neutral-300 hover:text-white hover:bg-[#141622]'
        }`}
      >
        <span>🎨</span>
        <span>{t('projection.action.colors')}</span>
      </button>

      {isOpen && (
        <div className="absolute top-10 right-0 w-72 p-3 rounded-xl bg-[#0e1018]/95 backdrop-blur-xl border border-white/[0.12] shadow-2xl text-xs space-y-2.5 z-30">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08]">
            <span className="font-semibold text-white">{t('projection.colors.title')}</span>
            <button type="button" onClick={onReset} className="text-[10px] text-neutral-400 hover:text-cyan-400">
              {t('projection.colors.reset')}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <label className="flex items-center justify-between p-1.5 rounded bg-[#141724]">
              <span>{t('projection.colors.wall')}</span>
              <input type="color" value={colors.wallColor} onChange={(e) => onChange({ wallColor: e.target.value })} className="w-5 h-5 cursor-pointer border-0 bg-transparent" />
            </label>
            <label className="flex items-center justify-between p-1.5 rounded bg-[#141724]">
              <span>{t('projection.colors.blend')}</span>
              <input type="color" value={colors.blendColor} onChange={(e) => onChange({ blendColor: e.target.value })} className="w-5 h-5 cursor-pointer border-0 bg-transparent" />
            </label>
            <label className="flex items-center justify-between p-1.5 rounded bg-[#141724]">
              <span>{t('projection.colors.beam')}</span>
              <input type="color" value={colors.beamColor} onChange={(e) => onChange({ beamColor: e.target.value })} className="w-5 h-5 cursor-pointer border-0 bg-transparent" />
            </label>
            <label className="flex items-center justify-between p-1.5 rounded bg-[#141724]">
              <span>{t('projection.colors.proj')}</span>
              <input type="color" value={colors.projColor} onChange={(e) => onChange({ projColor: e.target.value })} className="w-5 h-5 cursor-pointer border-0 bg-transparent" />
            </label>
          </div>

          <div className="pt-2 border-t border-white/[0.08] space-y-1.5">
            <div className="flex justify-between text-[11px] font-semibold text-neutral-300">
              <span>{t('projection.colors.perProj')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={activeZoneId}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="flex-1 bg-[#141724] border border-white/[0.08] rounded px-2 py-1 text-xs text-white"
              >
                {slices.map((s) => (
                  <option key={s.zoneId} value={s.zoneId}>
                    {s.zoneId} (R{s.row} C{s.col})
                  </option>
                ))}
              </select>
              <input
                type="color"
                value={activeZoneColor}
                onChange={(e) => setProjColor(activeZoneId, e.target.value)}
                className="w-6 h-6 cursor-pointer border-0 bg-transparent"
              />
              {colors.customProjectorColors?.[activeZoneId] && (
                <button type="button" onClick={() => setProjColor(activeZoneId, '')} className="text-neutral-500 hover:text-white px-1">✕</button>
              )}
            </div>
            <div className="flex items-center gap-1 pt-1">
              {['#00f0ff', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#ffffff'].map((sw) => (
                <button
                  key={sw}
                  type="button"
                  onClick={() => setProjColor(activeZoneId, sw)}
                  style={{ backgroundColor: sw }}
                  className="w-4 h-4 rounded-full border border-white/20 hover:scale-110"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}