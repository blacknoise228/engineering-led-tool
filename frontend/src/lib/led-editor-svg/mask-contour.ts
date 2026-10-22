// src/lib/led-editor-svg/mask-contour.ts
import { Panel, ScreenGroup } from './types';
import { TEXTURES } from './textures';

export interface PixelPanel {
  id: string;
  px: number;
  py: number;
  pw: number;
  ph: number;
  stageX: number;
  stageY: number;
  stageW: number;
  stageH: number;
  resW: number;
  resH: number;
  label: string;
}

export interface ContourBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface GroupContourResult {
  pathData: string;
  bounds: ContourBounds;
  center: { x: number; y: number };
  innerSeams: Array<{ x1: number; y1: number; x2: number; y2: number }>;
}

/** Форматирует размер в метрах: убирает нули если число целое (напр. 8 или 8.5) */
export function formatMeters(m: number): string {
  const val = Math.round(m * 10) / 10;
  if (val % 1 === 0) return String(Math.round(val));
  return val.toFixed(1);
}

/**
 * Проверяет, является ли панель моделью Galaxy 3.9 - 7.8, для которой при создании/рисовании маски
 * требуется удвоение разрешения по вертикали (чтобы пиксели контента были квадратными).
 */
export function isGalaxySpecialMaskPanel(p?: { id?: string; special: boolean } | null): boolean {
  if (!p) return false;
  return p.special;
}

/**
 * Возвращает разрешение панели с учетом режима рисования маски.
 * Для панелей с presetId или id "galaxy-1m-3p9-7p8" или "galaxy-0p5m-3p9-7p8"
 * разрешение по вертикали умножается на 2.
 */
export function getMaskPanelResolution(p: Panel): { resW: number; resH: number } {
  return {
    resW: p.resW,
    resH: isGalaxySpecialMaskPanel(p) ? p.resH * 2 : p.resH,
  };
}

function clusterCoords(values: number[], eps = 1.5): number[] {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const result: number[] = [];
  for (const v of sorted) {
    if (result.length === 0 || Math.abs(v - result[result.length - 1]) > eps) {
      result.push(v);
    }
  }
  return result;
}

