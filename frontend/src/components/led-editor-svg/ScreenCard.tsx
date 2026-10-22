'use client';
import React from 'react';
import { Panel, ScreenGroup } from '@/lib/led-editor-svg/types';
import { TEXTURES } from '@/lib/led-editor-svg/textures';
import {
  computePixelPanels,
  computeContour,
  formatMeters,
  computeBadgeSize,
  getBadgeBounds,
} from '@/lib/led-editor-svg/mask-contour';
import NumberStepInput from './NumberStepInput';

export interface ScreenCardProps {
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
}

export default function ScreenCard({
  group,
  panels,
  defaultPosX,
  defaultPosY,
  isSelected,
  canRemove,
  pushHistory,
  onSelect,
  onUpdate,
  onRemove,
  onSelectPanels,
}: ScreenCardProps) {
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
