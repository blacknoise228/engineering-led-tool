'use client';

import React from 'react';
import { ProjectionInputs } from '@/lib/projection/types';
import { useI18n } from '@/lib/i18n';

interface Props {
  inputs: ProjectionInputs;
  onChange: (u: Partial<ProjectionInputs>) => void;
  stackMultiplier: number;
}

export default function PowerSection({ inputs, onChange, stackMultiplier }: Props) {
  const { t } = useI18n();

  const stackStatus =
    inputs.stackMode === 'auto'
      ? `${t('projection.power.stackAuto')} (${stackMultiplier}x)`
      : inputs.stackMode === 1
      ? t('projection.power.stack1')
      : `${inputs.stackMode}x (${t('projection.kpi.stackBadge', { count: inputs.stackMode })})`;

  return (
    <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-300">
          {t('projection.power.title')}
        </span>
        <span className="text-[10px] font-mono text-neutral-500">ANSI &amp; STACK</span>
      </div>

      {/* Lumens */}
      <div>
        <div className="flex justify-between items-center text-[11px] mb-1.5">
          <span className="text-neutral-400">{t('projection.power.lumens')}</span>
          <input
            type="number"
            step="1000"
            value={inputs.lumensPerProj}
            onChange={(e) => onChange({ lumensPerProj: parseFloat(e.target.value) || 5000 })}
            className="w-24 bg-[#141721] border border-white/[0.08] focus:border-cyan-500/50 rounded-lg px-2 py-1 text-right text-xs font-mono text-cyan-400 font-bold outline-none"
          />
        </div>
        <div className="grid grid-cols-6 gap-1 text-[10px] font-mono">
          {[10000, 15000, 20000, 30000, 40000, 50000].map((lm) => (
            <button
              key={lm}
              type="button"
              onClick={() => onChange({ lumensPerProj: lm })}
              className={`py-1 rounded text-center border transition ${
                inputs.lumensPerProj === lm
                  ? 'bg-blue-600/25 border-blue-500/50 text-blue-300 font-semibold'
                  : 'bg-[#141620] border-white/[0.06] text-neutral-400 hover:text-white'
              }`}
            >
              {lm / 1000}k
            </button>
          ))}
        </div>
      </div>

      {/* Stacking */}
      <div>
        <div className="flex justify-between items-center text-[11px] mb-1.5">
          <span className="text-neutral-400">{t('projection.power.stack')}</span>
          <span className="text-[10px] font-mono text-amber-400">{stackStatus}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-[11px] font-mono">
          {([1, 2, 3] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ stackMode: m })}
              className={`py-1.5 rounded-lg border text-center transition ${
                inputs.stackMode === m
                  ? 'bg-blue-600/25 border-blue-500/50 text-blue-300 font-semibold'
                  : 'bg-[#141620] border-white/[0.06] text-neutral-400 hover:text-white'
              }`}
            >
              {m}x
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange({ stackMode: 'auto' })}
            className={`py-1.5 rounded-lg border text-center transition ${
              inputs.stackMode === 'auto'
                ? 'bg-blue-600/35 border-blue-400 text-blue-200 font-semibold shadow-sm'
                : 'bg-[#141620] border-white/[0.06] text-neutral-400 hover:text-white'
            }`}
          >
            {t('projection.power.stackAuto')}
          </button>
        </div>
      </div>

      {/* Efficiency */}
      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-white/[0.06]">
        <span className="text-neutral-400">{t('projection.power.efficiency')}</span>
        <div className="flex items-center gap-1 font-mono">
          <input
            type="number"
            min="40"
            max="100"
            step="5"
            value={Math.round(inputs.efficiency * 100)}
            onChange={(e) => onChange({ efficiency: (parseFloat(e.target.value) || 85) / 100 })}
            className="w-14 bg-[#141721] border border-white/[0.08] rounded px-1 py-0.5 text-center text-xs text-white outline-none focus:border-cyan-500/50"
          />
          <span className="text-neutral-500">%</span>
        </div>
      </div>
    </div>
  );
}
