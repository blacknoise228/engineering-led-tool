'use client';
import React, { useEffect, useRef, useState } from 'react';

export type ContextMenuItem =
  | {
      id: string;
      label: string;
      icon?: React.ReactNode;
      shortcut?: string;
      disabled?: boolean;
      danger?: boolean;
      onClick?: () => void;
      children?: ContextMenuItem[];
    }
  | { type: 'separator' }
  | { type: 'header'; label: string };

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [subId, setSubId] = useState<string | null>(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const nx = x + r.width > window.innerWidth - 8 ? Math.max(8, window.innerWidth - r.width - 8) : x;
    const ny = y + r.height > window.innerHeight - 8 ? Math.max(8, window.innerHeight - r.height - 8) : y;
    setPos({ x: nx, y: ny });
  }, [x, y]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-[#12141c]/95 backdrop-blur-xl border border-white/[0.1] rounded-xl shadow-2xl p-1.5 min-w-[210px] text-xs select-none"
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, idx) => {
        if ('type' in item) {
          if (item.type === 'separator') return <div key={`sep-${idx}`} className="h-px bg-white/[0.08] my-1" />;
          return (
            <div key={`hdr-${idx}-${item.label}`} className="px-2.5 py-1 text-[10px] uppercase font-semibold text-neutral-400">
              {item.label}
            </div>
          );
        }
        const hasSub = Boolean(item.children?.length);
        const isOpen = subId === item.id;
        return (
          <div
            key={item.id ? `${item.id}-${idx}` : `item-${idx}`}
            className="relative"
            onMouseEnter={() => {
              if (!item.disabled && hasSub) setSubId(item.id);
              else if (!hasSub) setSubId(null);
            }}
          >
            <button
              type="button"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                if (hasSub) setSubId(prev => (prev === item.id ? null : item.id));
                else { item.onClick?.(); onClose(); }
              }}
              className={[
                'w-full flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg text-left transition',
                item.disabled
                  ? 'opacity-35 cursor-not-allowed text-neutral-500'
                  : item.danger
                  ? 'text-red-300 hover:bg-red-500/20 hover:text-red-200'
                  : isOpen
                  ? 'bg-blue-600/30 text-white font-medium'
                  : 'text-neutral-200 hover:bg-white/[0.08] hover:text-white',
              ].join(' ')}
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.icon && <span className="shrink-0 text-neutral-400 text-sm">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {item.shortcut && <span className="text-[10px] text-neutral-400 font-mono">{item.shortcut}</span>}
                {hasSub && <span className="text-neutral-400 text-[10px]">▸</span>}
              </div>
            </button>
            {hasSub && isOpen && (
              <div
                className="absolute left-full top-0 ml-1 bg-[#12141c]/95 backdrop-blur-xl border border-white/[0.1] rounded-xl shadow-2xl p-1.5 min-w-[200px] text-xs max-h-[360px] overflow-y-auto"
                style={{ transform: pos.x + 420 > window.innerWidth ? 'translateX(calc(-200% - 8px))' : undefined }}
              >
                {item.children!.map((sub, sIdx) => {
                  if ('type' in sub) {
                    if (sub.type === 'separator') return <div key={`sub-sep-${sIdx}`} className="h-px bg-white/[0.08] my-1" />;
                    return (
                      <div key={`sub-hdr-${sIdx}-${sub.label}`} className="px-2.5 py-1 text-[10px] uppercase font-semibold text-neutral-400">
                        {sub.label}
                      </div>
                    );
                  }
                  return (
                    <button
                      key={sub.id ? `${sub.id}-${sIdx}` : `sub-${sIdx}`}
                      type="button"
                      disabled={sub.disabled}
                      onClick={() => { if (!sub.disabled) { sub.onClick?.(); onClose(); } }}
                      className={[
                        'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left transition',
                        sub.disabled
                          ? 'opacity-35 cursor-not-allowed text-neutral-500'
                          : sub.danger
                          ? 'text-red-300 hover:bg-red-500/20 hover:text-red-200'
                          : 'text-neutral-200 hover:bg-white/[0.08] hover:text-white',
                      ].join(' ')}
                    >
                      <span className="truncate">{sub.label}</span>
                      {sub.shortcut && <span className="text-[10px] text-neutral-400 font-mono">{sub.shortcut}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
