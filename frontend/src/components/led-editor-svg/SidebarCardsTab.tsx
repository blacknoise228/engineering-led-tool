'use client';
import React, { useState } from 'react';
import {
  LINK_COLORS_16,
  FIBER_CONVERTERS,
  type CardPreset,
} from '@/lib/led-editor-svg/presets';

export type SidebarCardInstance = {
  id: string;
  modelId: string;
  order: number;
  color: string;
  portColors: string[];
};

interface SidebarCardsTabProps {
  cardPresetsList: CardPreset[];
  cards: SidebarCardInstance[];
  selectedCardId: string | null;
  onCardAdd?: (modelId: string) => void;
  onCardSelect?: (cardId: string) => void;
  onCardRemove?: (cardId: string) => void;
  setCardId: (s: string) => void;
  onSwitchToWiring: () => void;
  onOpenCardPresetsModal?: () => void;
  fiberCounts: Record<string, number>;
  setFiberCounts: (next: Record<string, number>) => void;
  textOutline: (stroke?: string) => React.CSSProperties;
}

export default function SidebarCardsTab({
  cardPresetsList,
  cards,
  selectedCardId,
  onCardAdd,
  onCardSelect,
  onCardRemove,
  setCardId,
  onSwitchToWiring,
  onOpenCardPresetsModal,
  fiberCounts,
  setFiberCounts,
  textOutline,
}: SidebarCardsTabProps) {
  const [newModelId, setNewModelId] = useState<string>(
    () => cardPresetsList[0]?.id ?? ''
  );

  return (
    <>
      <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
            Добавление карты / процессора
          </div>
          {onOpenCardPresetsModal && (
            <button
              type="button"
              onClick={onOpenCardPresetsModal}
              className="p-1 rounded-lg hover:bg-white/[0.08] text-neutral-400 hover:text-cyan-400 transition"
              title="Управление моделями карт и процессоров"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
        </div>
        <select
          className="w-full bg-[#181a24] border border-white/[0.08] rounded-lg p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
          value={newModelId}
          onChange={(e) => setNewModelId(e.target.value)}
        >
          <optgroup label="Отправочные карты">
            {cardPresetsList
              .filter((c) => c.category === 'sending')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.outputPorts} порт(ов)
                </option>
              ))}
          </optgroup>
          <optgroup label="Процессоры">
            {cardPresetsList
              .filter((c) => c.category === 'processor')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.outputPorts} порт(ов)
                </option>
              ))}
          </optgroup>
        </select>
        <button
          className="w-full py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-sm transition active:scale-[0.99]"
          onClick={() => {
            if (onCardAdd) onCardAdd(newModelId);
            else setCardId(newModelId);
            onSwitchToWiring();
          }}
        >
          + Добавить карту
        </button>
      </div>
      <div className="text-[11px] text-neutral-400 px-1">
        После добавления выберите карту во вкладке «Схема». Цвет карты подсветит
        панели при расключении.
      </div>

      <div className="space-y-2.5">
        {(!cards || cards.length === 0) && (
          <div className="text-xs text-neutral-400 p-3 rounded-xl bg-[#10121a] border border-white/[0.06] text-center">
            Карты ещё не добавлены.
          </div>
        )}
        {cards?.map((c) => {
          const model = cardPresetsList.find((m) => m.id === c.modelId);
          const isActive = c.id === selectedCardId;
          return (
            <div
              key={c.id}
              className={[
                'flex items-center gap-3 rounded-xl border p-3 transition',
                isActive
                  ? 'border-cyan-500/60 bg-[#121624] shadow-[0_0_15px_rgba(56,189,248,0.1)]'
                  : 'border-white/[0.06] bg-[#10121a] hover:border-white/[0.12]',
              ].join(' ')}
            >
              <div
                className="relative flex-shrink-0 w-10 h-10 rounded-lg border border-white/[0.1]"
                style={{ backgroundColor: c.color }}
                title={`S${c.order}`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="font-mono text-[18px] font-bold leading-none select-none"
                    style={{ color: '#fff', ...textOutline('#000') }}
                  >
                    {c.order}
                  </span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  S{c.order} — {model?.name ?? c.modelId}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  Портов:{' '}
                  <span className="font-mono text-neutral-200">
                    {model?.outputPorts ?? c.portColors.length}
                  </span>
                </div>
                <div className="mt-1.5 flex gap-1 flex-wrap">
                  {(model?.outputPorts
                    ? Array.from({ length: model.outputPorts })
                    : c.portColors
                  ).map((_, i) => (
                    <div
                      key={i}
                      className="w-3.5 h-3.5 rounded-sm border border-white/[0.1]"
                      style={{
                        backgroundColor:
                          c.portColors[i] ??
                          LINK_COLORS_16[i % LINK_COLORS_16.length],
                      }}
                      title={`Порт ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  className={[
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition',
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 border border-white/[0.08]',
                  ].join(' ')}
                  onClick={() => onCardSelect?.(c.id)}
                >
                  {isActive ? 'Выбрана' : 'Выбрать'}
                </button>
                <button
                  className="px-2 py-0.5 rounded-lg text-[11px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
                  onClick={() => onCardRemove?.(c.id)}
                >
                  Удалить
                </button>
              </div>
            </div>
          );
        })}

        <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-2.5">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
            Fiber Converters
          </div>
          <div className="space-y-2">
            {FIBER_CONVERTERS.map((fc) => {
              const val = Number.isFinite(fiberCounts[fc.id])
                ? fiberCounts[fc.id]
                : 0;
              return (
                <div key={fc.id} className="flex items-center justify-between gap-2">
                  <div className="text-xs text-neutral-300 truncate">{fc.name}</div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="w-6 h-6 rounded-md border border-white/[0.08] bg-[#181a24] hover:bg-[#202330] text-neutral-300 text-xs flex items-center justify-center transition"
                      onClick={() =>
                        setFiberCounts({ ...fiberCounts, [fc.id]: Math.max(0, val - 1) })
                      }
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      className="w-12 bg-[#181a24] border border-white/[0.08] rounded-md py-0.5 text-xs text-center font-mono text-white focus:outline-none"
                      value={val}
                      onChange={(e) => {
                        const n = Math.max(0, parseInt(e.target.value || '0', 10));
                        setFiberCounts({ ...fiberCounts, [fc.id]: n });
                      }}
                    />
                    <button
                      type="button"
                      className="w-6 h-6 rounded-md border border-white/[0.08] bg-[#181a24] hover:bg-[#202330] text-neutral-300 text-xs flex items-center justify-center transition"
                      onClick={() => setFiberCounts({ ...fiberCounts, [fc.id]: val + 1 })}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
