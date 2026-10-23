'use client';
import React, { useState, useEffect } from 'react';
import { DEFAULT_PANEL_PRESETS, type PanelPreset } from '@/lib/led-editor-svg/presets';
import { slugify } from '@/lib/led-editor-svg/utils';
import { showToast, openDesktopPanelsFileDialog, saveDesktopPanelsFileDialog } from '@/lib/desktop';
import PresetsModalLayout from './PresetsModalLayout';
import { useI18n } from '@/lib/i18n';

interface PanelPresetsModalProps {
  open: boolean;
  onClose: () => void;
  presets: PanelPreset[];
  onSavePresets: (newPresets: PanelPreset[]) => Promise<void> | void;
  activePresetId?: string;
  onSelectPreset?: (id: string) => void;
  onAddPanelToCanvas?: (presetId: string) => void;
  filePath?: string;
}

export default function PanelPresetsModal({
  open,
  onClose,
  presets,
  onSavePresets,
  activePresetId,
  onSelectPreset,
  onAddPanelToCanvas,
  filePath,
}: PanelPresetsModalProps) {
  const { language, t } = useI18n();
  const [list, setList] = useState<PanelPreset[]>(presets);
  const [selectedId, setSelectedId] = useState<string>(activePresetId || presets[0]?.id || '');
  const [currentFilePath, setCurrentFilePath] = useState<string>(filePath || '');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Editing form state
  const [formName, setFormName] = useState('');
  const [formId, setFormId] = useState('');
  const [formW, setFormW] = useState(500);
  const [formH, setFormH] = useState(1000);
  const [formResW, setFormResW] = useState(128);
  const [formResH, setFormResH] = useState(256);
  const [formPitch, setFormPitch] = useState(3.9);
  const [formPower, setFormPower] = useState(200);
  const [formWeight, setFormWeight] = useState(13.5);
  const [formSpecial, setFormSpecial] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Confirm modals
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sync external presets into local state when modal opens
  useEffect(() => {
    if (open) {
      setList(presets);
      if (filePath) setCurrentFilePath(filePath);
      const initialId = activePresetId && presets.some(p => p.id === activePresetId)
        ? activePresetId
        : presets[0]?.id || '';
      setSelectedId(initialId);
      setIsCreatingNew(false);
      setErrorMessage(null);
    }
  }, [open, presets, activePresetId, filePath]);

  // Load selected preset into form
  useEffect(() => {
    if (isCreatingNew) return;
    const cur = list.find(p => p.id === selectedId);
    if (cur) {
      setFormName(cur.name);
      setFormId(cur.id);
      setFormW(cur.w);
      setFormH(cur.h);
      setFormResW(cur.resW);
      setFormResH(cur.resH);
      setFormPitch(cur.pitch_mm);
      setFormPower(cur.power);
      setFormWeight(cur.weight ?? 0);
      setFormSpecial(cur.special);
      setErrorMessage(null);
    }
  }, [selectedId, list, isCreatingNew]);

  const validateImportedPanel = (raw: Record<string, unknown>, idx: number): PanelPreset | null => {
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `panel-${idx + 1}`;
    const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : `Панель ${idx + 1}`;
    const w = typeof raw.w === 'number' && raw.w > 0 ? raw.w : 500;
    const h = typeof raw.h === 'number' && raw.h > 0 ? raw.h : 1000;
    const resW = typeof raw.resW === 'number' && raw.resW > 0 ? raw.resW : 104;
    const resH = typeof raw.resH === 'number' && raw.resH > 0 ? raw.resH : 208;
    const pitch_mm = typeof raw.pitch_mm === 'number' && raw.pitch_mm > 0 ? raw.pitch_mm : 4.8;
    const power = typeof raw.power === 'number' && raw.power >= 0 ? raw.power : 200;
    const weight = typeof raw.weight === 'number' && raw.weight >= 0 ? raw.weight : 0;
    const special = Boolean(raw.special);
    return { id, name, w, h, resW, resH, pitch_mm, power, weight, special };
  };

  const handleResetDefaults = async () => {
    try {
      const content = JSON.stringify(DEFAULT_PANEL_PRESETS, null, 2);
      const saved = await saveDesktopPanelsFileDialog('panels.json', content);
      if (saved) {
        const fileName = saved.split(/[\\/]/).pop() || saved;
        setList(DEFAULT_PANEL_PRESETS);
        setCurrentFilePath(fileName);
        const initialId = DEFAULT_PANEL_PRESETS[0]?.id || '';
        setSelectedId(initialId);
        setIsCreatingNew(false);
        await onSavePresets(DEFAULT_PANEL_PRESETS);
        if (onSelectPreset) onSelectPreset(initialId);
        showToast(language === 'en' ? `Created new presets file: ${fileName}` : `Создан новый файл пресетов: ${fileName}`);
      }
    } catch (e) {
      console.error('Failed to create new presets file:', e);
      showToast(language === 'en' ? 'Error creating presets file' : 'Ошибка при создании файла пресетов');
    }
  };



  const handleStartNew = () => {
    setIsCreatingNew(true);
    setSelectedId('');
    setFormName('');
    setFormId('');
    setFormW(500);
    setFormH(1000);
    setFormResW(104);
    setFormResH(208);
    setFormPitch(4.8);
    setFormPower(322);
    setFormWeight(13.5);
    setFormSpecial(false);
    setErrorMessage(null);
  };

  const handleDuplicate = (preset: PanelPreset) => {
    let nextId = `${preset.id}-copy`;
    let count = 1;
    while (list.some(p => p.id === nextId)) {
      count++;
      nextId = `${preset.id}-copy-${count}`;
    }
    const cloned: PanelPreset = {
      ...preset,
      id: nextId,
      name: `${preset.name} (${t('panels.copy')})`,
    };
    const nextList = [...list, cloned];
    setList(nextList);
    setSelectedId(nextId);
    setIsCreatingNew(false);
    onSavePresets(nextList);
    showToast(language === 'en' ? `Panel "${cloned.name}" copied` : `Панель "${cloned.name}" скопирована`);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const name = formName.trim();
    if (!name) {
      setErrorMessage(language === 'en' ? 'Specify panel model name' : 'Укажите название модели панели');
      return;
    }

    const id = formId.trim() || slugify(name);
    if (!id) {
      setErrorMessage(language === 'en' ? 'Specify ID identifier' : 'Укажите идентификатор ID');
      return;
    }

    if (isCreatingNew) {
      if (list.some(p => p.id.toLowerCase() === id.toLowerCase())) {
        setErrorMessage(language === 'en' ? `Panel with ID "${id}" already exists. Choose another ID.` : `Панель с ID "${id}" уже существует. Выберите другой ID.`);
        return;
      }
    } else {
      if (list.some(p => p.id.toLowerCase() === id.toLowerCase() && p.id !== selectedId)) {
        setErrorMessage(language === 'en' ? `Panel with ID "${id}" already exists. Choose another ID.` : `Панель с ID "${id}" уже существует. Выберите другой ID.`);
        return;
      }
    }

    if (formW <= 0 || formH <= 0) {
      setErrorMessage(language === 'en' ? 'Panel dimensions must be greater than 0' : 'Размеры панели должны быть больше 0');
      return;
    }
    if (formResW <= 0 || formResH <= 0) {
      setErrorMessage(language === 'en' ? 'Panel resolution must be greater than 0' : 'Разрешение панели должно быть больше 0');
      return;
    }
    if (formPitch <= 0) {
      setErrorMessage(language === 'en' ? 'Pixel pitch must be greater than 0' : 'Шаг пикселя должен быть больше 0');
      return;
    }
    if (formPower < 0) {
      setErrorMessage(language === 'en' ? 'Power cannot be negative' : 'Мощность не может быть отрицательной');
      return;
    }
    if (formWeight < 0) {
      setErrorMessage(language === 'en' ? 'Weight cannot be negative' : 'Вес не может быть отрицательным');
      return;
    }

    const newPreset: PanelPreset = {
      id,
      name,
      w: formW,
      h: formH,
      resW: formResW,
      resH: formResH,
      pitch_mm: formPitch,
      power: formPower,
      weight: formWeight,
      special: formSpecial,
    };

    let nextList: PanelPreset[];
    if (isCreatingNew) {
      nextList = [...list, newPreset];
      setIsCreatingNew(false);
      setSelectedId(id);
    } else {
      nextList = list.map(p => (p.id === selectedId ? newPreset : p));
      setSelectedId(id);
    }

    setList(nextList);
    await onSavePresets(nextList);
    if (onSelectPreset) {
      onSelectPreset(id);
    }
    showToast(language === 'en' ? `Panel "${name}" saved` : `Панель "${name}" сохранена`);
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDeleteId) return;
    if (list.length <= 1) {
      showToast(language === 'en' ? 'Cannot delete the last model' : 'Нельзя удалить последнюю панель');
      setConfirmDeleteId(null);
      return;
    }

    const target = list.find(p => p.id === confirmDeleteId);
    const nextList = list.filter(p => p.id !== confirmDeleteId);
    setList(nextList);

    if (selectedId === confirmDeleteId) {
      const nextActive = nextList[0]?.id || '';
      setSelectedId(nextActive);
      setIsCreatingNew(false);
      if (onSelectPreset) onSelectPreset(nextActive);
    }

    setConfirmDeleteId(null);
    await onSavePresets(nextList);
    showToast(language === 'en' ? `Panel "${target?.name || confirmDeleteId}" deleted` : `Панель "${target?.name || confirmDeleteId}" удалена`);
  };

  if (!open) return null;

  return (
    <PresetsModalLayout<PanelPreset>
      open={open}
      onClose={onClose}
      title={t('panels.modalTitle')}
      subtitle={t('panels.modalSubtitle')}
      accentColor="cyan"
      headerIcon={
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      }
      filePath={currentFilePath || filePath || 'panels.json'}
      defaultFileName="panels.json"
      items={list}
      selectedId={selectedId}
      isCreatingNew={isCreatingNew}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={t('panels.searchPlaceholder')}
      createNewButtonLabel={t('panels.createBtn')}
      emptyListText={t('panels.emptyList')}
      errorMessage={errorMessage}
      confirmDeleteId={confirmDeleteId}
      confirmDeleteTitle={t('panels.deleteTitle')}
      confirmDeleteDescription={t('panels.deleteDesc', { name: list.find(p => p.id === confirmDeleteId)?.name || confirmDeleteId || '' })}
      onSetConfirmDeleteId={setConfirmDeleteId}
      onConfirmDelete={handleDeleteConfirmed}
      onSelectItem={id => {
        setSelectedId(id);
        setIsCreatingNew(false);
        setErrorMessage(null);
      }}
      onStartCreateNew={handleStartNew}
      onResetDefaults={handleResetDefaults}
      onDuplicate={handleDuplicate}
      onImportItems={async (valid, sourcePath) => {
        setList(valid);
        setCurrentFilePath(sourcePath);
        const initialId = valid[0]?.id || '';
        setSelectedId(initialId);
        setIsCreatingNew(false);
        setErrorMessage(null);
        await onSavePresets(valid);
        if (onSelectPreset) onSelectPreset(initialId);
      }}
      validateImportedItem={validateImportedPanel}
      openDesktopDialog={openDesktopPanelsFileDialog}
      saveDesktopDialog={saveDesktopPanelsFileDialog}
      renderListItemBadge={p =>
        p.special ? (
          <span className="shrink-0 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded font-mono">
            Special
          </span>
        ) : null
      }
      renderListItemSubtext={p => (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span>{p.w}×{p.h} mm</span>
          <span>•</span>
          <span>{p.resW}×{p.resH} px</span>
          <span>•</span>
          <span>P{p.pitch_mm}</span>
          <span>•</span>
          <span>{p.power} W</span>
          <span>•</span>
          <span>{p.weight ?? 0} kg</span>
        </span>
      )}
    >
      <form onSubmit={handleSaveForm} className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {isCreatingNew ? t('panels.createNewHeader') : t('panels.editHeader')}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {isCreatingNew
                        ? t('panels.createSubtitle')
                        : t('panels.editSubtitle', { name: formName || selectedId })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isCreatingNew && (
                      <button
                        type="button"
                        onClick={handleStartNew}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-medium border border-cyan-500/30 transition flex items-center gap-1.5"
                        title="Создать новую панель"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>+ Создать панель</span>
                      </button>
                    )}
                    {!isCreatingNew && onAddPanelToCanvas && (
                      <button
                        type="button"
                        onClick={() => {
                          onAddPanelToCanvas(selectedId);
                          showToast(`Панель "${formName}" добавлена на схему`);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-medium border border-emerald-500/30 transition flex items-center gap-1.5"
                        title="Добавить панель в текущую схему"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>+ В схему</span>
                      </button>
                    )}
                    {!isCreatingNew && onSelectPreset && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPreset(selectedId);
                          showToast(`Выбрана модель: ${formName}`);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#1a1d2b] hover:bg-[#222638] text-neutral-300 hover:text-white text-xs font-medium border border-white/[0.1] transition flex items-center gap-1.5"
                        title="Выбрать эту модель в селекторе"
                      >
                        <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Выбрать</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-4">
                  {/* Name & ID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                        {t('panels.modelName')} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={e => {
                          const val = e.target.value;
                          setFormName(val);
                          if (isCreatingNew && (!formId || formId === slugify(formName))) {
                            setFormId(slugify(val));
                          }
                        }}
                        placeholder={t('panels.modelNamePh')}
                        className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                        {t('panels.id')} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formId}
                        onChange={e => setFormId(e.target.value.toLowerCase().trim())}
                        placeholder={t('panels.idPh')}
                        className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-neutral-500 mt-1 block">
                        {t('panels.idDesc')}
                      </span>
                    </div>
                  </div>
                  {/* Dimensions */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                        {t('panels.width')} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={formW}
                        onChange={e => setFormW(Math.max(1, parseInt(e.target.value || '1', 10)))}
                        className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                        {t('panels.height')} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={formH}
                        onChange={e => setFormH(Math.max(1, parseInt(e.target.value || '1', 10)))}
                        className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Resolution */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                        {t('panels.resW')} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={formResW}
                        onChange={e => setFormResW(Math.max(1, parseInt(e.target.value || '1', 10)))}
                        className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                        {t('panels.resH')} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={formResH}
                        onChange={e => setFormResH(Math.max(1, parseInt(e.target.value || '1', 10)))}
                        className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Pitch, Power & Weight */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                        {t('panels.pitch')} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={0.1}
                        required
                        value={formPitch}
                        onChange={e => setFormPitch(Math.max(0.1, parseFloat(e.target.value || '0.1')))}
                        className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                        {t('panels.power')} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={formPower}
                        onChange={e => setFormPower(Math.max(0, parseInt(e.target.value || '0', 10)))}
                        className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                        {t('panels.weight')}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        value={formWeight}
                        onChange={e => setFormWeight(Math.max(0, parseFloat(e.target.value || '0')))}
                        className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Special Galaxy mode toggle */}
                  <div className="p-3.5 rounded-xl bg-[#181a24] border border-white/[0.06] flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="special-mode-toggle"
                      checked={formSpecial}
                      onChange={e => setFormSpecial(e.target.checked)}
                      className="mt-0.5 rounded border-white/20 bg-neutral-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
                    />
                    <div>
                      <label htmlFor="special-mode-toggle" className="text-xs font-medium text-white cursor-pointer select-none">
                        {t('panels.special')}
                      </label>
                      <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                        {t('panels.specialDesc')}
                      </p>
                    </div>
                  </div>

                  {/* Preview summary card */}
                  <div className="p-3.5 rounded-xl bg-[#0e1017] border border-white/[0.06] flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                        {t('panels.calcProps')}
                      </div>
                      <div className="text-xs text-neutral-300 flex items-center gap-3 font-mono">
                        <span>{t('panels.area', { area: ((formW * formH) / 1_000_000).toFixed(3) })}</span>
                        <span>•</span>
                        <span>{t('panels.pixels', { pixels: (formResW * formResH).toLocaleString(language === 'en' ? 'en-US' : 'ru-RU') })}</span>
                        <span>•</span>
                        <span>{t('panels.aspect', { ratio: (formW / formH).toFixed(2) })}</span>
                        <span>•</span>
                        <span>{t('panels.weightCalc', { weight: formWeight || 0 })}</span>
                      </div>
                    </div>
                    {/* Visual aspect preview */}
                    <div
                      className="border border-cyan-500/40 bg-cyan-500/10 rounded flex items-center justify-center text-[9px] text-cyan-300 font-mono"
                      style={{
                        width: `${Math.min(60, Math.max(24, Math.round(40 * (formW / formH))))}px`,
                        height: `${Math.min(60, Math.max(24, Math.round(40 * (formH / formW))))}px`,
                      }}
                      title={`${formW}×${formH} mm`}
                    >
                      {formW}×{formH}
                    </div>
                  </div>

                </div>
                {/* Submit buttons */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  {isCreatingNew ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingNew(false);
                        setSelectedId(list[0]?.id || '');
                      }}
                      className="px-4 py-2 rounded-xl bg-[#161822] hover:bg-[#1e202d] text-neutral-300 hover:text-white border border-white/[0.08] text-xs font-medium transition active:scale-[0.98]"
                    >
                      {t('presets.cancel')}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleStartNew}
                        className="px-3.5 py-2.5 rounded-xl bg-[#161822] hover:bg-[#1e202d] text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 text-xs font-medium transition active:scale-[0.98] flex items-center gap-1.5"
                        title={t('panels.createBtn')}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>{t('panels.createBtn')}</span>
                      </button>
                      {onAddPanelToCanvas && (
                        <button
                          type="button"
                          onClick={() => {
                            onAddPanelToCanvas(selectedId);
                            showToast(language === 'en' ? `Panel "${formName}" added to schema` : `Панель "${formName}" добавлена на схему`);
                            onClose();
                          }}
                          className="px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-medium border border-emerald-500/30 transition active:scale-[0.98] flex items-center gap-1.5"
                          title={t('panels.addToSchemaTitle')}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          <span>{t('panels.addToSchema')}</span>
                        </button>
                      )}
                    </>
                  )}

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs shadow-lg shadow-cyan-600/25 transition active:scale-[0.98] flex items-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    <span>{isCreatingNew ? t('presets.createAndSave') : t('presets.saveChanges')}</span>
                  </button>
                </div>

              </form>
    </PresetsModalLayout>
  );
}


