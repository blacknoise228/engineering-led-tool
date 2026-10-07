'use client';
import React from 'react';

export default function SelectionMarquee({ rect }: { rect: {x:number;y:number;w:number;h:number} | null }){
  if (!rect) return null;
  return (
    <g id="marquee-layer" pointerEvents="none">
      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h}
            fill="#60a5fa22" stroke="#60a5fa" strokeDasharray="6 4" strokeWidth={1.5} rx={2}/>
    </g>
  );
}
