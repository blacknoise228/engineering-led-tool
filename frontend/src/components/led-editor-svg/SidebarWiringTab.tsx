'use client';
import React from 'react';
import {
  PRESETS,
  LINK_COLORS_16,
  REFRESH_RATE_PRESETS,
  DEFAULT_REFRESH_RATE,
  getPortMaxPixels,
  type PanelPreset,
  type CardPreset,
} from '@/lib/led-editor-svg/presets';
import type { Tool, WiringPage } from '@/lib/led-editor-svg/types';
import SnakeIcon from './icons/SnakeIcon';
import type { SidebarCardInstance } from './SidebarCardsTab';

export type PortStats = {
  ok: boolean;
  pixels: number;
  widthPx: number;
  heightPx: number;
  limit: number;
  hz: number;
  panelCount: number;
};

interface SidebarWiringTabProps {
  wiringPages: WiringPage[];
  activeWiringPageId?: string;
  onSelectWiringPage?: (id: string) => void;
  onAddWiringPage?: () => void;
  onRemoveWiringPage?: (id: string) => void;
  onDuplicateWiringPage?: (id: string) => void;
  presetId: string;
  setPresetId: (id: string) => void;
  presets?: PanelPreset[];
  onOpenPresetsModal?: () => void;
  setRows: (n: number) => void;
  setCols: (n: number) => void;
  createMatrix: () => void;
  clearAll: () => void;
  duplicateSelectedPanels: () => void;
  copySelectedPanels?: () => void;
  cutSelectedPanels?: () => void;
  pastePanels?: () => void;
  canPaste: boolean;
  clipboardCount: number;
  hasPanelSelection: boolean;
  setSelectedPanels: (value: React.SetStateAction<Set<string>>) => void;
  cards: SidebarCardInstance[];
  cardPresetsList: CardPreset[];
  selectedCardId: string | null;
  onCardSelect?: (cardId: string) => void;
  selectedCard: SidebarCardInstance | null;
  selectedCardModel: CardPreset | null;
  tool: Tool;
  setTool: (t: Tool) => void;
  activeLink: number;
  setActiveLink: (i: number) => void;
  refreshRate?: number;
  onRefreshRateChange?: (hz: number) => void;
  getPortStats?: (link: number) => PortStats;
  autoSnakeH_TL: () => void;
  autoSnakeH_TR: () => void;
  autoSnakeH_BL: () => void;
  autoSnakeH_BR: () => void;
  autoSnakeV_TL: () => void;
  autoSnakeV_TR: () => void;
  autoSnakeV_BL: () => void;
  autoSnakeV_BR: () => void;
  clearSelectedWiring: () => void;
  exportPNG: () => void;
  textOutline: (stroke?: string) => React.CSSProperties;
}

