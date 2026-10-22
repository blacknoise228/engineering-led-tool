'use client';
import React, { useMemo, useState, useCallback } from 'react';
import { type ServerPreset } from '@/lib/led-editor-svg/presets';

interface SidebarInfoTabProps {
  eventName: string;
  setEventName: (s: string) => void;
  eventDate: string;
  setEventDate: (s: string) => void;
  serverName?: string;
  setServerId?: (s: string) => void;
  servers?: Array<{ id: string; modelId: string }>;
  onServerAdd?: (modelId: string) => void;
  onServerRemove?: (id: string) => void;
  onServerChange?: (id: string, modelId: string) => void;
  serverPresetsList: ServerPreset[];
  onOpenServerPresetsModal?: () => void;
  specText: string;
  newProject?: () => void;
  saveJSON: () => void;
  openLoadJSONDialog: () => void;
}

export default function SidebarInfoTab({
  eventName,
  setEventName,
  eventDate,
  setEventDate,
  serverName,
  setServerId,
  servers,
  onServerAdd,
  onServerRemove,
  onServerChange,
  serverPresetsList,
  onOpenServerPresetsModal,
  specText,
  newProject,
  saveJSON,
  openLoadJSONDialog,
}: SidebarInfoTabProps) {
  const [newServerModelId, setNewServerModelId] = useState<string>(
    () => serverPresetsList[0]?.id ?? 'hp-z2'
  );
  const [copiedSpec, setCopiedSpec] = useState(false);

  const serverValue = useMemo(() => {
    const byId = serverPresetsList.find((s) => s.id === serverName)?.id;
    if (byId) return byId;
    const byName = serverPresetsList.find((s) => s.name === serverName)?.id;
    return byName ?? serverPresetsList[0]?.id ?? '';
  }, [serverName, serverPresetsList]);

  const handleCopySpec = useCallback(async () => {
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        await navigator.clipboard.writeText(specText);
      } else if (typeof document !== 'undefined') {
        const ta = document.createElement('textarea');
        ta.value = specText;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedSpec(true);
      setTimeout(() => setCopiedSpec(false), 2000);
    } catch (e) {
      console.error('Failed to copy spec to clipboard', e);
    }
  }, [specText]);

  return (
    <>
      <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-3.5">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
          Данные проекта
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider font-medium text-neutral-400 mb-1">
            Название события
          </label>
          <input
            className="w-full bg-[#181a24] border border-white/[0.08] rounded-lg p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Концерт / Шоу"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider font-medium text-neutral-400 mb-1">
            Дата события
          </label>
          <input
            type="date"
            className="w-full bg-[#181a24] border border-white/[0.08] rounded-lg p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>
        <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 block">
              Медиасерверы
            </label>
            {onOpenServerPresetsModal && (
              <button
                type="button"
                onClick={onOpenServerPresetsModal}
                className="p-1 rounded-lg hover:bg-white/[0.08] text-neutral-400 hover:text-emerald-400 transition"
                title="Управление моделями медиасерверов"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            )}
          </div>

          {servers && servers.length > 0 ? (
            <div className="space-y-2">
              {servers.map((srv, idx) => (
                <div key={srv.id} className="flex items-center gap-2">
                  <span className="text-[11px] text-neutral-500 w-3.5 text-right font-mono">
                    {idx + 1}.
                  </span>
                  <select
                    className="flex-1 bg-[#181a24] border border-white/[0.08] rounded-lg p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    value={srv.modelId}
                    onChange={(e) => onServerChange?.(srv.id, e.target.value)}
                  >
                    {serverPresetsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {servers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onServerRemove?.(srv.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition"
                      title="Удалить сервер"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <select
              className="w-full bg-[#181a24] border border-white/[0.08] rounded-lg p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              value={serverValue}
              onChange={(e) => setServerId?.(e.target.value)}
            >
              {serverPresetsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2 pt-1">
            <select
              className="flex-1 bg-[#181a24] border border-white/[0.08] rounded-lg p-2 text-xs text-neutral-300 focus:border-cyan-500 focus:outline-none"
              value={newServerModelId}
              onChange={(e) => setNewServerModelId(e.target.value)}
            >
              {serverPresetsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onServerAdd?.(newServerModelId)}
              className="px-3 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-medium transition whitespace-nowrap"
            >
              + Добавить
            </button>
          </div>
        </div>
      </div>
      <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
            Спецификация
          </div>
          <button
            type="button"
            onClick={handleCopySpec}
            className={[
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition',
              copiedSpec
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200',
            ].join(' ')}
            title="Скопировать спецификацию в буфер обмена"
          >
            {copiedSpec ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="font-semibold text-emerald-300">Скопировано!</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Скопировать</span>
              </>
            )}
          </button>
        </div>

        <textarea
          readOnly
          value={specText}
          rows={9}
          className="w-full bg-[#181a24] border border-white/[0.08] rounded-lg p-2.5 text-[11px] leading-relaxed text-neutral-300 font-mono resize-none focus:outline-none focus:border-cyan-500/50 select-all"
          title="Текст спецификации (можно выделить или нажать Скопировать)"
        />
      </div>

      <div className="space-y-2 pt-2 border-t border-white/[0.06]">
        {newProject && (
          <button
            className="w-full py-2.5 px-3 rounded-xl bg-[#141620] hover:bg-[#1a1d28] hover:border-emerald-500/30 text-neutral-200 hover:text-white border border-white/[0.08] text-xs font-medium transition active:scale-[0.99] flex items-center justify-center gap-1.5"
            onClick={newProject}
            title="Начать новый проект (Ctrl+N)"
          >
            <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Новый проект</span>
            <span className="text-[10px] text-neutral-400 font-mono">Ctrl+N</span>
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-blue-500/20 transition active:scale-[0.99] flex items-center justify-center gap-1.5"
            onClick={saveJSON}
            title="Сохранить проект в .ss (Ctrl+S)"
          >
            <span>Сохранить проект</span>
            <span className="text-[10px] text-white/70 font-mono">Ctrl+S</span>
          </button>
          <button
            className="py-2.5 px-3 rounded-xl bg-[#141620] hover:bg-[#1a1d28] text-neutral-200 border border-white/[0.08] text-xs font-medium transition flex items-center justify-center gap-1.5"
            onClick={openLoadJSONDialog}
          >
            Загрузить проект
          </button>
        </div>
      </div>
    </>
  );
}
