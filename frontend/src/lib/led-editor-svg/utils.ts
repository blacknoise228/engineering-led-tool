// src/lib/led-editor-svg/utils.ts
import type { Panel, Vec, CableEx, CardInstance, ScreenGroup } from './types';
import { PanelPreset, PRESETS, SERVERS, CARDS, FIBER_CONVERTERS } from './presets';
import { savePngBlob, savePngFile, showToast } from '../desktop';

export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}`;
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export function center(p: Panel): Vec { return { x: p.x + p.w / 2, y: p.y + p.h / 2 }; }

export async function ensureDataUrl(src: string): Promise<string> {
  if (!src) return '';
  if (/^data:/i.test(src)) return src; // уже data URL
  const abs = src.startsWith('http') ? src : new URL(src, window.location.origin).toString();
  const res = await fetch(abs, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Logo fetch failed: ${res.status}`);
  const blob = await res.blob();
  const fr = new FileReader();
  return await new Promise<string>((resolve) => {
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(blob);
  });
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

/** Центр → центр: одинаковая пластика на любой дистанции */
export function pathCenterToCenter(a: Panel, b: Panel) {
  const s = center(a), e = center(b);
  const dx = e.x - s.x, dy = e.y - s.y;
  const dist = Math.hypot(dx, dy) || 1;
  const k = clamp(dist * 0.35, 40, 160);
  const ux = dx / dist, uy = dy / dist;
  const c1 = { x: s.x + ux * k, y: s.y + uy * k };
  const c2 = { x: e.x - ux * k, y: e.y - uy * k };
  return `M${s.x},${s.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${e.x},${e.y}`;
}
export function pathCenterToPoint(a: Panel, to: Vec) {
  const s = center(a), e = to;
  const dx = e.x - s.x, dy = e.y - s.y;
  const dist = Math.hypot(dx, dy) || 1;
  const k = clamp(dist * 0.35, 40, 160);
  const ux = dx / dist, uy = dy / dist;
  const c1 = { x: s.x + ux * k, y: s.y + uy * k };
  const c2 = { x: e.x - ux * k, y: e.y - uy * k };
  return `M${s.x},${s.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${e.x},${e.y}`;
}

// ---------------- export legend ----------------

// заменить у себя типы в src/lib/led-editor-svg/utils.ts
export type LegendCardRow = {
  order: number;
  name: string;
  color: string;
};

export type ExportLegend = {
  eventName: string;
  eventDate: string;
  serverName: string;
  cardName: string; // можно не использовать
  logoDataUrl: string;
  cablesCount: number;
  linksUsedCount: number; // показываем только число
  linksList: number[];    // можно оставить — не рисуем
  panelGroups: { label: string; sub?: string; count: number }[];
  cards?: LegendCardRow[];
  totalAreaM2?: number;   // НОВОЕ: суммарная площадь панелей в м²
  fibers?: { id: string; name: string; count: number }[];
  power: number;
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
  } = params;

  const presetsList = presets && presets.length > 0 ? presets : PRESETS;

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

  const groupsMap = new Map<string, { label: string; sub?: string; count: number }>();
  for (const p of panels) {
    const pr = presetsList.find(pp => pp.id === p.presetId);
    const res = pr ? `${pr.resW}×${pr.resH}` : `${p.resW}×${p.resH}`;
    const name = pr?.name ?? String(p.presetName || p.presetId);
    const key = `${name}__${res ?? ''}`;
    const existed = groupsMap.get(key);
    if (existed) existed.count += 1;
    else groupsMap.set(key, { label: name, sub: res ? `res ${res}` : undefined, count: 1 });
  }
  const panelGroups = Array.from(groupsMap.values()).sort((a, b) => a.label.localeCompare(b.label));

  const byId = new Map(presetsList.map(p => [p.id, p]));
  let power = 0;
  let n05 = 0, n10 = 0, otherArea = 0;
  for (const p of panels) {
    const pr = byId.get(p.presetId);
    if (pr) {
      power += pr.power;
      if (pr.w === 500 && pr.h === 500) n05++;
      else if (pr.w === 500 && pr.h === 1000) n10++;
      else otherArea += (pr.w * pr.h) / 1_000_000;
    } else {
      otherArea += (p.w * 5 * p.h * 5) / 1_000_000;
    }
  }
  const totalAreaM2 = Math.round((n05 * 0.25 + n10 * 0.50 + otherArea) * 100) / 100;

  const serverName = Array.isArray(servers)
    ? servers.map(s => SERVERS.find(m => m.id === s.modelId)?.name ?? s.modelId).join(', ')
    : (servers ? (SERVERS.find(s => s.id === servers)?.name ?? servers) : '');

  const modelName = CARDS.find(c => c.id === cardId)?.name ?? cardId;

  const cardsLegend = cards
    .map(ci => ({
      order: ci.order,
      name: (CARDS.find(m => m.id === ci.modelId)?.name) ?? ci.modelId,
      color: ci.color,
    }))
    .sort((a, b) => a.order - b.order);

  const fibers = Object.entries(fiberCounts)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([id, count]) => ({
      id,
      name: FIBER_CONVERTERS.find(f => f.id === id)?.name ?? id,
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
    fibers,
    power,
  };
}

