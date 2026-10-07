// src/lib/led-editor-svg/mask-export.ts
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { savePngFile, saveDesktopZIP, blobToBase64, isDesktopApp, showToast } from '../desktop';
import { Panel, ScreenGroup } from './types';
import { getTextureById } from './textures';
import { computePixelPanels, computeContour, GroupContourResult, PixelPanel, formatMeters, getMaskPanelResolution, computeBadgeSize, getBadgeBounds } from './mask-contour';
import type { BuildLegendParams } from './utils';

/* Нормированный восьмиугольник 30-70-100 % */
const OCT_PATH = [
  [0.30, 0], [0.70, 0], [1, 0.30], [1, 0.70],
  [0.70, 1], [0.30, 1], [0, 0.70], [0, 0.30],
] as const;

export interface ScreenRenderData {
  group: ScreenGroup;
  panels: Panel[];
  pixelPanels: PixelPanel[];
  contour: GroupContourResult;
  posX: number;
  posY: number;
  offsetX: number;
  offsetY: number;
  wPx: number;
  hPx: number;
  wM: number;
  hM: number;
  meterPxW: number;
  meterPxH: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`Failed to load image: ${src}`);
      resolve(img);
    };
    img.src = src;
  });
}

function drawOctagon(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  side: number,
  fillOrStroke: 'fill' | 'stroke',
  style: string,
  lineWidth = 1
) {
  ctx.beginPath();
  OCT_PATH.forEach(([px, py], i) => {
    const vx = ox + px * side;
    const vy = oy + py * side;
    if (i === 0) ctx.moveTo(vx, vy);
    else ctx.lineTo(vx, vy);
  });
  ctx.closePath();

  if (fillOrStroke === 'stroke') {
    ctx.strokeStyle = style;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  } else {
    ctx.fillStyle = style;
    ctx.fill();
  }
}

export function computeAutoPositions(
  items: Array<{
    group: ScreenGroup;
    stageMinX: number;
    stageMinY: number;
    stageW?: number;
    stageH?: number;
    wPx: number;
    hPx: number;
  }>,
  allPanels?: Panel[]
): Array<{ x: number; y: number }> {
  if (!items.length) return [];

  // Если переданы все панели, рассчитываем авто-позиции по глобальной пиксельной сетке
  if (allPanels && allPanels.length > 0) {
    const allPixelPanels = computePixelPanels(allPanels);
    if (allPixelPanels.length > 0) {
      const minAllPxX = Math.min(...allPixelPanels.map(p => p.px));
      const minAllPxY = Math.min(...allPixelPanels.map(p => p.py));

      return items.map(it => {
        const gPanels = allPixelPanels.filter(p => it.group.panelIds.includes(p.id));
        const realX = gPanels.length ? Math.max(0, Math.min(...gPanels.map(p => p.px)) - minAllPxX) : 0;
        const realY = gPanels.length ? Math.max(0, Math.min(...gPanels.map(p => p.py)) - minAllPxY) : 0;

        const posX = typeof it.group.posX === 'number' ? it.group.posX : realX;
        const posY = typeof it.group.posY === 'number' ? it.group.posY : realY;

        return { x: posX, y: posY };
      });
    }
  }

  // Начало позиции композиции считается с левого края физического расположения на сцене
  const minAllX = Math.min(...items.map(it => it.stageMinX));
  const minAllY = Math.min(...items.map(it => it.stageMinY));

  return items.map(it => {
    const kx = (it.stageW && it.stageW > 0) ? it.wPx / it.stageW : 1.08;
    const ky = (it.stageH && it.stageH > 0) ? it.hPx / it.stageH : 1.08;

    // Реальная позиция экрана от левого края (minAllX) в пикселях
    const realX = Math.max(0, Math.round((it.stageMinX - minAllX) * kx));
    const realY = Math.max(0, Math.round((it.stageMinY - minAllY) * ky));

    const posX = typeof it.group.posX === 'number' ? it.group.posX : realX;
    const posY = typeof it.group.posY === 'number' ? it.group.posY : realY;

    return { x: posX, y: posY };
  });
}

