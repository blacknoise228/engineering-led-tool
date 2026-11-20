'use client';

import React from 'react';
import { ProjectionInputs } from '@/lib/projection/types';
import { SURFACE_PRESETS } from '@/lib/projection/calculator';
import { useI18n } from '@/lib/i18n';

interface Props {
  inputs: ProjectionInputs;
  onChange: (u: Partial<ProjectionInputs>) => void;
  wallArea: number;
}

export default function SurfaceSection({ inputs, onChange, wallArea }: Props) {
  const { t, language } = useI18n();
  const meterUnit = language === 'en' ? 'm' : 'м';

  return (
    <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-300">
          {t('projection.surface.title')}
        </span>
        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
          {wallArea.toFixed(1)} {meterUnit}²
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-neutral-400">{t('projection.surface.width')}</span>
            <span className="font-mono text-neutral-500">{meterUnit}</span>
          </div>
          <input
            type="number"
            step="0.5"
            value={inputs.wallW}
            onChange={(e) => onChange({ wallW: parseFloat(e.target.value) || 1 })}
            className="w-full bg-[#141721] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white font-semibold outline-none focus:border-cyan-500/50"
          />
          <input
            type="range"
            min="2"
            max="100"
            step="0.5"
            value={inputs.wallW}
            onChange={(e) => onChange({ wallW: parseFloat(e.target.value) || 1 })}
            className="w-full mt-1.5"
          />
        </div>
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-neutral-400">{t('projection.surface.height')}</span>
            <span className="font-mono text-neutral-500">{meterUnit}</span>
          </div>
          <input
            type="number"
            step="0.5"
            value={inputs.wallH}
            onChange={(e) => onChange({ wallH: parseFloat(e.target.value) || 1 })}
            className="w-full bg-[#141721] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white font-semibold outline-none focus:border-cyan-500/50"
          />
          <input
            type="range"
            min="2"
            max="50"
            step="0.5"
            value={inputs.wallH}
            onChange={(e) => onChange({ wallH: parseFloat(e.target.value) || 1 })}
            className="w-full mt-1.5"
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center text-[11px] mb-1.5">
          <span className="text-neutral-400">{t('projection.surface.targetLux')}</span>
          <div className="flex items-center gap-1 font-mono">
            <input
              type="number"
              step="10"
              value={inputs.targetLux}
              onChange={(e) => onChange({ targetLux: parseFloat(e.target.value) || 50 })}
              className="w-16 bg-[#141721] border border-white/[0.08] focus:border-cyan-500/50 rounded-lg px-1.5 py-1 text-right text-xs text-cyan-400 font-bold outline-none"
            />
            <span className="text-neutral-500 text-[10px]">lx</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
          {[
            { lux: 300, desc: t('projection.surface.luxDark') },
            { lux: 500, desc: t('projection.surface.luxShow') },
            { lux: 1000, desc: t('projection.surface.luxOutdoor') },
          ].map((it) => (
            <button
              key={it.lux}
              type="button"
              onClick={() => onChange({ targetLux: it.lux })}
              className={`py-1.5 px-1 rounded-lg text-center border transition ${
                inputs.targetLux === it.lux
                  ? 'bg-blue-600/25 border-blue-500/50 text-blue-300 font-semibold'
                  : 'bg-[#141620] border-white/[0.06] text-neutral-400 hover:text-white'
              }`}
            >
              <div className="font-bold">{it.lux} lx</div>
              <div className="text-[9px] text-neutral-500 truncate">{it.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-white/[0.06]">
        <div className="col-span-8">
          <label className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 block mb-1">
            {t('projection.surface.gain')}
          </label>
          <select
            value={String(inputs.gain)}
            onChange={(e) => onChange({ gain: parseFloat(e.target.value) || 0.8 })}
            className="w-full bg-[#141721] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500/50"
          >
            {SURFACE_PRESETS.map((p) => (
              <option key={p.gain} value={String(p.gain)}>
                {language === 'en' ? p.labelEn : p.labelRu}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-4">
          <label className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 block mb-1">
            Gain
          </label>
          <input
            type="number"
            step="0.05"
            value={inputs.gain}
            onChange={(e) => onChange({ gain: parseFloat(e.target.value) || 0.8 })}
            className="w-full bg-[#141721] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs font-mono text-center text-white outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>
    </div>
  );
}
