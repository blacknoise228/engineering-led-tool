'use client';
import React, { useState, useEffect } from 'react';
import { DEFAULT_CARD_PRESETS, type CardPreset } from '@/lib/led-editor-svg/presets';
import { slugify } from '@/lib/led-editor-svg/utils';
import { showToast, openDesktopCardsFileDialog, saveDesktopCardsFileDialog } from '@/lib/desktop';
import PresetsModalLayout from './PresetsModalLayout';

interface CardPresetsModalProps {
  open: boolean;
  onClose: () => void;
  presets: CardPreset[];
  onSavePresets: (newPresets: CardPreset[]) => Promise<void> | void;
  activePresetId?: string;
  onSelectPreset?: (id: string) => void;
  filePath?: string;
}

export default function CardPresetsModal({
  open,
  onClose,
  presets,
  onSavePresets,
  activePresetId,
  onSelectPreset,
  filePath,
}: CardPresetsModalProps) {
  const [list, setList] = useState<CardPreset[]>(presets);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFilePath, setCurrentFilePath] = useState(filePath || 'cards.json');

  // Form fields
  const [formName, setFormName] = useState('');
  const [formId, setFormId] = useState('');
  const [formCategory, setFormCategory] = useState<'sending' | 'processor'>('sending');
  const [formMaxInput, setFormMaxInput] = useState('1920×1200 @60Hz');
  const [formOutputPorts, setFormOutputPorts] = useState(4);
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
      setFormCategory(cur.category);
      setFormMaxInput(cur.maxInput || '1920×1200 @60Hz');
      setFormOutputPorts(cur.outputPorts || 4);
      setFormNotes(cur.notes || '');
      setErrorMessage(null);
    }
  }, [selectedId, list, isCreatingNew]);

  const validateImportedCard = (raw: Record<string, unknown>, idx: number): CardPreset | null => {
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `card-${idx + 1}`;
    const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : `Карта ${idx + 1}`;
    const category = raw.category === 'processor' ? 'processor' : 'sending';
    const maxInput = typeof raw.maxInput === 'string' && raw.maxInput.trim() ? raw.maxInput.trim() : '1920×1200 @60Hz';
    const outputPorts = typeof raw.outputPorts === 'number' && raw.outputPorts > 0 ? raw.outputPorts : 4;
    const notes = typeof raw.notes === 'string' && raw.notes.trim() ? raw.notes.trim() : undefined;
    return { id, name, category, maxInput, outputPorts, ...(notes ? { notes } : {}) };
  };

  const handleResetDefaults = async () => {
    try {
      const content = JSON.stringify(DEFAULT_CARD_PRESETS, null, 2);
      const saved = await saveDesktopCardsFileDialog('cards.json', content);
      if (saved) {
        const fileName = saved.split(/[\\/]/).pop() || saved;
        setList(DEFAULT_CARD_PRESETS);
        setCurrentFilePath(fileName);
        const initialId = DEFAULT_CARD_PRESETS[0]?.id || '';
        setSelectedId(initialId);
        setIsCreatingNew(false);
        await onSavePresets(DEFAULT_CARD_PRESETS);
        if (onSelectPreset) onSelectPreset(initialId);
        showToast(`Создан новый файл пресетов: ${fileName}`);
      }
    } catch (e) {
      console.error('Failed to create new cards file:', e);
      showToast('Ошибка при создании файла пресетов');
    }
  };

  const handleStartNew = () => {
    setIsCreatingNew(true);
    setSelectedId('');
    setFormName('');
    setFormId('');
    setFormCategory('sending');
    setFormMaxInput('1920×1200 @60Hz');
    setFormOutputPorts(4);
    setFormNotes('');
    setErrorMessage(null);
  };

  const handleDuplicate = (preset: CardPreset) => {
    let nextId = `${preset.id}-copy`;
    let count = 1;
    while (list.some(p => p.id === nextId)) {
      count++;
      nextId = `${preset.id}-copy-${count}`;
    }
    const cloned: CardPreset = {
      ...preset,
      id: nextId,
      name: `${preset.name} (Копия)`,
    };
    const nextList = [...list, cloned];
    setList(nextList);
    setSelectedId(nextId);
    setIsCreatingNew(false);
    onSavePresets(nextList);
    showToast(`Карта "${cloned.name}" скопирована`);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const name = formName.trim();
    if (!name) {
      setErrorMessage('Укажите название модели карты');
      return;
    }

    const id = formId.trim() || slugify(name);
    if (!id) {
      setErrorMessage('Укажите идентификатор ID');
      return;
    }

    if (isCreatingNew) {
      if (list.some(p => p.id.toLowerCase() === id.toLowerCase())) {
        setErrorMessage(`Карта с ID "${id}" уже существует`);
        return;
      }
    } else {
      if (list.some(p => p.id.toLowerCase() === id.toLowerCase() && p.id !== selectedId)) {
        setErrorMessage(`Карта с ID "${id}" уже существует`);
        return;
      }
    }

    if (formOutputPorts <= 0) {
      setErrorMessage('Количество портов должно быть больше 0');
      return;
    }

    const newPreset: CardPreset = {
      id,
      name,
      category: formCategory,
      maxInput: formMaxInput.trim() || '1920×1200 @60Hz',
      outputPorts: formOutputPorts,
      notes: formNotes.trim() || undefined,
    };

    let nextList: CardPreset[];
    if (isCreatingNew) {
      nextList = [...list, newPreset];
    } else {
      nextList = list.map(p => (p.id === selectedId ? newPreset : p));
    }

    setList(nextList);
    setSelectedId(id);
    setIsCreatingNew(false);
    await onSavePresets(nextList);
    showToast(`Карта "${name}" успешно сохранена`);
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
    showToast(`Карта "${target?.name || confirmDeleteId}" удалена`);
  };

  if (!open) return null;

  return (
    <PresetsModalLayout<CardPreset>
      open={open}
      onClose={onClose}
      title="Управление картами и процессорами"
      subtitle="База отправочных карт и видеопроцессоров"
      accentColor="blue"
      headerIcon={
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      }
      filePath={currentFilePath}
      defaultFileName="cards.json"
      items={list}
      selectedId={selectedId}
      isCreatingNew={isCreatingNew}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Поиск карты..."
      createNewButtonLabel="+ Создать карту"
      emptyListText="Карты не найдены"
      errorMessage={errorMessage}
      confirmDeleteId={confirmDeleteId}
      confirmDeleteTitle="Удаление карты"
      confirmDeleteDescription={`Вы уверены, что хотите удалить карту "${list.find(p => p.id === confirmDeleteId)?.name || confirmDeleteId}"?`}
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
      validateImportedItem={validateImportedCard}
      openDesktopDialog={openDesktopCardsFileDialog}
      saveDesktopDialog={saveDesktopCardsFileDialog}
      renderListItemBadge={p => (
        <span
          className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-semibold shrink-0 ${
            p.category === 'processor'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
          }`}
        >
          {p.category === 'processor' ? 'Процессор' : 'Карта'}
        </span>
      )}
      renderListItemSubtext={p => (
        <span className="flex items-center gap-2">
          <span>{p.outputPorts} порт(ов)</span>
          <span className="text-neutral-600">•</span>
          <span className="truncate max-w-[120px]">{p.maxInput}</span>
        </span>
      )}
    >
      <form onSubmit={handleSaveForm} className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {isCreatingNew ? 'Создание новой карты / процессора' : 'Редактирование параметров карты'}
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
                        title="Создать новую карту"
                      >
                        <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>+ Создать карту</span>
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
                        Название карты / процессора <span className="text-red-400">*</span>
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
                        placeholder="Например: NovaStar VX1000"
                        className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
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
                        placeholder="Например: vx1000"
                        className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Category & Output Ports */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                        Тип устройства
                      </label>
                      <select
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value as 'sending' | 'processor')}
                        className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="sending">Отправочная карта (Sending Card)</option>
                        <option value="processor">Процессор (All-in-one Processor)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                        Количество портов Ethernet <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={128}
                        required
                        value={formOutputPorts}
                        onChange={e => setFormOutputPorts(Math.max(1, parseInt(e.target.value || '1', 10)))}
                        className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Max input & Notes */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                        Максимальный входной сигнал (разрешение @ частота)
                      </label>
                      <input
                        type="text"
                        value={formMaxInput}
                        onChange={e => setFormMaxInput(e.target.value)}
                        placeholder="3840×1080 @60Hz"
                        className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                        Примечание / Описание
                      </label>
                      <input
                        type="text"
                        value={formNotes}
                        onChange={e => setFormNotes(e.target.value)}
                        placeholder="Опциональное примечание к оборудованию"
                        className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="p-3.5 rounded-xl bg-[#0e1017] border border-white/[0.06] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Итоговые параметры карты</div>
                      <div className="text-sm font-semibold text-white mt-0.5">{formName || 'Безымянная модель'}</div>
                      <div className="text-xs text-neutral-400 mt-0.5 font-mono">
                        {formCategory === 'processor' ? 'Процессор' : 'Отправочная карта'} • {formOutputPorts} порт(ов) • {formMaxInput}
                      </div>
                    </div>
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
                    className="px-5 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 transition active:scale-[0.98] flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{isCreatingNew ? 'Создать прессет' : 'Сохранить изменения'}</span>
                  </button>
                </div>
              </form>
    </PresetsModalLayout>
  );
}