export function prepareScreensData(panels: Panel[], groups: ScreenGroup[]): {
  screens: ScreenRenderData[];
  totalW: number;
  totalH: number;
} {
  if (!panels.length) {
    return { screens: [], totalW: 0, totalH: 0 };
  }

  const panelsById = new Map(panels.map(p => [p.id, p]));

  type RawScreenItem = {
    group: ScreenGroup;
    groupPanels: Panel[];
    pixelPanels: PixelPanel[];
    contour: GroupContourResult;
    stageMinX: number;
    stageMinY: number;
    stageW: number;
    stageH: number;
    wPx: number;
    hPx: number;
    wM: number;
    hM: number;
    meterPxW: number;
    meterPxH: number;
  };

  const rawItems: RawScreenItem[] = [];

  for (const group of groups) {
    const groupPanels = group.panelIds
      .map(id => panelsById.get(id))
      .filter((p): p is Panel => Boolean(p));

    if (!groupPanels.length) continue;

    const pixelPanels = computePixelPanels(groupPanels);
    const contour = computeContour(pixelPanels.map(p => ({ x: p.px, y: p.py, w: p.pw, h: p.ph })));

    // Точные размеры экрана по пикселям панелей (не подгоняются под общий размер)
    const wPx = Math.max(...pixelPanels.map(p => p.px + p.pw), 0);
    const hPx = Math.max(...pixelPanels.map(p => p.py + p.ph), 0);

    // Физические размеры
    const stageMinX = Math.min(...groupPanels.map(p => p.x));
    const stageMaxX = Math.max(...groupPanels.map(p => p.x + p.w));
    const stageMinY = Math.min(...groupPanels.map(p => p.y));
    const stageMaxY = Math.max(...groupPanels.map(p => p.y + p.h));
    const stageW = stageMaxX - stageMinX;
    const stageH = stageMaxY - stageMinY;
    const wM = Math.round((stageW / 200) * 100) / 100;
    const hM = Math.round((stageH / 200) * 100) / 100;

    // Размер 1 квадратного метра в пикселях для выбранного вида панелей
    const firstP = groupPanels[0];
    const pRes = getMaskPanelResolution(firstP);
    const pw = pRes.resW;
    const ph = pRes.resH;
    const mmW = firstP.w * 5;
    const mmH = firstP.h * 5;
    const meterPxW = Math.max(1, Math.round((500 / mmW) * pw));
    const meterPxH = Math.max(1, Math.round((500 / mmH) * ph));

    rawItems.push({
      group,
      groupPanels,
      pixelPanels,
      contour,
      stageMinX,
      stageMinY,
      stageW,
      stageH,
      wPx,
      hPx,
      wM,
      hM,
      meterPxW,
      meterPxH,
    });
  }

  // 1. Позиции экранов строго по реальным размерам и координатам
  const positions = computeAutoPositions(rawItems, panels);

  const rawScreens = rawItems.map((item, idx) => ({
    group: item.group,
    panels: item.groupPanels,
    pixelPanels: item.pixelPanels,
    contour: item.contour,
    posX: positions[idx].x,
    posY: positions[idx].y,
    wPx: item.wPx,
    hPx: item.hPx,
    wM: item.wM,
    hM: item.hM,
    meterPxW: item.meterPxW,
    meterPxH: item.meterPxH,
  }));

  // 2. Начало позиции холста всегда отсчитывается с левого края (minX) и верхнего края (minY)
  const minX = rawScreens.length ? Math.min(...rawScreens.map(s => s.posX)) : 0;
  const minY = rawScreens.length ? Math.min(...rawScreens.map(s => s.posY)) : 0;
  const maxX = rawScreens.length ? Math.max(...rawScreens.map(s => s.posX + s.wPx)) : 0;
  const maxY = rawScreens.length ? Math.max(...rawScreens.map(s => s.posY + s.hPx)) : 0;

  const totalW = Math.max(1, maxX - minX);
  const totalH = Math.max(1, maxY - minY);

  // Каждому экрану выставляем точный оффсет от левого края холста
  const screens: ScreenRenderData[] = rawScreens.map(s => ({
    ...s,
    offsetX: s.posX - minX,
    offsetY: s.posY - minY,
  }));

  return { screens, totalW, totalH };
}

