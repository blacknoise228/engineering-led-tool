'use client';
import React, { useRef } from 'react';
import { clamp } from '@/lib/led-editor-svg/utils';
import type { Tool, Vec } from '@/lib/led-editor-svg/types';

export default function SvgStage(props: {
  svgRef: React.MutableRefObject<SVGSVGElement | null>;
  pan: Vec; setPan: React.Dispatch<React.SetStateAction<Vec>>;
  scale: number; setScale: React.Dispatch<React.SetStateAction<number>>;
  onBgPointerDown: (e: React.MouseEvent<SVGRectElement>) => void;
  onPointerUp: () => void;
  base: React.ReactNode;     // панели
  top?: React.ReactNode;     // кабели/оверлеи (рисуем после панелей — поверх)
  tool: Tool
}) {
  const { svgRef, pan, setPan, scale, setScale, onBgPointerDown, onPointerUp, base, top, tool } = props;

  const panning = useRef(false);
  const panStart = useRef<Vec>({ x: 0, y: 0 });

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const prev = scale;
    const next = clamp(e.deltaY < 0 ? prev * 1.06 : prev / 1.06, 0.10, 4);
    setPan(p => ({ x: cx - (cx - p.x) * (next / prev), y: cy - (cy - p.y) * (next / prev) }));
    setScale(next);
  };

  const onMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 1 || e.shiftKey) {
      panning.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };
  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!panning.current) return;
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  };
  const onMouseUp = () => { panning.current = false; onPointerUp(); };

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      xmlns="http://www.w3.org/2000/svg"
      className="select-none"
    >
      <defs>
        {/* Мягкая тень под панелями */}
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000000" floodOpacity="0.3" />
        </filter>

        {/* Свечение при выделении панели */}
        <filter id="panelGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#38bdf8" floodOpacity="0.45" />
        </filter>

        {/* Глубокий матовый металлический градиент корпуса панели */}
        <linearGradient id="panelGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#151722" />
          <stop offset="100%" stopColor="#0d0e14" />
        </linearGradient>

        {/* МАРКЕР СТРЕЛКИ — цвет берётся из штриха линии (context-stroke) */}
        <marker id="arrowHead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" viewBox="0 0 10 6">
          <path d="M0,0 L10,3 L0,6 Z" fill="context-stroke" />
        </marker>

        <filter id="cableGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodOpacity="0.9" />
        </filter>

        {/* Высокопроизводительная техническая сетка вьюпорта */}
        <pattern id="smallGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.015)" strokeWidth="1" />
        </pattern>
        <pattern id="grid" width="200" height="200" patternUnits="userSpaceOnUse">
          <rect width="200" height="200" fill="url(#smallGrid)" />
          <path d="M 200 0 L 0 0 0 200" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Глубокий темный фон холста */}
      <rect x="0" y="0" width="100%" height="100%" fill="#07080b" />
      <rect x="0" y="0" width="100%" height="100%" fill="transparent" onMouseDown={onBgPointerDown} />

      <g data-root transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
        {/* Инженерная сетка координат */}
        <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#grid)" pointerEvents="none" />

        {/* Начальные оси X/Y (0, 0) */}
        <line x1="-5000" y1="0" x2="5000" y2="0" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="1" strokeDasharray="6 6" pointerEvents="none" />
        <line x1="0" y1="-5000" x2="0" y2="5000" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="1" strokeDasharray="6 6" pointerEvents="none" />

        {/* ПАНЕЛИ */}
        <g id="canvas-base">{base}</g>

        {/* КАБЕЛИ/ОВЕРЛЕИ — строго после панелей */}
        <g
          id="canvas-top"
          style={{ pointerEvents: tool === 'cable' ? 'none' as const : 'auto' }}
        >{top}</g>
      </g>
    </svg>
  );
}

