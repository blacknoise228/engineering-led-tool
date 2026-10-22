// src/lib/led-editor-svg/autoconnect.ts
import { CableEx, CardInstance, Panel } from './types';
import { uid } from './utils';
import { CARDS, LINK_COLORS_16, type CardPreset } from './presets';

// «Сырой» кабель: только концы (и опционально штриховка). Оформление делаем в EditorApp.
export type RawCable = { id: string; a: string; b: string; dash?: number[] };

/** Вертикальное перекрытие двух прямоугольников (по Y) */
function vOverlap(a: Panel, b: Panel): number {
  const top = Math.max(a.y, b.y);
  const bot = Math.min(a.y + a.h, b.y + b.h);
  return bot - top; // может быть < 0 (нет перекрытия)
}
/** Горизонтальное перекрытие двух прямоугольников (по X) */
function hOverlap(a: Panel, b: Panel): number {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.w, b.x + b.w);
  return right - left;
}

type Row = { items: Panel[]; top: number; bottom: number; meanY: number };
type Col = { items: Panel[]; left: number; right: number; meanX: number };

const OVERLAP_RATIO = 0.4; // 40% от меньшей высоты/ширины — достаточно надёжно

/** Группировка в строки по вертикальному перекрытию (устойчиво к разным высотам) */
function groupRows(src: Panel[]): Row[] {
  const panels = [...src].sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2));
  const rows: Row[] = [];

  for (const p of panels) {
    let best: { row: Row; score: number } | null = null;
    for (const row of rows) {
      // считаем перекрытие по вертикали относительно диапазона строки
      const rowProxy: Panel = {
        ...p,
        x: 0, w: 0, r: 0, id: p.id,
        row: p.row, col: p.col, label: p.label,
        y: row.top, h: row.bottom - row.top,
      };
      const ov = vOverlap(p, rowProxy);
      const th = Math.min(p.h, rowProxy.h) * OVERLAP_RATIO;
      if (ov >= th) {
        const score = ov;
        if (!best || score > best.score) best = { row, score };
      }
    }
    if (best) {
      best.row.items.push(p);
      best.row.top = Math.min(best.row.top, p.y);
      best.row.bottom = Math.max(best.row.bottom, p.y + p.h);
      best.row.meanY = (best.row.top + best.row.bottom) / 2;
    } else {
      rows.push({ items: [p], top: p.y, bottom: p.y + p.h, meanY: p.y + p.h / 2 });
    }
  }

  rows.sort((a, b) => a.meanY - b.meanY);
  rows.forEach(r => r.items.sort((a, b) => (a.x + a.w / 2) - (b.x + b.w / 2)));
  return rows;
}

/** Группировка в столбцы по горизонтальному перекрытию */
function groupCols(src: Panel[]): Col[] {
  const panels = [...src].sort((a, b) => (a.x + a.w / 2) - (b.x + b.w / 2));
  const cols: Col[] = [];

  for (const p of panels) {
    let best: { col: Col; score: number } | null = null;
    for (const col of cols) {
      const colProxy: Panel = {
        ...p,
        y: 0, h: 0, r: 0, id: p.id,
        row: p.row, col: p.col, label: p.label,
        x: col.left, w: col.right - col.left,
      };
      const ov = hOverlap(p, colProxy);
      const th = Math.min(p.w, colProxy.w) * OVERLAP_RATIO;
      if (ov >= th) {
        const score = ov;
        if (!best || score > best.score) best = { col, score };
      }
    }
    if (best) {
      best.col.items.push(p);
      best.col.left = Math.min(best.col.left, p.x);
      best.col.right = Math.max(best.col.right, p.x + p.w);
      best.col.meanX = (best.col.left + best.col.right) / 2;
    } else {
      cols.push({ items: [p], left: p.x, right: p.x + p.w, meanX: p.x + p.w / 2 });
    }
  }

  cols.sort((a, b) => a.meanX - b.meanX);
  cols.forEach(c => c.items.sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2)));
  return cols;
}

type Corner = 'TL' | 'TR' | 'BL' | 'BR';

function buildChain(order: Panel[]): RawCable[] {
  const out: RawCable[] = [];
  for (let i = 0; i < order.length - 1; i++) {
    const a = order[i].id, b = order[i + 1].id;
    if (a !== b) out.push({ id: uid('c'), a, b });
  }
  return out;
}

/** Змейка по строкам (H): построчно, строка за строкой */
function snakeH(panels: Panel[], corner: Corner): RawCable[] {
  if (panels.length <= 1) return [];
  const rows = groupRows(panels);

  const rowOrder = (corner === 'TL' || corner === 'TR') ? rows : [...rows].reverse();
  let leftToRight = (corner === 'TL' || corner === 'BL');

  const sequence: Panel[] = [];
  for (const r of rowOrder) {
    const items = leftToRight ? r.items : [...r.items].reverse();
    sequence.push(...items);
    leftToRight = !leftToRight;
  }

  return buildChain(sequence);
}

