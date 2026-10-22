"use client";
import Image from "next/image";
import React, { useMemo, useState } from "react";
import {
  CARDS,
  SERVERS,
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
import MaskTab from "./MaskTab";
import SidebarCardsTab, { type SidebarCardInstance } from "./SidebarCardsTab";
import SidebarWiringTab from "./SidebarWiringTab";
import SidebarInfoTab from "./SidebarInfoTab";

type CardInstance = SidebarCardInstance;

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

  const selectedCard: CardInstance | null = useMemo(
    () => cards.find((c) => c.id === selectedCardId) ?? null,
    [cards, selectedCardId],
  );
  const selectedCardModel = useMemo(() => {
    if (selectedCard)
      return cardPresetsList.find((m) => m.id === selectedCard.modelId) ?? null;
    const mById = cardPresetsList.find((m) => m.id === cardName);
    if (mById) return mById;
    return cardPresetsList.find((m) => m.name === cardName) ?? null;
  }, [selectedCard, cardName, cardPresetsList]);

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
        <SidebarCardsTab
          cardPresetsList={cardPresetsList}
          cards={cards}
          selectedCardId={selectedCardId}
          onCardAdd={onCardAdd}
          onCardSelect={onCardSelect}
          onCardRemove={onCardRemove}
          setCardId={setCardId}
          onSwitchToWiring={() => setTab("wiring")}
          onOpenCardPresetsModal={onOpenCardPresetsModal}
          fiberCounts={fiberCounts}
          setFiberCounts={setFiberCounts}
          textOutline={textOutline}
        />
      )}
      {/* === TAB: Расключение === */}
      {tab === "wiring" && (
        <SidebarWiringTab
          wiringPages={wiringPages}
          activeWiringPageId={activeWiringPageId}
          onSelectWiringPage={onSelectWiringPage}
          onAddWiringPage={onAddWiringPage}
          onRemoveWiringPage={onRemoveWiringPage}
          onDuplicateWiringPage={onDuplicateWiringPage}
          presetId={presetId}
          setPresetId={setPresetId}
          presets={presets}
          onOpenPresetsModal={onOpenPresetsModal}
          setRows={setRows}
          setCols={setCols}
          createMatrix={createMatrix}
          clearAll={clearAll}
          duplicateSelectedPanels={duplicateSelectedPanels}
          copySelectedPanels={copySelectedPanels}
          cutSelectedPanels={cutSelectedPanels}
          pastePanels={pastePanels}
          canPaste={canPaste}
          clipboardCount={clipboardCount}
          hasPanelSelection={hasPanelSelection}
          setSelectedPanels={setSelectedPanels}
          cards={cards}
          cardPresetsList={cardPresetsList}
          selectedCardId={selectedCardId}
          onCardSelect={onCardSelect}
          selectedCard={selectedCard}
          selectedCardModel={selectedCardModel}
          tool={tool}
          setTool={setTool}
          activeLink={activeLink}
          setActiveLink={setActiveLink}
          autoSnakeH_TL={autoSnakeH_TL}
          autoSnakeH_TR={autoSnakeH_TR}
          autoSnakeH_BL={autoSnakeH_BL}
          autoSnakeH_BR={autoSnakeH_BR}
          autoSnakeV_TL={autoSnakeV_TL}
          autoSnakeV_TR={autoSnakeV_TR}
          autoSnakeV_BL={autoSnakeV_BL}
          autoSnakeV_BR={autoSnakeV_BR}
          clearSelectedWiring={clearSelectedWiring}
          exportPNG={exportPNG}
          textOutline={textOutline}
        />
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
        <SidebarInfoTab
          eventName={eventName}
          setEventName={setEventName}
          eventDate={eventDate}
          setEventDate={setEventDate}
          serverName={serverName}
          setServerId={setServerId}
          servers={servers}
          onServerAdd={onServerAdd}
          onServerRemove={onServerRemove}
          onServerChange={onServerChange}
          serverPresetsList={serverPresetsList}
          onOpenServerPresetsModal={onOpenServerPresetsModal}
          specText={specText}
          newProject={newProject}
          saveJSON={saveJSON}
          openLoadJSONDialog={openLoadJSONDialog}
        />
      )}
    </aside>
  );
}
