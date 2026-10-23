'use client';
import React, { useState, useEffect } from 'react';

export interface NumberStepInputProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  onChange: (val: number) => void;
}

export default function NumberStepInput({
  value,
  min,
  max,
  step = 1,
  prefix,
  suffix = 'px',
  onChange,
}: NumberStepInputProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const clampVal = (v: number) => {
    let res = v;
    if (min !== undefined) res = Math.max(min, res);
    if (max !== undefined) res = Math.min(max, res);
    return res;
  };

  const applyChange = (valStr: string) => {
    setText(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed)) {
      onChange(clampVal(parsed));
    }
  };

  const handleBlur = () => {
    const parsed = parseInt(text, 10);
    const finalVal = clampVal(isNaN(parsed) ? (min !== undefined && min > 0 ? min : 0) : parsed);
    setText(String(finalVal));
    if (finalVal !== value) {
      onChange(finalVal);
    }
  };

  const stepBy = (delta: number) => {
    const current = isNaN(parseInt(text, 10)) ? value : parseInt(text, 10);
    const nextVal = clampVal(current + delta);
    setText(String(nextVal));
    onChange(nextVal);
  };

  const startHold = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    e.preventDefault();
    stepBy(delta);

    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        stepBy(delta);
      }, 45);
      const clear = () => {
        clearInterval(interval);
        window.removeEventListener('mouseup', clear);
      };
      window.addEventListener('mouseup', clear);
    }, 280);

    const cancelTimer = () => {
      clearTimeout(timer);
      window.removeEventListener('mouseup', cancelTimer);
    };
    window.addEventListener('mouseup', cancelTimer);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      stepBy(e.shiftKey ? step * 10 : step);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      stepBy(e.shiftKey ? -step * 10 : -step);
    }
  };

  return (
    <div className="relative flex items-center bg-[#181a24] rounded-lg border border-white/[0.08] focus-within:border-cyan-400 overflow-hidden h-[30px] transition">
      {prefix && (
        <span className="pl-2.5 text-[11px] text-neutral-400 font-mono select-none pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => applyChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 bg-transparent text-white font-mono text-xs focus:outline-none min-w-0"
      />
      {suffix && (
        <span className="text-[10px] text-neutral-500 select-none pointer-events-none pr-1">
          {suffix}
        </span>
      )}
      <div className="flex flex-col border-l border-white/[0.08] h-full w-5 shrink-0 bg-[#141620]">
        <button
          type="button"
          onMouseDown={(e) => startHold(e, step)}
          className="flex-1 flex items-center justify-center text-[7px] text-neutral-400 hover:text-white hover:bg-white/[0.1] active:bg-cyan-500/30 transition cursor-pointer select-none leading-none"
          title={`+${step} px (или стрелка Вверх)`}
        >
          ▲
        </button>
        <button
          type="button"
          onMouseDown={(e) => startHold(e, -step)}
          className="flex-1 flex items-center justify-center text-[7px] text-neutral-400 hover:text-white hover:bg-white/[0.1] active:bg-cyan-500/30 border-t border-white/[0.06] transition cursor-pointer select-none leading-none"
          title={`-${step} px (или стрелка Вниз)`}
        >
          ▼
        </button>
      </div>
    </div>
  );
}
