'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DEFAULT_PANEL_PRESETS, type PanelPreset } from '@/lib/led-editor-svg/presets';
import ConfirmModal from './ConfirmModal';
import { showToast, isDesktopApp, openDesktopPanelsFileDialog, saveDesktopPanelsFileDialog } from '@/lib/desktop';

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

function slugify(text: string): string {
  const ruToEn: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
    з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
    п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
    ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  const lower = text.toLowerCase().trim();
  let res = '';
  for (const char of lower) {
    if (ruToEn[char] !== undefined) {
      res += ruToEn[char];
    } else if (/[a-z0-9]/.test(char)) {
      res += char;
    } else if (char === ' ' || char === '-' || char === '_' || char === '.') {
      res += '-';
    }
  }
  return res.replace(/-+/g, '-').replace(/^-|-$/g, '') || 'panel';
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
  const [list, setList] = useState<PanelPreset[]>(presets);
  const [selectedId, setSelectedId] = useState<string>(activePresetId || presets[0]?.id || '');
  const [currentFilePath, setCurrentFilePath] = useState<string>(filePath || '');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Editing form state
  const [formName, setFormName] = useState('');
  const [formId, setFormId] = useState('');
  const [formW, setFormW] = useState(500);
  const [formH, setFormH] = useState(1000);
  const [formResW, setFormResW] = useState(128);
  const [formResH, setFormResH] = useState(256);
  const [formPitch, setFormPitch] = useState(3.9);
  const [formPower, setFormPower] = useState(200);
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
      setFormSpecial(cur.special);
      setErrorMessage(null);
    }
  }, [selectedId, list, isCreatingNew]);

  // Close on Escape if no nested confirm modal is open
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

  // Filtered preset list
  const filteredPresets = useMemo(() => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [list, searchQuery]);
  const handleOpenFile = async () => {
    if (isDesktopApp()) {
      try {
        const res = await openDesktopPanelsFileDialog();
        if (res && res.content) {
          const parsed = JSON.parse(res.content);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setList(parsed);
            if (res.filePath) setCurrentFilePath(res.filePath);
            const initialId = parsed[0]?.id || '';
            setSelectedId(initialId);
            setIsCreatingNew(false);
            await onSavePresets(parsed);
            if (onSelectPreset) onSelectPreset(initialId);
            const fileName = res.filePath.split(/[\\/]/).pop() || res.filePath;
            showToast(`Загружено ${parsed.length} моделей из ${fileName}`);
            return;
          } else {
            showToast('В выбранном файле не найден массив панелей');
          }
        }
      } catch (e) {
        console.error('Failed to open panels file:', e);
        showToast('Ошибка при чтении файла пресетов');
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed) && parsed.length > 0) {
          setList(parsed);
          setCurrentFilePath(file.name);
          const initialId = parsed[0]?.id || '';
          setSelectedId(initialId);
          setIsCreatingNew(false);
          await onSavePresets(parsed);
          if (onSelectPreset) onSelectPreset(initialId);
          showToast(`Загружено ${parsed.length} моделей из ${file.name}`);
        } else {
          showToast('Неверный формат файла пресетов');
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
      const saved = await saveDesktopPanelsFileDialog('panels.json', content);
      if (saved) {
        const fileName = saved.split(/[\\/]/).pop() || saved;
        showToast(`Пресеты экспортированы в ${fileName}`);
      }
    } catch (e) {
      console.error('Failed to export presets:', e);
      showToast('Ошибка при экспорте файла');
    }
  };

  const handleCreateNewFile = async () => {
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
        showToast(`Создан новый файл пресетов: ${fileName}`);
      }
    } catch (e) {
      console.error('Failed to create new presets file:', e);
      showToast('Ошибка при создании файла пресетов');
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
      name: `${preset.name} (Копия)`,
    };
    const nextList = [...list, cloned];
    setList(nextList);
    setSelectedId(nextId);
    setIsCreatingNew(false);
    onSavePresets(nextList);
    showToast(`Панель "${cloned.name}" скопирована`);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const name = formName.trim();
    if (!name) {
      setErrorMessage('Укажите название модели панели');
      return;
    }

    const id = formId.trim() || slugify(name);
    if (!id) {
      setErrorMessage('Укажите идентификатор ID');
      return;
    }

    if (isCreatingNew) {
      if (list.some(p => p.id.toLowerCase() === id.toLowerCase())) {
        setErrorMessage(`Панель с ID "${id}" уже существует. Выберите другой ID.`);
        return;
      }
    } else {
      if (list.some(p => p.id.toLowerCase() === id.toLowerCase() && p.id !== selectedId)) {
        setErrorMessage(`Панель с ID "${id}" уже существует. Выберите другой ID.`);
        return;
      }
    }

    if (formW <= 0 || formH <= 0) {
      setErrorMessage('Размеры панели должны быть больше 0');
      return;
    }
    if (formResW <= 0 || formResH <= 0) {
      setErrorMessage('Разрешение панели должно быть больше 0');
      return;
    }
    if (formPitch <= 0) {
      setErrorMessage('Шаг пикселя должен быть больше 0');
      return;
    }
    if (formPower < 0) {
      setErrorMessage('Мощность не может быть отрицательной');
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
    showToast(`Панель "${name}" сохранена`);
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDeleteId) return;
    if (list.length <= 1) {
      showToast('Нельзя удалить последнюю панель');
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
    showToast(`Панель "${target?.name || confirmDeleteId}" удалена`);
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          className="relative flex flex-col w-full max-w-5xl h-[85vh] max-h-[850px] bg-[#0c0e14] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#12141c]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white tracking-wide">
                  Управление прессетами LED панелей
                </h2>
                <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                  <span>Файл:</span>
                  <span className="font-mono text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40 text-[10px]" title={currentFilePath || filePath}>
                    {currentFilePath || filePath || 'panels.json (рядом с бинарником)'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.08] transition text-sm"
              title="Закрыть (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Preset List */}
            <div className="w-80 border-r border-white/[0.08] bg-[#0f1118] flex flex-col">
              {/* Search & Add */}
              <div className="p-3 border-b border-white/[0.06] space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Поиск по названию..."
                    className="flex-1 bg-[#181a24] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-2 py-1.5 text-xs text-neutral-400 hover:text-white"
                      title="Очистить поиск"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCreateNewFile}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition active:scale-[0.98] shadow-sm bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/30"
                  title="Создать новый файл пресетов (.json)"
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
                    <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Выбрать файл</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportFile}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#181a24] hover:bg-[#202330] text-neutral-300 hover:text-white border border-white/[0.08] text-[11px] font-medium transition active:scale-[0.98]"
                    title="Экспортировать текущие пресеты в файл (.json)"
                  >
                    <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                          ? 'bg-cyan-950/30 border-cyan-500/50 text-white shadow-sm shadow-cyan-950/50'
                          : 'bg-[#141620] border-white/[0.04] hover:bg-[#1a1d2b] hover:border-white/[0.1] text-neutral-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="font-medium text-xs truncate leading-snug">
                          {p.name}
                        </div>
                        {p.special && (
                          <span className="shrink-0 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded font-mono">
                            Special
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-neutral-400 font-mono">
                        <span>{p.w}×{p.h} мм</span>
                        <span>•</span>
                        <span>{p.resW}×{p.resH} px</span>
                        <span>•</span>
                        <span>P{p.pitch_mm}</span>
                        <span>•</span>
                        <span>{p.power} Вт</span>
                      </div>

                      {/* Card actions */}
                      <div className="mt-2 pt-1.5 border-t border-white/[0.04] flex items-center justify-between">
                        <span className="text-[10px] font-mono text-neutral-500 truncate max-w-[150px]">
                          {p.id}
                        </span>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleDuplicate(p);
                            }}
                            className="p-1 rounded text-neutral-400 hover:text-cyan-400 hover:bg-white/[0.08] transition"
                            title="Дублировать панель"
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
                            title={list.length <= 1 ? 'Нельзя удалить единственную модель' : 'Удалить панель'}
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
                    Панели не найдены
                  </div>
                )}
              </div>

              {/* Footer of Left Pane */}
              <div className="p-3 border-t border-white/[0.06] bg-[#0c0e14] flex items-center justify-between text-xs">
                <span className="text-[11px] text-neutral-500">
                  Всего моделей: {list.length}
                </span>
                <button
                  type="button"
                  onClick={handleStartNew}
                  className="flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline font-medium transition"
                  title="Создать новую панель"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>+ Создать панель</span>
                </button>
              </div>
            </div>


            {/* Right Column: Editor Form */}
            <div className="flex-1 bg-[#12141d] flex flex-col overflow-y-auto">
              <form onSubmit={handleSaveForm} className="p-6 space-y-6 max-w-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {isCreatingNew ? 'Создание нового прессета' : 'Редактирование параметров панели'}
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
                  {/* Name & ID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                        Название модели <span className="text-red-400">*</span>
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
                        placeholder="Например: InfiLed 1m (500×1000) 4.6"
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
                        placeholder="Например: infiled-1m-4p6"
                        className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-neutral-500 mt-1 block">
                        Уникальный код модели для файлов проектов (.ss)
                      </span>
                    </div>
                  </div>
                  {/* Dimensions */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                        Ширина (мм) <span className="text-red-400">*</span>
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
                        Высота (мм) <span className="text-red-400">*</span>
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
                        Разрешение W (px) <span className="text-red-400">*</span>
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
                        Разрешение H (px) <span className="text-red-400">*</span>
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

                  {/* Pitch & Power */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                        Шаг пикселя (мм) <span className="text-red-400">*</span>
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
                        Мощность (Вт) <span className="text-red-400">*</span>
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
                        Специальный режим маски
                      </label>
                      <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                        Удваивает вертикальное разрешение при формировании маски контента. Используется для экрана с через-строчным пропуском пикселей.
                      </p>
                    </div>
                  </div>

                  {/* Preview summary card */}
                  <div className="p-3.5 rounded-xl bg-[#0e1017] border border-white/[0.06] flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                        Расчётные характеристики
                      </div>
                      <div className="text-xs text-neutral-300 flex items-center gap-3 font-mono">
                        <span>Площадь: {((formW * formH) / 1_000_000).toFixed(3)} м²</span>
                        <span>•</span>
                        <span>Пикселей: {(formResW * formResH).toLocaleString('ru-RU')} px</span>
                        <span>•</span>
                        <span>Соотношение: {(formW / formH).toFixed(2)}:1</span>
                      </div>
                    </div>
                    {/* Visual aspect preview */}
                    <div
                      className="border border-cyan-500/40 bg-cyan-500/10 rounded flex items-center justify-center text-[9px] text-cyan-300 font-mono"
                      style={{
                        width: `${Math.min(60, Math.max(24, Math.round(40 * (formW / formH))))}px`,
                        height: `${Math.min(60, Math.max(24, Math.round(40 * (formH / formW))))}px`,
                      }}
                      title={`Пропорции: ${formW}×${formH} мм`}
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
                      Отмена
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleStartNew}
                        className="px-3.5 py-2.5 rounded-xl bg-[#161822] hover:bg-[#1e202d] text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 text-xs font-medium transition active:scale-[0.98] flex items-center gap-1.5"
                        title="Создать новую панель"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>+ Создать панель</span>
                      </button>
                      {onAddPanelToCanvas && (
                        <button
                          type="button"
                          onClick={() => {
                            onAddPanelToCanvas(selectedId);
                            showToast(`Панель "${formName}" добавлена на схему`);
                            onClose();
                          }}
                          className="px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-medium border border-emerald-500/30 transition active:scale-[0.98] flex items-center gap-1.5"
                          title="Добавить панель в схему"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          <span>Добавить в схему</span>
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
                    <span>{isCreatingNew ? 'Создать и сохранить' : 'Сохранить изменения'}</span>
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={Boolean(confirmDeleteId)}
        title="Удаление модели панели"
        description={`Вы действительно хотите удалить панель "${list.find(p => p.id === confirmDeleteId)?.name || confirmDeleteId}"? Это действие удалит её из списка доступных моделей.`}
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


