// src/components/led-editor-svg/MaskLayer.tsx
'use client';
import React, { useMemo, useState, useRef } from 'react';
import { Panel, ScreenGroup } from '@/lib/led-editor-svg/types';
import { getTextureById } from '@/lib/led-editor-svg/textures';
import { computeContour, computePixelPanels, formatMeters, getMaskPanelResolution, computeBadgeSize, getBadgeBounds } from '@/lib/led-editor-svg/mask-contour';
import { computeAutoPositions } from '@/lib/led-editor-svg/mask-export';

interface MaskLayerProps {
  panels: Panel[];
  groups: ScreenGroup[];
  selectedGroupId?: string | null;
  selectedGroupIds?: Set<string>;
  onSelectGroup: (groupId: string, multi?: boolean) => void;
  onUpdateGroup?: (updated: ScreenGroup) => void;
  onUpdateGroups?: (updated: ScreenGroup[]) => void;
  pushHistory?: () => void;
  scale?: number;
  showGuides?: boolean;
  showBadges?: boolean;
}

const OCT_POINTS = [
  [0.30, 0], [0.70, 0], [1, 0.30], [1, 0.70],
  [0.70, 1], [0.30, 1], [0, 0.70], [0, 0.30],
];

export default function MaskLayer({
  panels,
  groups,
  selectedGroupId,
  selectedGroupIds,
  onSelectGroup,
  onUpdateGroup,
  onUpdateGroups,
  pushHistory,
  scale = 1,
  showGuides = true,
  showBadges = true,
}: MaskLayerProps) {
  const panelsById = useMemo(() => new Map(panels.map(p => [p.id, p])), [panels]);

  const activeSelectedIds = useMemo(() => {
    if (selectedGroupIds) return selectedGroupIds;
    return selectedGroupId ? new Set([selectedGroupId]) : new Set<string>();
  }, [selectedGroupIds, selectedGroupId]);

  // Локальное состояние драга экрана для плавных 60fps без задержек (поддержка группы экранов)
  const [dragState, setDragState] = useState<{
    deltaX: number;
    deltaY: number;
    groupIds: Set<string>;
  } | null>(null);

  // Локальное состояние драга бейджа (смещение или масштаб с Shift)
  const [badgeDragState, setBadgeDragState] = useState<{
    groupId: string;
    deltaX: number;
    deltaY: number;
    scale?: number;
  } | null>(null);

  const dragRef = useRef(dragState);
  dragRef.current = dragState;

  const rawScreenItems = useMemo(() => {
    return groups.map(g => {
      const gPanels = g.panelIds
        .map(id => panelsById.get(id))
        .filter((p): p is Panel => Boolean(p));

      if (!gPanels.length) return null;

      const stageMinX = Math.min(...gPanels.map(p => p.x));
      const stageMaxX = Math.max(...gPanels.map(p => p.x + p.w));
      const stageMinY = Math.min(...gPanels.map(p => p.y));
      const stageMaxY = Math.max(...gPanels.map(p => p.y + p.h));
      const stageW = stageMaxX - stageMinX;
      const stageH = stageMaxY - stageMinY;

      // Панели экрана в пикселях по сетке
      const pixelPanels = computePixelPanels(gPanels);
      const contour = computeContour(
        pixelPanels.map(p => ({ x: p.px, y: p.py, w: p.pw, h: p.ph }))
      );
      const texture = getTextureById(g.textureId);

      const wPx = Math.max(...pixelPanels.map(p => p.px + p.pw), 0);
      const hPx = Math.max(...pixelPanels.map(p => p.py + p.ph), 0);

      const wM = Math.round((stageW / 200) * 100) / 100;
      const hM = Math.round((stageH / 200) * 100) / 100;

      // Размер 1 квадратного метра в пикселях для текстуры экрана
      const firstP = gPanels[0];
      const pRes = getMaskPanelResolution(firstP);
      const pw = pRes.resW;
      const ph = pRes.resH;
      const mmW = firstP.w * 5;
      const mmH = firstP.h * 5;
      const meterPxW = Math.max(1, Math.round((500 / mmW) * pw));
      const meterPxH = Math.max(1, Math.round((500 / mmH) * ph));

      return {
        group: g,
        panels: gPanels,
        pixelPanels,
        contour,
        texture,
        wPx,
        hPx,
        wM,
        hM,
        meterPxW,
        meterPxH,
        stageMinX,
        stageMinY,
        stageW,
        stageH,
      };
    }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [groups, panelsById]);

  const autoPositions = useMemo(() => {
    return computeAutoPositions(rawScreenItems, panels);
  }, [rawScreenItems, panels]);

  const screenItems = useMemo(() => {
    return rawScreenItems.map((item, idx) => {
      const autoPos = autoPositions[idx] || { x: 0, y: 0 };
      const posPxX = typeof item.group.posX === 'number' ? item.group.posX : autoPos.x;
      const posPxY = typeof item.group.posY === 'number' ? item.group.posY : autoPos.y;
      return {
        ...item,
        posPxX,
        posPxY,
      };
    });
  }, [rawScreenItems, autoPositions]);

  const onScreenMouseDown = (
    e: React.MouseEvent,
    item: (typeof screenItems)[0]
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const isMultiKey = e.ctrlKey || e.metaKey || e.shiftKey;
    const isAlreadySelected = activeSelectedIds.has(item.group.id);

    let movingIds: string[];

    if (isMultiKey) {
      const next = new Set(activeSelectedIds);
      if (next.has(item.group.id)) {
        next.delete(item.group.id);
      } else {
        next.add(item.group.id);
      }
      movingIds = Array.from(next);
      onSelectGroup(item.group.id, true);
    } else if (!isAlreadySelected) {
      movingIds = [item.group.id];
      onSelectGroup(item.group.id, false);
    } else {
      movingIds = Array.from(activeSelectedIds);
    }

    const movingItems = screenItems.filter(it => movingIds.includes(it.group.id));
    if (!movingItems.length) return;

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startPosX = item.posPxX;
    const startPosY = item.posPxY;

    let hasMoved = false;

    // Границы выбранных экранов, чтобы не сдвинуть их левее/выше 0
    const minStartX = Math.min(...movingItems.map(it => it.posPxX));
    const minStartY = Math.min(...movingItems.map(it => it.posPxY));

    // Неподвижные экраны для прилипания
    const otherBoxes = screenItems
      .filter(it => !movingIds.includes(it.group.id))
      .map(it => ({
        x: it.posPxX,
        y: it.posPxY,
        w: it.wPx,
        h: it.hPx,
      }));

    let curDeltaX = 0;
    let curDeltaY = 0;

    const onMove = (moveEv: MouseEvent) => {
      const stageDx = (moveEv.clientX - startClientX) / (scale || 1);
      const stageDy = (moveEv.clientY - startClientY) / (scale || 1);
      if (!hasMoved && (Math.abs(stageDx) > 1 || Math.abs(stageDy) > 1)) {
        hasMoved = true;
        pushHistory?.();
      }

      const rawDx = Math.round(stageDx);
      const rawDy = Math.round(stageDy);

      let deltaX = Math.max(-minStartX, rawDx);
      let deltaY = Math.max(-minStartY, rawDy);

      // Прилипание к краю холста (0) и границам других экранов (отключается с Alt)
      if (!moveEv.altKey) {
        const snapDist = 20; // в пикселях

        let bestDiffX = snapDist;
        let bestDeltaX = deltaX;

        // 1. Прилипание самого левого экрана группы к 0
        if (Math.abs(minStartX + deltaX) < bestDiffX) {
          bestDiffX = Math.abs(minStartX + deltaX);
          bestDeltaX = -minStartX;
        }

        // 2. Прилипание перетаскиваемого экрана к другим экранам
        const candItemX = startPosX + deltaX;
        for (const ob of otherBoxes) {
          if (Math.abs(candItemX - ob.x) < bestDiffX) {
            bestDiffX = Math.abs(candItemX - ob.x);
            bestDeltaX = ob.x - startPosX;
          }
          if (Math.abs(candItemX - (ob.x + ob.w)) < bestDiffX) {
            bestDiffX = Math.abs(candItemX - (ob.x + ob.w));
            bestDeltaX = (ob.x + ob.w) - startPosX;
          }
          if (Math.abs(candItemX - (ob.x - item.wPx)) < bestDiffX) {
            bestDiffX = Math.abs(candItemX - (ob.x - item.wPx));
            bestDeltaX = (ob.x - item.wPx) - startPosX;
          }
        }
        deltaX = Math.max(-minStartX, bestDeltaX);

        let bestDiffY = snapDist;
        let bestDeltaY = deltaY;

        // 1. Прилипание самого верхнего экрана группы к 0
        if (Math.abs(minStartY + deltaY) < bestDiffY) {
          bestDiffY = Math.abs(minStartY + deltaY);
          bestDeltaY = -minStartY;
        }

        // 2. Прилипание перетаскиваемого экрана к другим экранам
        const candItemY = startPosY + deltaY;
        for (const ob of otherBoxes) {
          if (Math.abs(candItemY - ob.y) < bestDiffY) {
            bestDiffY = Math.abs(candItemY - ob.y);
            bestDeltaY = ob.y - startPosY;
          }
          if (Math.abs(candItemY - (ob.y + ob.h)) < bestDiffY) {
            bestDiffY = Math.abs(candItemY - (ob.y + ob.h));
            bestDeltaY = (ob.y + ob.h) - startPosY;
          }
          if (Math.abs(candItemY - (ob.y - item.hPx)) < bestDiffY) {
            bestDiffY = Math.abs(candItemY - (ob.y - item.hPx));
            bestDeltaY = (ob.y - item.hPx) - startPosY;
          }
        }
        deltaY = Math.max(-minStartY, bestDeltaY);
      }

      curDeltaX = deltaX;
      curDeltaY = deltaY;

      setDragState({
        deltaX,
        deltaY,
        groupIds: new Set(movingIds),
      });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);

      if (hasMoved) {
        const updatedList = movingItems.map(it => ({
          ...it.group,
          posX: it.posPxX + curDeltaX,
          posY: it.posPxY + curDeltaY,
        }));
        if (onUpdateGroups) {
          onUpdateGroups(updatedList);
        } else if (onUpdateGroup) {
          updatedList.forEach(g => onUpdateGroup(g));
        }
      } else {
        if (!isMultiKey && isAlreadySelected && activeSelectedIds.size > 1) {
          onSelectGroup(item.group.id, false);
        }
      }
      setDragState(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onBadgeMouseDown = (
    e: React.MouseEvent,
    item: (typeof screenItems)[0]
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    if (!activeSelectedIds.has(item.group.id)) {
      onSelectGroup(item.group.id, false);
    }

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startOffsetX = item.group.badgeOffsetX ?? 0;
    const startOffsetY = item.group.badgeOffsetY ?? 0;
    const startScale = item.group.badgeScale ?? 1;
    const isShiftScaling = e.shiftKey;

    const screenCx = item.contour.center.x || (item.wPx / 2);
    const screenCy = item.contour.center.y || (item.hPx / 2);
    const { octSide, maxScale } = computeBadgeSize(item.wPx, item.hPx, startScale);
    const { minX, maxX, minY, maxY } = getBadgeBounds(item.wPx, item.hPx, screenCx, screenCy, octSide);

    let curDeltaX = 0;
    let curDeltaY = 0;
    let curScale = startScale;
    let hasMoved = false;

    const onMove = (moveEv: MouseEvent) => {
      const rawDx = Math.round((moveEv.clientX - startClientX) / scale);
      const rawDy = Math.round((moveEv.clientY - startClientY) / scale);

      if (Math.abs(rawDx) > 1 || Math.abs(rawDy) > 1) {
        if (!hasMoved) {
          hasMoved = true;
          pushHistory?.();
        }
      }

      if (isShiftScaling) {
        const delta = (rawDx - rawDy) / 120;
        curScale = Math.max(0.4, Math.min(maxScale, Math.round((startScale + delta) * 20) / 20));
        setBadgeDragState({
          groupId: item.group.id,
          deltaX: 0,
          deltaY: 0,
          scale: curScale,
        });
      } else {
        const targetOffsetX = startOffsetX + rawDx;
        const clampedOffsetX = Math.max(minX, Math.min(maxX, targetOffsetX));
        const deltaX = clampedOffsetX - startOffsetX;

        const targetOffsetY = startOffsetY + rawDy;
        const clampedOffsetY = Math.max(minY, Math.min(maxY, targetOffsetY));
        const deltaY = clampedOffsetY - startOffsetY;

        curDeltaX = deltaX;
        curDeltaY = deltaY;
        setBadgeDragState({
          groupId: item.group.id,
          deltaX,
          deltaY,
        });
      }
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);

      if (hasMoved) {
        if (isShiftScaling) {
          onUpdateGroup?.({
            ...item.group,
            badgeScale: curScale,
          });
        } else {
          onUpdateGroup?.({
            ...item.group,
            badgeOffsetX: startOffsetX + curDeltaX,
            badgeOffsetY: startOffsetY + curDeltaY,
          });
        }
      }
      setBadgeDragState(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <g id="mask-layer">
      <defs>
        {screenItems.map(item => {
          const { group, texture, contour, meterPxW, meterPxH } = item;
          return (
            <React.Fragment key={group.id}>
              <pattern
                id={`mask-pat-${group.id}`}
                x={0}
                y={0}
                width={meterPxW}
                height={meterPxH}
                patternUnits="userSpaceOnUse"
              >
                <image
                  href={texture.url}
                  width={meterPxW}
                  height={meterPxH}
                  preserveAspectRatio="none"
                />
              </pattern>
              <clipPath id={`mask-clip-${group.id}`}>
                <path d={contour.pathData} />
              </clipPath>
            </React.Fragment>
          );
        })}
      </defs>

      {screenItems.map(item => {
        const { group, contour, wPx, hPx, wM, hM } = item;
        const isSelected = activeSelectedIds.has(group.id);
        const side = Math.min(wPx, hPx);

        const isBadgeDragging = badgeDragState?.groupId === group.id;
        const currentScale = isBadgeDragging && badgeDragState.scale !== undefined
          ? badgeDragState.scale
          : (typeof group.badgeScale === 'number' ? group.badgeScale : 1);

        const { octSide, baseFs } = computeBadgeSize(wPx, hPx, currentScale);

        const screenCx = contour.center.x || (wPx / 2);
        const screenCy = contour.center.y || (hPx / 2);

        const { minX, maxX, minY, maxY } = getBadgeBounds(wPx, hPx, screenCx, screenCy, octSide);

        const rawOffsetX = (group.badgeOffsetX ?? 0) + (isBadgeDragging ? badgeDragState.deltaX : 0);
        const rawOffsetY = (group.badgeOffsetY ?? 0) + (isBadgeDragging ? badgeDragState.deltaY : 0);

        const badgeOffsetX = Math.max(minX, Math.min(maxX, rawOffsetX));
        const badgeOffsetY = Math.max(minY, Math.min(maxY, rawOffsetY));

        const badgeCx = screenCx + badgeOffsetX;
        const badgeCy = screenCy + badgeOffsetY;
        const ox = badgeCx - octSide / 2;
        const oy = badgeCy - octSide / 2;
        const octPointsStr = OCT_POINTS
          .map(([px, py]) => `${ox + px * octSide},${oy + py * octSide}`)
          .join(' ');

        // Положение экрана на маске строго в пикселях:
        const isMoving = Boolean(dragState && dragState.groupIds.has(group.id));
        const activePosX = isMoving && dragState ? item.posPxX + dragState.deltaX : item.posPxX;
        const activePosY = isMoving && dragState ? item.posPxY + dragState.deltaY : item.posPxY;

        return (
          <g
            key={group.id}
            id={`mask-group-${group.id}`}
            transform={`translate(${activePosX}, ${activePosY})`}
            onMouseDown={(e) => onScreenMouseDown(e, item)}
            className="cursor-move select-none"
          >
            {/* 1. Заливка текстурой единым полотном по контуру (стыки модулей не рисуются) */}
            <path
              d={contour.pathData}
              fill={`url(#mask-pat-${group.id})`}
            />

            {/* 2. Направляющие (диагонали, перекрестие, круг) - тонкие белые линии */}
            {showGuides && (
              <g clipPath={`url(#mask-clip-${group.id})`}>
                <g stroke="#ffffff" strokeWidth="1" opacity="0.8">
                  <line x1={0} y1={0} x2={wPx} y2={hPx} />
                  <line x1={wPx} y1={0} x2={0} y2={hPx} />
                  <line x1={0} y1={screenCy} x2={wPx} y2={screenCy} />
                  <line x1={screenCx} y1={0} x2={screenCx} y2={hPx} />
                  <circle
                    cx={screenCx}
                    cy={screenCy}
                    r={Math.max(10, side / 2.4)}
                    fill="none"
                  />
                </g>
              </g>
            )}

            {/* 3. Внешняя обводка контура */}
            <path
              d={contour.pathData}
              fill="none"
              stroke={isSelected ? '#38bdf8' : (group.strokeColor || '#ffffff')}
              strokeWidth={isSelected ? 4 : 3}
              strokeLinejoin="miter"
              filter={isSelected ? 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))' : undefined}
            />

            {/* 4. Инфо-плашка (бейдж) */}
            {showBadges && (
              <g
                className="cursor-grab active:cursor-grabbing select-none"
                onMouseDown={(e) => onBadgeMouseDown(e, item)}
              >
                <title>Перетащите бейдж для смещения от центра. Shift+перетаскивание — изменить размер</title>
                {/* Линия и маркер связи с центром экрана, если бейдж смещен */}
                {(badgeOffsetX !== 0 || badgeOffsetY !== 0) && (
                  <>
                    <line
                      x1={screenCx}
                      y1={screenCy}
                      x2={badgeCx}
                      y2={badgeCy}
                      stroke={isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.45)'}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      pointerEvents="none"
                    />
                    <circle
                      cx={screenCx}
                      cy={screenCy}
                      r={3.5}
                      fill={isSelected ? '#38bdf8' : '#ffffff'}
                      opacity={0.8}
                      pointerEvents="none"
                    />
                  </>
                )}
                <polygon
                  points={octPointsStr}
                  fill="rgba(8, 9, 11, 0.90)"
                  stroke={isSelected ? '#38bdf8' : '#ffffff'}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  filter={isSelected ? 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.5))' : undefined}
                />
                <image
                  href="/logo3.png"
                  x={badgeCx - octSide * 0.28}
                  y={oy + octSide * 0.1}
                  width={octSide * 0.58}
                  height={octSide * 0.24}
                  preserveAspectRatio="xMidYMid meet"
                  pointerEvents="none"
                />
                <text
                  x={badgeCx}
                  y={badgeCy}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={baseFs * 1.15}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                  pointerEvents="none"
                >
                  {wPx}×{hPx} px
                </text>
                <text
                  x={badgeCx}
                  y={oy + octSide * 0.62}
                  textAnchor="middle"
                  fill="rgba(255, 255, 255, 0.85)"
                  fontSize={baseFs * 0.9}
                  fontFamily="sans-serif"
                  pointerEvents="none"
                >
                  {formatMeters(wM)}×{formatMeters(hM)} м
                </text>
                <text
                  x={badgeCx}
                  y={oy + octSide * 0.77}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={baseFs * 0.85}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                  pointerEvents="none"
                >
                  {group.name}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}