function findNearest(val: number, list: number[]): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < list.length; i++) {
    const d = Math.abs(val - list[i]);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Рассчитывает точные координаты и размеры каждой панели в пикселях по сетке.
 * Устраняет любые зазоры, наложения и погрешности округления.
 */
export function computePixelPanels(panels: Panel[]): PixelPanel[] {
  if (!panels.length) return [];

  const xs = clusterCoords(panels.flatMap(p => [p.x, p.x + p.w]), 2);
  const ys = clusterCoords(panels.flatMap(p => [p.y, p.y + p.h]), 2);

  const colWidths: number[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const mx = (xs[i] + xs[i + 1]) / 2;
    const p = panels.find(pan => mx >= pan.x - 0.5 && mx <= pan.x + pan.w + 0.5);
    const pw = p ? getMaskPanelResolution(p).resW : 128;
    const kx = p && p.w > 0 ? pw / p.w : 1.28;
    colWidths.push(Math.round((xs[i + 1] - xs[i]) * kx));
  }

  const rowHeights: number[] = [];
  for (let j = 0; j < ys.length - 1; j++) {
    const my = (ys[j] + ys[j + 1]) / 2;
    const p = panels.find(pan => my >= pan.y - 0.5 && my <= pan.y + pan.h + 0.5);
    const ph = p ? getMaskPanelResolution(p).resH : 128;
    const ky = p && p.h > 0 ? ph / p.h : 1.28;
    rowHeights.push(Math.round((ys[j + 1] - ys[j]) * ky));
  }

  const pixelX = [0];
  for (const w of colWidths) pixelX.push(pixelX[pixelX.length - 1] + w);

  const pixelY = [0];
  for (const h of rowHeights) pixelY.push(pixelY[pixelY.length - 1] + h);

  return panels.map(p => {
    const i1 = findNearest(p.x, xs);
    const i2 = findNearest(p.x + p.w, xs);
    const j1 = findNearest(p.y, ys);
    const j2 = findNearest(p.y + p.h, ys);
    const pRes = getMaskPanelResolution(p);
    const pw = pRes.resW;
    const ph = pRes.resH;

    return {
      id: p.id,
      px: pixelX[i1],
      py: pixelY[j1],
      pw: Math.max(pw, pixelX[i2] - pixelX[i1]),
      ph: Math.max(ph, pixelY[j2] - pixelY[j1]),
      stageX: p.x,
      stageY: p.y,
      stageW: p.w,
      stageH: p.h,
      resW: pw,
      resH: ph,
      label: p.label,
    };
  });
}

/**
 * Вычисляет контур (обводку) вокруг группы прямоугольников.
 * Поддерживает любые формы (L-образные, ступени, разрывы) без швов и самопересечений.
 */
export function computeContour(
  rects: Array<{ x: number; y: number; w: number; h: number }>
): GroupContourResult {
  if (!rects.length) {
    return {
      pathData: '',
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
      center: { x: 0, y: 0 },
      innerSeams: [],
    };
  }

  const minX = Math.min(...rects.map(r => r.x));
  const minY = Math.min(...rects.map(r => r.y));
  const maxX = Math.max(...rects.map(r => r.x + r.w));
  const maxY = Math.max(...rects.map(r => r.y + r.h));
  const width = maxX - minX;
  const height = maxY - minY;

  const xs = clusterCoords(rects.flatMap(r => [r.x, r.x + r.w]), 0.5);
  const ys = clusterCoords(rects.flatMap(r => [r.y, r.y + r.h]), 0.5);

  const nx = xs.length - 1;
  const ny = ys.length - 1;
  if (nx <= 0 || ny <= 0) {
    return {
      pathData: '',
      bounds: { minX, minY, maxX, maxY, width, height },
      center: { x: minX + width / 2, y: minY + height / 2 },
      innerSeams: [],
    };
  }

  const grid: boolean[][] = Array.from({ length: nx }, () => Array(ny).fill(false));

  for (let i = 0; i < nx; i++) {
    const mx = (xs[i] + xs[i + 1]) / 2;
    for (let j = 0; j < ny; j++) {
      const my = (ys[j] + ys[j + 1]) / 2;
      grid[i][j] = rects.some(
        r => mx >= r.x - 0.5 && mx <= r.x + r.w + 0.5 && my >= r.y - 0.5 && my <= r.y + r.h + 0.5
      );
    }
  }

  type Point = { x: number; y: number };
  type Segment = { from: Point; to: Point };

  const boundarySegments: Segment[] = [];
  const innerSeams: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const filled = grid[i][j];
      const topFilled = j > 0 ? grid[i][j - 1] : false;
      const leftFilled = i > 0 ? grid[i - 1][j] : false;

      // Горизонтальное ребро на ys[j]
      if (filled && !topFilled) {
        boundarySegments.push({ from: { x: xs[i], y: ys[j] }, to: { x: xs[i + 1], y: ys[j] } });
      } else if (!filled && topFilled) {
        boundarySegments.push({ from: { x: xs[i + 1], y: ys[j] }, to: { x: xs[i], y: ys[j] } });
      } else if (filled && topFilled) {
        innerSeams.push({ x1: xs[i], y1: ys[j], x2: xs[i + 1], y2: ys[j] });
      }

      // Вертикальное ребро на xs[i]
      if (filled && !leftFilled) {
        boundarySegments.push({ from: { x: xs[i], y: ys[j + 1] }, to: { x: xs[i], y: ys[j] } });
      } else if (!filled && leftFilled) {
        boundarySegments.push({ from: { x: xs[i], y: ys[j] }, to: { x: xs[i], y: ys[j + 1] } });
      } else if (filled && leftFilled) {
        innerSeams.push({ x1: xs[i], y1: ys[j], x2: xs[i], y2: ys[j + 1] });
      }

      // Внешняя правая граница на xs[nx]
      if (i === nx - 1 && filled) {
        boundarySegments.push({ from: { x: xs[i + 1], y: ys[j] }, to: { x: xs[i + 1], y: ys[j + 1] } });
      }
      // Внешняя нижняя граница на ys[ny]
      if (j === ny - 1 && filled) {
        boundarySegments.push({ from: { x: xs[i + 1], y: ys[j + 1] }, to: { x: xs[i], y: ys[j + 1] } });
      }
    }
  }

  const ptKey = (p: Point) => `${Math.round(p.x * 100) / 100},${Math.round(p.y * 100) / 100}`;
  const fromMap = new Map<string, Segment[]>();
  for (const seg of boundarySegments) {
    const k = ptKey(seg.from);
    if (!fromMap.has(k)) fromMap.set(k, []);
    fromMap.get(k)!.push(seg);
  }

  function pickBestTurn(inSeg: Segment, candidates: Segment[]): Segment {
    if (candidates.length === 1) return candidates[0];
    const inAngle = Math.atan2(inSeg.to.y - inSeg.from.y, inSeg.to.x - inSeg.from.x);
    let bestCand = candidates[0];
    let bestTurn = Infinity;
    for (const c of candidates) {
      const candAngle = Math.atan2(c.to.y - c.from.y, c.to.x - c.from.x);
      let diff = candAngle - inAngle;
      while (diff <= -Math.PI) diff += 2 * Math.PI;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      if (diff < bestTurn) {
        bestTurn = diff;
        bestCand = c;
      }
    }
    return bestCand;
  }

  const visited = new Set<Segment>();
  const loops: Point[][] = [];

  for (const startSeg of boundarySegments) {
    if (visited.has(startSeg)) continue;

    const loop: Point[] = [startSeg.from];
    let curSeg: Segment | null = startSeg;

    while (curSeg) {
      visited.add(curSeg);
      const nextPt = curSeg.to;

      if (Math.abs(nextPt.x - startSeg.from.x) < 1e-4 && Math.abs(nextPt.y - startSeg.from.y) < 1e-4) {
        // Замкнули контур
        break;
      }

      loop.push(nextPt);
      const candidates = (fromMap.get(ptKey(nextPt)) ?? []).filter(s => !visited.has(s));
      if (!candidates.length) break;
      curSeg = pickBestTurn(curSeg, candidates);
    }

    if (loop.length >= 3) {
      // Убираем коллинеарные промежуточные точки на прямых отрезках
      const N = loop.length;
      const simplified: Point[] = [];
      for (let k = 0; k < N; k++) {
        const prev = loop[(k - 1 + N) % N];
        const curr = loop[k];
        const next = loop[(k + 1) % N];
        const colX = Math.abs(prev.x - curr.x) < 1e-4 && Math.abs(curr.x - next.x) < 1e-4;
        const colY = Math.abs(prev.y - curr.y) < 1e-4 && Math.abs(curr.y - next.y) < 1e-4;
        if (!colX && !colY) simplified.push(curr);
      }
      if (simplified.length >= 3) loops.push(simplified);
    }
  }

  let pathData = '';
  for (const loop of loops) {
    pathData += `M ${loop[0].x} ${loop[0].y} `;
    for (let k = 1; k < loop.length; k++) {
      pathData += `L ${loop[k].x} ${loop[k].y} `;
    }
    pathData += 'Z ';
  }

  const uniqueSeams: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const seamKeys = new Set<string>();
  for (const s of innerSeams) {
    const k1 = `${Math.round(s.x1 * 100) / 100},${Math.round(s.y1 * 100) / 100}-${Math.round(s.x2 * 100) / 100},${Math.round(s.y2 * 100) / 100}`;
    const k2 = `${Math.round(s.x2 * 100) / 100},${Math.round(s.y2 * 100) / 100}-${Math.round(s.x1 * 100) / 100},${Math.round(s.y1 * 100) / 100}`;
    if (!seamKeys.has(k1) && !seamKeys.has(k2)) {
      seamKeys.add(k1);
      uniqueSeams.push(s);
    }
  }

  return {
    pathData: pathData.trim(),
    bounds: { minX, minY, maxX, maxY, width, height },
    center: { x: minX + width / 2, y: minY + height / 2 },
    innerSeams: uniqueSeams,
  };
}