/** Змейка по столбцам (V): столбец за столбцом */
function snakeV(panels: Panel[], corner: Corner): RawCable[] {
  if (panels.length <= 1) return [];
  const cols = groupCols(panels);

  const colOrder = (corner === 'TL' || corner === 'BL') ? cols : [...cols].reverse();
  let topToBottom = (corner === 'TL' || corner === 'TR');

  const sequence: Panel[] = [];
  for (const c of colOrder) {
    const items = topToBottom ? c.items : [...c.items].reverse();
    sequence.push(...items);
    topToBottom = !topToBottom;
  }

  return buildChain(sequence);
}

/** Если передан subset — используем только выбранные панели */
function subsetPanels(all: Panel[], subset: Set<string> | null): Panel[] {
  return subset ? all.filter(p => subset.has(p.id)) : all;
}

// ===== Публичные функции под 8 кнопок (возвращают RawCable[]) =====
export function autoSnakeH_TL(panels: Panel[], subset: Set<string> | null) { return snakeH(subsetPanels(panels, subset), 'TL'); }
export function autoSnakeH_TR(panels: Panel[], subset: Set<string> | null) { return snakeH(subsetPanels(panels, subset), 'TR'); }
export function autoSnakeH_BL(panels: Panel[], subset: Set<string> | null) { return snakeH(subsetPanels(panels, subset), 'BL'); }
export function autoSnakeH_BR(panels: Panel[], subset: Set<string> | null) { return snakeH(subsetPanels(panels, subset), 'BR'); }

export function autoSnakeV_TL(panels: Panel[], subset: Set<string> | null) { return snakeV(subsetPanels(panels, subset), 'TL'); }
export function autoSnakeV_TR(panels: Panel[], subset: Set<string> | null) { return snakeV(subsetPanels(panels, subset), 'TR'); }
export function autoSnakeV_BL(panels: Panel[], subset: Set<string> | null) { return snakeV(subsetPanels(panels, subset), 'BL'); }
export function autoSnakeV_BR(panels: Panel[], subset: Set<string> | null) { return snakeV(subsetPanels(panels, subset), 'BR'); }

export function buildAddEdges(
  base: { a: string; b: string; dash?: number[]; id?: string }[],
  selection: Set<string> | null,
  selectedCard: CardInstance | null,
  cables: CableEx[],
  activeLinkRef: React.RefObject<number>,
  panelHasOtherAssignment: (panelId: string, cardNo: number, link: number) => boolean,
  willPortFit: (cardNo: number, link: number, extras?: string[]) => boolean,
  cardPresets: CardPreset[] = CARDS
) {
  if (!selectedCard) return { existing: cables, add: [] as CableEx[] };

  const model = cardPresets.find(m => m.id === selectedCard.modelId) ?? CARDS.find(m => m.id === selectedCard.modelId);
  const ports = model?.outputPorts ?? selectedCard.portColors.length;

  const existing = selection
    ? cables.filter(c => !(selection.has(c.a) || selection.has(c.b)))
    : cables.slice();

  const add: CableEx[] = [];
  const pairSet = new Set<string>(
    existing.map(c => (c.a < c.b ? `${c.a}|${c.b}` : `${c.b}|${c.a}`))
  );
  const degMap = new Map<string, number>();
  for (const c of existing) {
    degMap.set(c.a, (degMap.get(c.a) || 0) + 1);
    degMap.set(c.b, (degMap.get(c.b) || 0) + 1);
  }

  const link = activeLinkRef.current;
  if (link >= ports) return { existing, add };

  const plannedNodes = new Set<string>();

  for (const e of base) {
    const k = e.a < e.b ? `${e.a}|${e.b}` : `${e.b}|${e.a}`;
    if (pairSet.has(k)) continue;
    if ((degMap.get(e.a) || 0) >= 2 || (degMap.get(e.b) || 0) >= 2) continue;

    if (panelHasOtherAssignment(e.a, selectedCard.order, link)) continue;
    if (panelHasOtherAssignment(e.b, selectedCard.order, link)) continue;

    const extrasForCheck = [...plannedNodes, e.a, e.b];
    if (!willPortFit(selectedCard.order, link, extrasForCheck)) continue;

    degMap.set(e.a, (degMap.get(e.a) || 0) + 1);
    degMap.set(e.b, (degMap.get(e.b) || 0) + 1);
    pairSet.add(k);

    add.push({
      id: e.id ?? uid('c'),
      a: e.a,
      b: e.b,
      link,
      color: selectedCard.portColors[link] ?? LINK_COLORS_16[link] ?? '#9ca3af',
      dash: e.dash,
      card: selectedCard.order,
    });

    plannedNodes.add(e.a);
    plannedNodes.add(e.b);
  }

  return { existing, add };
}