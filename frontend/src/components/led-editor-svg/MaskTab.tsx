'use client';
import React, { useMemo } from 'react';
import { Panel, ScreenGroup, MaskPage, WiringPage, MaskLogoConfig, DEFAULT_MASK_LOGO_URL } from '@/lib/led-editor-svg/types';
import { type PanelPreset } from '@/lib/led-editor-svg/presets';
import { prepareScreensData } from '@/lib/led-editor-svg/mask-export';
import ScreenCard from './ScreenCard';

interface MaskTabProps {
  panels: Panel[];
  screenGroups: ScreenGroup[];
  presets?: PanelPreset[];
  selectedGroupId: string | null;
  selectedGroupIds?: Set<string>;
  hasPanelSelection: boolean;
  onSelectGroup?: (groupId: string | null, multi?: boolean) => void;
  onAddGroup?: () => void;
  onAutoGroup?: () => void;
  onUpdateGroup?: (updated: ScreenGroup) => void;
  onUpdateGroups?: (updated: ScreenGroup[]) => void;
  onRemoveGroup?: (groupId: string) => void;
  onRemoveGroups?: (groupIds: string[]) => void;
  onSelectGroupPanels?: (groupId: string) => void;
  onExportMaskPNG?: () => void;
  onExportMaskZIP?: () => void;
  onPreviewMask?: () => void;
  pushHistory?: () => void;
  showGuides?: boolean;
  setShowGuides?: (v: boolean | ((prev: boolean) => boolean)) => void;
  showBadges?: boolean;
  setShowBadges?: (v: boolean | ((prev: boolean) => boolean)) => void;
  // Постраничность масок
  maskPages?: MaskPage[];
  activeMaskPageId?: string;
  onSelectMaskPage?: (id: string) => void;
  onAddMaskPage?: () => void;
  onRemoveMaskPage?: (id: string) => void;
  onRenameMaskPage?: (id: string, name: string) => void;
  onDuplicateMaskPage?: (id: string) => void;
  wiringPages?: WiringPage[];
  onAddScreensFromWiringPage?: (pageId: string) => void;
  // Кастомный логотип бейджей масок
  maskLogoConfig?: MaskLogoConfig;
  onOpenMaskLogoModal?: () => void;
}