/**
 * Автоматическая группировка панелей в экраны по физическому касанию (связные кластеры)
 */
export function autoGroupPanels(panels: Panel[], existingGroups?: ScreenGroup[]): ScreenGroup[] {
  if (!panels.length) return [];

  const adj = new Map<string, Set<string>>();
  for (const p of panels) adj.set(p.id, new Set());

  for (let i = 0; i < panels.length; i++) {
    for (let j = i + 1; j < panels.length; j++) {
      const a = panels[i];
      const b = panels[j];

      const touchX = Math.abs(a.x + a.w - b.x) <= 3 || Math.abs(b.x + b.w - a.x) <= 3;
      const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);

      const touchY = Math.abs(a.y + a.h - b.y) <= 3 || Math.abs(b.y + b.h - a.y) <= 3;
      const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);

      if ((touchX && overlapY > 0) || (touchY && overlapX > 0)) {
        adj.get(a.id)!.add(b.id);
        adj.get(b.id)!.add(a.id);
      }
    }
  }

  const visited = new Set<string>();
  const clusters: string[][] = [];

  for (const p of panels) {
    if (visited.has(p.id)) continue;
    const cluster: string[] = [];
    const queue = [p.id];
    visited.add(p.id);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      cluster.push(curr);
      const neighbors = adj.get(curr) ?? new Set();
      for (const nb of neighbors) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }
    clusters.push(cluster);
  }

  clusters.sort((c1, c2) => {
    const minX1 = Math.min(...c1.map(id => panels.find(p => p.id === id)?.x ?? 0));
    const minX2 = Math.min(...c2.map(id => panels.find(p => p.id === id)?.x ?? 0));
    return minX1 - minX2;
  });

  return clusters.map((panelIds, idx) => {
    const existing = existingGroups?.find(g =>
      g.panelIds.some(id => panelIds.includes(id))
    );
    const texture = TEXTURES[idx % TEXTURES.length];

    return {
      id: existing?.id ?? `screen-${idx + 1}`,
      name: existing?.name ?? `Screen ${idx + 1}`,
      panelIds,
      textureId: existing?.textureId ?? texture.id,
      strokeColor: existing?.strokeColor ?? '#ffffff',
      posX: existing?.posX,
      posY: existing?.posY,
      badgeOffsetX: existing?.badgeOffsetX,
      badgeOffsetY: existing?.badgeOffsetY,
      badgeScale: existing?.badgeScale,
    };
  });
}

