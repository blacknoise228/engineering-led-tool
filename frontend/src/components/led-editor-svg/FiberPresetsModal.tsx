'use client';
import React, { useState, useEffect } from 'react';
import { DEFAULT_FIBER_PRESETS, type FiberConverterPreset, type CardPreset } from '@/lib/led-editor-svg/presets';
import { slugify } from '@/lib/led-editor-svg/utils';
import { showToast, openDesktopFibersFileDialog, saveDesktopFibersFileDialog } from '@/lib/desktop';
import PresetsModalLayout from './PresetsModalLayout';

interface FiberPresetsModalProps {
  open: boolean;
  onClose: () => void;
  presets: FiberConverterPreset[];
  onSavePresets: (newPresets: FiberConverterPreset[]) => Promise<void> | void;
  activePresetId?: string;
  onSelectPreset?: (id: string) => void;
  filePath?: string;
  availableCards?: CardPreset[];
}

export default function FiberPresetsModal({
  open,
  onClose,
  presets,
  onSavePresets,
  activePresetId,
  onSelectPreset,
  filePath,
  availableCards = [],
}: FiberPresetsModalProps) {
  const [list, setList] = useState<FiberConverterPreset[]>(presets);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFilePath, setCurrentFilePath] = useState(filePath || 'fibers.json');

  const [formName, setFormName] = useState('');
  const [formId, setFormId] = useState('');
  const [formPairedWith, setFormPairedWith] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  useEffect(() => {
    if (isCreatingNew) return;
    const cur = list.find(p => p.id === selectedId);
    if (cur) {
      setFormName(cur.name);
      setFormId(cur.id);
      setFormPairedWith(Array.isArray(cur.pairedWith) ? cur.pairedWith.join(', ') : '');
      setFormNotes(cur.notes || '');
      setErrorMessage(null);
    }
  }, [selectedId, list, isCreatingNew]);

  const validateImportedFiber = (raw: Record<string, unknown>, idx: number): FiberConverterPreset | null => {
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `cvt-${idx + 1}`;
    const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : `Конвертер ${idx + 1}`;
    let pairedWith: string[] | undefined = undefined;
    if (Array.isArray(raw.pairedWith)) {
      pairedWith = raw.pairedWith
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map(item => item.trim());
    } else if (typeof raw.pairedWith === 'string' && raw.pairedWith.trim()) {
      pairedWith = raw.pairedWith
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }
    const notes = typeof raw.notes === 'string' && raw.notes.trim() ? raw.notes.trim() : undefined;
    return {
      id,
      name,
      ...(pairedWith && pairedWith.length > 0 ? { pairedWith } : {}),
      ...(notes ? { notes } : {}),
    };
  };

  const handleResetDefaults = async () => {
    try {
      const content = JSON.stringify(DEFAULT_FIBER_PRESETS, null, 2);
      const saved = await saveDesktopFibersFileDialog('fibers.json', content);
      if (saved) {
        const fileName = saved.split(/[\\/]/).pop() || saved;
        setList(DEFAULT_FIBER_PRESETS);
        setCurrentFilePath(fileName);
        const initialId = DEFAULT_FIBER_PRESETS[0]?.id || '';
        setSelectedId(initialId);
        setIsCreatingNew(false);
        await onSavePresets(DEFAULT_FIBER_PRESETS);
        if (onSelectPreset) onSelectPreset(initialId);
        showToast(`Создан новый файл пресетов: ${fileName}`);
      }
    } catch (e) {
      console.error('Failed to create new fibers file:', e);
      showToast('Ошибка при создании файла пресетов');
    }
  };

  const handleStartNew = () => {
    setIsCreatingNew(true);
    setSelectedId('');
    setFormName('');
    setFormId('');
    setFormPairedWith('');
    setFormNotes('');
    setErrorMessage(null);
  };

  const handleDuplicate = (preset: FiberConverterPreset) => {
    let nextId = `${preset.id}-copy`;
    let count = 1;
    while (list.some(p => p.id === nextId)) {
      count++;
      nextId = `${preset.id}-copy-${count}`;
    }
    const cloned: FiberConverterPreset = {
      ...preset,
      id: nextId,
      name: `${preset.name} (Копия)`,
    };
    const nextList = [...list, cloned];
    setList(nextList);
    setSelectedId(nextId);
    setIsCreatingNew(false);
    onSavePresets(nextList);
    showToast(`Конвертер "${cloned.name}" скопирован`);
  };

  const togglePairedCard = (cardId: string) => {
    const tokens = formPairedWith
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const exists = tokens.includes(cardId);
    const nextTokens = exists ? tokens.filter(t => t !== cardId) : [...tokens, cardId];
    setFormPairedWith(nextTokens.join(', '));
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const name = formName.trim();
    if (!name) {
      setErrorMessage('Укажите название модели конвертера');
      return;
    }

    const id = formId.trim() || slugify(name);
    if (!id) {
      setErrorMessage('Укажите идентификатор ID');
      return;
    }

    if (isCreatingNew) {
      if (list.some(p => p.id.toLowerCase() === id.toLowerCase())) {
        setErrorMessage(`Конвертер с ID "${id}" уже существует`);
        return;
      }
    } else {
      if (list.some(p => p.id.toLowerCase() === id.toLowerCase() && p.id !== selectedId)) {
        setErrorMessage(`Конвертер с ID "${id}" уже существует`);
        return;
      }
    }

    const parsedPaired = formPairedWith
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const newPreset: FiberConverterPreset = {
      id,
      name,
      pairedWith: parsedPaired.length > 0 ? parsedPaired : undefined,
      notes: formNotes.trim() || undefined,
    };

    let nextList: FiberConverterPreset[];
    if (isCreatingNew) {
      nextList = [...list, newPreset];
    } else {
      nextList = list.map(p => (p.id === selectedId ? newPreset : p));
    }

    setList(nextList);
    setSelectedId(id);
    setIsCreatingNew(false);
    await onSavePresets(nextList);
    showToast(`Конвертер "${name}" успешно сохранен`);
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDeleteId) return;
    if (list.length <= 1) {
      showToast('Нельзя удалить последнюю модель');
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
    showToast(`Конвертер "${target?.name || confirmDeleteId}" удален`);
  };

  if (!open) return null;

  return (
    <PresetsModalLayout<FiberConverterPreset>
      open={open}
      onClose={onClose}
      title="Управление оптическими конвертерами"
      subtitle="База оптических трансиверов NovaStar CVT и конвертеров"
      accentColor="purple"
      headerIcon={
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="12" r="3" />
          <path d="M9 12h6" />
          <path d="M12 9v6" />
        </svg>
      }
      filePath={currentFilePath}
      defaultFileName="fibers.json"
      items={list}
      selectedId={selectedId}
      isCreatingNew={isCreatingNew}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Поиск конвертера..."
      createNewButtonLabel="+ Создать конвертер"
      emptyListText="Конвертеры не найдены"
      errorMessage={errorMessage}
      confirmDeleteId={confirmDeleteId}
      confirmDeleteTitle="Удаление конвертера"
      confirmDeleteDescription={`Вы уверены, что хотите удалить конвертер "${list.find(p => p.id === confirmDeleteId)?.name || confirmDeleteId}"?`}
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
        setSelectedId(valid[0].id);
        setIsCreatingNew(false);
        setErrorMessage(null);
        await onSavePresets(valid);
        if (onSelectPreset) onSelectPreset(valid[0].id);
      }}
      validateImportedItem={validateImportedFiber}
      openDesktopDialog={openDesktopFibersFileDialog}
      saveDesktopDialog={saveDesktopFibersFileDialog}
      renderListItemSubtext={p => (
        <span className="flex items-center gap-1.5 truncate">
          <span className="font-mono text-neutral-500">ID: {p.id}</span>
          {p.notes && (
            <>
              <span className="text-neutral-600">•</span>
              <span className="text-neutral-400 truncate">{p.notes}</span>
            </>
          )}
        </span>
      )}
      renderListItemBadge={p => {
        const count = Array.isArray(p.pairedWith) ? p.pairedWith.length : 0;
        if (count === 0) return null;
        return (
          <span className="text-[9px] px-1.5 py-0.2 rounded uppercase font-semibold shrink-0 bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {count} {count === 1 ? 'пара' : count < 5 ? 'пары' : 'пар'}
          </span>
        );
      }}
    >
      <form onSubmit={handleSaveForm} className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div>
            <h3 className="text-base font-semibold text-white">
              {isCreatingNew ? 'Создание нового конвертера' : 'Редактирование конвертера'}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isCreatingNew
                ? 'Заполните параметры и нажмите "Создать и сохранить"'
                : `Изменение параметров для ${formName || selectedId}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isCreatingNew && (
              <button
                type="button"
                onClick={handleStartNew}
                className="px-3 py-1.5 rounded-lg bg-[#1a1d2b] hover:bg-[#222638] text-neutral-300 hover:text-white text-xs font-medium border border-white/[0.1] transition flex items-center gap-1.5"
                title="Создать новый конвертер"
              >
                <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>+ Создать конвертер</span>
              </button>
            )}
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                Название конвертера <span className="text-red-400">*</span>
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
                placeholder="Например: NovaStar CVT10"
                className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                ID (Идентификатор) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formId}
                onChange={e => setFormId(e.target.value.toLowerCase().trim())}
                placeholder="Например: cvt10"
                className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-purple-300 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
              Совместимые карты / видеопроцессоры (ID через запятую)
            </label>
            <input
              type="text"
              value={formPairedWith}
              onChange={e => setFormPairedWith(e.target.value)}
              placeholder="Например: vx1000, h5_e, h9_e"
              className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
            />
            {availableCards.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-neutral-500 mr-1">Быстрый выбор:</span>
                {availableCards.map(c => {
                  const tokens = formPairedWith
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean);
                  const isSelected = tokens.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => togglePairedCard(c.id)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600/30 border-purple-500/60 text-purple-200'
                          : 'bg-[#141620] border-white/[0.08] text-neutral-400 hover:text-white hover:border-white/[0.2]'
                      }`}
                      title={c.name}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
              Примечания / описание
            </label>
            <input
              type="text"
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder="Например: Пара к VX1000 (10 Ethernet-выходов)."
              className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-3">
          {isCreatingNew && (
            <button
              type="button"
              onClick={() => {
                setIsCreatingNew(false);
                setSelectedId(list[0]?.id || '');
                setErrorMessage(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.06] transition"
            >
              Отмена
            </button>
          )}
          <button
            type="submit"
            className="px-5 py-2 rounded-xl text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30 transition active:scale-[0.98] flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>{isCreatingNew ? 'Создать и сохранить' : 'Сохранить изменения'}</span>
          </button>
        </div>
      </form>
    </PresetsModalLayout>
  );
}
