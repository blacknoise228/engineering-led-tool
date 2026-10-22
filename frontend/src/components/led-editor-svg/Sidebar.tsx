// src/components/led-editor-svg/Sidebar.tsx
"use client";
import Image from "next/image";
import React, { useMemo, useState, useCallback } from "react";
import {
  PRESETS,
  LINK_COLORS_16,
  CARDS,
  SERVERS,
  FIBER_CONVERTERS,
  type PanelPreset,
  type CardPreset,
  type ServerPreset,
} from "@/lib/led-editor-svg/presets";
import type {
  Tool,
  Panel,
  ScreenGroup,
  CableEx,
  WiringPage,
  MaskPage,
  MaskLogoConfig,
} from "@/lib/led-editor-svg/types";
import { buildSpecText } from "@/lib/led-editor-svg/utils";
import SnakeIcon from "./icons/SnakeIcon";
import MaskTab from "./MaskTab";

type CardInstance = {
  id: string;
  modelId: string; // CARDS[].id
  order: number; // номер S{order}
  color: string; // цвет панелей этой карты (полупрозрачный в редакторе)
  portColors: string[]; // цвета портов этой карты (кабели)
};

type SidebarProps = {
  tool: Tool;
  setTool: (t: Tool) => void;

  presetId: string;
  setPresetId: (id: string) => void;
  presets?: PanelPreset[];
  onOpenPresetsModal?: () => void;
  setRows: (n: number) => void;
  setCols: (n: number) => void;

  duplicateSelectedPanels: () => void;
  copySelectedPanels?: () => void;
  cutSelectedPanels?: () => void;
  pastePanels?: () => void;
  canPaste?: boolean;
  clipboardCount?: number;

  createMatrix: () => void;
  clearAll: () => void;

  exportPNG: () => void;
  saveJSON: () => void;
  openLoadJSONDialog: () => void;
  newProject?: () => void;

  clearSelectedWiring: () => void;
  hasPanelSelection: boolean;
  setSelectedPanels: (value: React.SetStateAction<Set<string>>) => void;

  // метаданные
  eventName: string;
  setEventName: (s: string) => void;
  eventDate: string;
  setEventDate: (s: string) => void;
  serverName?: string;
  setServerId?: (s: string) => void;
  servers?: Array<{ id: string; modelId: string }>;
  onServerAdd?: (modelId: string) => void;
  onServerRemove?: (id: string) => void;
  onServerChange?: (id: string, modelId: string) => void;

  // legacy (оставлено для совместимости, не используется для выбора инстанса)
  cardName: string;
  setCardId: (s: string) => void;

  // автозмейки
  autoSnakeH_TL: () => void;
  autoSnakeH_TR: () => void;
  autoSnakeH_BL: () => void;
  autoSnakeH_BR: () => void;
  autoSnakeV_TL: () => void;
  autoSnakeV_TR: () => void;
  autoSnakeV_BL: () => void;
  autoSnakeV_BR: () => void;

  // выбранный порт
  activeLink: number;
  setActiveLink: (i: number) => void;

  // НОВОЕ: инстансы карт и коллбеки
  cards?: CardInstance[];
  selectedCardId?: string | null;
  onCardAdd?: (modelId: string) => void;
  onCardSelect?: (cardId: string) => void;
  onCardRemove?: (cardId: string) => void;
  fiberCounts: Record<string, number>;
  setFiberCounts: (next: Record<string, number>) => void;

  // Кабели (wiring)
  cables?: CableEx[];

  // Вкладка и Маска
  activeTab?: "cards" | "wiring" | "mask" | "info";
  onTabChange?: (tab: "cards" | "wiring" | "mask" | "info") => void;
  panels?: Panel[];
  screenGroups?: ScreenGroup[];
  selectedGroupId?: string | null;
  selectedGroupIds?: Set<string>;
  onSelectGroup?: (groupId: string | null, multi?: boolean) => void;
  onAddGroup?: () => void;
  onAutoGroup?: () => void;
  onUpdateGroup?: (updated: ScreenGroup) => void;
  onUpdateGroups?: (updated: ScreenGroup[]) => void;
  onRemoveGroup?: (groupId: string) => void;
  onRemoveGroups?: (groupIds: string[]) => void;
  onSelectGroupPanels?: (groupId: string) => void;
  onExportMaskPNG?: () => void;
  onExportMaskZIP?: () => void;
  onPreviewMask?: () => void;
  pushHistory?: () => void;
  showGuides?: boolean;
  setShowGuides?: (v: boolean | ((prev: boolean) => boolean)) => void;
  showBadges?: boolean;
  setShowBadges?: (v: boolean | ((prev: boolean) => boolean)) => void;

  // Постраничность расключения и масок
  wiringPages?: WiringPage[];
  activeWiringPageId?: string;
  onSelectWiringPage?: (id: string) => void;
  onAddWiringPage?: () => void;
  onRemoveWiringPage?: (id: string) => void;
  onRenameWiringPage?: (id: string, name: string) => void;
  onDuplicateWiringPage?: (id: string) => void;

  maskPages?: MaskPage[];
  activeMaskPageId?: string;
  onSelectMaskPage?: (id: string) => void;
  onAddMaskPage?: () => void;
  onRemoveMaskPage?: (id: string) => void;
  onRenameMaskPage?: (id: string, name: string) => void;
  onDuplicateMaskPage?: (id: string) => void;

  allPanels?: Panel[];
  allCables?: CableEx[];
  allScreenGroups?: ScreenGroup[];
  onAddScreensFromWiringPage?: (pageId: string) => void;

  cardPresets?: CardPreset[];
  onOpenCardPresetsModal?: () => void;
  serverPresets?: ServerPreset[];
  onOpenServerPresetsModal?: () => void;

  maskLogoConfig?: MaskLogoConfig;
  onOpenMaskLogoModal?: () => void;
};

