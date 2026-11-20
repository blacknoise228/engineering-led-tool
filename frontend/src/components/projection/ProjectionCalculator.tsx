'use client';

'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { ProjectionInputs } from '@/lib/projection/types';
import { INITIAL_INPUTS, computeProjection, buildProjectionSpecText } from '@/lib/projection/calculator';
import SurfaceSection from './sidebar/SurfaceSection';
import OpticsSection from './sidebar/OpticsSection';
import PowerSection from './sidebar/PowerSection';
import ProjectionKpiCards from './ProjectionKpiCards';
import ProjectionVisualizer from './ProjectionVisualizer';
import ProjectionSliceTable from './ProjectionSliceTable';
import ProjectionMaskModal from './ProjectionMaskModal';
import { showToast } from '@/lib/desktop';
import { useI18n } from '@/lib/i18n';

export default function ProjectionCalculator() {
  const { t, language } = useI18n();
  const [inputs, setInputs] = useState<ProjectionInputs>(INITIAL_INPUTS);
  const [selectedPreset, setSelectedPreset] = useState<string>('facade');
  const [viewMode, setViewMode] = useState<'front' | 'top' | 'slices'>('front');
  const [isMaskModalOpen, setIsMaskModalOpen] = useState(false);
  const [copiedSpec, setCopiedSpec] = useState(false);

  const computed = useMemo(() => computeProjection(inputs, language), [inputs, language]);

  const updateInputs = (updates: Partial<ProjectionInputs>) => {
    setInputs((prev) => ({ ...prev, ...updates }));
  };

  const applyPreset = (name: 'facade' | 'panorama' | 'tower' | 'single27') => {
    setSelectedPreset(name);
    if (name === 'facade') {
      updateInputs({
        wallW: 28.0,
        wallH: 10.0,
        throwDist: 20.0,
        calcMode: 'autoGrid',
        lensInputType: 'tr',
        tr: 1.50,
        orientation: 'landscape',
        blendPercent: 15,
        lumensPerProj: 20000,
        targetLux: 150,
        stackMode: 1,
        gain: 0.8,
      });
    } else if (name === 'panorama') {
      updateInputs({
        wallW: 36.0,
        wallH: 6.0,
        throwDist: 15.0,
        calcMode: 'autoGrid',
        lensInputType: 'tr',
        tr: 1.20,
        orientation: 'landscape',
        blendPercent: 15,
        lumensPerProj: 20000,
        targetLux: 200,
        stackMode: 1,
        gain: 0.8,
      });
    } else if (name === 'tower') {
      updateInputs({
        wallW: 12.0,
        wallH: 15.0,
        throwDist: 18.0,
        calcMode: 'autoGrid',
        lensInputType: 'tr',
        tr: 1.20,
        orientation: 'portrait',
        blendPercent: 15,
        lumensPerProj: 30000,
        targetLux: 150,
        stackMode: 1,
        gain: 0.8,
      });
    } else if (name === 'single27') {
      updateInputs({
        wallW: 17.68,
        wallH: 11.05,
        throwDist: 27.2,
        calcMode: 'autoGrid',
        lensInputType: 'angle',
        angleDeg: 36.0,
        orientation: 'landscape',
        blendPercent: 15,
        lumensPerProj: 20000,
        targetLux: 80,
        gain: 1.0,
        stackMode: 1,
      });
    }
  };

  const handleCopySpec = () => {
    const text = buildProjectionSpecText(computed, undefined, language);
    navigator.clipboard?.writeText(text);
    setCopiedSpec(true);
    showToast(t('projection.action.copied'));
    setTimeout(() => setCopiedSpec(false), 2000);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0c0d12] text-neutral-200">
      {/* Left Sidebar (styled identical to ELT Editor Sidebar) */}
      <aside
        className={[
          'relative md:sticky md:top-0 flex-shrink-0',
          'w-full md:w-[24rem] lg:w-[26rem] max-w-full',
          'h-full',
          'overflow-y-auto supports-[scrollbar-gutter:stable]:scrollbar-gutter-stable',
          'border-r border-white/[0.07]',
          'bg-[#0c0d12] text-neutral-200',
          'px-4 py-4 space-y-3.5',
        ].join(' ')}
      >
        {/* ELT Logo Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex flex-col">
            <Image
              src="/logo2.png"
              alt="ELT logo"
              width={380}
              height={64}
              className="object-contain"
              priority
            />
            <span className="text-[10px] text-neutral-500 mt-1 opacity-80">
              @blacknoise228
            </span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
              {t('projection.presets')}
            </span>
          </div>
          <select
            value={selectedPreset}
            onChange={(e) => applyPreset(e.target.value as 'facade' | 'panorama' | 'tower' | 'single27')}
            className="w-full bg-[#141721] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500/50"
          >
            <option value="facade">{t('projection.preset.facade')}</option>
            <option value="panorama">{t('projection.preset.panorama')}</option>
            <option value="tower">{t('projection.preset.tower')}</option>
            <option value="single27">{t('projection.preset.single27')}</option>
          </select>
        </div>

        {/* Calculation Summary KPIs in Sidebar */}
        <ProjectionKpiCards computed={computed} />

        {/* Section 1: Surface */}
        <SurfaceSection inputs={inputs} onChange={updateInputs} wallArea={computed.wallArea} />

        {/* Section 2: Optics */}
        <OpticsSection
          inputs={inputs}
          onChange={updateInputs}
          lensTR={computed.lensTR}
          beamAngleDeg={computed.beamAngleDeg}
          blendPxW={computed.blendPxW}
        />

        {/* Section 3: Power */}
        <PowerSection inputs={inputs} onChange={updateInputs} stackMultiplier={computed.stackMultiplier} />

        {/* Actions Card */}
        <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-2 pt-2">
          <button
            type="button"
            onClick={() => setIsMaskModalOpen(true)}
            className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{t('projection.action.exportMask')}</span>
          </button>

          <button
            type="button"
            onClick={handleCopySpec}
            className="w-full py-2 px-3 rounded-xl bg-[#141620] hover:bg-[#1a1d28] hover:border-cyan-500/30 text-neutral-300 hover:text-white border border-white/[0.08] text-xs font-medium transition flex items-center justify-center gap-1.5 active:scale-[0.99]"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>{copiedSpec ? t('projection.action.copied') : t('projection.action.copySpec')}</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Stage */}
      <div className="flex-1 relative bg-[#07080b] h-full overflow-hidden flex flex-col">
        {/* Floating Top Toolbar (exact positioning like EditorToolbar in ELT) */}
        <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
          {/* Center View Selector Pill */}
          <div className="pointer-events-auto flex items-center p-1 rounded-xl bg-[#0c0d14]/90 backdrop-blur-md border border-white/[0.08] shadow-2xl">
            <button
              onClick={() => {
                setViewMode('front');
                updateInputs({ canvasTab: 'front' });
              }}
              className={[
                'px-4 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2',
                viewMode === 'front'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]',
              ].join(' ')}
            >
              <span>{t('projection.view.front')}</span>
            </button>
            <button
              onClick={() => {
                setViewMode('top');
                updateInputs({ canvasTab: 'top' });
              }}
              className={[
                'px-4 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2',
                viewMode === 'top'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]',
              ].join(' ')}
            >
              <span>{t('projection.view.top')}</span>
            </button>
            <button
              onClick={() => setViewMode('slices')}
              className={[
                'px-4 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2',
                viewMode === 'slices'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]',
              ].join(' ')}
            >
              <span>{t('projection.view.slices')}</span>
            </button>
          </div>

          {/* Right Action Button Pill */}
          <div className="pointer-events-auto flex items-center gap-2 bg-[#0c0d14]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/[0.08] shadow-2xl">
            <button
              onClick={() => setIsMaskModalOpen(true)}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{t('projection.action.exportMask')}</span>
            </button>
          </div>
        </div>

        {/* Stage Content */}
        <div className="flex-1 w-full h-full relative overflow-hidden">
          {viewMode === 'slices' ? (
            <div className="p-6 pt-16 overflow-y-auto h-full">
              <ProjectionSliceTable computed={computed} />
            </div>
          ) : (
            <ProjectionVisualizer computed={computed} activeTab={inputs.canvasTab} />
          )}
        </div>

        {/* Floating Bottom HUD (Single-line Glass Bar) */}
        <div className="absolute bottom-3.5 left-4 right-4 pointer-events-none z-20">
          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 bg-[#0c0d14]/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/[0.08] shadow-2xl text-xs">
            {/* Quick Metrics Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-neutral-300 font-mono text-[11px]">
                <span className="text-cyan-400 font-bold">{computed.totalPhysicalProjectors}</span>
                <span className="text-neutral-400">
                  {language === 'en' ? 'units' : 'апп.'} ({computed.cols}×{computed.rows}{computed.stackMultiplier > 1 ? ` • ${computed.stackMultiplier}x` : ''})
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-neutral-300 font-mono text-[11px]">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    computed.verdict.status === 'optimal'
                      ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                      : 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
                  }`}
                />
                <span className="font-bold text-white">{Math.round(computed.realLux)}</span>
                <span className="text-neutral-400">lx / {computed.realNits.toFixed(0)} nit</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-neutral-300 font-mono text-[11px]">
                <span className="text-neutral-300">{computed.totalCanvasPxW}×{computed.totalCanvasPxH}</span>
                <span className="text-neutral-500">px</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-neutral-300 font-mono text-[11px]">
                <span className="text-neutral-300">{computed.pixelPitchMm.toFixed(2)}</span>
                <span className="text-neutral-500">{language === 'en' ? 'mm/px' : 'мм/px'}</span>
              </div>
            </div>

            {/* Verdict Status and Description */}
            <div className="flex items-center gap-2 text-xs truncate max-w-full lg:max-w-[55%]">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border shrink-0 ${
                  computed.verdict.status === 'optimal'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {computed.verdict.badge}
              </span>
              <span className="text-neutral-200 font-medium truncate" title={computed.verdict.details}>
                {computed.verdict.headline}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Projection Mask Export Modal */}
      <ProjectionMaskModal
        computed={computed}
        isOpen={isMaskModalOpen}
        onClose={() => setIsMaskModalOpen(false)}
        eventName="Engineering LED Tool"
      />
    </div>
  );
}
