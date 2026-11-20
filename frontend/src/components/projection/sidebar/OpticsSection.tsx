'use client';

import React from 'react';
import { ProjectionInputs } from '@/lib/projection/types';
import { RESOLUTION_PRESETS, trToAngle, angleToTR } from '@/lib/projection/calculator';
import { useI18n } from '@/lib/i18n';

interface Props {
  inputs: ProjectionInputs;
  onChange: (u: Partial<ProjectionInputs>) => void;
  lensTR: number;
  beamAngleDeg: number;
  blendPxW: number;
}

export default function OpticsSection({ inputs, onChange, lensTR, beamAngleDeg, blendPxW }: Props) {
  const { t, language } = useI18n();
  const meterUnit = language === 'en' ? 'm' : 'м';

  return (
    <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-300">
          {t('projection.optics.title')}
        </span>
        <span className="text-[10px] font-mono text-neutral-500">THROW &amp; LENS</span>
      </div>

      <div className="grid grid-cols-2 gap-1 p-1 bg-[#090a0f] rounded-lg border border-white/[0.06]">
        <button
          type="button"
          onClick={() => onChange({ calcMode: 'autoGrid' })}
          className={`text-[11px] font-mono py-1 rounded-md transition font-semibold text-center ${
            inputs.calcMode === 'autoGrid'
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          {t('projection.optics.modeAutoGrid')}
        </button>
        <button
          type="button"
          onClick={() => onChange({ calcMode: 'manualGrid' })}
          className={`text-[11px] font-mono py-1 rounded-md transition font-semibold text-center ${
            inputs.calcMode === 'manualGrid'
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          {t('projection.optics.modeFindLens')}
        </button>
      </div>

      <div>
        <div className="flex justify-between items-center text-[11px] mb-1">
          <span className="text-neutral-400">{t('projection.optics.throwDist')}</span>
          <div className="flex items-center gap-1 font-mono">
            <input
              type="number"
              step="0.2"
              value={inputs.throwDist}
              onChange={(e) => onChange({ throwDist: parseFloat(e.target.value) || 1 })}
              className="w-16 bg-[#141721] border border-white/[0.08] focus:border-cyan-500/50 rounded-lg px-1.5 py-0.5 text-right text-xs text-cyan-400 font-bold outline-none"
            />
            <span className="text-neutral-500">{meterUnit}</span>
          </div>
        </div>
        <input
          type="range"
          min="2"
          max="80"
          step="0.2"
          value={inputs.throwDist}
          onChange={(e) => onChange({ throwDist: parseFloat(e.target.value) || 1 })}
          className="w-full"
        />
      </div>
      {inputs.calcMode === 'autoGrid' && (
        <div className="p-2.5 rounded-lg bg-black border border-[#22222a] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">Оптика:</span>
            <div className="inline-flex rounded bg-[#141419] p-0.5 border border-[#262630] text-[10px] font-mono">
              <button
                type="button"
                onClick={() => onChange({ lensInputType: 'tr' })}
                className={`px-2 py-0.5 rounded ${inputs.lensInputType === 'tr' ? 'bg-cyan-500/20 text-cyan-400 font-semibold' : 'text-zinc-400'}`}
              >
                TR
              </button>
              <button
                type="button"
                onClick={() => onChange({ lensInputType: 'angle' })}
                className={`px-2 py-0.5 rounded ${inputs.lensInputType === 'angle' ? 'bg-cyan-500/20 text-cyan-400 font-semibold' : 'text-zinc-400'}`}
              >
                Угол
              </button>
            </div>
          </div>

          {inputs.lensInputType === 'tr' ? (
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-zinc-400">TR:</span>
                <span className="font-mono text-zinc-400">≈ {beamAngleDeg.toFixed(1)}°</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min="0.35"
                  max="5.0"
                  step="0.01"
                  value={inputs.tr}
                  onChange={(e) => {
                    const tr = parseFloat(e.target.value) || 1.5;
                    onChange({ tr, angleDeg: parseFloat(trToAngle(tr).toFixed(1)) });
                  }}
                  className="w-full"
                />
                <input
                  type="number"
                  step="0.01"
                  value={inputs.tr}
                  onChange={(e) => {
                    const tr = parseFloat(e.target.value) || 1.5;
                    onChange({ tr, angleDeg: parseFloat(trToAngle(tr).toFixed(1)) });
                  }}
                  className="w-16 bg-[#111115] border border-[#272732] rounded px-1.5 py-1 text-xs font-mono text-right text-cyan-400 font-bold outline-none"
                />
              </div>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {[0.65, 0.8, 1.2, 1.5, 2.0].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onChange({ lensInputType: 'tr', tr: v, angleDeg: parseFloat(trToAngle(v).toFixed(1)) })}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#141419] border border-[#262630] text-zinc-400"
                  >
                    {v.toFixed(2)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-zinc-400">Угол:</span>
                <span className="font-mono text-zinc-400">TR ≈ {lensTR.toFixed(2)}:1</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min="10"
                  max="110"
                  step="0.5"
                  value={inputs.angleDeg}
                  onChange={(e) => {
                    const a = parseFloat(e.target.value) || 36;
                    onChange({ angleDeg: a, tr: parseFloat(angleToTR(a).toFixed(2)) });
                  }}
                  className="w-full"
                />
                <input
                  type="number"
                  step="0.5"
                  value={inputs.angleDeg}
                  onChange={(e) => {
                    const a = parseFloat(e.target.value) || 36;
                    onChange({ angleDeg: a, tr: parseFloat(angleToTR(a).toFixed(2)) });
                  }}
                  className="w-16 bg-[#111115] border border-[#272732] rounded px-1.5 py-1 text-xs font-mono text-right text-cyan-400 font-bold outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
      {inputs.calcMode === 'manualGrid' && (
        <div className="p-2.5 rounded-lg bg-[#090a0f] border border-blue-500/30 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-blue-300 font-semibold">{t('projection.optics.calcMode')}:</span>
            <span className="text-cyan-400">TR {lensTR.toFixed(2)}:1</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-neutral-400 block mb-1">{t('projection.optics.fixedCols')}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onChange({ manualCols: Math.max(1, inputs.manualCols - 1) })}
                  className="px-2.5 py-1 bg-[#141620] border border-white/[0.08] rounded text-neutral-300 font-mono text-xs hover:text-white"
                >-</button>
                <input
                  type="number"
                  value={inputs.manualCols}
                  onChange={(e) => onChange({ manualCols: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full bg-[#141721] border border-white/[0.08] rounded py-1 text-center font-mono text-xs text-white font-bold"
                />
                <button
                  type="button"
                  onClick={() => onChange({ manualCols: Math.min(24, inputs.manualCols + 1) })}
                  className="px-2.5 py-1 bg-[#141620] border border-white/[0.08] rounded text-neutral-300 font-mono text-xs hover:text-white"
                >+</button>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 block mb-1">{t('projection.optics.fixedRows')}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onChange({ manualRows: Math.max(1, inputs.manualRows - 1) })}
                  className="px-2.5 py-1 bg-[#141620] border border-white/[0.08] rounded text-neutral-300 font-mono text-xs hover:text-white"
                >-</button>
                <input
                  type="number"
                  value={inputs.manualRows}
                  onChange={(e) => onChange({ manualRows: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full bg-[#141721] border border-white/[0.08] rounded py-1 text-center font-mono text-xs text-white font-bold"
                />
                <button
                  type="button"
                  onClick={() => onChange({ manualRows: Math.min(12, inputs.manualRows + 1) })}
                  className="px-2.5 py-1 bg-[#141620] border border-white/[0.08] rounded text-neutral-300 font-mono text-xs hover:text-white"
                >+</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resolution & Orientation */}
      <div className="grid grid-cols-12 gap-2 pt-1 border-t border-white/[0.06]">
        <div className="col-span-7">
          <label className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 block mb-1">
            {t('projection.optics.resolution')}
          </label>
          <select
            value={`${inputs.nativeW}x${inputs.nativeH}`}
            onChange={(e) => {
              const [w, h] = e.target.value.split('x').map(Number);
              onChange({ nativeW: w, nativeH: h });
            }}
            className="w-full bg-[#141721] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 font-mono outline-none focus:border-cyan-500/50"
          >
            {RESOLUTION_PRESETS.map((rp) => (
              <option key={rp.value} value={rp.value}>{rp.label}</option>
            ))}
          </select>
        </div>
        <div className="col-span-5">
          <label className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 block mb-1">
            {t('projection.optics.orientation')}
          </label>
          <div className="grid grid-cols-2 gap-1 bg-[#090a0f] p-0.5 rounded-lg border border-white/[0.06] text-[10px] font-mono">
            <button
              type="button"
              onClick={() => onChange({ orientation: 'landscape' })}
              className={`py-1 rounded ${inputs.orientation === 'landscape' ? 'bg-blue-600/30 text-blue-300 font-semibold' : 'text-neutral-400 hover:text-white'}`}
            >
              {t('projection.optics.landscape')}
            </button>
            <button
              type="button"
              onClick={() => onChange({ orientation: 'portrait' })}
              className={`py-1 rounded ${inputs.orientation === 'portrait' ? 'bg-blue-600/30 text-blue-300 font-semibold' : 'text-neutral-400 hover:text-white'}`}
            >
              {t('projection.optics.portrait')}
            </button>
          </div>
        </div>
      </div>

      {/* Edge Blend Overlap */}
      <div className="pt-1 border-t border-white/[0.06]">
        <div className="flex justify-between items-center text-[11px] mb-1">
          <span className="text-neutral-400">{t('projection.optics.blendPercent')}</span>
          <span className="font-mono text-cyan-400 font-semibold">
            {inputs.blendPercent}% ({blendPxW} px)
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="range"
            min="0"
            max="40"
            step="1"
            value={inputs.blendPercent}
            onChange={(e) => onChange({ blendPercent: parseInt(e.target.value) || 0 })}
            className="w-full"
          />
          <input
            type="number"
            min="0"
            max="45"
            value={inputs.blendPercent}
            onChange={(e) => onChange({ blendPercent: parseInt(e.target.value) || 0 })}
            className="w-14 bg-[#141721] border border-white/[0.08] rounded-lg px-1.5 py-0.5 text-xs font-mono text-right text-cyan-400 font-bold outline-none"
          />
        </div>
      </div>
    </div>
  );
}