export default function Sidebar(props: SidebarProps) {
  const {
    tool,
    setTool,
    presetId,
    setPresetId,
    presets,
    onOpenPresetsModal,
    setRows,
    setCols,
    cardPresets,
    onOpenCardPresetsModal,
    serverPresets,
    onOpenServerPresetsModal,
    createMatrix,
    clearAll,
    exportPNG,
    saveJSON,
    openLoadJSONDialog,
    newProject,
    clearSelectedWiring,
    hasPanelSelection,
    autoSnakeH_TL,
    autoSnakeH_TR,
    autoSnakeH_BL,
    autoSnakeH_BR,
    autoSnakeV_TL,
    autoSnakeV_TR,
    autoSnakeV_BL,
    autoSnakeV_BR,
    duplicateSelectedPanels,
    copySelectedPanels,
    cutSelectedPanels,
    pastePanels,
    canPaste = false,
    clipboardCount = 0,
    activeLink,
    setActiveLink,
    setSelectedPanels,
    eventName,
    eventDate,
    serverName,
    setEventName,
    setEventDate,
    setServerId,
    servers,
    onServerAdd,
    onServerRemove,
    onServerChange,
    // legacy
    cardName,
    setCardId,
    // инстансы
    cards = [],
    selectedCardId = null,
    onCardAdd,
    onCardSelect,
    onCardRemove,
    fiberCounts,
    setFiberCounts,
    cables = [],
    activeTab: propTab,
    onTabChange,
    panels = [],
    screenGroups = [],
    selectedGroupId = null,
    selectedGroupIds,
    onSelectGroup,
    onAddGroup,
    onAutoGroup,
    onUpdateGroup,
    onUpdateGroups,
    onRemoveGroup,
    onRemoveGroups,
    onSelectGroupPanels,
    onExportMaskPNG,
    onExportMaskZIP,
    onPreviewMask,
    pushHistory,
    showGuides = true,
    setShowGuides,
    showBadges = true,
    setShowBadges,
    wiringPages = [],
    activeWiringPageId,
    onSelectWiringPage,
    onAddWiringPage,
    onRemoveWiringPage,
    onDuplicateWiringPage,
    maskPages = [],
    activeMaskPageId,
    onSelectMaskPage,
    onAddMaskPage,
    onRemoveMaskPage,
    onRenameMaskPage,
    onDuplicateMaskPage,
    allPanels,
    allCables,
    allScreenGroups,
    onAddScreensFromWiringPage,
    maskLogoConfig,
    onOpenMaskLogoModal,
  } = props;

  // вкладки
  const [localTab, setLocalTab] = useState<
    "cards" | "wiring" | "mask" | "info"
  >("wiring");
  const tab = propTab ?? localTab;
  const setTab = (t: "cards" | "wiring" | "mask" | "info") => {
    setLocalTab(t);
    onTabChange?.(t);
  };

  // утилита обводки цифры
  const textOutline = (stroke = "#000") =>
    ({
      WebkitTextStroke: `1.1px ${stroke}`,
      textShadow: [
        `0 1px 0 ${stroke}`,
        `0 -1px 0 ${stroke}`,
        `1px 0 0 ${stroke}`,
        `-1px 0 0 ${stroke}`,
        `1px 1px 0 ${stroke}`,
        `-1px 1px 0 ${stroke}`,
        `1px -1px 0 ${stroke}`,
        `-1px -1px 0 ${stroke}`,
      ].join(", "),
    }) as React.CSSProperties;

  const cardPresetsList =
    cardPresets && cardPresets.length > 0 ? cardPresets : CARDS;
  const serverPresetsList =
    serverPresets && serverPresets.length > 0 ? serverPresets : SERVERS;

  // сервер → id
  const serverValue = useMemo(() => {
    const byId = serverPresetsList.find((s) => s.id === serverName)?.id;
    if (byId) return byId;
    const byName = serverPresetsList.find((s) => s.name === serverName)?.id;
    return byName ?? serverPresetsList[0]?.id ?? "";
  }, [serverName, serverPresetsList]);

  // выбранная карта (инстанс) и её модель
  const selectedCard: CardInstance | null = useMemo(
    () => cards.find((c) => c.id === selectedCardId) ?? null,
    [cards, selectedCardId],
  );
  const selectedCardModel = useMemo(() => {
    if (selectedCard)
      return cardPresetsList.find((m) => m.id === selectedCard.modelId) ?? null;
    // fallback на «старую» модель по cardName (id или name) — но расключение без инстанса отключаем
    const mById = cardPresetsList.find((m) => m.id === cardName);
    if (mById) return mById;
    return cardPresetsList.find((m) => m.name === cardName) ?? null;
  }, [selectedCard, cardName, cardPresetsList]);

  const portsCount = selectedCardModel?.outputPorts ?? 0;
  const portButtons = Array.from({ length: portsCount }, (_, i) => i);
  const portColor = (i: number) =>
    selectedCard?.portColors?.[i] ?? LINK_COLORS_16[i % LINK_COLORS_16.length];

  // выбор модели для добавления (во вкладке «Карты»)
  const [newModelId, setNewModelId] = useState<string>(
    () => cardPresetsList[0]?.id ?? "",
  );

  // выбор модели для добавления сервера (во вкладке «Инфо»)
  const [newServerModelId, setNewServerModelId] = useState<string>(
    () => serverPresetsList[0]?.id ?? "hp-z2",
  );

  // Спецификация оборудования в виде текста
  const specText = useMemo(() => {
    return buildSpecText({
      panels: allPanels ?? panels,
      cables: allCables ?? cables,
      servers,
      cardId: cardName,
      cards,
      eventName,
      eventDate,
      fiberCounts,
      screenGroups: allScreenGroups ?? screenGroups,
      presets,
      cardPresets: cardPresetsList,
      serverPresets: serverPresetsList,
    });
  }, [
    allPanels,
    panels,
    allCables,
    cables,
    servers,
    cardName,
    cards,
    eventName,
    eventDate,
    fiberCounts,
    allScreenGroups,
    screenGroups,
    presets,
    cardPresetsList,
    serverPresetsList,
  ]);

  const [copiedSpec, setCopiedSpec] = useState(false);

  const handleCopySpec = useCallback(async () => {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        await navigator.clipboard.writeText(specText);
      } else if (typeof document !== "undefined") {
        const ta = document.createElement("textarea");
        ta.value = specText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedSpec(true);
      setTimeout(() => setCopiedSpec(false), 2000);
    } catch (e) {
      console.error("Failed to copy spec to clipboard", e);
    }
  }, [specText]);

  // кнопки автозмейки
  const runH_TL = autoSnakeH_TL;
  const runH_TR = autoSnakeH_TR;
  const runH_BL = autoSnakeH_BL;
  const runH_BR = autoSnakeH_BR;
  const runV_TL = autoSnakeV_TL;
  const runV_TR = autoSnakeV_TR;
  const runV_BL = autoSnakeV_BL;
  const runV_BR = autoSnakeV_BR;

  const currentWiringPage = wiringPages.find(
    (p) => p.id === activeWiringPageId,
  );

  return (
    <aside
      className={[
        // размеры/позиционирование
        "relative md:sticky md:top-0 flex-shrink-0",
        "w-full md:w-[24rem] lg:w-[26rem] max-w-full",
        "h-full",
        "overflow-y-auto supports-[scrollbar-gutter:stable]:scrollbar-gutter-stable",
        // стиль
        "border-r border-white/[0.07]",
        "bg-[#0c0d12] text-neutral-200",
        // внутренности
        "px-4 py-4 space-y-3.5",
      ].join(" ")}
    >
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        {/* Добавляем flex-col, чтобы элементы встали друг под другом */}
        <div className="flex flex-col">
          <Image
            src="/logo2.png"
            alt="ELT logo"
            width={380}
            height={64}
            className="object-contain"
            priority
          />
          {/* Стилизуем текст: мелкий размер, серый цвет, небольшой отступ сверху */}
          <span className="text-[10px] text-neutral-500 mt-1 opacity-80">
            @blacknoise228
          </span>
        </div>
      </div>

      {/* Переключатель вкладок (Tabs) */}
      <div className="p-1 rounded-xl bg-[#08090e] border border-white/[0.06]">
        <div className="grid grid-cols-4 gap-1">
          {[
            { id: "cards", label: "Карты" },
            { id: "wiring", label: "Схема" },
            { id: "mask", label: "Маска" },
            { id: "info", label: "Инфо" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={[
                "w-full py-1.5 px-2 text-xs font-medium rounded-lg transition text-center truncate",
                tab === t.id
                  ? "bg-[#1c1f2b] text-white shadow-sm border border-white/[0.08]"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03]",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* === TAB: Карты === */}
      {tab === "cards" && (
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
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
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
                  .filter((c) => c.category === "sending")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.outputPorts} порт(ов)
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Процессоры">
                {cardPresetsList
                  .filter((c) => c.category === "processor")
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
                setTab("wiring");
              }}
            >
              + Добавить карту
            </button>
          </div>

          <div className="text-[11px] text-neutral-400 px-1">
            После добавления выберите карту во вкладке «Схема». Цвет карты
            подсветит панели при расключении.
          </div>

          {/* Список карт + удаление/выбор */}
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
                    "flex items-center gap-3 rounded-xl border p-3 transition",
                    isActive
                      ? "border-cyan-500/60 bg-[#121624] shadow-[0_0_15px_rgba(56,189,248,0.1)]"
                      : "border-white/[0.06] bg-[#10121a] hover:border-white/[0.12]",
                  ].join(" ")}
                >
                  <div
                    className="relative flex-shrink-0 w-10 h-10 rounded-lg border border-white/[0.1]"
                    style={{ backgroundColor: c.color }}
                    title={`S${c.order}`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="font-mono text-[18px] font-bold leading-none select-none"
                        style={{ color: "#fff", ...textOutline("#000") }}
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
                      Портов:{" "}
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
                        "px-2.5 py-1 rounded-lg text-xs font-medium transition",
                        isActive
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 border border-white/[0.08]",
                      ].join(" ")}
                      onClick={() => onCardSelect?.(c.id)}
                    >
                      {isActive ? "Выбрана" : "Выбрать"}
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

            {/* Оптика / ЦВТ */}
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
                    <div
                      key={fc.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="text-xs text-neutral-300 truncate">
                        {fc.name}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="w-6 h-6 rounded-md border border-white/[0.08] bg-[#181a24] hover:bg-[#202330] text-neutral-300 text-xs flex items-center justify-center transition"
                          onClick={() =>
                            setFiberCounts({
                              ...fiberCounts,
                              [fc.id]: Math.max(0, val - 1),
                            })
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
                            const n = Math.max(
                              0,
                              parseInt(e.target.value || "0", 10),
                            );
                            setFiberCounts({ ...fiberCounts, [fc.id]: n });
                          }}
                        />
                        <button
                          type="button"
                          className="w-6 h-6 rounded-md border border-white/[0.08] bg-[#181a24] hover:bg-[#202330] text-neutral-300 text-xs flex items-center justify-center transition"
                          onClick={() =>
                            setFiberCounts({ ...fiberCounts, [fc.id]: val + 1 })
                          }
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
      )}

      {/* === TAB: Расключение === */}
      {tab === "wiring" && (
        <>
          {/* Схемы расключения (Schemas) */}
          {wiringPages.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
                  Схемы
                </div>
                {onAddWiringPage && (
                  <button
                    type="button"
                    onClick={onAddWiringPage}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition"
                  >
                    + Schema
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {wiringPages.map((wp) => {
                  const isCur = wp.id === activeWiringPageId;
                  return (
                    <div
                      key={wp.id}
                      onClick={() => onSelectWiringPage?.(wp.id)}
                      className={[
                        "group px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer border flex items-center gap-1.5 transition",
                        isCur
                          ? "bg-blue-600/30 border-blue-500/50 text-white shadow-sm"
                          : "bg-[#181a24] border-white/[0.06] text-neutral-400 hover:text-white hover:border-white/[0.12]",
                      ].join(" ")}
                    >
                      <span className="truncate max-w-[100px]">{wp.name}</span>
                      <span className="text-[10px] text-cyan-400 font-mono">
                        {wp.panels.length}
                      </span>
                      {onDuplicateWiringPage && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateWiringPage(wp.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-white text-neutral-400 text-[11px]"
                          title="Дублировать схему (copy)"
                        >
                          ⧉
                        </button>
                      )}
                      {wiringPages.length > 1 && onRemoveWiringPage && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveWiringPage(wp.id);
                          }}
                          className="opacity-40 group-hover:opacity-100 hover:text-red-400 text-neutral-400 ml-0.5"
                          title="Удалить схему"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Сетка панелей */}
          <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
                Модель LED кабинета
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                className="flex-1 bg-[#181a24] border border-white/[0.08] rounded-lg p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                value={presetId}
                onChange={(e) => setPresetId(e.target.value)}
              >
                {(presets ?? PRESETS).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {onOpenPresetsModal && (
                <button
                  type="button"
                  onClick={onOpenPresetsModal}
                  className="p-2 rounded-lg bg-[#181a24] hover:bg-[#202330] border border-white/[0.08] hover:border-cyan-500/50 text-neutral-400 hover:text-cyan-400 transition shrink-0"
                  title="Открыть окно управления панелями"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
              )}
            </div>

            <div
              className="grid grid-cols-2 gap-2"
              onClick={() => setSelectedPanels(new Set())}
            >
              <div>
                <label className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 block mb-1">
                  Колонки (Cols)
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full bg-[#181a24] border border-white/[0.08] rounded-lg p-1.5 text-xs text-center font-mono text-white focus:border-cyan-500 focus:outline-none"
                  onChange={(e) =>
                    setCols(Math.max(1, parseInt(e.target.value || "1", 10)))
                  }
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 block mb-1">
                  Строки (Rows)
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full bg-[#181a24] border border-white/[0.08] rounded-lg p-1.5 text-xs text-center font-mono text-white focus:border-cyan-500 focus:outline-none"
                  onChange={(e) =>
                    setRows(Math.max(1, parseInt(e.target.value || "1", 10)))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                className="py-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-sm transition active:scale-[0.99]"
                onClick={createMatrix}
              >
                + Создать сетку
              </button>
              <button
                className="py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition"
                onClick={clearAll}
              >
                Очистить всё
              </button>
            </div>

            <button
              className="w-full py-1.5 px-3 rounded-lg border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
              onClick={duplicateSelectedPanels}
              disabled={!hasPanelSelection}
              title="Дублировать выбранные панели (Ctrl+D)"
            >
              <span>Дублировать выделение</span>
              <span className="text-[10px] text-neutral-400 font-mono">
                Ctrl+D
              </span>
            </button>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                className="py-1.5 px-2 rounded-lg border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition flex flex-col items-center justify-center gap-0.5"
                onClick={copySelectedPanels}
                disabled={!hasPanelSelection}
                title="Копировать выбранные панели (Ctrl+C)"
              >
                <span>Копировать</span>
                <span className="text-[9px] text-neutral-500 font-mono">
                  Ctrl+C
                </span>
              </button>
              <button
                type="button"
                className="py-1.5 px-2 rounded-lg border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition flex flex-col items-center justify-center gap-0.5"
                onClick={cutSelectedPanels}
                disabled={!hasPanelSelection}
                title="Вырезать выбранные панели (Ctrl+X)"
              >
                <span>Вырезать</span>
                <span className="text-[9px] text-neutral-500 font-mono">
                  Ctrl+X
                </span>
              </button>
              <button
                type="button"
                className="py-1.5 px-2 rounded-lg border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition flex flex-col items-center justify-center gap-0.5"
                onClick={pastePanels}
                disabled={!canPaste}
                title="Вставить панели в активную схему (Ctrl+V)"
              >
                <span>
                  Вставить {clipboardCount > 0 ? `(${clipboardCount})` : ""}
                </span>
                <span className="text-[9px] text-neutral-500 font-mono">
                  Ctrl+V
                </span>
              </button>
            </div>
          </div>
          {/* ВЫБОР КАРТЫ ДЛЯ РАСКЛЮЧЕНИЯ */}
          <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-2.5">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
              Sending Card
            </div>
            {cards.length === 0 ? (
              <div className="text-xs text-neutral-400">
                Нет добавленных карт. Перейдите на вкладку «Карты», добавьте
                карту и вернитесь сюда.
              </div>
            ) : (
              <div className="space-y-1.5">
                {cards.map((c) => {
                  const model = CARDS.find((m) => m.id === c.modelId);
                  const isActive = c.id === selectedCardId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onCardSelect?.(c.id)}
                      className={[
                        "w-full flex items-center gap-2.5 rounded-lg border p-2 text-left transition",
                        isActive
                          ? "border-cyan-500/60 bg-[#141828] shadow-[0_0_12px_rgba(56,189,248,0.1)]"
                          : "border-white/[0.06] bg-[#141622] hover:border-white/[0.12]",
                      ].join(" ")}
                      title={`S${c.order} — ${model?.name ?? c.modelId}`}
                    >
                      <div
                        className="relative flex-shrink-0 w-8 h-8 rounded-md border border-white/[0.1]"
                        style={{ backgroundColor: c.color }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span
                            className="font-mono text-[14px] font-bold leading-none select-none"
                            style={{ color: "#fff", ...textOutline("#000") }}
                          >
                            {c.order}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white truncate">
                          S{c.order} — {model?.name ?? c.modelId}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {model?.outputPorts ?? c.portColors.length} портов
                        </div>
                      </div>

                      <div className="flex gap-0.5 flex-wrap max-w-[60px]">
                        {(model?.outputPorts
                          ? Array.from({ length: model.outputPorts })
                          : c.portColors
                        ).map((_, i) => (
                          <div
                            key={i}
                            className="w-2.5 h-2.5 rounded-[2px]"
                            style={{
                              backgroundColor:
                                c.portColors[i] ??
                                LINK_COLORS_16[i % LINK_COLORS_16.length],
                            }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Инструменты */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#08090e] border border-white/[0.06]">
            <button
              className={[
                "py-1.5 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5",
                tool === "select"
                  ? "bg-[#1c1f2b] text-white shadow-sm border border-white/[0.08]"
                  : "text-neutral-400 hover:text-neutral-200",
              ].join(" ")}
              onClick={() => setTool("select")}
            >
              <span>Выделение</span>
            </button>
            <button
              className={[
                "py-1.5 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed",
                tool === "cable"
                  ? "bg-[#1c1f2b] text-white shadow-sm border border-white/[0.08]"
                  : "text-neutral-400 hover:text-neutral-200",
              ].join(" ")}
              onClick={() => setTool("cable")}
              title={
                selectedCard
                  ? `Карта: S${selectedCard.order}`
                  : "Выберите карту выше"
              }
              disabled={!selectedCard}
            >
              <span>Ручное расключение</span>
            </button>
          </div>

          {/* ПОРТЫ ВЫБРАННОЙ КАРТЫ */}
          <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
              <span>Порты вывода</span>
              {selectedCard && selectedCardModel && (
                <span className="font-mono text-cyan-400 font-medium">
                  S{selectedCard.order} • {portsCount}p
                </span>
              )}
            </div>

            {!selectedCard || !selectedCardModel ? (
              <div className="text-xs text-neutral-400 py-1">
                Выберите карту выше для расключения портов.
              </div>
            ) : (
              <div
                className="grid gap-1.5 pt-1"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(8, Math.max(1, portsCount))}, minmax(0, 1fr))`,
                }}
              >
                {portButtons.map((i) => {
                  const isActive = i === activeLink;
                  const color = portColor(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveLink(i)}
                      className={[
                        "h-9 rounded-lg flex items-center justify-center transition relative",
                        "border border-white/[0.1] shadow-sm",
                        isActive
                          ? "ring-2 ring-white ring-offset-2 ring-offset-[#10121a] scale-105 z-10"
                          : "opacity-85 hover:opacity-100 hover:scale-105",
                      ].join(" ")}
                      style={{ backgroundColor: color }}
                      title={`Порт P${i + 1}`}
                    >
                      <span
                        className="font-mono text-[18px] font-bold leading-none select-none"
                        style={{ color: "#fff", ...textOutline("#000") }}
                      >
                        {i + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Автозмейки */}
          <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 mb-1.5">
                Горизонтальная змейка (H-snake)
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  title="H snake — TL"
                  onClick={runH_TL}
                  className="aspect-square rounded-lg border border-white/[0.08] bg-[#141622] hover:bg-cyan-500/10 hover:border-cyan-500/40 p-2 transition text-neutral-300 hover:text-white"
                >
                  <SnakeIcon orient="H" corner="TL" />
                </button>
                <button
                  title="H snake — TR"
                  onClick={runH_TR}
                  className="aspect-square rounded-lg border border-white/[0.08] bg-[#141622] hover:bg-cyan-500/10 hover:border-cyan-500/40 p-2 transition text-neutral-300 hover:text-white"
                >
                  <SnakeIcon orient="H" corner="TR" />
                </button>
                <button
                  title="H snake — BL"
                  onClick={runH_BL}
                  className="aspect-square rounded-lg border border-white/[0.08] bg-[#141622] hover:bg-cyan-500/10 hover:border-cyan-500/40 p-2 transition text-neutral-300 hover:text-white"
                >
                  <SnakeIcon orient="H" corner="BL" />
                </button>
                <button
                  title="H snake — BR"
                  onClick={runH_BR}
                  className="aspect-square rounded-lg border border-white/[0.08] bg-[#141622] hover:bg-cyan-500/10 hover:border-cyan-500/40 p-2 transition text-neutral-300 hover:text-white"
                >
                  <SnakeIcon orient="H" corner="BR" />
                </button>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 mb-1.5">
                Вертикальная змейка (V-snake)
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  title="V snake — TL"
                  onClick={runV_TL}
                  className="aspect-square rounded-lg border border-white/[0.08] bg-[#141622] hover:bg-cyan-500/10 hover:border-cyan-500/40 p-2 transition text-neutral-300 hover:text-white"
                >
                  <SnakeIcon orient="V" corner="TL" />
                </button>
                <button
                  title="V snake — TR"
                  onClick={runV_TR}
                  className="aspect-square rounded-lg border border-white/[0.08] bg-[#141622] hover:bg-cyan-500/10 hover:border-cyan-500/40 p-2 transition text-neutral-300 hover:text-white"
                >
                  <SnakeIcon orient="V" corner="TR" />
                </button>
                <button
                  title="V snake — BL"
                  onClick={runV_BL}
                  className="aspect-square rounded-lg border border-white/[0.08] bg-[#141622] hover:bg-cyan-500/10 hover:border-cyan-500/40 p-2 transition text-neutral-300 hover:text-white"
                >
                  <SnakeIcon orient="V" corner="BL" />
                </button>
                <button
                  title="V snake — BR"
                  onClick={runV_BR}
                  className="aspect-square rounded-lg border border-white/[0.08] bg-[#141622] hover:bg-cyan-500/10 hover:border-cyan-500/40 p-2 transition text-neutral-300 hover:text-white"
                >
                  <SnakeIcon orient="V" corner="BR" />
                </button>
              </div>
            </div>
          </div>

          {/* Действия с выбором */}
          <div className="space-y-2">
            <button
              className="w-full py-2 px-3 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed transition"
              onClick={clearSelectedWiring}
              disabled={!hasPanelSelection}
              title="Удалить все кабели у выбранных панелей"
            >
              Очистить расключение выделенных
            </button>
          </div>

          {/* Экспорт схемы расключения */}
          <div className="pt-2 border-t border-white/[0.06]">
            <button
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition active:scale-[0.99] flex items-center justify-center gap-2"
              onClick={() => {
                setSelectedPanels(new Set());
                setTimeout(() => exportPNG(), 50);
              }}
              title="Экспорт расключения текущей схемы в PNG"
            >
              Скачать PNG{" "}
              {currentWiringPage ? `(${currentWiringPage.name})` : "схемы"}
            </button>
          </div>
        </>
      )}

      {/* === TAB: Маска === */}
      {tab === "mask" && (
        <MaskTab
          panels={allPanels ?? panels}
          screenGroups={screenGroups}
          selectedGroupId={selectedGroupId}
          selectedGroupIds={selectedGroupIds}
          hasPanelSelection={hasPanelSelection}
          onSelectGroup={onSelectGroup}
          onAddGroup={onAddGroup}
          onAutoGroup={onAutoGroup}
          onUpdateGroup={onUpdateGroup}
          onUpdateGroups={onUpdateGroups}
          onRemoveGroup={onRemoveGroup}
          onRemoveGroups={onRemoveGroups}
          onSelectGroupPanels={onSelectGroupPanels}
          onExportMaskPNG={onExportMaskPNG}
          onExportMaskZIP={onExportMaskZIP}
          onPreviewMask={onPreviewMask}
          pushHistory={pushHistory}
          showGuides={showGuides}
          setShowGuides={setShowGuides}
          showBadges={showBadges}
          setShowBadges={setShowBadges}
          maskPages={maskPages}
          activeMaskPageId={activeMaskPageId}
          onSelectMaskPage={onSelectMaskPage}
          onAddMaskPage={onAddMaskPage}
          onRemoveMaskPage={onRemoveMaskPage}
          onRenameMaskPage={onRenameMaskPage}
          onDuplicateMaskPage={onDuplicateMaskPage}
          wiringPages={wiringPages}
          onAddScreensFromWiringPage={onAddScreensFromWiringPage}
          maskLogoConfig={maskLogoConfig}
          onOpenMaskLogoModal={onOpenMaskLogoModal}
        />
      )}

      {/* === TAB: Инфо === */}
      {tab === "info" && (
        <>
          <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-3.5">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
              Данные проекта
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-medium text-neutral-400 mb-1">
                Название события
              </label>
              <input
                className="w-full bg-[#181a24] border border-white/[0.08] rounded-lg p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Концерт / Шоу"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-medium text-neutral-400 mb-1">
                Дата события
              </label>
              <input
                type="date"
                className="w-full bg-[#181a24] border border-white/[0.08] rounded-lg p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            {/* СЕРВЕРЫ */}
            <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 block">
                  Медиасерверы
                </label>
                {onOpenServerPresetsModal && (
                  <button
                    type="button"
                    onClick={onOpenServerPresetsModal}
                    className="p-1 rounded-lg hover:bg-white/[0.08] text-neutral-400 hover:text-emerald-400 transition"
                    title="Управление моделями медиасерверов"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </button>
                )}
              </div>

              {servers && servers.length > 0 ? (
                <div className="space-y-2">
                  {servers.map((srv, idx) => (
                    <div key={srv.id} className="flex items-center gap-2">
                      <span className="text-[11px] text-neutral-500 w-3.5 text-right font-mono">
                        {idx + 1}.
                      </span>
                      <select
                        className="flex-1 bg-[#181a24] border border-white/[0.08] rounded-lg p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                        value={srv.modelId}
                        onChange={(e) =>
                          onServerChange?.(srv.id, e.target.value)
                        }
                      >
                        {serverPresetsList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      {servers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onServerRemove?.(srv.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition"
                          title="Удалить сервер"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <select
                  className="w-full bg-[#181a24] border border-white/[0.08] rounded-lg p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  value={serverValue}
                  onChange={(e) => setServerId?.(e.target.value)}
                >
                  {serverPresetsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-2 pt-1">
                <select
                  className="flex-1 bg-[#181a24] border border-white/[0.08] rounded-lg p-2 text-xs text-neutral-300 focus:border-cyan-500 focus:outline-none"
                  value={newServerModelId}
                  onChange={(e) => setNewServerModelId(e.target.value)}
                >
                  {serverPresetsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onServerAdd?.(newServerModelId)}
                  className="px-3 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-medium transition whitespace-nowrap"
                >
                  + Добавить
                </button>
              </div>
            </div>
          </div>

          {/* СПЕЦИФИКАЦИЯ ОБОРУДОВАНИЯ */}
          <div className="p-3.5 rounded-xl bg-[#10121a] border border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
                Спецификация
              </div>
              <button
                type="button"
                onClick={handleCopySpec}
                className={[
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition",
                  copiedSpec
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    : "border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200",
                ].join(" ")}
                title="Скопировать спецификацию в буфер обмена"
              >
                {copiedSpec ? (
                  <>
                    <svg
                      className="w-3.5 h-3.5 text-emerald-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="font-semibold text-emerald-300">
                      Скопировано!
                    </span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>Скопировать</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              readOnly
              value={specText}
              rows={9}
              className="w-full bg-[#181a24] border border-white/[0.08] rounded-lg p-2.5 text-[11px] leading-relaxed text-neutral-300 font-mono resize-none focus:outline-none focus:border-cyan-500/50 select-all"
              title="Текст спецификации (можно выделить или нажать Скопировать)"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            {newProject && (
              <button
                className="w-full py-2.5 px-3 rounded-xl bg-[#141620] hover:bg-[#1a1d28] hover:border-emerald-500/30 text-neutral-200 hover:text-white border border-white/[0.08] text-xs font-medium transition active:scale-[0.99] flex items-center justify-center gap-1.5"
                onClick={newProject}
                title="Начать новый проект (Ctrl+N)"
              >
                <svg
                  className="w-3.5 h-3.5 text-emerald-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Новый проект</span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  Ctrl+N
                </span>
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-blue-500/20 transition active:scale-[0.99] flex items-center justify-center gap-1.5"
                onClick={saveJSON}
                title="Сохранить проект в .ss (Ctrl+S)"
              >
                <span>Сохранить проект</span>
                <span className="text-[10px] text-white/70 font-mono">
                  Ctrl+S
                </span>
              </button>
              <button
                className="py-2.5 px-3 rounded-xl bg-[#141620] hover:bg-[#1a1d28] text-neutral-200 border border-white/[0.08] text-xs font-medium transition flex items-center justify-center gap-1.5"
                onClick={openLoadJSONDialog}
              >
                Загрузить проект
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