export interface BuildSpecTextParams extends BuildLegendParams {
  screenGroups?: ScreenGroup[];
}

export function buildSpecText(params: BuildSpecTextParams): string {
  const legend = buildExportLegend(params);
  const { panels, screenGroups = [] } = params;

  const lines: string[] = [
    'СПЕЦИФИКАЦИЯ ОБОРУДОВАНИЯ',
    '',
    `Мероприятие: ${legend.eventName || 'Event'}`,
    `Дата: ${legend.eventDate || new Date().toISOString().slice(0, 10)}`,
    ''
  ];

  lines.push('----------------------');
  lines.push('СВОДКА:');
  if (screenGroups.length > 0) {
    lines.push(`Количество экранов: ${screenGroups.length}`);
  }
  lines.push(`Всего панелей: ${panels.length} шт.`);
  if (typeof legend.totalAreaM2 === 'number') {
    lines.push(`Общая площадь: ${legend.totalAreaM2} м²`);
  }
  lines.push(`Перемычки: ${legend.cablesCount} шт.`);
  lines.push(`Занято портов: ${legend.linksUsedCount}`);
  lines.push('');

  if (screenGroups.length > 0) {
    lines.push('----------------------');
    lines.push('ЭКРАНЫ');
    screenGroups.forEach((g, idx) => {
      lines.push(`• ${g.name || `Screen ${idx + 1}`}: ${g.panelIds.length} панелей`);
    });
    lines.push('');
  }

  lines.push('----------------------');
  lines.push('МОДЕЛИ ПАНЕЛЕЙ');
  if (legend.panelGroups.length > 0) {
    legend.panelGroups.forEach(pg => {
      lines.push(`• ${pg.label}${pg.sub ? ` (${pg.sub})` : ''}: ${pg.count} шт.`);
    });
  } else {
    lines.push('  —');
  }
  lines.push('');

  lines.push('----------------------');
  lines.push('КАРТЫ');
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
      lines.push(`• ${f.name}: ${f.count} шт.`);
    });
    lines.push('');
  }
  lines.push('----------------------');
  lines.push('ЭЛЕКТРОПИТАНИЕ (СИЛА)');
  lines.push(`Потребление: ${(legend.power / 1000).toFixed(2)} кВт (${legend.power} Вт)`);
  lines.push(`Ток (3 фазы, 230В): ${(legend.power / 230 / 3).toFixed(2)} A`);
  lines.push('');

  lines.push('----------------------');
  lines.push('МЕДИАСЕРВЕРЫ');
  lines.push(`Сервер: ${legend.serverName || '—'}`);
  lines.push('');

  return lines.join('\n');
}