/**
 * Расчет размера бейджа с гарантией, что он не превышает размер скрина
 */
export function computeBadgeSize(
  wPx: number,
  hPx: number,
  badgeScale: number = 1
): { octSide: number; baseFs: number; maxScale: number } {
  const side = Math.max(1, Math.min(wPx, hPx));
  const defaultOctSide = Math.max(20, Math.min(260, side * 0.38));
  // Бейдж никогда не должен превышать габариты экрана
  const maxOctSide = Math.max(20, side);
  const maxScale = Math.max(0.5, Math.min(2.5, Math.round((maxOctSide / defaultOctSide) * 100) / 100));
  const clampedScale = Math.max(0.3, Math.min(maxScale, badgeScale));
  const octSide = Math.min(maxOctSide, Math.max(20, Math.round(defaultOctSide * clampedScale)));
  const baseFs = Math.max(8, Math.round(octSide / 9));

  return { octSide, baseFs, maxScale };
}

/**
 * Расчет допустимых границ смещения бейджа (+ / - px относительно центра),
 * чтобы бейдж не выходил за габариты скрина
 */
export function getBadgeBounds(
  wPx: number,
  hPx: number,
  screenCx: number,
  screenCy: number,
  octSide: number
): { minX: number; maxX: number; minY: number; maxY: number } {
  const halfOct = octSide / 2;
  const rawMinX = Math.round(-(screenCx - halfOct));
  const rawMaxX = Math.round(wPx - screenCx - halfOct);
  const rawMinY = Math.round(-(screenCy - halfOct));
  const rawMaxY = Math.round(hPx - screenCy - halfOct);

  const minX = rawMinX > rawMaxX ? 0 : rawMinX;
  const maxX = rawMinX > rawMaxX ? 0 : rawMaxX;
  const minY = rawMinY > rawMaxY ? 0 : rawMinY;
  const maxY = rawMinY > rawMaxY ? 0 : rawMaxY;

  return { minX, maxX, minY, maxY };
}


