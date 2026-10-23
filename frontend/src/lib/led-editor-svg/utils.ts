import type { Panel, Vec, CableEx, CardInstance, ScreenGroup } from './types';
import { PanelPreset, PRESETS, SERVERS, CARDS, FIBER_CONVERTERS, getPortMaxPixels, type CardPreset, type ServerPreset, type FiberConverterPreset } from './presets';
import { savePngBlob, savePngFile, showToast } from '../desktop';

export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}`;
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export function center(p: Panel): Vec {
  return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
}

export function slugify(text: string, fallback = 'preset'): string {
  const ruToEn: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
    з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
    п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
    ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return (
    text
      .toLowerCase()
      .trim()
      .split('')
      .map(char => ruToEn[char] ?? char)
      .join('')
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || fallback
  );
}

export function boundsOfPanels(panels: Panel[]) {
  if (!panels.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const xs = panels.flatMap(p => [p.x, p.x + p.w]);
  const ys = panels.flatMap(p => [p.y, p.y + p.h]);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

export function rectFromPoints(a: Vec, b: Vec) {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

export function rectsIntersect(
  r: { x: number; y: number; w: number; h: number },
  p: { x: number; y: number; w: number; h: number }
) {
  return !(p.x > r.x + r.w || p.x + p.w < r.x || p.y > r.y + r.h || p.y + p.h < r.y);
}

export function clientToStage(clientX: number, clientY: number, svgEl: SVGSVGElement, pan: Vec, scale: number) {
  const rect = svgEl.getBoundingClientRect();
  const x = (clientX - rect.left - pan.x) / scale;
  const y = (clientY - rect.top - pan.y) / scale;
  return { x, y };
}

export type LegendCardRow = {
  order: number;
  name: string;
  color: string;
};

export type ExportLegend = {
  eventName: string;
  eventDate: string;
  serverName: string;
  cardName: string;
  logoDataUrl: string;
  cablesCount: number;
  linksUsedCount: number;
  linksList: number[];
  panelGroups: { label: string; sub?: string; count: number; weight?: number }[];
  cards?: LegendCardRow[];
  totalAreaM2?: number;
  totalWeight?: number;
  fibers?: { id: string; name: string; count: number }[];
  power: number;
  refreshRate?: number;
};

export interface BuildLegendParams {
  panels: Panel[];
  cables?: CableEx[];
  servers?: Array<{ id: string; modelId: string }> | string;
  cardId?: string;
  cards?: CardInstance[];
  eventName?: string;
  eventDate?: string;
  logoDataUrl?: string;
  fiberCounts?: Record<string, number>;
  presets?: PanelPreset[];
  cardPresets?: CardPreset[];
  serverPresets?: ServerPreset[];
  fiberPresets?: FiberConverterPreset[];
  refreshRate?: number;
}

export function buildExportLegend(params: BuildLegendParams): ExportLegend {
  const {
    panels,
    cables = [],
    servers,
    cardId = '',
    cards = [],
    eventName = 'Event',
    eventDate = new Date().toISOString().slice(0, 10),
    logoDataUrl = '',
    fiberCounts = {},
    presets,
    cardPresets,
    serverPresets,
    fiberPresets,
  } = params;

  const presetsList = presets && presets.length > 0 ? presets : PRESETS;
  const cardsList = cardPresets && cardPresets.length > 0 ? cardPresets : CARDS;
  const serversList = serverPresets && serverPresets.length > 0 ? serverPresets : SERVERS;
  const fibersList = fiberPresets && fiberPresets.length > 0 ? fiberPresets : FIBER_CONVERTERS;

  const cablesCount = cables.length;

  const usedPairs = new Set<string>();
  for (const c of cables) {
    const cardNo = Number.isFinite((c as CableEx).card) ? (c as CableEx).card as number : 1;
    usedPairs.add(`${cardNo}:${c.link}`);
  }
  const linksUsedCount = usedPairs.size;
  const linksList: number[] = Array.from(
    new Set(Array.from(usedPairs, s => parseInt(s.split(':')[1], 10)))
  ).sort((a, b) => a - b);

  const groupsMap = new Map<string, { label: string; sub?: string; count: number; weight?: number }>();
  for (const p of panels) {
    const pr = presetsList.find(pp => pp.id === p.presetId) ?? presetsList.find(pp => pp.name === p.presetName);
    const res = pr ? `${pr.resW}×${pr.resH}` : `${p.resW}×${p.resH}`;
    const name = pr?.name ?? String(p.presetName || p.presetId);
    const key = `${name}__${res ?? ''}`;
    const existed = groupsMap.get(key);
    if (existed) existed.count += 1;
    else groupsMap.set(key, { label: name, sub: res ? `res ${res}` : undefined, count: 1, weight: pr?.weight });
  }
  const panelGroups = Array.from(groupsMap.values()).sort((a, b) => a.label.localeCompare(b.label));

  const byId = new Map(presetsList.map(p => [p.id, p]));
  let power = 0;
  let totalWeight = 0;
  let n05 = 0, n10 = 0, otherArea = 0;
  for (const p of panels) {
    const pr = byId.get(p.presetId) ?? presetsList.find(pp => pp.name === p.presetName);
    if (pr) {
      power += pr.power;
      if (typeof pr.weight === 'number' && pr.weight > 0) {
        totalWeight += pr.weight;
      }
      if (pr.w === 500 && pr.h === 500) n05++;
      else if (pr.w === 500 && pr.h === 1000) n10++;
      else otherArea += (pr.w * pr.h) / 1_000_000;
    } else {
      otherArea += (p.w * 5 * p.h * 5) / 1_000_000;
    }
  }
  const totalAreaM2 = Math.round((n05 * 0.25 + n10 * 0.50 + otherArea) * 100) / 100;
  const totalWeightKg = Math.round(totalWeight * 100) / 100;

  const formatServerInfo = (modelId: string) => {
    const found = serversList.find(m => m.id === modelId);
    if (!found) return modelId;
    return found.specs ? `${found.name} (${found.specs})` : found.name;
  };

  const serverName = Array.isArray(servers)
    ? servers.map(s => formatServerInfo(s.modelId)).join(', ')
    : (servers ? formatServerInfo(servers) : '');

  const modelName = cardsList.find(c => c.id === cardId)?.name ?? cardId;

  const cardsLegend = cards
    .map(ci => ({
      order: ci.order,
      name: (cardsList.find(m => m.id === ci.modelId)?.name) ?? ci.modelId,
      color: ci.color,
    }))
    .sort((a, b) => a.order - b.order);

  const fibers = Object.entries(fiberCounts)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([id, count]) => ({
      id,
      name: fibersList.find(f => f.id === id)?.name ?? id,
      count: Number(count),
    }));

  return {
    eventName,
    eventDate,
    serverName,
    cardName: modelName,
    cablesCount,
    logoDataUrl,
    linksUsedCount,
    linksList,
    panelGroups,
    cards: cardsLegend,
    totalAreaM2,
    totalWeight: totalWeightKg,
    fibers,
    power,
    refreshRate: params.refreshRate,
  };
}

export interface BuildSpecTextParams extends BuildLegendParams {
  screenGroups?: ScreenGroup[];
  language?: 'ru' | 'en';
}

export function buildSpecText(params: BuildSpecTextParams): string {
  const isEn = params.language === 'en';
  const legend = buildExportLegend(params);
  const { panels, screenGroups = [], servers, serverPresets, presets } = params;
  const serversList = serverPresets && serverPresets.length > 0 ? serverPresets : SERVERS;
  const presetsList = presets && presets.length > 0 ? presets : PRESETS;
  const presetById = new Map(presetsList.map(p => [p.id, p]));
  const panelMap = new Map(panels.map(p => [p.id, p]));

  const lines: string[] = [
    isEn ? 'EQUIPMENT SPECIFICATION' : 'СПЕЦИФИКАЦИЯ ОБОРУДОВАНИЯ',
    '',
    `${isEn ? 'Event' : 'Мероприятие'}: ${legend.eventName || (isEn ? 'Event' : 'Концерт')}`,
    `${isEn ? 'Date' : 'Дата'}: ${legend.eventDate || new Date().toISOString().slice(0, 10)}`,
    ''
  ];

  lines.push('----------------------');
  lines.push(isEn ? 'SUMMARY:' : 'СВОДКА:');
  if (screenGroups.length > 0) {
    lines.push(`${isEn ? 'Number of screens' : 'Количество экранов'}: ${screenGroups.length}`);
  }
  lines.push(`${isEn ? 'Total panels' : 'Всего панелей'}: ${panels.length} ${isEn ? 'pcs.' : 'шт.'}`);
  if (typeof legend.totalAreaM2 === 'number') {
    lines.push(`${isEn ? 'Total area' : 'Общая площадь'}: ${legend.totalAreaM2} ${isEn ? 'm²' : 'м²'}`);
  }
  if (typeof legend.totalWeight === 'number' && legend.totalWeight > 0) {
    lines.push(`${isEn ? 'Total screens weight' : 'Общий вес экранов'}: ${legend.totalWeight} ${isEn ? 'kg' : 'кг'}`);
  }
  lines.push(`${isEn ? 'Cables' : 'Перемычки'}: ${legend.cablesCount} ${isEn ? 'pcs.' : 'шт.'}`);
  lines.push(`${isEn ? 'Ports used' : 'Занято портов'}: ${legend.linksUsedCount}`);
  if (typeof legend.refreshRate === 'number' && legend.refreshRate > 0) {
    const limit = getPortMaxPixels(legend.refreshRate);
    lines.push(`${isEn ? 'Refresh rate' : 'Частота обновления'}: ${legend.refreshRate} Hz (${isEn ? 'port limit' : 'лимит порта'}: ${limit.toLocaleString(isEn ? 'en-US' : 'ru-RU')} px)`);
  }
  lines.push('');

  if (screenGroups.length > 0) {
    lines.push('----------------------');
    lines.push(isEn ? 'SCREENS' : 'ЭКРАНЫ');
    screenGroups.forEach((g, idx) => {
      let screenWeight = 0;
      let screenPower = 0;
      let hasWeight = false;
      let hasPower = false;
      for (const pid of g.panelIds) {
        const pan = panelMap.get(pid);
        const pr = pan ? (presetById.get(pan.presetId) ?? presetsList.find(x => x.name === pan.presetName)) : undefined;
        if (pr) {
          if (typeof pr.weight === 'number' && pr.weight > 0) {
            screenWeight += pr.weight;
            hasWeight = true;
          }
          if (typeof pr.power === 'number' && pr.power > 0) {
            screenPower += pr.power;
            hasPower = true;
          }
        }
      }
      const roundedWeight = Math.round(screenWeight * 100) / 100;
      const weightStr = (hasWeight && roundedWeight > 0) ? `, ${isEn ? 'weight' : 'вес'}: ${roundedWeight} ${isEn ? 'kg' : 'кг'}` : '';
      const powerStr = (hasPower && screenPower > 0) ? `, ${isEn ? 'power' : 'потребление'}: ${(screenPower / 1000).toFixed(2)} ${isEn ? 'kW' : 'кВт'} (${screenPower} ${isEn ? 'W' : 'Вт'})` : '';
      lines.push(`• ${g.name || `Screen ${idx + 1}`}: ${g.panelIds.length} ${isEn ? 'panels' : 'панелей'}${weightStr}${powerStr}`);
    });
    lines.push('');
  }

  lines.push('----------------------');
  lines.push(isEn ? 'PANEL MODELS' : 'МОДЕЛИ ПАНЕЛЕЙ');
  if (legend.panelGroups.length > 0) {
    legend.panelGroups.forEach(pg => {
      const details: string[] = [];
      if (pg.sub) details.push(pg.sub);
      if (typeof pg.weight === 'number' && pg.weight > 0) details.push(`${pg.weight} ${isEn ? 'kg' : 'кг'}`);
      const subText = details.length > 0 ? ` (${details.join(', ')})` : '';
      lines.push(`• ${pg.label}${subText}: ${pg.count} ${isEn ? 'pcs.' : 'шт.'}`);
    });
  } else {
    lines.push('  —');
  }
  lines.push('');

  lines.push('----------------------');
  lines.push(isEn ? 'CARDS' : 'КАРТЫ');
  if (legend.cards && legend.cards.length > 0) {
    legend.cards.forEach(c => {
      lines.push(`• S${c.order} — ${c.name}`);
    });
  } else if (legend.cardName) {
    lines.push(`• ${legend.cardName}`);
  } else {
    lines.push('  —');
  }
  lines.push('');

  const activeFibers = (legend.fibers ?? []).filter(f => (f.count ?? 0) > 0);
  if (activeFibers.length > 0) {
    lines.push('CVT');
    lines.push('');
    activeFibers.forEach(f => {
      lines.push(`• ${f.name}: ${f.count} ${isEn ? 'pcs.' : 'шт.'}`);
    });
    lines.push('');
  }
  lines.push('----------------------');
  lines.push(isEn ? 'POWER CONSUMPTION' : 'ЭЛЕКТРОПИТАНИЕ (СИЛА)');
  lines.push(`${isEn ? 'Total power' : 'Общее потребление'}: ${(legend.power / 1000).toFixed(2)} ${isEn ? 'kW' : 'кВт'} (${legend.power} ${isEn ? 'W' : 'Вт'})`);
  lines.push(`${isEn ? 'Current (3 phases, 230V)' : 'Ток (3 фазы, 230В)'}: ${(legend.power / 230 / 3).toFixed(2)} A`);
  if (screenGroups.length > 1) {
    lines.push(isEn ? 'By screen:' : 'По экранам:');
    screenGroups.forEach((g, idx) => {
      let sp = 0;
      for (const pid of g.panelIds) {
        const pan = panelMap.get(pid);
        const pr = pan ? (presetById.get(pan.presetId) ?? presetsList.find(x => x.name === pan.presetName)) : undefined;
        if (pr?.power) sp += pr.power;
      }
      if (sp > 0) {
        lines.push(`• ${g.name || `Screen ${idx + 1}`}: ${(sp / 1000).toFixed(2)} ${isEn ? 'kW' : 'кВт'} (${sp} ${isEn ? 'W' : 'Вт'}, ${(sp / 230 / 3).toFixed(1)} ${isEn ? 'A/phase' : 'A/фаза'})`);
      }
    });
  }
  lines.push('');

  lines.push('----------------------');
  lines.push(isEn ? 'MEDIA SERVERS' : 'МЕДИАСЕРВЕРЫ');
  if (Array.isArray(servers) && servers.length > 0) {
    if (servers.length === 1) {
      const found = serversList.find(m => m.id === servers[0].modelId);
      const name = found ? (found.specs ? `${found.name} (${found.specs})` : found.name) : servers[0].modelId;
      lines.push(`${isEn ? 'Server' : 'Сервер'}: ${name}`);
    } else {
      servers.forEach((s, idx) => {
        const found = serversList.find(m => m.id === s.modelId);
        const name = found ? (found.specs ? `${found.name} (${found.specs})` : found.name) : s.modelId;
        lines.push(`• ${isEn ? 'Server' : 'Сервер'} ${idx + 1}: ${name}`);
      });
    }
  } else if (legend.serverName) {
    lines.push(`${isEn ? 'Server' : 'Сервер'}: ${legend.serverName}`);
  } else {
    lines.push('  —');
  }
  lines.push('');

  return lines.join('\n');
}


export function exportSvgToPng(
  svg: SVGSVGElement,
  crop: { x: number; y: number; width: number; height: number },
  filename: string
) {
  const PPU = 2;
  const SUPERSAMPLE = 2;
  const MAX_DIM = 16384;
  const MAX_PIXELS = 120e6;
  const BG = '#0a0f1a';
  const MARGIN_PX = 16;

  const ns = 'http://www.w3.org/2000/svg';
  const q = <T extends Element = Element>(r: ParentNode, sel: string) => r.querySelector(sel) as T | null;

  const toBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
    new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob(): null blob'))), 'image/png')
    );

  const findStage = (root: SVGSVGElement) =>
    (q(root, 'g[data-root]') ||
      q(root, 'g#stage') ||
      q(root, 'g.stage') ||
      q(root, 'g[transform*="scale("]') ||
      q(root, 'g[transform]')) as SVGGraphicsElement | null;

  const viewportToContentRect = (stageEl: SVGGraphicsElement | null, r: { x: number; y: number; width: number; height: number }) => {
    if (!stageEl || !('getCTM' in stageEl)) {
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }
    const m = stageEl.getCTM() as DOMMatrix;
    const inv = m.inverse();
    const p0 = new DOMPoint(r.x, r.y).matrixTransform(inv);
    const p1 = new DOMPoint(r.x + r.width, r.y + r.height).matrixTransform(inv);
    const x = Math.min(p0.x, p1.x);
    const y = Math.min(p0.y, p1.y);
    const w = Math.max(1, Math.abs(p1.x - p0.x));
    const h = Math.max(1, Math.abs(p1.y - p0.y));
    return { x, y, width: w, height: h };
  };

  const stageLive = findStage(svg);
  const cropContent = viewportToContentRect(stageLive, crop);

  const cloned = svg.cloneNode(true) as SVGSVGElement;
  const stageClone = findStage(cloned);
  if (stageClone && stageClone.hasAttribute('transform')) {
    stageClone.removeAttribute('transform');
  }

  cloned.setAttribute('xmlns', ns);
  cloned.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  cloned.setAttribute('shape-rendering', 'geometricPrecision');
  cloned.setAttribute('text-rendering', 'geometricPrecision');
  cloned.setAttribute('image-rendering', 'optimizeQuality');

  const marginUnits = MARGIN_PX / PPU;
  const viewX = cropContent.x - marginUnits;
  const viewY = cropContent.y - marginUnits;
  const viewW = cropContent.width + marginUnits * 2;
  const viewH = cropContent.height + marginUnits * 2;

  cloned.setAttribute('viewBox', `${viewX} ${viewY} ${viewW} ${viewH}`);
  cloned.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  const outW = Math.max(1, Math.round(viewW * PPU));
  const outH = Math.max(1, Math.round(viewH * PPU));

  let ss = SUPERSAMPLE;
  if (outW * ss > MAX_DIM) ss = Math.floor(MAX_DIM / outW) || 1;
  if (outH * ss > MAX_DIM) ss = Math.min(ss, Math.floor(MAX_DIM / outH) || 1);
  if (outW * outH * ss * ss > MAX_PIXELS) {
    const scaleArea = Math.sqrt(MAX_PIXELS / (outW * outH));
    ss = Math.max(1, Math.floor(scaleArea));
  }

  const xml = new XMLSerializer().serializeToString(cloned);
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);

  const img = new Image();
  img.decoding = 'async';
  img.onload = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = outW * ss;
    canvas.height = outH * ss;

    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(ss, 0, 0, ss, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, outW, outH);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, outW, outH);

    try {
      const blob = await toBlob(canvas);
      const saved = await savePngBlob(filename, blob);
      if (saved) {
        showToast('PNG сохранен');
      }
    } catch (e) {
      console.error('Export failed, fallback to DataURL:', e);
      try {
        const fallbackUrl = canvas.toDataURL('image/png');
        if (fallbackUrl.startsWith('data:image/png')) {
          const saved = await savePngFile(filename, fallbackUrl);
          if (saved) {
            showToast('PNG сохранен');
          }
        }
      } catch {}
    }
  };
  img.onerror = () => console.error('Failed to load SVG data for export');
  img.src = dataUrl;
}
