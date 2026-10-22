'use client';
import React, { useEffect, useMemo, useRef } from 'react';
import ConfirmModal from './ConfirmModal';
import { showToast, isDesktopApp, type DesktopConfigResult } from '@/lib/desktop';

export interface BasePresetItem {
  id: string;
  name: string;
}

interface PresetsModalLayoutProps<T extends BasePresetItem> {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  headerIcon: React.ReactNode;
  accentColor?: 'cyan' | 'blue' | 'emerald';
  filePath: string;
  defaultFileName: string;
  items: T[];
  selectedId: string;
  isCreatingNew: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder: string;
  createNewButtonLabel: string;
  emptyListText: string;
  errorMessage: string | null;
  confirmDeleteId: string | null;
  confirmDeleteTitle: string;
  confirmDeleteDescription: string;
  onSetConfirmDeleteId: (id: string | null) => void;
  onConfirmDelete: () => void;
  onSelectItem: (id: string) => void;
  onStartCreateNew: () => void;
  onResetDefaults: () => void;
  onDuplicate?: (item: T) => void;
  onImportItems: (items: T[], filePath: string) => Promise<void> | void;
  validateImportedItem: (raw: Record<string, unknown>, index: number) => T | null;
  openDesktopDialog: () => Promise<DesktopConfigResult | null>;
  saveDesktopDialog: (defaultFilename: string, content: string) => Promise<string | null>;
  renderListItemSubtext: (item: T) => React.ReactNode;
  renderListItemBadge?: (item: T) => React.ReactNode;
  children: React.ReactNode;
}

const ACCENT_STYLES = {
  cyan: {
    iconWrap: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    fileText: 'text-cyan-400/90',
    newBtn: 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/30',
    activeItem: 'bg-blue-600/20 border-blue-500/40 text-white shadow-sm',
  },
  blue: {
    iconWrap: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    fileText: 'text-cyan-400/90',
    newBtn: 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border-blue-500/30',
    activeItem: 'bg-blue-600/20 border-blue-500/40 text-white shadow-sm',
  },
  emerald: {
    iconWrap: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    fileText: 'text-emerald-400/90',
    newBtn: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30',
    activeItem: 'bg-emerald-600/20 border-emerald-500/40 text-white shadow-sm',
  },
};

