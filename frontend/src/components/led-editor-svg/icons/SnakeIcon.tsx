'use client';
import React from 'react';

type Props = {
  orient: 'H' | 'V';
  corner: 'TL' | 'TR' | 'BL' | 'BR';
};

/**
 * Пиктограмма «змейки» c стрелкой на хвосте.
 * 48×48, сетка 3×3.
 */
export default function SnakeIcon({ orient, corner }: Props) {
  const w = 48, h = 48, pad = 6;
  const cols = 3, rows = 3;
  const gx = (w - 2 * pad) / cols;
  const gy = (h - 2 * pad) / rows;

  // Стартовые индексы
  const r = corner.includes('T') ? 0 : rows - 1;
  const c = corner.includes('L') ? 0 : cols - 1;

  const points: Array<[number, number]> = [];
  const p = (rr: number, cc: number): [number, number] => [pad + cc * gx + gx / 2, pad + rr * gy + gy / 2];

  if (orient === 'H') {
    // горизонтальная змейка: ряд за рядом
    let leftToRight = corner === 'TL' || corner === 'BL';
    for (let rr = 0; rr < rows; rr++) {
      const row = r + (corner.includes('T') ? rr : -rr);
      const colsOrder = leftToRight ? [0, 1, 2] : [2, 1, 0];
      for (const cc of colsOrder) points.push(p(row, cc));
      leftToRight = !leftToRight;
    }
  } else {
    // вертикальная змейка: столбец за столбцом
    let topToBottom = corner === 'TL' || corner === 'TR';
    for (let cc = 0; cc < cols; cc++) {
      const col = c + (corner.includes('L') ? cc : -cc);
      const rowsOrder = topToBottom ? [0, 1, 2] : [2, 1, 0];
      for (const rr of rowsOrder) points.push(p(rr, col));
      topToBottom = !topToBottom;
    }
  }

  const d = points.map((pt, i) => (i === 0 ? `M ${pt[0]} ${pt[1]}` : `L ${pt[0]} ${pt[1]}`)).join(' ');

  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden>
      <defs>
        {/* Маркер стрелки: цвет берётся из stroke линии */}
        <marker id="arrowHeadMini" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" viewBox="0 0 10 6">
          <path d="M0,0 L10,3 L0,6 Z" fill="context-stroke" />
        </marker>
      </defs>

      <rect x="0" y="0" width="48" height="48" rx="8" ry="8" fill="none" />
    
      {/* путь со стрелкой на конце */}
      <path
        d={d}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd="url(#arrowHeadMini)"
      />

      {/* маркер старта */}
      <circle cx={points[0][0]} cy={points[0][1]} r="2.6" fill="#e5e7eb" />
    </svg>
  );
}
