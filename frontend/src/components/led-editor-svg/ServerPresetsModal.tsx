'use client';
import React, { useState, useEffect } from 'react';
import { DEFAULT_SERVER_PRESETS, type ServerPreset } from '@/lib/led-editor-svg/presets';
import { slugify } from '@/lib/led-editor-svg/utils';
import { showToast, openDesktopServersFileDialog, saveDesktopServersFileDialog } from '@/lib/desktop';
import PresetsModalLayout from './PresetsModalLayout';
import { useI18n } from '@/lib/i18n';

interface ServerPresetsModalProps {
  open: boolean;
  onClose: () => void;
  presets: ServerPreset[];
  onSavePresets: (newPresets: ServerPreset[]) => Promise<void> | void;
  activePresetId?: string;
  onSelectPreset?: (id: string) => void;
  filePath?: string;
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
  const { language, t } = useI18n();
  const [list, setList] = useState<ServerPreset[]>(presets);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFilePath, setCurrentFilePath] = useState(filePath || 'servers.json');

  const [formName, setFormName] = useState('');
  const [formId, setFormId] = useState('');
  const [formSpecs, setFormSpecs] = useState('');
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
      setFormSpecs(cur.specs || (cur as unknown as Record<string, unknown>).characteristics as string || '');
      setFormNotes(cur.notes || '');
      setErrorMessage(null);
    }
  }, [selectedId, list, isCreatingNew]);

  const validateImportedServer = (raw: Record<string, unknown>, idx: number): ServerPreset | null => {
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `server-${idx + 1}`;
    const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : `Сервер ${idx + 1}`;
    const specs = typeof raw.specs === 'string' && raw.specs.trim()
      ? raw.specs.trim()
      : (typeof raw.characteristics === 'string' && raw.characteristics.trim() ? raw.characteristics.trim() : undefined);
    const notes = typeof raw.notes === 'string' && raw.notes.trim() ? raw.notes.trim() : undefined;
    return {
      id,
      name,
      ...(specs ? { specs } : {}),
      ...(notes ? { notes } : {}),
    };
  };

  const handleResetDefaults = async () => {
    try {
      const content = JSON.stringify(DEFAULT_SERVER_PRESETS, null, 2);
      const saved = await saveDesktopServersFileDialog('servers.json', content);
      if (saved) {
        const fileName = saved.split(/[\\/]/).pop() || saved;
        setList(DEFAULT_SERVER_PRESETS);
        setCurrentFilePath(fileName);
        const initialId = DEFAULT_SERVER_PRESETS[0]?.id || '';
        setSelectedId(initialId);
        setIsCreatingNew(false);
        await onSavePresets(DEFAULT_SERVER_PRESETS);
        if (onSelectPreset) onSelectPreset(initialId);
        showToast(language === 'en' ? `Created new presets file: ${fileName}` : `Создан новый файл пресетов: ${fileName}`);
      }
    } catch (e) {
      console.error('Failed to create new servers file:', e);
      showToast(language === 'en' ? 'Error creating presets file' : 'Ошибка при создании файла пресетов');
    }
  };

  const handleStartNew = () => {
    setIsCreatingNew(true);
    setSelectedId('');
    setFormName('');
    setFormId('');
    setFormSpecs('');
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
      name: `${preset.name} (${t('panels.copy')})`,
    };
    const nextList = [...list, cloned];
    setList(nextList);
    setSelectedId(nextId);
    setIsCreatingNew(false);
    onSavePresets(nextList);
    showToast(language === 'en' ? `Server "${cloned.name}" copied` : `Сервер "${cloned.name}" скопирован`);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const name = formName.trim();
    if (!name) {
      setErrorMessage(language === 'en' ? 'Specify server model name' : 'Укажите название модели сервера');
      return;
    }

    const id = formId.trim() || slugify(name);
    if (!id) {
      setErrorMessage(language === 'en' ? 'Specify ID identifier' : 'Укажите идентификатор ID');
      return;
    }

    if (isCreatingNew) {
      if (list.some(p => p.id.toLowerCase() === id.toLowerCase())) {
        setErrorMessage(language === 'en' ? `Server with ID "${id}" already exists` : `Сервер с ID "${id}" уже существует`);
        return;
      }
    } else {
      if (list.some(p => p.id.toLowerCase() === id.toLowerCase() && p.id !== selectedId)) {
        setErrorMessage(language === 'en' ? `Server with ID "${id}" already exists` : `Сервер с ID "${id}" уже существует`);
        return;
      }
    }

    const newPreset: ServerPreset = {
      id,
      name,
      specs: formSpecs.trim() || undefined,
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
    showToast(language === 'en' ? `Server "${name}" successfully saved` : `Сервер "${name}" успешно сохранен`);
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDeleteId) return;
    if (list.length <= 1) {
      showToast(language === 'en' ? 'Cannot delete the last model' : 'Нельзя удалить последнюю модель');
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
    showToast(language === 'en' ? `Server "${target?.name || confirmDeleteId}" deleted` : `Сервер "${target?.name || confirmDeleteId}" удален`);
  };

  if (!open) return null;
  return (
    <PresetsModalLayout<ServerPreset>
      open={open}
      onClose={onClose}
      title={t('servers.modalTitle')}
      subtitle={t('servers.modalSubtitle')}
      accentColor="emerald"
      headerIcon={
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      }
      filePath={currentFilePath}
      defaultFileName="servers.json"
      items={list}
      selectedId={selectedId}
      isCreatingNew={isCreatingNew}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={t('servers.searchPlaceholder')}
      createNewButtonLabel={t('servers.createBtn')}
      emptyListText={t('servers.emptyList')}
      errorMessage={errorMessage}
      confirmDeleteId={confirmDeleteId}
      confirmDeleteTitle={t('servers.deleteTitle')}
      confirmDeleteDescription={t('servers.deleteDesc', { name: list.find(p => p.id === confirmDeleteId)?.name || confirmDeleteId || '' })}
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
      validateImportedItem={validateImportedServer}
      openDesktopDialog={openDesktopServersFileDialog}
      saveDesktopDialog={saveDesktopServersFileDialog}
      renderListItemSubtext={p => (
        <span className="flex items-center gap-1.5 truncate">
          <span className="font-mono text-neutral-500">ID: {p.id}</span>
          {p.specs && (
            <>
              <span className="text-neutral-600">•</span>
              <span className="text-neutral-400 truncate">{p.specs}</span>
            </>
          )}
        </span>
      )}
    >
      <form onSubmit={handleSaveForm} className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {isCreatingNew ? t('servers.createNewHeader') : t('servers.editHeader')}
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
                        className="px-3 py-1.5 rounded-lg bg-[#1a1d2b] hover:bg-[#222638] text-neutral-300 hover:text-white text-xs font-medium border border-white/[0.1] transition flex items-center gap-1.5"
                        title={t('servers.createBtn')}
                      >
                        <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>{t('servers.createBtn')}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                        {t('servers.nameLabel')} <span className="text-red-400">*</span>
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
                        placeholder={t('servers.namePh')}
                        className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                        {t('servers.idLabel')} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formId}
                        onChange={e => setFormId(e.target.value.toLowerCase().trim())}
                        placeholder={t('servers.idPh')}
                        className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                      {t('servers.specsLabel')}
                    </label>
                    <input
                      type="text"
                      value={formSpecs}
                      onChange={e => setFormSpecs(e.target.value)}
                      placeholder={t('servers.specsPh')}
                      className="w-full bg-[#181a24] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block mb-1.5">
                      {t('servers.notesLabel')}
                    </label>
                    <input
                      type="text"
                      value={formNotes}
                      onChange={e => setFormNotes(e.target.value)}
                      placeholder={t('servers.notesPh')}
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
                      {t('presets.cancel')}
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition active:scale-[0.98] flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{isCreatingNew ? t('presets.createPreset') : t('presets.saveChanges')}</span>
                  </button>
                </div>
              </form>
    </PresetsModalLayout>
  );
}



