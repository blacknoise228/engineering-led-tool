'use client';
import React from 'react';
import type { Panel, Tool } from '@/lib/led-editor-svg/types';

type GetColor = (panelId: string) => string | null;

function lightenHex(hex: string, amt = 0.18): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  let s = m[1];
  if (s.length === 3) s = s.split('').map(ch => ch + ch).join('');
  const n = parseInt(s, 16);
  let r = (n >> 16) & 0xff;
  let g = (n >> 8) & 0xff;
  let b = n & 0xff;
  r = Math.min(255, Math.round(r + (255 - r) * amt));
  g = Math.min(255, Math.round(g + (255 - g) * amt));
  b = Math.min(255, Math.round(b + (255 - b) * amt));
  const to2 = (v: number) => v.toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function PanelShape({
  p,
  isSelected,
  onMouseDown,
  tint,
}: {
  p: Panel;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  /** HEX цвет карты (будет слегка осветлён для читаемости) */
  tint: string | null;
}) {
  // Реалистичный индустриальный радиус светодиодного кабинета
  const r = 10;

  return (
    <g onMouseDown={(e) => onMouseDown(e, p.id)} cursor="pointer">
      {/* Корпус кабинета */}
      <rect
        x={p.x}
        y={p.y}
        width={p.w}
        height={p.h}
        rx={r}
        ry={r}
        fill="url(#panelGrad)"
        filter="url(#softShadow)"
      />

      {/* Полупрозрачная подсветка цветом назначенной Sending Card */}
      {tint && (
        <rect
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          rx={r}
          ry={r}
          fill={lightenHex(tint, 0.18)}
          fillOpacity={0.28}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Контур кабинета */}
      <rect
        x={p.x + 0.5}
        y={p.y + 0.5}
        width={p.w - 1}
        height={p.h - 1}
        rx={r - 0.5}
        ry={r - 0.5}
        fill="none"
        stroke={isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}
        strokeWidth={isSelected ? 2 : 1}
        strokeOpacity={isSelected ? 1 : 0.8}
      />

      {/* Модель панели вверху кабинета */}
      <text
        x={p.x + p.w / 2}
        y={p.y + 11}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={6}
        letterSpacing="0.04em"
        fill="#94a3b8"
        style={{ WebkitTextStroke: '0.5px #07080b', paintOrder: 'stroke', userSelect: 'none', fontFamily: 'monospace' }}
      >
        {p.presetName}
      </text>

      {/* Номер и порт расключения (S1-1-1) */}
      {p.label && (
        <text
          x={p.x + p.w / 2}
          y={p.y + p.h / 2.7}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={13}
          fontWeight={600}
          fill="#f8fafc"
          style={{
            WebkitTextStroke: '1px #050608',
            paintOrder: 'stroke',
            userSelect: 'none',
            fontFamily: 'monospace',
            letterSpacing: '-0.02em',
          }}
        >
          {p.label}
        </text>
      )}
    </g>
  );
}

export default function PanelsLayer(props: {
  panels: Panel[];
  selected: Set<string>;
  tool: Tool;
  onPanelMouseDown: (e: React.MouseEvent, id: string) => void;
  /** Вернёт HEX цвета карты для панели */
  getPanelCardColor?: GetColor;
}) {
  const { panels, selected, tool, onPanelMouseDown, getPanelCardColor } = props;

  const anchorR = 8;
  const hotspotR = 20;

  return (
    <g>
      {panels.map((p) => (
        <PanelShape
          key={p.id}
          p={p}
          isSelected={selected.has(p.id)}
          onMouseDown={onPanelMouseDown}
          tint={getPanelCardColor ? getPanelCardColor(p.id) : null}
        />
      ))}

      {tool === 'cable' && (
        <g>
          {panels.map((p) => {
            const cx = p.x + p.w / 2;
            const cy = p.y + p.h / 2;
            return (
              <g key={`anchor-${p.id}`} onMouseDown={(e) => onPanelMouseDown(e, p.id)}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={hotspotR}
                  fill="rgba(56, 189, 248, 0.12)"
                  stroke="#38bdf8"
                  strokeOpacity={0.4}
                  strokeDasharray="3 3"
                  style={{ pointerEvents: 'all', cursor: 'crosshair' }}
                />
                <circle cx={cx} cy={cy} r={anchorR} fill="#38bdf8" />
              </g>
            );
          })}
        </g>
      )}
    </g>
  );
}

