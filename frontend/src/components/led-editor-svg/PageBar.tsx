// src/components/led-editor-svg/PageBar.tsx
'use client';
import React, { useState, useRef, useEffect } from 'react';

export interface PageItem {
  id: string;
  name: string;
  count?: number;
  countLabel?: string;
}

interface PageBarProps {
  pages: PageItem[];
  activePageId: string;
  onSelectPage: (id: string) => void;
  onAddPage: () => void;
  onRemovePage: (id: string) => void;
  onRenamePage: (id: string, newName: string) => void;
  onDuplicatePage?: (id: string) => void;
  addTitle?: string;
  addBtnText?: string;
  badgeSuffix?: string;
}

export default function PageBar({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onRemovePage,
  onRenamePage,
  onDuplicatePage,
  addTitle = 'Add page',
  addBtnText = 'Page',
  badgeSuffix = '',
}: PageBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startRename = (page: PageItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(page.id);
    setEditValue(page.name);
  };

  const commitRename = (id: string) => {
    const trimmed = editValue.trim();
    if (trimmed) {
      onRenamePage(id, trimmed);
    }
    setEditingId(null);
  };

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0c0d14]/90 backdrop-blur-md border border-white/[0.08] shadow-2xl max-w-[80vw] overflow-x-auto no-scrollbar">
      {pages.map((p) => {
        const isActive = p.id === activePageId;
        const isEditing = editingId === p.id;

        return (
          <div
            key={p.id}
            onClick={() => onSelectPage(p.id)}
            onDoubleClick={(e) => startRename(p, e)}
            className={[
              'group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition select-none shrink-0',
              isActive
                ? 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white shadow-md shadow-blue-500/25 border border-blue-400/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.05] border border-transparent',
            ].join(' ')}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitRename(p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(p.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="bg-[#10121a] text-white px-1.5 py-0.5 rounded text-xs border border-cyan-400 focus:outline-none min-w-[70px] max-w-[140px]"
              />
            ) : (
              <span className="truncate max-w-[120px] font-medium" title={p.name}>
                {p.name}
              </span>
            )}

            {typeof p.count === 'number' && (
              <span
                className={[
                  'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-white/[0.07] text-neutral-400 group-hover:text-neutral-300',
                ].join(' ')}
                title={`${p.count} ${p.countLabel ?? badgeSuffix}`}
              >
                {p.count}
                {badgeSuffix ? ` ${badgeSuffix}` : ''}
              </span>
            )}

            <div className="flex items-center gap-0.5 ml-0.5 opacity-60 group-hover:opacity-100 transition">
              {!isEditing && (
                <button
                  type="button"
                  onClick={(e) => startRename(p, e)}
                  title="Переименовать"
                  className="p-0.5 hover:text-white rounded hover:bg-white/10 transition"
                >
                  ✎
                </button>
              )}

              {onDuplicatePage && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicatePage(p.id);
                  }}
                  title="Дублировать страницу"
                  className="p-0.5 hover:text-white rounded hover:bg-white/10 transition"
                >
                  ⧉
                </button>
              )}

              {pages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePage(p.id);
                  }}
                  title="Удалить страницу"
                  className="p-0.5 hover:text-red-300 text-red-400 rounded hover:bg-red-500/20 transition ml-0.5"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAddPage}
        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/[0.2] transition flex items-center gap-1 shrink-0 active:scale-95 shadow-sm"
        title={addTitle}
      >
        <span>+</span>
        <span className="hidden sm:inline text-[11px]">{addBtnText}</span>
      </button>
    </div>
  );
}