export default function SidebarWiringTab(props: SidebarWiringTabProps) {
  const {
    wiringPages,
    activeWiringPageId,
    onSelectWiringPage,
    onAddWiringPage,
    onRemoveWiringPage,
    onDuplicateWiringPage,
    presetId,
    setPresetId,
    presets,
    onOpenPresetsModal,
    setRows,
    setCols,
    createMatrix,
    clearAll,
    duplicateSelectedPanels,
    copySelectedPanels,
    cutSelectedPanels,
    pastePanels,
    canPaste,
    clipboardCount,
    hasPanelSelection,
    setSelectedPanels,
    cards,
    cardPresetsList,
    selectedCardId,
    onCardSelect,
    selectedCard,
    selectedCardModel,
    tool,
    setTool,
    activeLink,
    setActiveLink,
    refreshRate,
    onRefreshRateChange,
    getPortStats,
    autoSnakeH_TL,
    autoSnakeH_TR,
    autoSnakeH_BL,
    autoSnakeH_BR,
    autoSnakeV_TL,
    autoSnakeV_TR,
    autoSnakeV_BL,
    autoSnakeV_BR,
    clearSelectedWiring,
    exportPNG,
    textOutline,
  } = props;

  const currentWiringPage = wiringPages.find((p) => p.id === activeWiringPageId);
  const currentHz = refreshRate ?? currentWiringPage?.refreshRate ?? DEFAULT_REFRESH_RATE;
  const currentLimit = getPortMaxPixels(currentHz);

  const portsCount = selectedCardModel?.outputPorts ?? 0;
  const portButtons = Array.from({ length: portsCount }, (_, i) => i);
  const portColor = (i: number) =>
    selectedCard?.portColors?.[i] ?? LINK_COLORS_16[i % LINK_COLORS_16.length];
  const activeStats = getPortStats ? getPortStats(activeLink) : null;

  return (
    <>
      {wiringPages.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
              Схемы
            </div>
            {onAddWiringPage && (
              <button
                type="button"
                onClick={onAddWiringPage}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition"
              >
                + Schema
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {wiringPages.map((wp) => {
              const isCur = wp.id === activeWiringPageId;
              return (
                <div
                  key={wp.id}
                  onClick={() => onSelectWiringPage?.(wp.id)}
                  className={[
                    'group px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer border flex items-center gap-1.5 transition',
                    isCur
                      ? 'bg-blue-600/30 border-blue-500/50 text-white shadow-sm'
                      : 'bg-[#181a24] border-white/[0.06] text-neutral-400 hover:text-white hover:border-white/[0.12]',
                  ].join(' ')}
                >
                  <span className="truncate max-w-[100px]">{wp.name}</span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {wp.panels.length}
                  </span>
                  {onDuplicateWiringPage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateWiringPage(wp.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-white text-neutral-400 text-[11px]"
                      title="Дублировать схему (copy)"
                    >
                      ⧉
                    </button>
                  )}
                  {wiringPages.length > 1 && onRemoveWiringPage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveWiringPage(wp.id);
                      }}
                      className="opacity-40 group-hover:opacity-100 hover:text-red-400 text-neutral-400 ml-0.5"
                      title="Удалить схему"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
            Модель LED кабинета
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            className="flex-1 bg-[#181a24] border border-white/[0.08] rounded-lg p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
          >
            {(presets ?? PRESETS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {onOpenPresetsModal && (
            <button
              type="button"
              onClick={onOpenPresetsModal}
              className="p-2 rounded-lg bg-[#181a24] hover:bg-[#202330] border border-white/[0.08] hover:border-cyan-500/50 text-neutral-400 hover:text-cyan-400 transition shrink-0"
              title="Открыть окно управления панелями"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2" onClick={() => setSelectedPanels(new Set())}>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 block mb-1">
              Колонки (Cols)
            </label>
            <input
              type="number"
              min={1}
              className="w-full bg-[#181a24] border border-white/[0.08] rounded-lg p-1.5 text-xs text-center font-mono text-white focus:border-cyan-500 focus:outline-none"
              onChange={(e) => setCols(Math.max(1, parseInt(e.target.value || '1', 10)))}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 block mb-1">
              Строки (Rows)
            </label>
            <input
              type="number"
              min={1}
              className="w-full bg-[#181a24] border border-white/[0.08] rounded-lg p-1.5 text-xs text-center font-mono text-white focus:border-cyan-500 focus:outline-none"
              onChange={(e) => setRows(Math.max(1, parseInt(e.target.value || '1', 10)))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            className="py-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-sm transition active:scale-[0.99]"
            onClick={createMatrix}
          >
            + Создать сетку
          </button>
          <button
            className="py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition"
            onClick={clearAll}
          >
            Очистить всё
          </button>
        </div>
        <button
          className="w-full py-1.5 px-3 rounded-lg border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
          onClick={duplicateSelectedPanels}
          disabled={!hasPanelSelection}
          title="Дублировать выбранные панели (Ctrl+D)"
        >
          <span>Дублировать выделение</span>
          <span className="text-[10px] text-neutral-400 font-mono">Ctrl+D</span>
        </button>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            className="py-1.5 px-2 rounded-lg border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition flex flex-col items-center justify-center gap-0.5"
            onClick={copySelectedPanels}
            disabled={!hasPanelSelection}
            title="Копировать выбранные панели (Ctrl+C)"
          >
            <span>Копировать</span>
            <span className="text-[9px] text-neutral-500 font-mono">Ctrl+C</span>
          </button>
          <button
            type="button"
            className="py-1.5 px-2 rounded-lg border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition flex flex-col items-center justify-center gap-0.5"
            onClick={cutSelectedPanels}
            disabled={!hasPanelSelection}
            title="Вырезать выбранные панели (Ctrl+X)"
          >
            <span>Вырезать</span>
            <span className="text-[9px] text-neutral-500 font-mono">Ctrl+X</span>
          </button>
          <button
            type="button"
            className="py-1.5 px-2 rounded-lg border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition flex flex-col items-center justify-center gap-0.5"
            onClick={pastePanels}
            disabled={!canPaste}
            title="Вставить панели в активную схему (Ctrl+V)"
          >
            <span>Вставить {clipboardCount > 0 ? `(${clipboardCount})` : ''}</span>
            <span className="text-[9px] text-neutral-500 font-mono">Ctrl+V</span>
          </button>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-2.5">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
          Sending Card
        </div>
        {cards.length === 0 ? (
          <div className="text-xs text-neutral-400">
            Нет добавленных карт. Перейдите на вкладку «Карты», добавьте карту и
            вернитесь сюда.
          </div>
        ) : (
          <div className="space-y-1.5">
            {cards.map((c) => {
              const model = cardPresetsList.find((m) => m.id === c.modelId);
              const isActive = c.id === selectedCardId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onCardSelect?.(c.id)}
                  className={[
                    'w-full flex items-center gap-2.5 rounded-lg border p-2 text-left transition',
                    isActive
                      ? 'border-cyan-500/60 bg-[#141828] shadow-[0_0_12px_rgba(56,189,248,0.1)]'
                      : 'border-white/[0.06] bg-[#141622] hover:border-white/[0.12]',
                  ].join(' ')}
                  title={`S${c.order} — ${model?.name ?? c.modelId}`}
                >
                  <div
                    className="relative flex-shrink-0 w-8 h-8 rounded-md border border-white/[0.1]"
                    style={{ backgroundColor: c.color }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="font-mono text-[14px] font-bold leading-none select-none"
                        style={{ color: '#fff', ...textOutline('#000') }}
                      >
                        {c.order}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">
                      S{c.order} — {model?.name ?? c.modelId}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {model?.outputPorts ?? c.portColors.length} портов
                    </div>
                  </div>

                  <div className="flex gap-0.5 flex-wrap max-w-[60px]">
                    {(model?.outputPorts
                      ? Array.from({ length: model.outputPorts })
                      : c.portColors
                    ).map((_, i) => (
                      <div
                        key={i}
                        className="w-2.5 h-2.5 rounded-[2px]"
                        style={{
                          backgroundColor:
                            c.portColors[i] ??
                            LINK_COLORS_16[i % LINK_COLORS_16.length],
                        }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#08090e] border border-white/[0.06]">
        <button
          className={[
            'py-1.5 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5',
            tool === 'select'
              ? 'bg-[#1c1f2b] text-white shadow-sm border border-white/[0.08]'
              : 'text-neutral-400 hover:text-neutral-200',
          ].join(' ')}
          onClick={() => setTool('select')}
        >
          <span>Выделение</span>
        </button>
        <button
          className={[
            'py-1.5 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed',
            tool === 'cable'
              ? 'bg-[#1c1f2b] text-white shadow-sm border border-white/[0.08]'
              : 'text-neutral-400 hover:text-neutral-200',
          ].join(' ')}
          onClick={() => setTool('cable')}
          title={selectedCard ? `Карта: S${selectedCard.order}` : 'Выберите карту выше'}
          disabled={!selectedCard}
        >
          <span>Ручное расключение</span>
        </button>
      </div>

      {/* === ЧАСТОТА ОБНОВЛЕНИЯ (ГЕРЦОВКА) === */}
      <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
            Частота обновления
          </div>
          <span className="font-mono text-cyan-400 text-xs font-semibold">
            {currentHz} Hz
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="grid grid-cols-6 gap-1 flex-1">
            {REFRESH_RATE_PRESETS.map((p) => {
              const isCur = currentHz === p.hz;
              return (
                <button
                  key={p.hz}
                  type="button"
                  onClick={() => onRefreshRateChange?.(p.hz)}
                  className={[
                    'py-1.5 rounded-lg text-xs font-semibold font-mono transition text-center border',
                    isCur
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400/40 shadow-sm shadow-blue-500/20'
                      : 'bg-[#181a24] text-neutral-400 hover:text-white border-white/[0.06] hover:border-white/[0.12]',
                  ].join(' ')}
                  title={`${p.label} (макс. ${p.maxPixels.toLocaleString('ru-RU')} px)`}
                >
                  {p.hz}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1 bg-[#181a24] border border-white/[0.08] rounded-lg px-2 py-1 shrink-0" title="Пользовательская частота (Hz)">
            <input
              type="number"
              min={1}
              max={480}
              value={currentHz}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0) {
                  onRefreshRateChange?.(val);
                }
              }}
              className="w-8 bg-transparent text-xs text-right font-mono text-white focus:outline-none"
            />
            <span className="text-[10px] text-neutral-400 font-mono">Hz</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] bg-[#141622] px-2.5 py-1.5 rounded-lg border border-white/[0.04]">
          <span className="text-neutral-400">Лимит расключаемой области:</span>
          <span className="font-mono text-cyan-400 font-semibold">
            {currentLimit.toLocaleString('ru-RU')} px
          </span>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-2">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
          <span>Порты вывода</span>
          {selectedCard && selectedCardModel && (
            <span className="font-mono text-cyan-400 font-medium">
              S{selectedCard.order} • {portsCount}p
            </span>
          )}
        </div>

        {!selectedCard || !selectedCardModel ? (
          <div className="text-xs text-neutral-400 py-1">
            Выберите карту выше для расключения портов.
          </div>
        ) : (
          <>
            <div
              className="grid gap-1.5 pt-1"
              style={{
                gridTemplateColumns: `repeat(${Math.min(8, Math.max(1, portsCount))}, minmax(0, 1fr))`,
              }}
            >
              {portButtons.map((i) => {
                const isActive = i === activeLink;
                const color = portColor(i);
                const stats = getPortStats ? getPortStats(i) : null;
                const isOver = stats ? stats.panelCount > 0 && stats.pixels > stats.limit : false;
                const hasPanels = Boolean(stats && stats.panelCount > 0);

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveLink(i)}
                    className={[
                      'h-9 rounded-lg flex items-center justify-center transition relative',
                      'border border-white/[0.1] shadow-sm',
                      isOver ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-[#10121a]' : '',
                      isActive
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#10121a] scale-105 z-10'
                        : 'opacity-85 hover:opacity-100 hover:scale-105',
                    ].filter(Boolean).join(' ')}
                    style={{ backgroundColor: color }}
                    title={`Порт P${i + 1}${stats && stats.panelCount > 0 ? ` (${stats.panelCount} пан., ${stats.pixels.toLocaleString('ru-RU')} / ${stats.limit.toLocaleString('ru-RU')} px)` : ''}`}
                  >
                    <span
                      className="font-mono text-[18px] font-bold leading-none select-none"
                      style={{ color: '#fff', ...textOutline('#000') }}
                    >
                      {i + 1}
                    </span>
                    {isOver && (
                      <span
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 border border-[#10121a] rounded-full text-[9px] font-extrabold text-white flex items-center justify-center leading-none shadow"
                        title="Превышен лимит области порта!"
                      >
                        !
                      </span>
                    )}
                    {!isOver && hasPanels && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-white/80 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {activeStats && (
              <div
                className={[
                  'mt-2.5 p-3 rounded-xl border text-xs space-y-2 transition',
                  activeStats.panelCount > 0 && activeStats.pixels > activeStats.limit
                    ? 'bg-red-500/10 border-red-500/30 text-red-200'
                    : 'bg-[#141622] border-white/[0.06] text-neutral-300',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: portColor(activeLink) }}
                    />
                    <span className="font-semibold text-white">
                      Порт P{activeLink + 1}
                    </span>
                    <span className="text-neutral-400 font-mono text-[11px]">
                      ({activeStats.panelCount} {activeStats.panelCount === 1 ? 'панель' : activeStats.panelCount < 5 ? 'панели' : 'панелей'})
                    </span>
                  </div>
                  {activeStats.panelCount > 0 && (
                    <div className="font-mono text-[11px]">
                      <span
                        className={
                          activeStats.pixels > activeStats.limit
                            ? 'text-red-400 font-bold'
                            : 'text-cyan-400 font-semibold'
                        }
                      >
                        {Math.round((activeStats.pixels / activeStats.limit) * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {activeStats.panelCount > 0 ? (
                  <>
                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <span>Область (W×H):</span>
                      <span className="font-mono text-neutral-200 font-medium">
                        {activeStats.widthPx} × {activeStats.heightPx} px
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <span>Загрузка пикселей:</span>
                      <span className="font-mono text-neutral-200">
                        <strong
                          className={
                            activeStats.pixels > activeStats.limit
                              ? 'text-red-400 font-bold'
                              : 'text-white font-semibold'
                          }
                        >
                          {activeStats.pixels.toLocaleString('ru-RU')}
                        </strong>{' '}
                        / {activeStats.limit.toLocaleString('ru-RU')} px
                      </span>
                    </div>

                    <div className="w-full bg-[#0d0e14] h-2 rounded-full overflow-hidden border border-white/[0.06]">
                      <div
                        className={[
                          'h-full transition-all duration-300 rounded-full',
                          activeStats.pixels > activeStats.limit
                            ? 'bg-red-500'
                            : (activeStats.pixels / activeStats.limit) > 0.85
                            ? 'bg-amber-400'
                            : 'bg-gradient-to-r from-cyan-500 to-blue-500',
                        ].join(' ')}
                        style={{
                          width: `${Math.min(100, Math.round((activeStats.pixels / activeStats.limit) * 100))}%`,
                        }}
                      />
                    </div>

                    {activeStats.pixels > activeStats.limit ? (
                      <div className="text-[11px] text-red-300 font-medium bg-red-500/15 p-2 rounded-lg border border-red-500/30 flex items-start gap-1.5">
                        <span>⚠️</span>
                        <span>
                          Превышен лимит области порта на{' '}
                          <strong>{(activeStats.pixels - activeStats.limit).toLocaleString('ru-RU')} px</strong> (@{activeStats.hz}Hz)!
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-neutral-400 flex items-center justify-between">
                        <span>Свободно:</span>
                        <span className="font-mono text-emerald-400">
                          {(activeStats.limit - activeStats.pixels).toLocaleString('ru-RU')} px
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[11px] text-neutral-400 py-0.5">
                    К порту P{activeLink + 1} пока не подключены кабинеты.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 mb-1.5">
            Горизонтальная змейка (H-snake)
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {([
              ['TL', autoSnakeH_TL],
              ['TR', autoSnakeH_TR],
              ['BL', autoSnakeH_BL],
              ['BR', autoSnakeH_BR],
            ] as const).map(([corner, fn]) => (
              <button
                key={corner}
                title={`H snake — ${corner}`}
                onClick={fn}
                className="aspect-square rounded-lg border border-white/[0.08] bg-[#141622] hover:bg-cyan-500/10 hover:border-cyan-500/40 p-2 transition text-neutral-300 hover:text-white"
              >
                <SnakeIcon orient="H" corner={corner} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 mb-1.5">
            Вертикальная змейка (V-snake)
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {([
              ['TL', autoSnakeV_TL],
              ['TR', autoSnakeV_TR],
              ['BL', autoSnakeV_BL],
              ['BR', autoSnakeV_BR],
            ] as const).map(([corner, fn]) => (
              <button
                key={corner}
                title={`V snake — ${corner}`}
                onClick={fn}
                className="aspect-square rounded-lg border border-white/[0.08] bg-[#141622] hover:bg-cyan-500/10 hover:border-cyan-500/40 p-2 transition text-neutral-300 hover:text-white"
              >
                <SnakeIcon orient="V" corner={corner} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <button
          className="w-full py-2 px-3 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed transition"
          onClick={clearSelectedWiring}
          disabled={!hasPanelSelection}
          title="Удалить все кабели у выбранных панелей"
        >
          Очистить расключение выделенных
        </button>
      </div>

      <div className="pt-2 border-t border-white/[0.06]">
        <button
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition active:scale-[0.99] flex items-center justify-center gap-2"
          onClick={() => {
            setSelectedPanels(new Set());
            setTimeout(() => exportPNG(), 50);
          }}
          title="Экспорт расключения текущей схемы в PNG"
        >
          Скачать PNG {currentWiringPage ? `(${currentWiringPage.name})` : 'схемы'}
        </button>
      </div>
    </>
  );
}
