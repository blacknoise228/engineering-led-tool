'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { ServerPreset } from '@/lib/led-editor-svg/presets';
import ConfirmModal from './ConfirmModal';
import { showToast, isDesktopApp, openDesktopServersFileDialog, saveDesktopServersFileDialog } from '@/lib/desktop';

interface ServerPresetsModalProps {
  open: boolean;
  onClose: () => void;
  presets: ServerPreset[];
  onSavePresets: (newPresets: ServerPreset[]) => Promise<void> | void;
  activePresetId?: string;
  onSelectPreset?: (id: string) => void;
  filePath?: string;
}

function slugify(text: string): string {
  const ruToEn: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
    з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
    п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
    ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return text
    .toLowerCase()
    .split('')
    .map(char => ruToEn[char] ?? char)
    .join('')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function ServerPresetsModal({
  open,
  onClose,
  presets,
  onSavePresets,
  activePresetId,
  onSelectPreset,
  filePath,
}: ServerPresetsModalProps) {
  const [list, setList] = useState<ServerPreset[]>(presets);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFilePath, setCurrentFilePath] = useState(filePath || 'servers.json');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formId, setFormId] = useState('');
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
      setFormNotes(cur.notes || '');
      setErrorMessage(null);
    }
  }, [selectedId, list, isCreatingNew]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmDeleteId) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, confirmDeleteId, onClose]);

  const filteredPresets = useMemo(() => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [list, searchQuery]);

  const handleOpenFile = async () => {
    if (isDesktopApp()) {
      try {
        const res = await openDesktopServersFileDialog();
        if (res && res.content) {
          const parsed = JSON.parse(res.content);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setList(parsed);
            if (res.filePath) setCurrentFilePath(res.filePath);
            setSelectedId(parsed[0].id);
            setIsCreatingNew(false);
            await onSavePresets(parsed);
            showToast(`Загружено ${parsed.length} серверов из файла`);
          } else {
            showToast('В файле нет валидного списка серверов');
          }
        }
      } catch (e) {
        console.error('Failed to open servers file:', e);
        showToast('Ошибка при открытии файла');
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setList(parsed);
          setSelectedId(parsed[0].id);
          setIsCreatingNew(false);
          await onSavePresets(parsed);
          showToast(`Импортировано ${parsed.length} серверов`);
        } else {
          showToast('Некорректный JSON');
        }
      } catch {
        showToast('Ошибка парсинга JSON');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleExportFile = async () => {
    try {
      const content = JSON.stringify(list, null, 2);
      const saved = await saveDesktopServersFileDialog('servers.json', content);
      if (saved) {
        const fileName = saved.split(/[\\/]/).pop() || saved;
        showToast(`Пресеты серверов экспортированы в ${fileName}`);
      }
    } catch (e) {
      console.error('Failed to export presets:', e);
      showToast('Ошибка при экспорте файла');
    }
  };

  const handleStartNew = () => {
    setIsCreatingNew(true);
    setSelectedId('');
    setFormName('');
    setFormId('');
    setFormNotes('');
    setErrorMessage(null);
  };

  const handleDuplicate = (preset: ServerPreset) => {
    let nextId = `${preset.id}-copy`;
    let count = 1;
    while (list.some(p => p.id === nextId)) {
      count++;
      nextId = `${preset.id}-copy-${count}`;
    }
    const cloned: ServerPreset = {
      ...preset,
      id: nextId,
      name: `${preset.name} (Копия)`,
    };
    const nextList = [...list, cloned];
    setList(nextList);
    setSelectedId(nextId);
    setIsCreatingNew(false);
    onSavePresets(nextList);
    showToast(`Сервер "${cloned.name}" скопирован`);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const name = formName.trim();
    if (!name) {
      setErrorMessage('Укажите название модели сервера');
      return;
    }

    const id = formId.trim() || slugify(name);
    if (!id) {
      setErrorMessage('Укажите идентификатор ID');
      return;
    }

    if (isCreatingNew) {
      if (list.some(p => p.id.toLowerCase() === id.toLowerCase())) {
        setErrorMessage(`Сервер с ID "${id}" уже существует`);
        return;
      }
    } else {
      if (list.some(p => p.id.toLowerCase() === id.toLowerCase() && p.id !== selectedId)) {
        setErrorMessage(`Сервер с ID "${id}" уже существует`);
        return;
      }
    }

    const newPreset: ServerPreset = {
      id,
      name,
      notes: formNotes.trim() || undefined,
    };

    let nextList: ServerPreset[];
    if (isCreatingNew) {
      nextList = [...list, newPreset];
    } else {
      nextList = list.map(p => (p.id === selectedId ? newPreset : p));
    }

    setList(nextList);
    setSelectedId(id);
    setIsCreatingNew(false);
    await onSavePresets(nextList);
    showToast(`Сервер "${name}" успешно сохранен`);
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
    showToast(`Сервер "${target?.name || confirmDeleteId}" удален`);
  };

  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          className="relative flex flex-col w-full max-w-4xl h-[80vh] max-h-[750px] bg-[#0c0e14] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#12141c]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" />
                  <line x1="6" y1="18" x2="6.01" y2="18" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Управление медиасерверами</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-neutral-400">Файл пресетов:</span>
                  <span className="text-[11px] font-mono text-cyan-400/90 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20 truncate max-w-sm" title={currentFilePath}>
                    {currentFilePath}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition"
              title="Закрыть"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Preset List */}
            <div className="w-72 md:w-80 border-r border-white/[0.08] flex flex-col bg-[#0e1017]">
              <div className="p-3 border-b border-white/[0.06] space-y-2.5">
                <div className="relative">
                  <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Поиск сервера..."
                    className="w-full bg-[#181a24] border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleStartNew}
                  className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition active:scale-[0.98] shadow-sm ${
                    isCreatingNew
                      ? 'bg-emerald-500 text-white ring-2 ring-emerald-400/50 shadow-emerald-900/50'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                  }`}
                  title="Создать новый прессет сервера"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Создать новый прессет</span>
                </button>
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={handleOpenFile}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#181a24] hover:bg-[#202330] text-neutral-300 hover:text-white border border-white/[0.08] text-[11px] font-medium transition active:scale-[0.98]"
                    title="Выбрать и открыть файл пресетов (.json)"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Выбрать файл</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportFile}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#181a24] hover:bg-[#202330] text-neutral-300 hover:text-white border border-white/[0.08] text-[11px] font-medium transition active:scale-[0.98]"
                    title="Экспортировать текущие пресеты серверов в файл (.json)"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Экспорт</span>
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {filteredPresets.map(p => {
                  const isSelected = !isCreatingNew && p.id === selectedId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedId(p.id);
                        setIsCreatingNew(false);
                      }}
                      className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-950/30 border-emerald-500/50 text-white shadow-sm shadow-emerald-950/50'
                          : 'bg-[#141620] border-white/[0.04] hover:bg-[#1a1d2b] hover:border-white/[0.1] text-neutral-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold truncate text-white">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-neutral-400 mt-0.5 font-mono truncate">
                            ID: {p.id}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleDuplicate(p);
                            }}
                            className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded transition"
                            title="Дублировать сервер"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            disabled={list.length <= 1}
                            onClick={e => {
                              e.stopPropagation();
                              setConfirmDeleteId(p.id);
                            }}
                            className={`p-1 rounded transition ${
                              list.length <= 1
                                ? 'text-neutral-600 cursor-not-allowed'
                                : 'text-neutral-400 hover:text-red-400 hover:bg-red-500/10'
                            }`}
                            title={list.length <= 1 ? 'Нельзя удалить единственный сервер' : 'Удалить сервер'}
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredPresets.length === 0 && (
                  <div className="text-center py-8 text-neutral-500 text-xs">
                    Серверы не найдены
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-white/[0.06] bg-[#0c0e14] flex items-center justify-between text-xs">
                <span className="text-[11px] text-neutral-500">
                  Всего моделей: {list.length}
                </span>
                <button
                  type="button"
                  onClick={handleStartNew}
                  className="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline font-medium transition"
                  title="Создать новый прессет"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Новый прессет</span>
                </button>
              </div>
            </div>

            {/* Right Column: Editor Form */}
            <div className="flex-1 bg-[#12141d] flex flex-col overflow-y-auto">
              <form onSubmit={handleSaveForm} className="p-6 space-y-6 max-w-xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {isCreatingNew ? 'Создание нового медиасервера' : 'Редактирование медиасервера'}
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
                        title="Создать новый прессет"
                      >
                        <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>+ Новый прессет</span>
                      </button>
                    )}
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Form fields */}
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                      Название сервера / ноутбука <span className="text-red-400">*</span>
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
                      placeholder="Например: HP Z2 или Acer Predator"
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
                      placeholder="Например: hp-z2"
                      className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                      Примечание / Конфигурация
                    </label>
                    <input
                      type="text"
                      value={formNotes}
                      onChange={e => setFormNotes(e.target.value)}
                      placeholder="Опциональное примечание (GPU, выходы, и т.д.)"
                      className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
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
                    className="px-5 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition active:scale-[0.98] flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{isCreatingNew ? 'Создать прессет' : 'Сохранить изменения'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmDeleteId}
        title="Удаление медиасервера"
        description={`Вы уверены, что хотите удалить медиасервер "${list.find(p => p.id === confirmDeleteId)?.name || confirmDeleteId}"?`}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleDeleteConfirmed}
        onClose={() => setConfirmDeleteId(null)}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileInputChange}
      />
    </>
  );
}



