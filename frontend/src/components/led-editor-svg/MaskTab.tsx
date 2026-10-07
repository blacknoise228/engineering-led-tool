// src/components/led-editor-svg/MaskTab.tsx
'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { Panel, ScreenGroup, MaskPage, WiringPage } from '@/lib/led-editor-svg/types';
import { TEXTURES } from '@/lib/led-editor-svg/textures';
import { computePixelPanels, computeContour, formatMeters, computeBadgeSize, getBadgeBounds } from '@/lib/led-editor-svg/mask-contour';
import { prepareScreensData } from '@/lib/led-editor-svg/mask-export';

interface MaskTabProps {
  panels: Panel[];
  screenGroups: ScreenGroup[];
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
}

/** Поле ввода числа с кнопками вверх/вниз для пошагового изменения по 1 px */
function NumberStepInput({
  value,
  min,
  max,
  step = 1,
  prefix,
  suffix = 'px',
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  onChange: (val: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const clampVal = (v: number) => {
    let res = v;
    if (min !== undefined) res = Math.max(min, res);
    if (max !== undefined) res = Math.min(max, res);
    return res;
  };

  const applyChange = (valStr: string) => {
    setText(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed)) {
      onChange(clampVal(parsed));
    }
  };

  const handleBlur = () => {
    const parsed = parseInt(text, 10);
    const finalVal = clampVal(isNaN(parsed) ? (min !== undefined && min > 0 ? min : 0) : parsed);
    setText(String(finalVal));
    if (finalVal !== value) {
      onChange(finalVal);
    }
  };

  const stepBy = (delta: number) => {
    const current = isNaN(parseInt(text, 10)) ? value : parseInt(text, 10);
    const nextVal = clampVal(current + delta);
    setText(String(nextVal));
    onChange(nextVal);
  };

  const startHold = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    e.preventDefault();
    stepBy(delta);

    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        stepBy(delta);
      }, 60);
      const stop = () => {
        clearInterval(interval);
        window.removeEventListener('mouseup', stop);
      };
      window.addEventListener('mouseup', stop);
    }, 300);

    const stopInitial = () => {
      clearTimeout(timer);
      window.removeEventListener('mouseup', stopInitial);
    };
    window.addEventListener('mouseup', stopInitial);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      stepBy(e.shiftKey ? step * 10 : step);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      stepBy(e.shiftKey ? -step * 10 : -step);
    }
  };

  return (
    <div className="relative flex items-center bg-[#181a24] rounded-lg border border-white/[0.08] focus-within:border-cyan-400 overflow-hidden h-[30px] transition">
      {prefix && (
        <span className="pl-2.5 text-[11px] text-neutral-400 font-mono select-none pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => applyChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 bg-transparent text-white font-mono text-xs focus:outline-none min-w-0"
      />
      {suffix && (
        <span className="text-[10px] text-neutral-500 select-none pointer-events-none pr-1">
          {suffix}
        </span>
      )}
      <div className="flex flex-col border-l border-white/[0.08] h-full w-5 shrink-0 bg-[#141620]">
        <button
          type="button"
          onMouseDown={(e) => startHold(e, step)}
          className="flex-1 flex items-center justify-center text-[7px] text-neutral-400 hover:text-white hover:bg-white/[0.1] active:bg-cyan-500/30 transition cursor-pointer select-none leading-none"
          title={`+${step} px (или стрелка Вверх)`}
        >
          ▲
        </button>
        <button
          type="button"
          onMouseDown={(e) => startHold(e, -step)}
          className="flex-1 flex items-center justify-center text-[7px] text-neutral-400 hover:text-white hover:bg-white/[0.1] active:bg-cyan-500/30 border-t border-white/[0.06] transition cursor-pointer select-none leading-none"
          title={`-${step} px (или стрелка Вниз)`}
        >
          ▼
        </button>
      </div>
    </div>
  );
}

function ScreenCard(props: {
  group: ScreenGroup;
  panels: Panel[];
  defaultPosX: number;
  defaultPosY: number;
  isSelected: boolean;
  canRemove: boolean;
  pushHistory?: () => void;
  onSelect: (e: React.MouseEvent) => void;
  onUpdate: (g: ScreenGroup) => void;
  onRemove: () => void;
  onSelectPanels: () => void;
}) {
  const { group, panels, defaultPosX, defaultPosY, isSelected, canRemove, pushHistory, onSelect, onUpdate, onRemove, onSelectPanels } = props;

  let wPx = 0, hPx = 0, wM = 0, hM = 0;
  let screenCx = 0, screenCy = 0;
  let octSide = 100, maxScale = 2.0;
  let minX = 0, maxX = 0, minY = 0, maxY = 0;

  if (panels.length) {
    const pixelPanels = computePixelPanels(panels);
    wPx = Math.max(...pixelPanels.map(p => p.px + p.pw), 0);
    hPx = Math.max(...pixelPanels.map(p => p.py + p.ph), 0);

    const minStageX = Math.min(...panels.map(p => p.x));
    const maxStageX = Math.max(...panels.map(p => p.x + p.w));
    const minStageY = Math.min(...panels.map(p => p.y));
    const maxStageY = Math.max(...panels.map(p => p.y + p.h));
    const stageW = maxStageX - minStageX;
    const stageH = maxStageY - minStageY;

    wM = Math.round((stageW / 200) * 100) / 100;
    hM = Math.round((stageH / 200) * 100) / 100;

    const contour = computeContour(
      pixelPanels.map(p => ({ x: p.px, y: p.py, w: p.pw, h: p.ph }))
    );
    screenCx = contour.center.x || (wPx / 2);
    screenCy = contour.center.y || (hPx / 2);

    const bSize = computeBadgeSize(wPx, hPx, group.badgeScale ?? 1);
    octSide = bSize.octSide;
    maxScale = bSize.maxScale;

    const bBounds = getBadgeBounds(wPx, hPx, screenCx, screenCy, octSide);
    minX = bBounds.minX;
    maxX = bBounds.maxX;
    minY = bBounds.minY;
    maxY = bBounds.maxY;
  }

  return (
    <div
      onClick={onSelect}
      className={[
        'p-3.5 rounded-xl border transition cursor-pointer',
        isSelected
          ? 'border-cyan-500/60 bg-[#121624] shadow-[0_0_20px_rgba(56,189,248,0.12)]'
          : 'border-white/[0.06] bg-[#10121a] hover:border-white/[0.12] hover:bg-[#131520]',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <input
          type="text"
          value={group.name}
          onChange={(e) => onUpdate({ ...group, name: e.target.value })}
          className="bg-transparent font-medium text-sm text-white focus:outline-none focus:border-b border-cyan-400 w-full"
        />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelectPanels(); }}
            className="text-[11px] text-neutral-400 hover:text-white px-2 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition"
            title="Выделить панели этого экрана"
          >
            Выбрать
          </button>
          {canRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="text-xs text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded transition"
              title="Удалить экран"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-400 mb-2.5">
        <div>Разрешение: <span className="font-mono text-cyan-400 font-semibold">{wPx}×{hPx} px</span></div>
        <div className="font-mono text-[11px] text-neutral-400">{formatMeters(wM)}×{formatMeters(hM)} м • {panels.length} шт</div>
      </div>

      {/* Позиция экрана на маске в пикселях */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-2.5">
        <div>
          <label className="text-[10px] text-neutral-400 block mb-0.5 uppercase tracking-wider font-medium">Позиция X (px):</label>
          <NumberStepInput
            value={group.posX ?? defaultPosX}
            min={0}
            step={1}
            onChange={(val) => onUpdate({ ...group, posX: val })}
          />
        </div>
        <div>
          <label className="text-[10px] text-neutral-400 block mb-0.5 uppercase tracking-wider font-medium">Позиция Y (px):</label>
          <NumberStepInput
            value={group.posY ?? defaultPosY}
            min={0}
            step={1}
            onChange={(val) => onUpdate({ ...group, posY: val })}
          />
        </div>
      </div>

      {/* Настройки инфо-бейджа экрана */}
      <div className="p-2.5 rounded-lg bg-[#141724]/70 border border-white/[0.05] space-y-2 mb-2.5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
          <span>Бейдж (инфо-плашка)</span>
          {((group.badgeOffsetX !== undefined && group.badgeOffsetX !== 0) ||
            (group.badgeOffsetY !== undefined && group.badgeOffsetY !== 0) ||
            (group.badgeScale !== undefined && group.badgeScale !== 1)) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                pushHistory?.();
                const next = { ...group };
                delete next.badgeOffsetX;
                delete next.badgeOffsetY;
                delete next.badgeScale;
                onUpdate(next);
              }}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium transition cursor-pointer"
              title="Сбросить смещение и размер в центр по умолчанию"
            >
              Сброс
            </button>
          )}
        </div>

        {/* Смещение относительно центра */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
            <span>Смещение от центра (+ / −):</span>
            <span className="text-[9px] text-neutral-500 font-mono">
              X: [{minX}..{maxX}] Y: [{minY}..{maxY}]
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <NumberStepInput
                prefix="X"
                value={group.badgeOffsetX ?? 0}
                min={minX}
                max={maxX}
                step={1}
                onChange={(val) => onUpdate({ ...group, badgeOffsetX: val })}
              />
            </div>
            <div>
              <NumberStepInput
                prefix="Y"
                value={group.badgeOffsetY ?? 0}
                min={minY}
                max={maxY}
                step={1}
                onChange={(val) => onUpdate({ ...group, badgeOffsetY: val })}
              />
            </div>
          </div>
        </div>

        {/* Размер бейджа */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
            <span>Размер (макс. {Math.round(maxScale * 100)}%):</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (group.badgeScale !== undefined && group.badgeScale !== 1) {
                  pushHistory?.();
                  onUpdate({ ...group, badgeScale: 1 });
                }
              }}
              className="font-mono text-cyan-400 font-medium hover:underline cursor-pointer"
              title="Нажмите, чтобы сбросить на 100%"
            >
              {Math.round((group.badgeScale ?? 1) * 100)}%
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                pushHistory?.();
                const cur = group.badgeScale ?? 1;
                const next = Math.max(0.4, Math.round((cur - 0.1) * 10) / 10);
                onUpdate({ ...group, badgeScale: next });
              }}
              className="w-6 h-6 rounded bg-[#181a24] hover:bg-[#202332] text-neutral-300 border border-white/[0.08] text-xs flex items-center justify-center transition active:scale-95"
              title="Уменьшить на 10%"
            >
              −
            </button>
            <input
              type="range"
              min="0.4"
              max={maxScale}
              step="0.05"
              value={Math.min(maxScale, group.badgeScale ?? 1)}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                const next = isNaN(val) ? 1 : Math.round(val * 100) / 100;
                onUpdate({ ...group, badgeScale: Math.min(maxScale, next) });
              }}
              className="flex-1 accent-cyan-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              disabled={(group.badgeScale ?? 1) >= maxScale}
              onClick={(e) => {
                e.stopPropagation();
                pushHistory?.();
                const cur = group.badgeScale ?? 1;
                const next = Math.min(maxScale, Math.round((cur + 0.1) * 10) / 10);
                onUpdate({ ...group, badgeScale: next });
              }}
              className="w-6 h-6 rounded bg-[#181a24] hover:bg-[#202332] disabled:opacity-30 disabled:pointer-events-none text-neutral-300 border border-white/[0.08] text-xs flex items-center justify-center transition active:scale-95"
              title="Увеличить на 10%"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 mb-1.5">Текстура заливки:</div>
      <div className="grid grid-cols-6 gap-1.5 mb-1">
        {TEXTURES.map((tex) => (
          <button
            key={tex.id}
            type="button"
            onClick={(e) => { e.stopPropagation(); onUpdate({ ...group, textureId: tex.id }); }}
            className={[
              'w-full aspect-square rounded-md border border-white/[0.1] transition relative',
              group.textureId === tex.id ? 'ring-2 ring-white scale-105 z-10' : 'opacity-70 hover:opacity-100 hover:scale-105',
            ].join(' ')}
            style={{ backgroundColor: tex.color }}
            title={`${tex.name} (${tex.id})`}
          />
        ))}
      </div>
    </div>
  );
}

export default function MaskTab({
  panels,
  screenGroups,
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

