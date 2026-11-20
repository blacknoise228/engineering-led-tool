'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ProjectionInputs } from '@/lib/projection/types';
import { INITIAL_INPUTS, BUILTIN_PRESETS, computeProjection, buildProjectionSpecText } from '@/lib/projection/calculator';
import ProjectionPresetsSection from './sidebar/ProjectionPresetsSection';
import SurfaceSection from './sidebar/SurfaceSection';
import OpticsSection from './sidebar/OpticsSection';
import PowerSection from './sidebar/PowerSection';
import ProjectionKpiCards from './ProjectionKpiCards';
import ProjectionVisualizer from './ProjectionVisualizer';
import ProjectionSliceTable from './ProjectionSliceTable';
import ProjectionMaskModal from './ProjectionMaskModal';
import {
  showToast,
  isDesktopApp,
  saveDesktopProject,
  openDesktopProject,
  readDesktopProjectFile,
  onDesktopProjectOpen,
  setupDesktopFileDrop,
} from '@/lib/desktop';
import { useI18n } from '@/lib/i18n';
import { useAppMode } from '@/lib/appMode';

export default function ProjectionCalculator() {
  const { t, language } = useI18n();
  const { mode, setMode } = useAppMode();
  const [inputs, setInputs] = useState<ProjectionInputs>(INITIAL_INPUTS);
  const [selectedPreset, setSelectedPreset] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('elt_projection_selected_preset_v1') || 'facade';
    }
    return 'facade';
  });
  const [projectName, setProjectName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('elt_projection_project_name_v1') || '';
    }
    return '';
  });
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'front' | 'top' | 'side' | 'slices'>('front');
  const [isMaskModalOpen, setIsMaskModalOpen] = useState(false);
  const [copiedSpec, setCopiedSpec] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const computed = useMemo(() => computeProjection(inputs, language), [inputs, language]);

  const updateInputs = (updates: Partial<ProjectionInputs>) => {
    setInputs((prev) => ({ ...prev, ...updates }));
  };

  const handleSetProjectName = (name: string) => {
    setProjectName(name);
    try {
      localStorage.setItem('elt_projection_project_name_v1', name);
    } catch {
      // ignore
    }
  };

  const handleNewProject = useCallback(() => {
    setInputs(INITIAL_INPUTS);
    setSelectedPreset('facade');
    const defaultName = language === 'en' ? 'New Project' : 'Новый проект';
    handleSetProjectName(defaultName);
    setCurrentFilePath(null);
    showToast(language === 'en' ? 'New project created' : 'Создан новый проект');
  }, [language]);

  const handleResetInputs = () => {
    setInputs(INITIAL_INPUTS);
    setSelectedPreset('facade');
    handleSetProjectName(t('projection.preset.facade'));
    setCurrentFilePath(null);
    showToast(t('projection.project.resetDone'));
  };

  const handleCopySpec = () => {
    const text = buildProjectionSpecText(computed, undefined, language);
    navigator.clipboard?.writeText(text);
    setCopiedSpec(true);
    showToast(t('projection.action.copied'));
    setTimeout(() => setCopiedSpec(false), 2000);
  };

  const activePresetName = useMemo(() => {
    if (projectName && projectName.trim()) {
      return projectName.trim();
    }
    if (selectedPreset in BUILTIN_PRESETS) {
      return t(BUILTIN_PRESETS[selectedPreset].nameKey);
    }
    return `Wall ${computed.wallW}×${computed.wallH}m`;
  }, [projectName, selectedPreset, t, computed.wallW, computed.wallH]);

  const saveProjectToFile = useCallback(async (targetPath: string | null = null) => {
    const safeName = (projectName || activePresetName || 'project').replace(/[/\\?%*:|"<>]/g, '_');
    const defaultName = `${safeName}.projection`;
    const payload = {
      format: 'engineering-led-tool-projection',
      version: 1,
      module: 'projection',
      exportedAt: new Date().toISOString(),
      eventName: projectName || activePresetName,
      inputs,
    };
    const jsonContent = JSON.stringify(payload, null, 2);

    if (isDesktopApp()) {
      try {
        const savedPath = await saveDesktopProject(targetPath, defaultName, jsonContent);
        if (savedPath) {
          setCurrentFilePath(savedPath);
          const fileName = savedPath.split(/[\\/]/).pop() || defaultName;
          showToast(t('projection.project.saved', { name: fileName }));
        }
      } catch (err) {
        console.error('Failed to save project:', err);
        showToast(language === 'en' ? 'Failed to save project' : 'Ошибка сохранения проекта');
      }
      return;
    }

    // Browser fallback
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(t('projection.project.saved', { name: defaultName }));
  }, [projectName, activePresetName, inputs, t, language]);

  const applyProjectData = useCallback((content: string, filePath?: string) => {
    try {
      const data = JSON.parse(content);
      if (!data) return;

      if (data.inputs && typeof data.inputs === 'object') {
        updateInputs(data.inputs);
        if (data.eventName || data.name) {
          handleSetProjectName(data.eventName || data.name);
        }
        if (filePath) {
          setCurrentFilePath(filePath);
        }
        const fileName = (filePath ? filePath.split(/[\\/]/).pop() : null) || 'project.projection';
        showToast(t('projection.project.loaded', { name: fileName }));
        return;
      }

      // Legacy fallback for presets or single item array
      let legacyInputs: Partial<ProjectionInputs> | null = null;
      let legacyName: string | null = null;
      if (Array.isArray(data) && data[0]?.inputs) {
        legacyInputs = data[0].inputs;
        legacyName = data[0].name;
      } else if (data && Array.isArray(data.presets) && data.presets[0]?.inputs) {
        legacyInputs = data.presets[0].inputs;
        legacyName = data.presets[0].name;
      } else if (data && typeof data.name === 'string' && data.inputs) {
        legacyInputs = data.inputs;
        legacyName = data.name;
      }

      if (legacyInputs) {
        updateInputs(legacyInputs);
        if (legacyName) {
          handleSetProjectName(legacyName);
        }
        if (filePath) {
          setCurrentFilePath(filePath);
        }
        const fileName = (filePath ? filePath.split(/[\\/]/).pop() : null) || 'project.projection';
        showToast(t('projection.project.loaded', { name: fileName }));
        return;
      }

      showToast(language === 'en' ? 'Unrecognized file format' : 'Неизвестный формат файла');
    } catch (err) {
      console.error('Error applying loaded project:', err);
      showToast(language === 'en' ? 'Error reading file' : 'Ошибка чтения файла');
    }
  }, [t, language]);

  const openProjectDialog = useCallback(async () => {
    if (isDesktopApp()) {
      try {
        const res = await openDesktopProject();
        if (res && res.content) {
          applyProjectData(res.content, res.filePath);
        }
      } catch (err) {
        console.error('Failed to open project:', err);
      }
      return;
    }

    fileInputRef.current?.click();
  }, [applyProjectData]);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      applyProjectData(text, file.name);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Keyboard shortcuts (Ctrl+S, Ctrl+Shift+S, Ctrl+O)
  useEffect(() => {
    if (mode !== 'projection') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (!isCtrlOrMeta) return;

      if (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') {
        e.preventDefault();
        if (e.shiftKey) {
          saveProjectToFile(null);
        } else {
          saveProjectToFile(currentFilePath);
        }
      } else if (e.key === 'o' || e.key === 'O' || e.key === 'щ' || e.key === 'Щ') {
        e.preventDefault();
        openProjectDialog();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, currentFilePath, saveProjectToFile, openProjectDialog]);

  // Support desktop file drop and external file open (drag & drop from Explorer into window)
  useEffect(() => {
    const unsubProjectOpen = onDesktopProjectOpen((project) => {
      if (project && project.content) {
        try {
          const parsed = JSON.parse(project.content);
          if (parsed && (parsed.format === 'projection' || parsed.projectionInputs || (parsed.wallW !== undefined && parsed.lumensPerProj !== undefined))) {
            setMode('projection');
            applyProjectData(project.content, project.filePath);
          }
        } catch {
          // not a projection JSON
        }
      }
    });

    const unsubFileDrop = setupDesktopFileDrop(async (paths) => {
      const projPath = paths.find((p) => {
        const lower = p.toLowerCase();
        return lower.endsWith('.projection') || lower.endsWith('.json') || lower.endsWith('.ss');
      });
      if (projPath) {
        try {
          const res = await readDesktopProjectFile(projPath);
          if (res && res.content) {
            const parsed = JSON.parse(res.content);
            if (parsed && (parsed.format === 'projection' || parsed.projectionInputs || (parsed.wallW !== undefined && parsed.lumensPerProj !== undefined))) {
              setMode('projection');
              applyProjectData(res.content, res.filePath);
            }
          }
        } catch (e) {
          console.error('Failed to load dropped projection file:', e);
        }
      }
    });

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer?.files?.[0];
      if (file && (file.name.endsWith('.projection') || file.name.endsWith('.json') || file.name.endsWith('.ss'))) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            applyProjectData(String(reader.result || ''), file.name);
          } catch (err) {
            console.error('Failed to parse dropped projection file:', err);
          }
        };
        reader.readAsText(file);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      unsubProjectOpen();
      unsubFileDrop();
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [applyProjectData, setMode]);


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

        {/* Project Section: New, Open, Save, Save As, Quick Templates & Reset */}
        <ProjectionPresetsSection
          inputs={inputs}
          onApplyInputs={updateInputs}
          onResetInputs={handleResetInputs}
          projectName={projectName}
          onProjectNameChange={handleSetProjectName}
          currentFilePath={currentFilePath}
          onNewProject={handleNewProject}
          onSaveProject={() => saveProjectToFile(currentFilePath)}
          onSaveProjectAs={() => saveProjectToFile(null)}
          onLoadProject={openProjectDialog}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".projection,.json,.ss"
          onChange={handleFileInputChange}
          className="hidden"
        />

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
              onClick={() => {
                setViewMode('side');
                updateInputs({ canvasTab: 'side' });
              }}
              className={[
                'px-4 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2',
                viewMode === 'side'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]',
              ].join(' ')}
            >
              <span>{t('projection.view.side')}</span>
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
            <ProjectionVisualizer computed={computed} activeTab={inputs.canvasTab} eventName={activePresetName} />
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
        eventName={activePresetName || 'Engineering LED Tool'}
        onEventNameChange={handleSetProjectName}
      />
    </div>
  );
}
