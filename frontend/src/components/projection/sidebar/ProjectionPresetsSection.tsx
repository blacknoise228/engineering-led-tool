'use client';

import React from 'react';
import { ProjectionInputs, CustomProjectionPreset } from '@/lib/projection/types';
import { BUILTIN_PRESETS } from '@/lib/projection/calculator';
import { useI18n } from '@/lib/i18n';

interface ProjectionPresetsSectionProps {
  inputs: ProjectionInputs;
  onApplyInputs: (newInputs: Partial<ProjectionInputs>) => void;
  onResetInputs: () => void;
  selectedPreset?: string;
  setSelectedPreset?: (id: string) => void;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  currentFilePath?: string | null;
  onNewProject?: () => void;
  onSaveProject?: () => void;
  onSaveProjectAs?: () => void;
  onLoadProject?: () => void;
  // Optional for backward compatibility:
  customPresets?: CustomProjectionPreset[];
  setCustomPresets?: React.Dispatch<React.SetStateAction<CustomProjectionPreset[]>>;
}

export default function ProjectionPresetsSection({
  onApplyInputs,
  onResetInputs,
  projectName,
  onProjectNameChange,
  currentFilePath,
  onNewProject,
  onSaveProject,
  onSaveProjectAs,
  onLoadProject,
}: ProjectionPresetsSectionProps) {
  const { t, language } = useI18n();

  const handleApplyTemplate = (templateKey: string) => {
    if (!templateKey || !(templateKey in BUILTIN_PRESETS)) return;
    const template = BUILTIN_PRESETS[templateKey];
    onApplyInputs(template.inputs);
    if (!projectName || projectName.trim() === '' || projectName === 'Новый проект' || projectName === 'New Project') {
      onProjectNameChange(t(template.nameKey));
    }
  };

  const fileNameOnly = currentFilePath ? currentFilePath.split(/[\\/]/).pop() : null;



  return (
    <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-3">
      {/* Header with Title and File Status */}
      <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-300">
            {t('projection.project.title')}
          </span>
        </div>

        {/* File status badge */}
        <div className="flex items-center">
          {fileNameOnly ? (
            <span
              title={currentFilePath || ''}
              className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 rounded max-w-[140px] truncate"
            >
              {fileNameOnly}
            </span>
          ) : (
            <span className="text-[10px] text-neutral-500 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded">
              {t('projection.project.unsaved')}
            </span>
          )}
        </div>
      </div>

      {/* Project / Event Name Field */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 block">
          {t('projection.project.name')}
        </label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          placeholder={t('projection.project.namePh')}
          className="w-full bg-[#141721] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-cyan-500/50 transition font-medium"
        />
      </div>

      {/* Project Actions: New, Open, Save, Save As */}
      <div className="grid grid-cols-4 gap-1.5 pt-0.5">
        {/* New Project */}
        <button
          type="button"
          onClick={onNewProject}
          title={t('projection.project.newTooltip')}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/[0.06] text-xs transition active:scale-[0.98]"
        >
          <svg className="w-3.5 h-3.5 mb-0.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="text-[11px] font-medium">{t('projection.project.new')}</span>
        </button>

        {/* Open Project */}
        <button
          type="button"
          onClick={onLoadProject}
          title={t('projection.project.openTooltip')}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-[#141620] hover:bg-[#1a1d28] text-neutral-200 hover:text-white border border-white/[0.08] text-xs transition active:scale-[0.98]"
        >
          <svg className="w-3.5 h-3.5 mb-0.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium">{t('projection.project.open')}</span>
            <span className="text-[9px] text-neutral-500 font-mono hidden sm:inline">Ctrl+O</span>
          </div>
        </button>

        {/* Save Project (Ctrl+S) - High-visibility Primary button */}
        <button
          type="button"
          onClick={onSaveProject}
          title={t('projection.project.saveTooltip')}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-blue-500/20 transition active:scale-[0.98]"
        >
          <svg className="w-3.5 h-3.5 mb-0.5 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium">{t('projection.project.save')}</span>
            <span className="text-[9px] text-white/70 font-mono hidden sm:inline">Ctrl+S</span>
          </div>
        </button>

        {/* Save As (Ctrl+Shift+S) */}
        <button
          type="button"
          onClick={onSaveProjectAs}
          title={t('projection.project.saveAsTooltip')}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/[0.06] text-xs transition active:scale-[0.98]"
        >
          <svg className="w-3.5 h-3.5 mb-0.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span className="text-[11px] font-medium">{t('projection.project.saveAs')}</span>
        </button>
      </div>

      {/* Quick Start Templates Picker */}
      <div className="space-y-1 pt-1 border-t border-white/[0.06]">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
            {t('projection.project.templates')}
          </label>
          <button
            type="button"
            onClick={onResetInputs}
            title={t('projection.project.resetTooltip')}
            className="text-[10px] text-neutral-500 hover:text-cyan-300 flex items-center gap-1 transition"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>{language === 'en' ? 'Reset' : 'Сброс'}</span>
          </button>
        </div>
        <select
          defaultValue=""
          onChange={(e) => {
            handleApplyTemplate(e.target.value);
            e.target.value = '';
          }}
          className="w-full bg-[#141721] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 outline-none focus:border-cyan-500/50 transition cursor-pointer"
        >
          <option value="" disabled>
            {t('projection.project.templateSelect')}
          </option>
          <option value="facade">{t('projection.preset.facade')}</option>
          <option value="panorama">{t('projection.preset.panorama')}</option>
          <option value="tower">{t('projection.preset.tower')}</option>
          <option value="single27">{t('projection.preset.single27')}</option>
        </select>
      </div>
    </div>
  );
}