export function exportSvgToPng(
  svg: SVGSVGElement,
  crop: { x: number; y: number; width: number; height: number },
  filename: string,
  legend: ExportLegend | null
) {
  // ----------------------- CONFIG (tweak if needed) -----------------------
  // Pixels-per-unit for CONTENT coordinates (before DPI supersampling).
  // Increase for larger exports regardless of on-screen zoom.
  const PPU = 2;            // 1..4 is reasonable
  const SUPERSAMPLE = 2;    // DPI multiplier (2..4). Will be auto-clamped if too big.
  const MAX_DIM = 16384;    // hard cap for canvas width/height (avoid blank/0-byte)
  const MAX_PIXELS = 120e6; // ~120 MP cap (avoid OOM on big scenes)
  const BG = '#0a0f1a';

  // ----------------------- UTILITIES --------------------------------------
  const ns = 'http://www.w3.org/2000/svg';
  const q = <T extends Element = Element>(r: ParentNode, sel: string) => r.querySelector(sel) as T | null;

  const toBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
    new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob(): null blob'))), 'image/png')
    );

  // Find the stage group that carries pan/scale. In your SvgStage it's [data-root].
  const findStage = (root: SVGSVGElement) =>
    (q(root, 'g[data-root]') ||
      q(root, 'g#stage') ||
      q(root, 'g.stage') ||
      q(root, 'g[transform*="scale("]') ||
      q(root, 'g[transform]')) as SVGGraphicsElement | null;

  // Map viewport (screen) px => content units using the CURRENT DOM transform matrix.
  // We take CTM from the ORIGINAL <svg> (must be in DOM), then invert it.
  const viewportToContentRect = (stageEl: SVGGraphicsElement | null, r: { x: number; y: number; width: number; height: number }) => {
    if (!stageEl || !('getCTM' in stageEl)) {
      // Fallback: assume no transform (scale=1, pan=0)
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }
    // In modern browsers getCTM() -> DOMMatrix
    const m = (stageEl as SVGGraphicsElement).getCTM() as DOMMatrix;
    const inv = m.inverse();
    const p0 = new DOMPoint(r.x, r.y).matrixTransform(inv);
    const p1 = new DOMPoint(r.x + r.width, r.y + r.height).matrixTransform(inv);
    const x = Math.min(p0.x, p1.x);
    const y = Math.min(p0.y, p1.y);
    const w = Math.max(1, Math.abs(p1.x - p0.x));
    const h = Math.max(1, Math.abs(p1.y - p0.y));
    return { x, y, width: w, height: h };
  };

  // ----------------------- 1) READ CURRENT PAN/SCALE & CROP ----------------
  const stageLive = findStage(svg);
  const cropContent = viewportToContentRect(stageLive, crop);

  // ----------------------- 2) CLONE SVG & REMOVE PAN/SCALE -----------------
  // Clone BEFORE any changes; CTM is taken from original DOM.
  const cloned = svg.cloneNode(true) as SVGSVGElement;

  // Remove transform from the stage node in the CLONE so content is in base units.
  const stageClone = findStage(cloned);
  if (stageClone && stageClone.hasAttribute('transform')) {
    stageClone.removeAttribute('transform');
  }

  // Ensure namespace + crisp rendering hints
  cloned.setAttribute('xmlns', ns);
  cloned.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  cloned.setAttribute('shape-rendering', 'geometricPrecision');
  cloned.setAttribute('text-rendering', 'geometricPrecision');
  cloned.setAttribute('image-rendering', 'optimizeQuality');

  // ----------------------- 3) LEGEND LAYOUT (base coords) ------------------
  const BASE_W = 460, INNER = 16, LOGO = 56, ROW = 30, SEP_BIG = 16, SEP_MID = 12, FOOTER = 18, SWATCH = 14, RULE_OFF = 6;
  const FS_SM = 12, FS_NUM = 13, FS_H = 16, BASELINE = 14;
  const baseY = (yTop: number) => yTop + BASELINE;

  const measureLegendH = (lg: ExportLegend | null): number => {
    if (!lg) return 0;
    let y = INNER;
    y += Math.max(LOGO, 20) + SEP_BIG;      // header
    y += ROW /*Сводка*/ + ROW /*Перемычек*/ + ROW /*Порты*/;
    if (typeof lg.totalAreaM2 === 'number') y += ROW;

    const fx = (lg.fibers ?? []).filter(f => (f.count ?? 0) > 0);
    if (lg.cards?.length) y += ROW + lg.cards.length * ROW;
    if (fx.length) y += ROW + fx.length * ROW;

    y += SEP_MID;
    y += ROW /*Панели*/ + lg.panelGroups.length * ROW;

    y += SEP_MID;
    y += ROW + 2 * ROW;

    y += SEP_MID + FOOTER;
    y += INNER + 8;
    return Math.ceil(y);
  };

  const baseBoxH = legend ? measureLegendH(legend) : 0;

  // ----------------------- 4) EXPANDED VIEWBOX (content units) -------------
  // Margins/legend size are specified in OUTPUT PIXELS; convert to content units via PPU.
  const MARGIN_PX = 16;
  const TARGET_FRAC = 0.32;
  const LEGEND_BOOST = 2;   // +20% к целевой ширине
  const MAX_W_PX = 1000;       // можно оставить 560, но 640 даст чуть больше потолок
  const MIN_W_PX = 180;       // немного повысим минималку для читаемости

  const contentW_px = Math.max(1, Math.round(cropContent.width * PPU));

  const roomW_px = Math.max(80, contentW_px - 2 * MARGIN_PX);
  const desiredLegendW_px = Math.min(
    Math.floor(contentW_px * TARGET_FRAC * LEGEND_BOOST),
    MAX_W_PX
  );
  const fitW_px = legend ? Math.max(MIN_W_PX, Math.min(desiredLegendW_px, roomW_px)) : 0;
  const fitW_units = legend ? fitW_px / PPU : 0;
  const S_units = legend ? fitW_units / BASE_W : 1;
  const boxW_units = legend ? fitW_units : 0;
  const boxH_units = legend ? baseBoxH * S_units : 0;

  const margin_units = MARGIN_PX / PPU;

  const extraLeft_units = margin_units;
  const extraRight_units = margin_units;
  const extraTop_units = margin_units;
  const extraBottom_units = legend ? (boxH_units + margin_units) : margin_units;

  const viewX = cropContent.x - extraLeft_units;
  const viewY = cropContent.y - extraTop_units;
  const viewW = cropContent.width + extraLeft_units + extraRight_units;
  const viewH = cropContent.height + extraTop_units + extraBottom_units;

  cloned.setAttribute('viewBox', `${viewX} ${viewY} ${viewW} ${viewH}`);
  cloned.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  // Important: keep width/height OFF for the <img> renderer to treat it as scalable vector.

  // ----------------------- 5) DRAW LEGEND (in clone) -----------------------
  if (legend) {
    const x0 = viewX + viewW - margin_units - boxW_units;
    const y0 = viewY + viewH - margin_units - boxH_units;

    const root = document.createElementNS(ns, 'g');
    root.setAttribute('id', 'export-legend');
    root.setAttribute('pointer-events', 'none');
    root.setAttribute(
      'font-family',
      'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'
    );
    root.setAttribute('transform', `translate(${x0},${y0}) scale(${S_units})`);

    const g = document.createElementNS(ns, 'g');
    let y = INNER;

    const drawRule = (yy: number, tone = '#263243', opacity = 0.55) => {
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', String(INNER));
      line.setAttribute('x2', String(BASE_W - INNER));
      line.setAttribute('y1', String(yy));
      line.setAttribute('y2', String(yy));
      line.setAttribute('stroke', tone);
      line.setAttribute('opacity', String(opacity));
      line.setAttribute('stroke-width', '1');
      g.appendChild(line);
    };
    const numX = BASE_W - INNER;
    const sectionHeader = (title: string) => {
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', String(INNER));
      t.setAttribute('y', String(baseY(y)));
      t.setAttribute('fill', '#e5e7eb');
      t.setAttribute('font-size', String(FS_SM));
      t.setAttribute('font-weight', '700');
      t.textContent = title;
      g.appendChild(t);
      y += ROW;
      drawRule(y - RULE_OFF, '#334155', 0.6);
    };
    const rowLabelValue = (label: string, value: string, last = false) => {
      const yb = baseY(y);

      const tL = document.createElementNS(ns, 'text');
      tL.setAttribute('x', String(INNER + 10));
      tL.setAttribute('y', String(yb));
      tL.setAttribute('fill', '#cbd5e1');
      tL.setAttribute('font-size', String(FS_SM));
      tL.textContent = label;
      g.appendChild(tL);

      const tR = document.createElementNS(ns, 'text');
      tR.setAttribute('x', String(numX));
      tR.setAttribute('y', String(yb));
      tR.setAttribute('fill', '#e5e7eb');
      tR.setAttribute('font-size', String(FS_NUM));
      tR.setAttribute('font-weight', '700');
      tR.setAttribute('text-anchor', 'end');
      tR.setAttribute(
        'font-family',
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
      );
      tR.textContent = value;
      g.appendChild(tR);

      y += ROW;
      if (!last) drawRule(y - RULE_OFF);
    };

    // Background card
    const bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('x', '0');
    bg.setAttribute('y', '0');
    bg.setAttribute('width', String(BASE_W));
    bg.setAttribute('height', String(baseBoxH));
    bg.setAttribute('rx', '12');
    bg.setAttribute('ry', '12');
    bg.setAttribute('fill', '#0b1220');
    bg.setAttribute('opacity', '0.98');
    bg.setAttribute('stroke', '#263243');
    bg.setAttribute('stroke-width', '1');
    root.appendChild(bg);

    const deco = document.createElementNS(ns, 'rect');
    deco.setAttribute('x', '0');
    deco.setAttribute('y', '0');
    deco.setAttribute('width', String(BASE_W));
    deco.setAttribute('height', '4');
    deco.setAttribute('fill', '#334155');
    deco.setAttribute('opacity', '0.9');
    root.appendChild(deco);

    // Header
    if (legend.logoDataUrl) {
      const img = document.createElementNS(ns, 'image');
      img.setAttribute('href', legend.logoDataUrl);
      img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', legend.logoDataUrl);
      img.setAttribute('x', String(INNER));
      img.setAttribute('y', String(y));
      img.setAttribute('width', String(LOGO));
      img.setAttribute('height', String(LOGO));
      img.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      g.appendChild(img);
    } else {
      const ph = document.createElementNS(ns, 'rect');
      ph.setAttribute('x', String(INNER));
      ph.setAttribute('y', String(y));
      ph.setAttribute('width', String(LOGO));
      ph.setAttribute('height', String(LOGO));
      ph.setAttribute('rx', '8');
      ph.setAttribute('ry', '8');
      ph.setAttribute('fill', '#111827');
      ph.setAttribute('stroke', '#374151');
      ph.setAttribute('stroke-width', '1');
      g.appendChild(ph);
    }

    const textX = INNER + LOGO + 10;
    {
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', String(textX));
      t.setAttribute('y', String(baseY(y)));
      t.setAttribute('fill', '#e5e7eb');
      t.setAttribute('font-size', String(FS_H));
      t.setAttribute('font-weight', '800');
      t.textContent = legend.eventName?.trim() || 'Event';
      g.appendChild(t);
    }
    if (legend.eventDate?.trim()) {
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', String(textX));
      t.setAttribute('y', String(baseY(y) + 14));
      t.setAttribute('fill', '#cbd5e1');
      t.setAttribute('font-size', String(FS_SM));
      t.textContent = legend.eventDate.trim();
      g.appendChild(t);
    }

    y += Math.max(LOGO, 20);
    drawRule(y + RULE_OFF, '#334155', 0.6);
    y += SEP_BIG;

    // Сводка
    sectionHeader('Сводка');
    const stats: Array<[string, string]> = [
      ['Перемычки', String(legend.cablesCount)],
      ['Порты', String(legend.linksUsedCount)],
    ];
    if (typeof legend.totalAreaM2 === 'number') stats.push(['Площадь', `${legend.totalAreaM2} м²`]);
    stats.forEach((row, i) => rowLabelValue(row[0], row[1], i === stats.length - 1));

    // Карты
    if (legend.cards?.length) {
      y += 6;
      sectionHeader('Карты');
      legend.cards.forEach((row, idx) => {
        const yb = baseY(y);
        const sq = document.createElementNS(ns, 'rect');
        sq.setAttribute('x', String(INNER));
        sq.setAttribute('y', String(yb - Math.round(SWATCH / 2)));
        sq.setAttribute('width', String(SWATCH));
        sq.setAttribute('height', String(SWATCH));
        sq.setAttribute('rx', '3');
        sq.setAttribute('ry', '3');
        sq.setAttribute('fill', row.color || '#475569');
        sq.setAttribute('stroke', '#1f2937');
        sq.setAttribute('stroke-width', '1');
        g.appendChild(sq);

        const t = document.createElementNS(ns, 'text');
        t.setAttribute('x', String(INNER + SWATCH + 8));
        t.setAttribute('y', String(yb));
        t.setAttribute('fill', '#cbd5e1');
        t.setAttribute('font-size', String(FS_SM));
        t.textContent = `S${row.order} — ${row.name}`;
        g.appendChild(t);

        y += ROW;
        if (idx < legend.cards!.length - 1) drawRule(y - RULE_OFF);
      });
    }

    // Оптика
    {
      const fx = (legend.fibers ?? []).filter((f) => (f.count ?? 0) > 0);
      if (fx.length) {
        y += 6;
        sectionHeader('CVT');
        fx.forEach((f, idx) => {
          const yb = baseY(y);
          const dot = document.createElementNS(ns, 'rect');
          dot.setAttribute('x', String(INNER));
          dot.setAttribute('y', String(yb - 10));
          dot.setAttribute('width', '6');
          dot.setAttribute('height', '6');
          dot.setAttribute('rx', '1');
          dot.setAttribute('ry', '1');
          dot.setAttribute('fill', '#64748b');
          g.appendChild(dot);

          const tL = document.createElementNS(ns, 'text');
          tL.setAttribute('x', String(INNER + 10));
          tL.setAttribute('y', String(yb));
          tL.setAttribute('fill', '#cbd5e1');
          tL.setAttribute('font-size', String(FS_SM));
          tL.textContent = f.name;
          g.appendChild(tL);

          const tR = document.createElementNS(ns, 'text');
          tR.setAttribute('x', String(BASE_W - INNER));
          tR.setAttribute('y', String(yb));
          tR.setAttribute('fill', '#cbd5e1');
          tR.setAttribute('font-size', String(FS_SM));
          tR.setAttribute('text-anchor', 'end');
          tR.setAttribute(
            'font-family',
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
          );
          tR.textContent = `${f.count} шт.`;
          g.appendChild(tR);

          y += ROW;
          if (idx < fx.length - 1) drawRule(y - RULE_OFF);
        });
      }
    }

    // Панели
    y += SEP_MID;
    drawRule(y, '#334155', 0.6);
    y += 2;
    sectionHeader('Панели');
    legend.panelGroups.forEach((pg, idx) => {
      const yb = baseY(y);
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('cx', String(INNER + 3));
      dot.setAttribute('cy', String(yb - 6));
      dot.setAttribute('r', '2');
      dot.setAttribute('fill', '#64748b');
      g.appendChild(dot);

      const tL = document.createElementNS(ns, 'text');
      tL.setAttribute('x', String(INNER + 10));
      tL.setAttribute('y', String(yb));
      tL.setAttribute('fill', '#cbd5e1');
      tL.setAttribute('font-size', String(FS_SM));
      tL.textContent = `${pg.label}${pg.sub ? ` (${pg.sub})` : ''}`;
      g.appendChild(tL);

      const tR = document.createElementNS(ns, 'text');
      tR.setAttribute('x', String(BASE_W - INNER));
      tR.setAttribute('y', String(yb));
      tR.setAttribute('fill', '#cbd5e1');
      tR.setAttribute('font-size', String(FS_SM));
      tR.setAttribute('text-anchor', 'end');
      tR.setAttribute(
        'font-family',
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
      );
      tR.textContent = `${pg.count} шт.`;
      g.appendChild(tR);

      y += ROW;
      if (idx < legend.panelGroups.length - 1) drawRule(y - RULE_OFF);
    });

    //Сила
  
    y += SEP_MID;
    drawRule(y, '#334155', 0.6);
    y += 2;
    sectionHeader('Сила');

    const pwrArr: Array<[string, string]> = [
      ["Потребление", String(`${legend.power / 1000} кВт.`)],
      ["Мощность", String(`${(legend.power / 230 / 3).toFixed(2)} A`)]]
    pwrArr.forEach((row, i) => rowLabelValue(row[0], row[1], i === pwrArr.length - 1));


    // Footer
    drawRule(y, '#334155', 0.6);
    y += SEP_MID;

    const server = document.createElementNS(ns, 'text');
    server.setAttribute('x', String(INNER));
    server.setAttribute('y', String(baseY(y)));
    server.setAttribute('fill', '#94a3b8');
    server.setAttribute('font-size', String(FS_SM));
    const sLabel = (legend.serverName && legend.serverName.includes(',')) ? 'Серверы' : 'Сервер';
    server.textContent = `${sLabel}: ${legend.serverName || '—'}`;
    g.appendChild(server);

    root.appendChild(g);
    cloned.appendChild(root);
  }

  // ----------------------- 6) RASTERIZE (independent of zoom) --------------
  // Final pixel size (before supersample)
  const outW = Math.max(1, Math.round(viewW * PPU));
  const outH = Math.max(1, Math.round(viewH * PPU));

  // Apply supersample, but clamp to safe limits
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
  // Avoid CORS taint if you ever add external images; data: URLs are fine.
  img.decoding = 'async';
  img.onload = async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = outW * ss;
      canvas.height = outH * ss;

      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(ss, 0, 0, ss, 0, 0);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, outW, outH);

      // Draw vector at exact pixel size — independent of on-screen zoom.
      ctx.imageSmoothingEnabled = true;
      (ctx as CanvasRenderingContext2D).imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, outW, outH);

      // Use toBlob + objectURL (robust; avoids 0-byte/data: quirks)
      const blob = await toBlob(canvas);
      const saved = await savePngBlob(filename, blob);
      if (saved) {
        showToast('PNG сохранен');
      }
    } catch (e) {
      console.error('Export failed, fallback to DataURL:', e);
      // Fallback (in case toBlob fails on very large canvases)
      try {
        const fallbackUrl = (document.createElement('canvas'), (e as CanvasRenderingContext2D)?.canvas?.toDataURL?.('image/png'));
        if (typeof fallbackUrl === 'string' && fallbackUrl.startsWith('data:image/png')) {
          const saved = await savePngFile(filename, fallbackUrl);
          if (saved) {
            showToast('PNG сохранен');
          }
        }
      } catch { }
    }
  };
  img.onerror = () => console.error('Failed to load SVG data for export');
  img.src = dataUrl;
}