export default function MaskTab({
  panels,
  screenGroups,
  presets,
  selectedGroupId,
  selectedGroupIds,
  hasPanelSelection,
  onSelectGroup,
  onAddGroup,
  onAutoGroup,
  onUpdateGroup,
  onUpdateGroups,
  onRemoveGroup,
  onRemoveGroups,
  onSelectGroupPanels,
  onExportMaskPNG,
  onExportMaskZIP,
  onPreviewMask,
  pushHistory,
  maskPages = [],
  activeMaskPageId,
  onSelectMaskPage,
  onAddMaskPage,
  onRemoveMaskPage,
  onDuplicateMaskPage,
  wiringPages = [],
  onAddScreensFromWiringPage,
  maskLogoConfig,
  onOpenMaskLogoModal,
}: MaskTabProps) {
  const panelsById = new Map(panels.map(p => [p.id, p]));
  const currentMaskPage = maskPages.find(p => p.id === activeMaskPageId);

  const { screens: screenDatas, totalW, totalH } = useMemo(() => {
    return prepareScreensData(panels, screenGroups);
  }, [panels, screenGroups]);

  const arrangeInRow = () => {
    let curX = 0;
    const list: ScreenGroup[] = [];
    for (const g of screenGroups) {
      const sd = screenDatas.find(s => s.group.id === g.id);
      const w = sd?.wPx ?? 0;
      list.push({ ...g, posX: curX, posY: 0 });
      curX += w;
    }
    if (onUpdateGroups) {
      onUpdateGroups(list);
    } else {
      list.forEach(g => onUpdateGroup?.(g));
    }
  };

  const arrangeInCol = () => {
    let curY = 0;
    const list: ScreenGroup[] = [];
    for (const g of screenGroups) {
      const sd = screenDatas.find(s => s.group.id === g.id);
      const h = sd?.hPx ?? 0;
      list.push({ ...g, posX: 0, posY: curY });
      curY += h;
    }
    if (onUpdateGroups) {
      onUpdateGroups(list);
    } else {
      list.forEach(g => onUpdateGroup?.(g));
    }
  };

  const resetPositions = () => {
    const list: ScreenGroup[] = [];
    for (const g of screenGroups) {
      const next = { ...g };
      delete next.posX;
      delete next.posY;
      list.push(next);
    }
    if (onUpdateGroups) {
      onUpdateGroups(list);
    } else {
      list.forEach(g => onUpdateGroup?.(g));
    }
  };

  return (
    <div className="space-y-3.5">
      {/* СТРАНИЦЫ МАСКИ (PAGES) */}
      {maskPages.length > 0 && (
        <div className="p-3 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
              Страницы
            </span>
            {onAddMaskPage && (
              <button
                type="button"
                onClick={onAddMaskPage}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition"
              >
                + Page
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {maskPages.map(mp => {
              const isCur = mp.id === activeMaskPageId;
              return (
                <div
                  key={mp.id}
                  onClick={() => onSelectMaskPage?.(mp.id)}
                  className={[
                    'group px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer border flex items-center gap-1.5 transition',
                    isCur
                      ? 'bg-blue-600/30 border-blue-500/50 text-white shadow-sm'
                      : 'bg-[#181a24] border-white/[0.06] text-neutral-400 hover:text-white hover:border-white/[0.12]',
                  ].join(' ')}
                >
                  <span className="truncate max-w-[100px]">{mp.name}</span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {mp.screenGroups.length}
                  </span>
                  {onDuplicateMaskPage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateMaskPage(mp.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-white text-neutral-400 text-[11px]"
                      title="Дублировать страницу (copy)"
                    >
                      ⧉
                    </button>
                  )}
                  {maskPages.length > 1 && onRemoveMaskPage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveMaskPage(mp.id);
                      }}
                      className="opacity-40 group-hover:opacity-100 hover:text-red-400 text-neutral-400 ml-0.5"
                      title="Удалить страницу"
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

      {/* ЛОГОТИП НА МАСКАХ (ЕДИНЫЙ ДЛЯ ВСЕХ БЕЙДЖИКОВ) */}
      <div className="p-3 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
            Логотип в бейдже
          </span>
          <span className="text-[10px] text-neutral-400 font-mono">
            {Math.round((maskLogoConfig?.scale ?? 1) * 100)}%
          </span>
        </div>

        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-12 h-9 rounded-lg bg-[#090a0f] border border-white/[0.08] flex items-center justify-center p-1 shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  maskLogoConfig?.customLogoDataUrl && maskLogoConfig.customLogoDataUrl.trim()
                    ? maskLogoConfig.customLogoDataUrl
                    : DEFAULT_MASK_LOGO_URL
                }
                alt="Mask Badge Logo"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-neutral-200 truncate">
                {maskLogoConfig?.customLogoDataUrl && maskLogoConfig.customLogoDataUrl.trim()
                  ? (maskLogoConfig.customLogoFileName || 'Свой логотип')
                  : 'Логотип приложения'}
              </div>
              <div className="text-[10px] text-neutral-400 truncate">
                Стандарт под все бейджики
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenMaskLogoModal}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#181a24] hover:bg-[#222534] text-cyan-300 border border-cyan-500/30 transition shrink-0"
          >
            Настроить
          </button>
        </div>
      </div>

      {/* Шапка вкладки */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
          Экраны {currentMaskPage ? `(${currentMaskPage.name})` : ''}
        </span>
        <button
          onClick={onAutoGroup}
          className="text-xs text-cyan-400 hover:text-cyan-300 transition hover:underline"
          title="Автоматически определить экраны по физическому касанию панелей"
        >
          Авто-группировка
        </button>
      </div>

      <button
        onClick={onAddGroup}
        disabled={!hasPanelSelection}
        className="w-full py-2 px-3 text-xs font-medium rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
      >
        <span>+</span> Объединить выделенные панели в экран
      </button>

      {/* Быстрое добавление экранов из схем расключения */}
      {wiringPages.length > 0 && onAddScreensFromWiringPage && (
        <div className="p-2.5 rounded-xl bg-[#10121a]/60 border border-white/[0.04] space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
            Импорт экранов из схемы:
          </div>
          <div className="flex flex-wrap gap-1">
            {wiringPages.map(wp => (
              <button
                key={wp.id}
                type="button"
                disabled={wp.panels.length === 0}
                onClick={() => onAddScreensFromWiringPage(wp.id)}
                className="px-2 py-1 rounded bg-[#181a24] hover:bg-[#222533] disabled:opacity-30 disabled:pointer-events-none text-neutral-300 hover:text-white text-xs border border-white/[0.06] transition flex items-center gap-1"
                title={`Создать экраны из панелей схемы "${wp.name}" (${wp.panels.length} шт.)`}
              >
                <span>+</span>
                <span>{wp.name}</span>
                <span className="text-[10px] text-cyan-400 font-mono">({wp.panels.length})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Панель холста маски и выравнивания */}
      {screenGroups.length > 0 && (
        <div className="p-3 rounded-xl border border-white/[0.06] bg-[#10121a] flex items-center justify-between gap-2">
          <div className="text-xs text-neutral-300">
            Холст: <span className="font-mono text-cyan-400 font-bold">{totalW}×{totalH} px</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={arrangeInRow}
              className="px-2 py-1 rounded-lg bg-[#181a24] hover:bg-[#202330] text-neutral-300 border border-white/[0.08] transition text-[11px]"
              title="Расположить экраны в ряд горизонтально"
            >
              В ряд
            </button>
            <button
              type="button"
              onClick={arrangeInCol}
              className="px-2 py-1 rounded-lg bg-[#181a24] hover:bg-[#202330] text-neutral-300 border border-white/[0.08] transition text-[11px]"
              title="Расположить экраны столбцом вертикально"
            >
              Столбцом
            </button>
            <button
              type="button"
              onClick={resetPositions}
              className="px-2 py-1 rounded-lg bg-[#181a24] hover:bg-[#202330] text-neutral-400 hover:text-neutral-200 border border-white/[0.08] transition text-[11px]"
              title="Сбросить к авто-позиционированию"
            >
              Авто
            </button>
          </div>
        </div>
      )}

      {selectedGroupIds && selectedGroupIds.size > 1 && (
        <div className="p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-950/30 flex items-center justify-between text-xs">
          <span className="text-cyan-300 font-medium">
            Выделено экранов: <strong className="text-white font-mono">{selectedGroupIds.size}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              if (onRemoveGroups) {
                onRemoveGroups(Array.from(selectedGroupIds));
              } else {
                Array.from(selectedGroupIds).forEach(id => onRemoveGroup?.(id));
              }
            }}
            className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition text-[11px] font-medium"
            title="Удалить выбранные экраны (Delete)"
          >
            Удалить ({selectedGroupIds.size})
          </button>
        </div>
      )}

      <div className="space-y-3">
        {screenGroups.map((g) => {
          const gPanels = g.panelIds
            .map(id => panelsById.get(id))
            .filter((p): p is Panel => Boolean(p));

          const sd = screenDatas.find(s => s.group.id === g.id);

          return (
            <ScreenCard
              key={g.id}
              group={g}
              panels={gPanels}
              presets={presets}
              defaultPosX={sd?.offsetX ?? 0}
              defaultPosY={sd?.offsetY ?? 0}
              isSelected={selectedGroupIds ? selectedGroupIds.has(g.id) : selectedGroupId === g.id}
              canRemove={screenGroups.length > 0}
              pushHistory={pushHistory}
              onSelect={(e) => {
                const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
                onSelectGroup?.(g.id, isMulti);
              }}
              onUpdate={(updated) => onUpdateGroup?.(updated)}
              onRemove={() => onRemoveGroup?.(g.id)}
              onSelectPanels={() => onSelectGroupPanels?.(g.id)}
            />
          );
        })}
      </div>

      <div className="space-y-2 pt-2 border-t border-white/[0.06]">
        <button
          onClick={onExportMaskPNG}
          className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          Скачать PNG {currentMaskPage ? `(${currentMaskPage.name})` : 'маски'}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onExportMaskZIP}
            className="py-2 px-3 rounded-xl text-xs font-medium bg-[#141620] hover:bg-[#1a1d2b] text-neutral-200 border border-white/[0.08] transition flex items-center justify-center gap-1.5"
          >
            Скачать ZIP
          </button>
          <button
            onClick={onPreviewMask}
            className="py-2 px-3 rounded-xl text-xs font-medium bg-[#141620] hover:bg-[#1a1d2b] text-neutral-200 border border-white/[0.08] transition flex items-center justify-center gap-1.5"
          >
            Предпросмотр
          </button>
        </div>
      </div>
    </div>
  );
}