export async function renderScreenOnCanvas(
  ctx: CanvasRenderingContext2D,
  screen: ScreenRenderData,
  originX: number,
  originY: number,
  logoImg: HTMLImageElement | null
) {
  const { contour, group, wPx, hPx, wM, hM, meterPxW, meterPxH } = screen;
  const texture = getTextureById(group.textureId);
  const textureImg = await loadImage(texture.url);

  ctx.save();
  ctx.translate(originX, originY);

  const path = new Path2D(contour.pathData);

  // 1. Заливка текстурой под 1 квадратный метр выбранного вида панелей (без стыков между модулями)
  ctx.save();
  ctx.clip(path);

  if (textureImg.width > 0 && meterPxW > 0 && meterPxH > 0) {
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = meterPxW;
    tileCanvas.height = meterPxH;
    const tileCtx = tileCanvas.getContext('2d')!;
    tileCtx.drawImage(textureImg, 0, 0, meterPxW, meterPxH);

    const pat = ctx.createPattern(tileCanvas, 'repeat');
    if (pat) ctx.fillStyle = pat;
    else ctx.fillStyle = texture.color;
  } else {
    ctx.fillStyle = texture.color;
  }

  // Заливаем весь экран единым полотном по контуру (стыки модулей не рисуются)
  ctx.fillRect(0, 0, wPx, hPx);
  ctx.restore();

  // 2. Направляющие (диагонали, перекрестие, круг) - тонкие белые линии
  const guideW = Math.max(1, Math.round(Math.min(wPx, hPx) / 500));
  const screenCx = contour.center.x || (wPx / 2);
  const screenCy = contour.center.y || (hPx / 2);
  const radius = Math.min(wPx, hPx) / 2.4;

  ctx.save();
  ctx.beginPath();
  ctx.clip(path);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = guideW;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(wPx, hPx);
  ctx.moveTo(wPx, 0); ctx.lineTo(0, hPx);
  ctx.moveTo(screenCx, 0); ctx.lineTo(screenCx, hPx);
  ctx.moveTo(0, screenCy); ctx.lineTo(wPx, screenCy);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(screenCx, screenCy, Math.max(10, radius), 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  // 3. Октагон-плашка (инфо-бейдж, гарантированно не превышающий габариты экрана)
  const { octSide, baseFs } = computeBadgeSize(wPx, hPx, group.badgeScale ?? 1);
  const { minX, maxX, minY, maxY } = getBadgeBounds(wPx, hPx, screenCx, screenCy, octSide);

  const clampedOffsetX = Math.max(minX, Math.min(maxX, group.badgeOffsetX ?? 0));
  const clampedOffsetY = Math.max(minY, Math.min(maxY, group.badgeOffsetY ?? 0));

  const badgeCx = screenCx + clampedOffsetX;
  const badgeCy = screenCy + clampedOffsetY;
  const ox = badgeCx - octSide / 2;
  const oy = badgeCy - octSide / 2;

  drawOctagon(ctx, ox, oy, octSide, 'fill', 'rgba(8, 9, 11, 0.88)');
  drawOctagon(ctx, ox, oy, octSide, 'stroke', '#ffffff', Math.max(2, guideW));

  // 5. Текст и логотип на плашке
  let textY = oy + octSide * 0.12;

  if (logoImg && logoImg.width > 0) {
    const maxLogoW = octSide * 0.55;
    const ratio = maxLogoW / logoImg.width;
    const logoW = Math.round(maxLogoW);
    const logoH = Math.round(logoImg.height * ratio);
    const lx = badgeCx - logoW / 2;
    ctx.drawImage(logoImg, lx, textY, logoW, logoH);
    textY += logoH + baseFs * 0.4;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';

  ctx.font = `bold ${Math.round(baseFs * 1.15)}px sans-serif`;
  ctx.fillText(`${wPx}×${hPx} px`, badgeCx, textY);
  textY += baseFs * 1.25;

  ctx.font = `${Math.round(baseFs * 0.85)}px sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText(`${formatMeters(wM)}×${formatMeters(hM)} м`, badgeCx, textY);
  textY += baseFs * 1.05;

  ctx.font = `bold ${Math.round(baseFs * 0.95)}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(group.name, badgeCx, textY);

  ctx.restore();
}


export async function renderFullMaskCanvas(
  panels: Panel[],
  groups: ScreenGroup[]
): Promise<{ canvas: HTMLCanvasElement; totalW: number; totalH: number; screens: ScreenRenderData[] }> {
  const { screens, totalW, totalH } = prepareScreensData(panels, groups);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, totalW);
  canvas.height = Math.max(1, totalH);
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#08090b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const logoImg = await loadImage('/logo3.png');

  for (const s of screens) {
    await renderScreenOnCanvas(ctx, s, s.offsetX, s.offsetY, logoImg);
  }

  return { canvas, totalW, totalH, screens };
}

export async function exportMaskPNG(
  panels: Panel[],
  groups: ScreenGroup[],
  eventName = 'Mask',
  pageName?: string
): Promise<void> {
  const { canvas, totalW, totalH } = await renderFullMaskCanvas(panels, groups);
  if (totalW === 0 || totalH === 0) return;

  const dataUrl = canvas.toDataURL('image/png');
  const safePage = pageName ? `_${pageName.replace(/[/\\?%*:|"<>]/g, '_')}` : '';
  const filename = `${eventName}${safePage}_mask_${totalW}x${totalH}.png`;

  const saved = await savePngFile(filename, dataUrl);
  if (saved) {
    showToast('PNG сохранен');
  }
}

export async function exportMaskZIP(
  panels: Panel[],
  groups: ScreenGroup[],
  eventName = 'Mask',
  _legendParams?: Partial<BuildLegendParams>,
  pageName?: string
): Promise<void> {
  void _legendParams;
  const { canvas, totalW, totalH } = await renderFullMaskCanvas(panels, groups);
  if (totalW === 0 || totalH === 0) return;

  const zip = new JSZip();
  const fullDataUrl = canvas.toDataURL('image/png');
  const safePage = pageName ? `_${pageName.replace(/[/\\?%*:|"<>]/g, '_')}` : '';
  zip.file(`${eventName}${safePage}_mask_${totalW}x${totalH}.png`, fullDataUrl.split(',')[1], { base64: true });

  const blob = await zip.generateAsync({ type: 'blob' });
  const filename = `${eventName}${safePage}_mask_${totalW}x${totalH}.zip`;

  if (isDesktopApp()) {
    const base64 = await blobToBase64(blob);
    const saved = await saveDesktopZIP(filename, base64);
    if (saved) {
      showToast('ZIP сохранен');
    }
  } else {
    saveAs(blob, filename);
    showToast('ZIP сохранен');
  }
}

