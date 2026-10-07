'use client';
import React, { useMemo } from 'react';
import type { Cable, Panel } from '@/lib/led-editor-svg/types';

function center(p: Panel) { return { x: p.x + p.w / 2, y: p.y + p.h / 2 }; }

export default function CablesLayer(props: {
  cables: Cable[];
  panelsById: Record<string, Panel>;
  draft: { fromId: string; mouse: { x: number; y: number } } | null;
  selected: Set<string>;
  onCableMouseDown: (e: React.MouseEvent, id: string) => void;
}) {
  const { cables, panelsById, selected, onCableMouseDown } = props;

  /** Группируем по (card, link), находим стартовые узлы (in=0, out>0) и готовим бейджи */
  const portBadges = useMemo(() => {
    type Edge = { a: string; b: string; color: string };
    type Group = { card: number; link: number; edges: Edge[] };
    const groups = new Map<string, Group>();

    for (const c of cables) {
      const card = (c as Cable).card ?? 1;
      const link = (c as Cable).link ?? 0;
      const key = `${card}:${link}`;
      let g = groups.get(key);
      if (!g) {
        g = { card, link, edges: [] };
        groups.set(key, g);
      }
      g.edges.push({ a: c.a, b: c.b, color: c.color || '#e5e7eb' });
    }

    const badges: Array<{ x: number; y: number; color: string; text: string }> = [];

    for (const [, g] of groups) {
      if (g.edges.length === 0) continue;

      // Собираем граф для группы
      const nodes = new Set<string>();
      const indeg = new Map<string, number>();
      const outdeg = new Map<string, number>();
      for (const e of g.edges) {
        nodes.add(e.a); nodes.add(e.b);
        indeg.set(e.b, (indeg.get(e.b) || 0) + 1);
        outdeg.set(e.a, (outdeg.get(e.a) || 0) + 1);
        if (!indeg.has(e.a)) indeg.set(e.a, indeg.get(e.a) || 0);
        if (!outdeg.has(e.b)) outdeg.set(e.b, outdeg.get(e.b) || 0);
      }

      // Стартовые панели: входов 0, выходов > 0
      const starts = [...nodes].filter(n => (indeg.get(n) || 0) === 0 && (outdeg.get(n) || 0) > 0);

      // Цвет берём из первого ребра группы (цвет линка)
      const color = g.edges[0].color;
      const label = String(g.link + 1);

      for (const sid of starts) {
        const p = panelsById[sid];
        if (!p) continue;
        const { x, y } = center(p);
        badges.push({ x, y, color, text: label });
      }
    }
    return badges;
  }, [cables, panelsById]);

  return (
    <g>
      {/* реальные кабели */}
      {cables.map((c) => {
        const a = panelsById[c.a], b = panelsById[c.b];
        if (!a || !b) return null;
        const pa = center(a), pb = center(b);
        const stroke = c.color || '#e5e7eb';
        const isSel = selected.has(c.id);

        return (
          <g key={c.id} onMouseDown={(e) => onCableMouseDown(e, c.id)} cursor="pointer">
            {/* свечение под линией */}
            <line
              x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              stroke={stroke} style={{ color: stroke }}
              strokeWidth={isSel ? 5 : 4} opacity={0.9} filter="url(#cableGlow)"
            />
            {/* основная линия + стрелка */}
            <line
              x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              stroke={stroke} style={{ color: stroke }}
              strokeWidth={isSel ? 2.6 : 2} markerEnd="url(#arrowHead)"
              strokeDasharray={c.dash?.join(' ')}
            />
          </g>
        );
      })}

      {/* бейджи портов у стартовых панелей */}
      <g pointerEvents="none">
        {portBadges.map((b, i) => (
          <g key={i}>
            <circle cx={b.x} cy={b.y} r={23} fill="#0b1220" opacity="0.95" />
            <circle cx={b.x} cy={b.y} r={22} fill={b.color} opacity="0.75"/>
            <text
              x={b.x} y={b.y + 8}
              textAnchor="middle"
              fontFamily='ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
              fontSize={22} fontWeight={800} fill="#fff"
              style={{ paintOrder: 'stroke', WebkitTextStroke: '2px #000'}}
            >
              {b.text}
            </text>
          </g>
        ))}
      </g>

      {/* превью ручной протяжки */}
      {props.draft && (() => {
        const a = panelsById[props.draft.fromId];
        if (!a) return null;
        const pa = center(a), pb = props.draft.mouse;
        return (
          <>
            <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                  stroke="#e5e7eb" style={{ color: '#e5e7eb' }}
                  strokeWidth={4} opacity={0.6} filter="url(#cableGlow)"/>
            <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                  stroke="#e5e7eb" style={{ color: '#e5e7eb' }}
                  strokeWidth={2} markerEnd="url(#arrowHead)" opacity={0.85}/>
          </>
        );
      })()}
    </g>
  );
}