export default function PresetsModalLayout<T extends BasePresetItem>({
  open,
  onClose,
  title,
  subtitle,
  headerIcon,
  accentColor = 'cyan',
  filePath,
  defaultFileName,
  items,
  selectedId,
  isCreatingNew,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  createNewButtonLabel,
  emptyListText,
  errorMessage,
  confirmDeleteId,
  confirmDeleteTitle,
  confirmDeleteDescription,
  onSetConfirmDeleteId,
  onConfirmDelete,
  onSelectItem,
  onStartCreateNew,
  onResetDefaults,
  onDuplicate,
  onImportItems,
  validateImportedItem,
  openDesktopDialog,
  saveDesktopDialog,
  renderListItemSubtext,
  renderListItemBadge,
  children,
}: PresetsModalLayoutProps<T>) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const accent = ACCENT_STYLES[accentColor];

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

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [items, searchQuery]);

  if (!open) return null;

  const parseAndImportContent = async (content: string, sourcePath: string) => {
    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        showToast('Файл не содержит список пресетов');
        return;
      }
      const valid: T[] = [];
      parsed.forEach((raw, idx) => {
        if (raw && typeof raw === 'object') {
          const item = validateImportedItem(raw as Record<string, unknown>, idx);
          if (item) valid.push(item);
        }
      });
      if (valid.length === 0) {
        showToast('Не найдено корректных записей в файле');
        return;
      }
      await onImportItems(valid, sourcePath);
      showToast(`Загружено моделей: ${valid.length}`);
    } catch {
      showToast('Ошибка чтения JSON файла');
    }
  };

  const handleOpenFile = async () => {
    if (isDesktopApp()) {
      const res = await openDesktopDialog();
      if (res && res.content) {
        await parseAndImportContent(res.content, res.filePath);
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
      await parseAndImportContent(String(reader.result || ''), file.name);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleSaveAsFile = async () => {
    try {
      const content = JSON.stringify(items, null, 2);
      const savedPath = await saveDesktopDialog(defaultFileName, content);
      if (savedPath) {
        showToast(`Экспортировано: ${savedPath.split(/[\\/]/).pop()}`);
      }
    } catch {
      showToast('Ошибка экспорта файла');
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-4xl bg-[#0c0e14] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#10121a] gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${accent.iconWrap}`}>
                {headerIcon}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white leading-tight">{title}</h2>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <p className="text-xs text-neutral-400">{subtitle}</p>
                  {filePath && (
                    <span
                      className={`text-[10px] font-mono bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded truncate max-w-[260px] ${accent.fileText}`}
                      title={`Файл конфигурации: ${filePath}`}
                    >
                      {filePath.split(/[\\/]/).pop() || defaultFileName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenFile}
                className="px-2.5 py-1.5 rounded-lg bg-[#181a24] hover:bg-[#202330] text-neutral-300 hover:text-white border border-white/[0.08] text-xs font-medium transition flex items-center gap-1.5"
                title="Загрузить пресеты из другого JSON файла"
              >
                <span>Открыть JSON...</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAsFile}
                className="px-2.5 py-1.5 rounded-lg bg-[#181a24] hover:bg-[#202330] text-neutral-300 hover:text-white border border-white/[0.08] text-xs font-medium transition flex items-center gap-1.5"
                title="Сохранить список в отдельный JSON файл"
              >
                <span>Экспорт JSON...</span>
              </button>
              <button
                type="button"
                onClick={onResetDefaults}
                className="px-2.5 py-1.5 rounded-lg bg-[#181a24] hover:bg-[#202330] text-neutral-400 hover:text-amber-300 border border-white/[0.08] text-xs font-medium transition"
                title="Восстановить стандартные заводские пресеты"
              >
                Сбросить
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.08] transition text-sm"
                title="Закрыть (Esc)"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
            <div className="md:col-span-5 border-r border-white/[0.08] bg-[#0e1017] flex flex-col overflow-hidden">
              <div className="p-3 border-b border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
                    Доступные модели ({items.length})
                  </span>
                  <button
                    type="button"
                    onClick={onStartCreateNew}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition ${accent.newBtn}`}
                  >
                    {createNewButtonLabel}
                  </button>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-[#161822] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 max-h-[55vh]">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-xs text-neutral-500">{emptyListText}</div>
                ) : (
                  filteredItems.map(p => {
                    const isSelected = !isCreatingNew && p.id === selectedId;
                    return (
                      <div
                        key={p.id}
                        onClick={() => onSelectItem(p.id)}
                        className={[
                          'group relative rounded-xl p-2.5 border cursor-pointer transition flex items-center justify-between gap-2',
                          isSelected
                            ? accent.activeItem
                            : 'bg-[#13151f] border-white/[0.05] text-neutral-300 hover:bg-[#181b28] hover:border-white/[0.1]',
                        ].join(' ')}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold truncate text-white">{p.name}</span>
                            {renderListItemBadge?.(p)}
                          </div>
                          <div className="text-[11px] text-neutral-400 mt-0.5 font-mono">
                            {renderListItemSubtext(p)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                          {onDuplicate && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onDuplicate(p);
                              }}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
                              title="Дублировать модель"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            </button>
                          )}
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onSetConfirmDeleteId(p.id);
                              }}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition"
                              title="Удалить модель"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="md:col-span-7 p-6 overflow-y-auto flex flex-col justify-between bg-[#10121a]">
              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                  {errorMessage}
                </div>
              )}
              {children}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(confirmDeleteId)}
        title={confirmDeleteTitle}
        description={confirmDeleteDescription}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={onConfirmDelete}
        onClose={() => onSetConfirmDeleteId(null)}
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
