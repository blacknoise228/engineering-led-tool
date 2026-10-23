// src/components/led-editor-svg/EditorApp.tsx
'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import SvgStage from './SvgStage';
import PanelsLayer from './PanelsLayer';
import CablesLayer from './CablesLayer';
import SelectionMarquee from './SelectionMarquee';
import Sidebar from './Sidebar';

import {
  PRESETS,
  DEFAULT_PANEL_PRESETS,
  LINK_COLORS_16,
  CARDS,
  DEFAULT_CARD_PRESETS,
  SERVERS,
  DEFAULT_SERVER_PRESETS,
  DEFAULT_FIBER_PRESETS,
  CARD_COLORS,
  NOVASTAR_PORT_MAX_PIXELS_50HZ,
  type PanelPreset,
  type CardPreset,
  type ServerPreset,
  type FiberConverterPreset,
} from '@/lib/led-editor-svg/presets';
import {
  autoSnakeH_TL, autoSnakeH_TR, autoSnakeH_BL, autoSnakeH_BR,
  autoSnakeV_TL, autoSnakeV_TR, autoSnakeV_BL, autoSnakeV_BR,
  buildAddEdges,
} from '@/lib/led-editor-svg/autoconnect';
import {
  boundsOfPanels, clientToStage,
  rectsIntersect, uid
} from '@/lib/led-editor-svg/utils';
import type { CableEx, CardInstance, Panel, Tool, Vec, ScreenGroup, WiringPage, MaskPage, PanelClipboardData, MaskLogoConfig } from '@/lib/led-editor-svg/types';
import { DEFAULT_MASK_LOGO_CONFIG } from '@/lib/led-editor-svg/types';
import { exportPNGFunc } from '@/lib/led-editor/export-png';
import { snapFunc } from '@/lib/led-editor/snapping';
import { computeLabels } from '@/lib/led-editor/labels';
import { useHotkeys } from '@/lib/led-editor/hotkeys';
import { TEXTURES } from '@/lib/led-editor-svg/textures';
import { autoGroupPanels } from '@/lib/led-editor-svg/mask-contour';
import { exportMaskPNG, exportMaskZIP, prepareScreensData } from '@/lib/led-editor-svg/mask-export';
import MaskLayer from './MaskLayer';
import MaskPreviewModal from './MaskPreviewModal';
import MaskLogoModal from './MaskLogoModal';
import ConfirmModal from './ConfirmModal';
import PanelPresetsModal from './PanelPresetsModal';
import CardPresetsModal from './CardPresetsModal';
import ServerPresetsModal from './ServerPresetsModal';
import FiberPresetsModal from './FiberPresetsModal';
import EditorToolbar from './EditorToolbar';
import {
  isDesktopApp,
  openDesktopProject,
  saveDesktopProject,
  useToastListener,
  getInitialDesktopProject,
  readDesktopProjectFile,
  onDesktopProjectOpen,
  setupDesktopFileDrop,
  loadDesktopPanelPresets,
  saveDesktopPanelPresets,
  getDesktopPanelsConfigPath,
  loadDesktopCardPresets,
  saveDesktopCardPresets,
  getDesktopCardsConfigPath,
  loadDesktopServerPresets,
  saveDesktopServerPresets,
  getDesktopServersConfigPath,
  loadDesktopFiberPresets,
  saveDesktopFiberPresets,
  getDesktopFibersConfigPath,
  loadDesktopMaskLogoConfig,
  saveDesktopMaskLogoConfig,
} from '@/lib/desktop';

export type { CableEx, CardInstance };

export default function EditorApp() {
  // ======== VIEW ========
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [pan, setPan] = useState<Vec>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  // ======== DATA ========
  const [panelPresets, setPanelPresets] = useState<PanelPreset[]>(DEFAULT_PANEL_PRESETS);
  const [panelsConfigPath, setPanelsConfigPath] = useState<string>('');
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [presetId, setPresetId] = useState(DEFAULT_PANEL_PRESETS[0]?.id || PRESETS[0].id);

  const [cardPresets, setCardPresets] = useState<CardPreset[]>(DEFAULT_CARD_PRESETS);
  const [cardsConfigPath, setCardsConfigPath] = useState<string>('');
  const [isCardPresetsModalOpen, setIsCardPresetsModalOpen] = useState(false);

  const [serverPresets, setServerPresets] = useState<ServerPreset[]>(DEFAULT_SERVER_PRESETS);
  const [serversConfigPath, setServersConfigPath] = useState<string>('');
  const [isServerPresetsModalOpen, setIsServerPresetsModalOpen] = useState(false);

  const [fiberPresets, setFiberPresets] = useState<FiberConverterPreset[]>(DEFAULT_FIBER_PRESETS);
  const [fibersConfigPath, setFibersConfigPath] = useState<string>('');
  const [isFiberPresetsModalOpen, setIsFiberPresetsModalOpen] = useState(false);

  const [maskLogoConfig, setMaskLogoConfig] = useState<MaskLogoConfig>(DEFAULT_MASK_LOGO_CONFIG);
  const [isMaskLogoModalOpen, setIsMaskLogoModalOpen] = useState(false);

  const [rows, setRows] = useState(0);
  const [cols, setCols] = useState(0);

  // ======== WIRING PAGES ========
  const [wiringPages, setWiringPages] = useState<WiringPage[]>([
    { id: 'wiring-1', name: 'Schema 1', panels: [], cables: [] },
  ]);
  const [activeWiringPageId, setActiveWiringPageId] = useState<string>('wiring-1');

  const activeWiringPage = useMemo(
    () => wiringPages.find(p => p.id === activeWiringPageId) ?? wiringPages[0],
    [wiringPages, activeWiringPageId]
  );

  const panels = useMemo(() => activeWiringPage?.panels ?? [], [activeWiringPage]);
  const cables = useMemo(() => activeWiringPage?.cables ?? [], [activeWiringPage]);

  const setPanels = useCallback((action: React.SetStateAction<Panel[]>) => {
    setWiringPages(prev => prev.map(page => {
      if (page.id !== activeWiringPageId) return page;
      const nextPanels = typeof action === 'function' ? action(page.panels) : action;
      return { ...page, panels: nextPanels };
    }));
  }, [activeWiringPageId]);

  const setCables = useCallback((action: React.SetStateAction<CableEx[]>) => {
    setWiringPages(prev => prev.map(page => {
      if (page.id !== activeWiringPageId) return page;
      const nextCables = typeof action === 'function' ? action(page.cables) : action;
      return { ...page, cables: nextCables };
    }));
  }, [activeWiringPageId]);

  // ======== META (PNG легенда) ========
  const [eventName, setEventName] = useState('Event');
  const [eventDate, setEventDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [servers, setServers] = useState<Array<{ id: string; modelId: string }>>([
    { id: 'srv-1', modelId: SERVERS[0]?.id ?? 'hp-z2' }
  ]);
  const [cardId, setCardId] = useState<string>(''); // селектор модели в Info
  // РУЧНОЙ УЧЁТ ОПТИКИ/ЦВТ: { converterId: count }
  const [fiberCounts, setFiberCounts] = useState<Record<string, number>>({});


  // ======== NEW: КАРТЫ ========
  const [cards, setCards] = useState<CardInstance[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const selectedCard = useMemo(
    () => cards.find(c => c.id === selectedCardId) ?? null,
    [cards, selectedCardId]
  );

  // активный порт выбранной карты
  const [activeLink, setActiveLink] = useState<number>(0);
  const activeLinkRef = useRef(activeLink);
  useEffect(() => { activeLinkRef.current = activeLink; }, [activeLink]);

  // selection
  const [selectedPanels, setSelectedPanels] = useState<Set<string>>(new Set());
  const [selectedCables, setSelectedCables] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<Tool>('select');

  // ручная протяжка (превью)
  const [draft, setDraft] = useState<{ fromId: string; mouse: Vec } | null>(null);

  // буфер обмена для панелей (копирование/вырезание между схемами)
  const [clipboard, setClipboard] = useState<PanelClipboardData | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('masker_panel_clipboard');
      if (saved) setClipboard(JSON.parse(saved));
    } catch {}
  }, []);

  // текущий файл проекта (для перезаписи при Ctrl+S)
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);

  // уведомления (toast)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  // слушаем глобальные уведомления (например, от экспорта PNG)
  useToastListener(showToast);

  // рамка выделения
  const marqueeStart = useRef<Vec | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // групповой драг
  const dragGroup = useRef<null | {
    ids: string[];
    startClient: Vec;
    starts: Record<string, Vec>;
  }>(null);

  // JSON I/O
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ======== TABS & VIEW MODE ========
  const [activeTab, setActiveTab] = useState<'cards' | 'wiring' | 'mask' | 'info'>('wiring');

  // ======== MASK PAGES / ЭКРАНЫ ========
  const [maskPages, setMaskPages] = useState<MaskPage[]>([
    { id: 'mask-1', name: 'Page 1', screenGroups: [] },
  ]);
  const [activeMaskPageId, setActiveMaskPageId] = useState<string>('mask-1');

  const activeMaskPage = useMemo(
    () => maskPages.find(p => p.id === activeMaskPageId) ?? maskPages[0],
    [maskPages, activeMaskPageId]
  );

  const screenGroups = useMemo(() => activeMaskPage?.screenGroups ?? [], [activeMaskPage]);

  const setScreenGroups = useCallback((action: React.SetStateAction<ScreenGroup[]>) => {
    setMaskPages(prev => prev.map(page => {
      if (page.id !== activeMaskPageId) return page;
      const nextGroups = typeof action === 'function' ? action(page.screenGroups) : action;
      return { ...page, screenGroups: nextGroups };
    }));
  }, [activeMaskPageId]);

  // Агрегаты по всем страницам
  const allPanels = useMemo(() => wiringPages.flatMap(p => p.panels), [wiringPages]);
  const allCables = useMemo(() => wiringPages.flatMap(p => p.cables), [wiringPages]);
  const allScreenGroups = useMemo(() => maskPages.flatMap(p => p.screenGroups), [maskPages]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const selectedGroupId = useMemo(() => Array.from(selectedGroupIds)[0] ?? null, [selectedGroupIds]);

  const onSelectGroup = useCallback((groupId: string | null, multi = false) => {
    if (!groupId) {
      setSelectedGroupIds(new Set());
      return;
    }
    setSelectedGroupIds(prev => {
      if (multi) {
        const next = new Set(prev);
        if (next.has(groupId)) next.delete(groupId);
        else next.add(groupId);
        return next;
      }
      return new Set([groupId]);
    });
  }, []);

  const setSelectedGroupId = useCallback((val: string | null | ((prev: string | null) => string | null)) => {
    if (typeof val === 'function') {
      setSelectedGroupIds(curr => {
        const currFirst = Array.from(curr)[0] ?? null;
        const next = val(currFirst);
        return next ? new Set([next]) : new Set();
      });
    } else {
      setSelectedGroupIds(val ? new Set([val]) : new Set());
    }
  }, []);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // ======== UNDO / REDO ========
  type Snapshot = {
    wiringPages: WiringPage[];
    activeWiringPageId: string;
    maskPages: MaskPage[];
    activeMaskPageId: string;
    cards: CardInstance[];
    selectedCardId: string | null;
    activeLink: number;
    servers: Array<{ id: string; modelId: string }>;
  };
  const undoRef = useRef<Snapshot[]>([]);
  const redoRef = useRef<Snapshot[]>([]);
  const takeSnapshot = useCallback((): Snapshot => ({
    wiringPages: JSON.parse(JSON.stringify(wiringPages)),
    activeWiringPageId,
    maskPages: JSON.parse(JSON.stringify(maskPages)),
    activeMaskPageId,
    cards: JSON.parse(JSON.stringify(cards)),
    selectedCardId,
    activeLink,
    servers: JSON.parse(JSON.stringify(servers)),
  }), [wiringPages, activeWiringPageId, maskPages, activeMaskPageId, cards, selectedCardId, activeLink, servers]);

  const pushHistory = useCallback(() => {
    undoRef.current.push(takeSnapshot());
    redoRef.current = [];
  }, [takeSnapshot]);

  const undo = useCallback(() => {
    if (!undoRef.current.length) return;
    const prev = undoRef.current.pop()!;
    redoRef.current.push(takeSnapshot());
    setWiringPages(prev.wiringPages);
    setActiveWiringPageId(prev.activeWiringPageId);
    setMaskPages(prev.maskPages);
    setActiveMaskPageId(prev.activeMaskPageId);
    setCards(prev.cards);
    setSelectedCardId(prev.selectedCardId);
    setActiveLink(prev.activeLink);
    if (prev.servers) setServers(prev.servers);
  }, [takeSnapshot]);

  const redo = useCallback(() => {
    if (!redoRef.current.length) return;
    const s = redoRef.current.pop()!;
    undoRef.current.push(takeSnapshot());
    setWiringPages(s.wiringPages);
    setActiveWiringPageId(s.activeWiringPageId);
    setMaskPages(s.maskPages);
    setActiveMaskPageId(s.activeMaskPageId);
    setCards(s.cards);
    setSelectedCardId(s.selectedCardId);
    setActiveLink(s.activeLink);
    if (s.servers) setServers(s.servers);
  }, [takeSnapshot]);

  // ======== МЕТОДЫ УПРАВЛЕНИЯ СТРАНИЦАМИ РАСКЛЮЧЕНИЯ ========
  const addWiringPage = useCallback(() => {
    pushHistory();
    const newIdx = wiringPages.length + 1;
    const newPage: WiringPage = {
      id: uid('page'),
      name: `Schema ${newIdx}`,
      panels: [],
      cables: [],
    };
    setWiringPages(prev => [...prev, newPage]);
    setActiveWiringPageId(newPage.id);
    setSelectedPanels(new Set());
    setSelectedCables(new Set());
    setDraft(null);
  }, [wiringPages.length, pushHistory]);

  const removeWiringPage = useCallback((pageId: string) => {
    if (wiringPages.length <= 1) return;
    pushHistory();
    setWiringPages(prev => prev.filter(p => p.id !== pageId));
    if (activeWiringPageId === pageId) {
      const remaining = wiringPages.filter(p => p.id !== pageId);
      setActiveWiringPageId(remaining[0].id);
    }
    setSelectedPanels(new Set());
    setSelectedCables(new Set());
    setDraft(null);
  }, [wiringPages, activeWiringPageId, pushHistory]);

  const renameWiringPage = useCallback((pageId: string, newName: string) => {
    setWiringPages(prev => prev.map(p => p.id === pageId ? { ...p, name: newName } : p));
  }, []);

  const duplicateWiringPage = useCallback((pageId: string) => {
    const target = wiringPages.find(p => p.id === pageId);
    if (!target) return;
    pushHistory();
    const idMap = new Map<string, string>();
    const clonedPanels = target.panels.map(p => {
      const newId = uid('p');
      idMap.set(p.id, newId);
      return { ...p, id: newId };
    });
    const clonedCables = target.cables.map(c => ({
      ...c,
      id: uid('c'),
      a: idMap.get(c.a) ?? c.a,
      b: idMap.get(c.b) ?? c.b,
    }));
    const newPage: WiringPage = {
      id: uid('page'),
      name: `${target.name} (copy)`,
      panels: clonedPanels,
      cables: clonedCables,
    };
    setWiringPages(prev => [...prev, newPage]);
    setActiveWiringPageId(newPage.id);
    setSelectedPanels(new Set());
    setSelectedCables(new Set());
  }, [wiringPages, pushHistory]);

  const switchWiringPage = useCallback((pageId: string) => {
    if (pageId === activeWiringPageId) return;
    setActiveWiringPageId(pageId);
    setSelectedPanels(new Set());
    setSelectedCables(new Set());
    setDraft(null);
  }, [activeWiringPageId]);

  // ======== МЕТОДЫ УПРАВЛЕНИЯ СТРАНИЦАМИ МАСКИ ========
  const addMaskPage = useCallback(() => {
    pushHistory();
    const newIdx = maskPages.length + 1;
    const newPage: MaskPage = {
      id: uid('mask'),
      name: `Page ${newIdx}`,
      screenGroups: [],
    };
    setMaskPages(prev => [...prev, newPage]);
    setActiveMaskPageId(newPage.id);
    setSelectedGroupId(null);
  }, [maskPages.length, pushHistory, setSelectedGroupId]);

  const removeMaskPage = useCallback((pageId: string) => {
    if (maskPages.length <= 1) return;
    pushHistory();
    setMaskPages(prev => prev.filter(p => p.id !== pageId));
    if (activeMaskPageId === pageId) {
      const remaining = maskPages.filter(p => p.id !== pageId);
      setActiveMaskPageId(remaining[0].id);
    }
    setSelectedGroupId(null);
  }, [maskPages, activeMaskPageId, pushHistory, setSelectedGroupId]);

  const renameMaskPage = useCallback((pageId: string, newName: string) => {
    setMaskPages(prev => prev.map(p => p.id === pageId ? { ...p, name: newName } : p));
  }, []);

  const duplicateMaskPage = useCallback((pageId: string) => {
    const target = maskPages.find(p => p.id === pageId);
    if (!target) return;
    pushHistory();
    const newPage: MaskPage = {
      id: uid('mask'),
      name: `${target.name} (copy)`,
      screenGroups: target.screenGroups.map(g => ({ ...g, id: uid('screen') })),
    };
    setMaskPages(prev => [...prev, newPage]);
    setActiveMaskPageId(newPage.id);
    setSelectedGroupId(null);
  }, [maskPages, pushHistory, setSelectedGroupId]);

  const switchMaskPage = useCallback((pageId: string) => {
    if (pageId === activeMaskPageId) return;
    setActiveMaskPageId(pageId);
    setSelectedGroupId(null);
  }, [activeMaskPageId, setSelectedGroupId]);

  const addScreensFromWiringPage = useCallback((wiringPageId: string) => {
    const targetPage = wiringPages.find(p => p.id === wiringPageId);
    if (!targetPage || !targetPage.panels.length) return;
    pushHistory();
    const newGroups = autoGroupPanels(targetPage.panels, screenGroups);
    setScreenGroups(newGroups);
  }, [wiringPages, screenGroups, pushHistory, setScreenGroups]);

  const onServerAdd = useCallback((modelId: string) => {
    pushHistory();
    setServers(prev => [...prev, { id: uid('srv'), modelId }]);
  }, [pushHistory]);

  const onServerRemove = useCallback((id: string) => {
    pushHistory();
    setServers(prev => prev.length > 1 ? prev.filter(s => s.id !== id) : prev);
  }, [pushHistory]);

  const onServerChange = useCallback((id: string, modelId: string) => {
    pushHistory();
    setServers(prev => prev.map(s => s.id === id ? { ...s, modelId } : s));
  }, [pushHistory]);

  const colorForOrder = useCallback((order: number) => {
    const i = Math.max(0, order - 1) % CARD_COLORS.length;
    return CARD_COLORS[i];
  }, []);

  const panelsById = useMemo(() => Object.fromEntries(panels.map(p => [p.id, p])), [panels]);

  /** Цвет панели по карте из её ярлыка S{card}-{port}-{n} */
  const getPanelCardColor = useCallback((panelId: string) => {
    const p = panelsById[panelId];
    if (!p || !p.label) return null;
    const m = /^S(\d+)-/.exec(p.label);
    if (!m) return null;
    const order = parseInt(m[1], 10);
    const cardInst = cards.find((c) => c.order === order);
    return cardInst?.color ?? colorForOrder(order);
  }, [panelsById, cards, colorForOrder]);

  // активный порт — в пределах выбранной карты
  useEffect(() => {
    if (!selectedCard) return;
    const ports = CARDS.find(m => m.id === selectedCard.modelId)?.outputPorts ?? 0;
    if (ports === 0) setActiveLink(0);
    else if (activeLink >= ports) setActiveLink(0);
  }, [selectedCard, activeLink]);

  // ======== МАТРИЦА ПАНЕЛЕЙ ========
  const createMatrix = useCallback(() => {
    const pr = panelPresets.find(p => p.id === presetId) || panelPresets[0] || PRESETS[0];
    const gap = 0;
    const margin = 40;

    let startX = 120, startY = 120;
    if (panels.length) {
      const { minY, maxX } = boundsOfPanels(panels);
      startX = maxX + margin;
      startY = minY;
    }

    const newPanels: Panel[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        newPanels.push({
          id: uid('p'), row: r, col: c,
          x: startX + c * (pr.w / 5 + gap),
          y: startY + r * (pr.h / 5 + gap),
          w: pr.w / 5, h: pr.h / 5, r: 0,
          resH: pr.resH, resW: pr.resW, pitch_mm: pr.pitch_mm,
          label: '', presetId: pr.id, presetName: pr.name,
          special: pr.special,
        });
      }
    }

    pushHistory();
    setPanels(prev => [...prev, ...newPanels]);
    setSelectedPanels(new Set());
    setSelectedCables(new Set());
    setDraft(null);
  }, [cols, rows, presetId, panelPresets, panels, pushHistory, setPanels]);
  
  const clearAll = useCallback(() => {
    pushHistory();
    setWiringPages([{ id: 'wiring-1', name: 'Schema 1', panels: [], cables: [] }]);
    setActiveWiringPageId('wiring-1');
    setSelectedPanels(new Set()); setSelectedCables(new Set());
    setDraft(null);
    setCards([]); setSelectedCardId(null); setActiveLink(0);
    setMaskPages([{ id: 'mask-1', name: 'Page 1', screenGroups: [] }]);
    setActiveMaskPageId('mask-1');
    setSelectedGroupId(null);
  }, [pushHistory, setSelectedGroupId]);

  useEffect(() => {
    if (panels.length > 0 && screenGroups.length === 0 && maskPages.length === 1 && wiringPages.length === 1) {
      setScreenGroups(autoGroupPanels(panels));
    }
  }, [panels, screenGroups.length, maskPages.length, wiringPages.length, setScreenGroups]);

  // ======== SNAP ========
  type XEdge = 'L' | 'R'; type YEdge = 'T' | 'B';
  const snapLock = useRef<{
    x: { kind: 'edge' | 'grid'; mId: string; mEdge: XEdge; target: number } | null;
    y: { kind: 'edge' | 'grid'; mId: string; mEdge: YEdge; target: number } | null;
  }>({ x: null, y: null });

  const applySnapToDelta = useCallback(
    (ids: Set<string>, rawDx: number, rawDy: number) => {
      return snapFunc(panels, snapLock, ids, rawDx, rawDy)
    },
    [panels]
  );

  // ======== WIRING RULES ========
  const degreeOf = useCallback((id: string, list: { a: string; b: string }[] = cables) =>
    list.reduce((n, c) => n + ((c.a === id || c.b === id) ? 1 : 0), 0), [cables]);

  const hasPair = useCallback((a: string, b: string, list: { a: string; b: string }[] = cables) =>
    list.some(c => (c.a === a && c.b === b) || (c.a === b && c.b === a)), [cables]);

  /** Панель уже привязана к другой карте/порту? */
  const panelHasOtherAssignment = useCallback((panelId: string, cardNo: number, link: number) => {
    for (const c of cables) {
      if (c.a !== panelId && c.b !== panelId) continue;
      const cCard = (c as CableEx).card ?? 1;
      const cLink = c.link;
      if (cCard !== cardNo || cLink !== link) return true;
    }
    return false;
  }, [cables]);

  /** Пиксели прямоугольника для (cardNo, link) + extras; проверка лимита @50Hz */
  const bboxPixelsFor = useCallback((
    cardNo: number,
    link: number,
    extras: string[] = []
  ): { ok: boolean; pixels: number; widthPx: number; heightPx: number; limit: number } => {
    const nodeIds = new Set<string>();
    for (const c of cables) {
      const cc = c as CableEx;
      if ((cc.card ?? 0) === cardNo && cc.link === link) {
        nodeIds.add(cc.a);
        nodeIds.add(cc.b);
      }
    }
    extras.forEach(id => nodeIds.add(id));

    const arr: Panel[] = Array.from(nodeIds)
      .map(id => panelsById[id])
      .filter((pp): pp is Panel => Boolean(pp));

    const limit = NOVASTAR_PORT_MAX_PIXELS_50HZ;

    if (!arr.length) {
      return { ok: true, pixels: 0, widthPx: 0, heightPx: 0, limit };
    }

    // Проверяем одинаковую плотность px/мм в группе
    for (let i = 1; i < arr.length; i++) {
      const a = arr[0], b = arr[i];
      const kxA = a.resW / a.w, kyA = a.resH / a.h;
      const kxB = b.resW / b.w, kyB = b.resH / b.h;
      if (Math.abs(kxA - kxB) > 1e-6 || Math.abs(kyA - kyB) > 1e-6) {
        return { ok: false, pixels: 0, widthPx: 0, heightPx: 0, limit };
      }
    }

    const kx = arr[0].resW / arr[0].w;
    const ky = arr[0].resH / arr[0].h;

    const bb = boundsOfPanels(arr); // { minX, minY, maxX, maxY }
    const widthMm = Math.max(0, bb.maxX - bb.minX);
    const heightMm = Math.max(0, bb.maxY - bb.minY);

    const widthPx = Math.round(widthMm * kx);
    const heightPx = Math.round(heightMm * ky);
    const pixels = widthPx * heightPx;

    return { ok: true, pixels, widthPx, heightPx, limit };
  }, [cables, panelsById]);

  const willPortFit = useCallback((cardNo: number, link: number, extras: string[] = []) => {
    const r = bboxPixelsFor(cardNo, link, extras);
    return r.ok && r.pixels <= r.limit;
  }, [bboxPixelsFor]);

  /** Выбор линка (порта) с учётом уже назначений в пределах выбранной карты */
  const chooseLinkFor = useCallback((aId: string, bId: string, desired: number, cardNo: number): number | null => {
    let la: number | null = null, lb: number | null = null;
    for (const c of cables) {
      const cc = c as CableEx;
      if (cc.a !== aId && cc.b !== aId && cc.a !== bId && cc.b !== bId) continue;
      const cCard = cc.card ?? 1;
      if (cCard !== cardNo) {
        if (cc.a === aId || cc.b === aId || cc.a === bId || cc.b === bId) return null; // другая карта
      } else {
        if (cc.a === aId || cc.b === aId) la = cc.link;
        if (cc.a === bId || cc.b === bId) lb = cc.link;
      }
    }
    if (la !== null && lb !== null && la !== lb) return null;
    return la ?? lb ?? desired;
  }, [cables]);

  const addCable = useCallback((aId: string, bId: string) => {
    if (!selectedCard) return; // прошивка только при выбранной карте
    if (hasPair(aId, bId)) return;
    if (degreeOf(aId) >= 2 || degreeOf(bId) >= 2) return;

    // запрет «одна панель в двух картах»
    const panelCard = (panelId: string): number | null => {
      for (const c of cables) {
        const cc = c as CableEx;
        if (c.a === panelId || c.b === panelId) return typeof cc.card === 'number' ? cc.card : null;
      }
      return null;
    };
    const cardNo = selectedCard.order;
    const pa = panelCard(aId), pb = panelCard(bId);
    if ((pa !== null && pa !== cardNo) || (pb !== null && pb !== cardNo)) return; // конфликт карты

    // порт (link) должен совпадать внутри цепочки
    const desired = activeLinkRef.current;
    const link = chooseLinkFor(aId, bId, desired, cardNo);
    if (link === null) return;

    // лимит пикселей прямоугольника для этого (cardNo, link)
    const { ok, pixels, limit } = bboxPixelsFor(cardNo, link, [aId, bId]);
    if (!ok || pixels > limit) return;

    pushHistory();
    setCables(prev => [...prev, {
      id: uid('c'),
      a: aId,
      b: bId,
      link,
      color: selectedCard.portColors[link] ?? LINK_COLORS_16[link] ?? '#9ca3af',
      card: cardNo,
    }]);
  }, [selectedCard, chooseLinkFor, degreeOf, hasPair, bboxPixelsFor, pushHistory, cables, setCables]);

  // ======== PANEL MOUSE DOWN ========
  const onPanelMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    snapLock.current.x = null; snapLock.current.y = null;

    // РУЧНОЕ РАСКЛЮЧЕНИЕ
    if (tool === 'cable') {
      if (!selectedCard) return; // запрещено без карты
      if (e.button === 2) { setDraft(null); setTool('select'); return; }
      if (e.button !== 0) return;

      const p = panelsById[id];
      if (!p) return;
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2;

      if (!draft) {
        setDraft({ fromId: id, mouse: { x: cx, y: cy } });
      } else if (draft.fromId !== id) {
        addCable(draft.fromId, id);
        setDraft({ fromId: id, mouse: { x: cx, y: cy } });
      }
      return;
    }

    // ВЫДЕЛЕНИЕ
    const multi = e.ctrlKey || e.metaKey || e.shiftKey;
    let nextSel = new Set<string>(selectedPanels);
    const alreadySelected = nextSel.has(id);

    if (multi) {
      if (alreadySelected) nextSel.delete(id); else nextSel.add(id);
    } else {
      if (!alreadySelected) { nextSel = new Set([id]); }
    }

    setSelectedPanels(nextSel);
    setSelectedCables(new Set());
    setDraft(null);

    // старт группового драга
    pushHistory();
    const starts: Record<string, Vec> = {};
    for (const p of panels) if (nextSel.has(p.id)) starts[p.id] = { x: p.x, y: p.y };
    dragGroup.current = { ids: Array.from(nextSel), startClient: { x: e.clientX, y: e.clientY }, starts };
  }, [tool, draft, panelsById, selectedPanels, panels, addCable, pushHistory, selectedCard]);

  // ======== CABLE CLICK ========
  const onCableMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    const multi = e.ctrlKey || e.metaKey || e.shiftKey;
    setSelectedCables(prev => {
      const nextSet = new Set(prev);
      if (multi) { if (nextSet.has(id)) nextSet.delete(id); else nextSet.add(id); }
      else { nextSet.clear(); nextSet.add(id); }
      return nextSet;
    });
    setSelectedPanels(new Set());
    setDraft(null);
  }, []);

  // ======== BG / MARQUEE ========
  const marqueeMulti = useRef(false);
  const onBgPointerDown = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    if (e.button !== 1 && !e.shiftKey) {
      const svg = svgRef.current; if (!svg) return;
      const pt = clientToStage(e.clientX, e.clientY, svg, pan, scale);
      marqueeStart.current = pt;
      marqueeMulti.current = Boolean(e.ctrlKey || e.metaKey || e.shiftKey);
      setMarquee({ x: pt.x, y: pt.y, w: 0, h: 0 });
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        setSelectedPanels(new Set());
        setSelectedCables(new Set());
        setSelectedGroupIds(new Set());
      }
      setDraft(null);
    }
  }, [pan, scale]);

  const onPointerUp = useCallback(() => {
    snapLock.current.x = null; snapLock.current.y = null;

    if (marquee && marqueeStart.current) {
      const rect = marquee;
      const isDrag = Math.abs(rect.w) > 3 || Math.abs(rect.h) > 3;
      if (isDrag) {
        if (activeTab === 'mask') {
          const screens = prepareScreensData(allPanels, screenGroups).screens;
          const newly = screens
            .filter(s => rectsIntersect(rect, { x: s.posX, y: s.posY, w: s.wPx, h: s.hPx }))
            .map(s => s.group.id);
          setSelectedGroupIds(prev => {
            const nextSel = marqueeMulti.current ? new Set(prev) : new Set<string>();
            newly.forEach(id => nextSel.add(id));
            return nextSel;
          });
        } else {
          const newly = panels.filter(p => rectsIntersect(rect, p)).map(p => p.id);
          setSelectedPanels(prev => {
            const nextSel = marqueeMulti.current ? new Set(prev) : new Set(newly);
            if (marqueeMulti.current) {
              newly.forEach(pid => nextSel.add(pid));
            }
            return nextSel;
          });
          setSelectedCables(new Set());
        }
      }
    }
    marqueeStart.current = null;
    setMarquee(null);
    dragGroup.current = null;
  }, [marquee, activeTab, allPanels, screenGroups, panels]);

  // ======== CLEAR SELECTED WIRING ========
  const clearSelectedWiring = useCallback(() => {
    if (!selectedPanels.size) return;
    pushHistory();
    const kill = new Set(selectedPanels);
    setCables(cs => cs.filter(c => !kill.has(c.a) && !kill.has(c.b)));
  }, [selectedPanels, pushHistory, setCables]);

  // ======== DELETE SELECTED ========
  const deleteSelected = useCallback(() => {
    if (activeTab === 'mask' || (selectedGroupIds.size && !selectedPanels.size && !selectedCables.size)) {
      if (!selectedGroupIds.size) return;
      pushHistory();
      const killIds = new Set(selectedGroupIds);
      setScreenGroups(prev => prev.filter(g => !killIds.has(g.id)));
      setSelectedGroupIds(new Set());
      return;
    }

    if (!selectedPanels.size && !selectedCables.size) return;
    pushHistory();
    if (selectedPanels.size) {
      const killPanels = new Set(selectedPanels);
      setPanels(ps => ps.filter(p => !killPanels.has(p.id)));
      setCables(cs => cs.filter(c => !killPanels.has(c.a) && !killPanels.has(c.b)));
      setScreenGroups(groups =>
        groups
          .map(g => ({
            ...g,
            panelIds: g.panelIds.filter(id => !killPanels.has(id)),
          }))
          .filter(g => g.panelIds.length > 0)
      );
      setSelectedGroupIds(curr => {
        const next = new Set(curr);
        for (const id of curr) {
          if (!screenGroups.some(g => g.id === id && g.panelIds.some(pid => !killPanels.has(pid)))) {
            next.delete(id);
          }
        }
        return next;
      });
      setSelectedPanels(new Set());
    }
    if (selectedCables.size) {
      const killCables = new Set(selectedCables);
      setCables(cs => cs.filter(c => !killCables.has(c.id)));
      setSelectedCables(new Set());
    }
  }, [activeTab, selectedGroupIds, selectedPanels, selectedCables, screenGroups, pushHistory, setPanels, setCables, setScreenGroups]);

  // ======== PNG EXPORT ========
  const exportPNG = useCallback(() => {
    exportPNGFunc(svgRef, panels, pan, scale, eventName, activeWiringPage.name);
  }, [svgRef, panels, pan, scale, eventName, activeWiringPage.name]);

  // ======== APPLY LOADED PROJECT DATA ========
  const applyProjectData = useCallback((data: {
    meta?: { presetId?: string; rows?: number; cols?: number };
    wiringPages?: WiringPage[];
    activeWiringPageId?: string;
    maskPages?: MaskPage[];
    activeMaskPageId?: string;
    panels?: Panel[];
    cables?: CableEx[];
    cards?: CardInstance[];
    selectedCardId?: string | null;
    activeLink?: number;
    fiberCounts?: Record<string, number>;
    eventName?: string;
    eventDate?: string;
    servers?: Array<{ id: string; modelId: string }>;
    serverId?: string;
    screenGroups?: ScreenGroup[];
  }) => {
    let parsedWiringPages: WiringPage[] = [];
    let parsedActiveWiringPageId = 'wiring-1';
    if (Array.isArray(data.wiringPages) && data.wiringPages.length > 0) {
      parsedWiringPages = data.wiringPages;
      parsedActiveWiringPageId = data.activeWiringPageId ?? data.wiringPages[0].id;
    } else if (Array.isArray(data.panels) && Array.isArray(data.cables)) {
      parsedWiringPages = [{
        id: 'wiring-1',
        name: 'Schema 1',
        panels: data.panels,
        cables: data.cables,
      }];
      parsedActiveWiringPageId = 'wiring-1';
    }

    if (parsedWiringPages.length > 0) {
      setWiringPages(parsedWiringPages);
      setActiveWiringPageId(parsedActiveWiringPageId);

      let parsedMaskPages: MaskPage[] = [];
      let parsedActiveMaskPageId = 'mask-1';
      if (Array.isArray(data.maskPages) && data.maskPages.length > 0) {
        parsedMaskPages = data.maskPages;
        parsedActiveMaskPageId = data.activeMaskPageId ?? data.maskPages[0].id;
      } else if (Array.isArray(data.screenGroups) && data.screenGroups.length > 0) {
        parsedMaskPages = [{
          id: 'mask-1',
          name: 'Page 1',
          screenGroups: data.screenGroups,
        }];
        parsedActiveMaskPageId = 'mask-1';
      } else {
        const allP = parsedWiringPages.flatMap(wp => wp.panels);
        parsedMaskPages = [{
          id: 'mask-1',
          name: 'Page 1',
          screenGroups: autoGroupPanels(allP),
        }];
        parsedActiveMaskPageId = 'mask-1';
      }
      setMaskPages(parsedMaskPages);
      setActiveMaskPageId(parsedActiveMaskPageId);

      if (Array.isArray(data.cards)) setCards(data.cards);
      setSelectedCardId(data.selectedCardId ?? null);
      if (typeof data.activeLink === 'number') setActiveLink(data.activeLink);
      if (data.meta?.presetId) setPresetId(data.meta.presetId);
      if (data.eventName) setEventName(data.eventName);
      if (data.eventDate) setEventDate(data.eventDate);
      if (Array.isArray(data.servers) && data.servers.length > 0) {
        setServers(data.servers);
      } else if (data.serverId) {
        setServers([{ id: 'srv-1', modelId: data.serverId }]);
      }
      if (data.fiberCounts && typeof data.fiberCounts === 'object') {
        setFiberCounts(data.fiberCounts as Record<string, number>);
      }
      if (typeof data.meta?.rows === 'number') setRows(data.meta.rows);
      if (typeof data.meta?.cols === 'number') setCols(data.meta.cols);
      setSelectedGroupId(null);
      setSelectedPanels(new Set());
      setSelectedCables(new Set());
      setDraft(null);
      undoRef.current = []; redoRef.current = [];
    }
  }, [setSelectedGroupId]);

  // ======== LOAD PRESETS FROM CONFIG FILES ========
  useEffect(() => {
    const initPresetConfig = async <T,>(
      getPath: () => Promise<string>,
      load: () => Promise<{ filePath: string; content: string } | null>,
      save: (json: string) => Promise<string | null>,
      defaults: T[],
      setPresets: React.Dispatch<React.SetStateAction<T[]>>,
      setPath: React.Dispatch<React.SetStateAction<string>>,
      onLoaded?: (list: T[]) => void
    ) => {
      const p = await getPath();
      if (p) setPath(p);
      const res = await load();
      if (res) {
        if (res.filePath) setPath(res.filePath);
        if (res.content && res.content.trim()) {
          try {
            const parsed = JSON.parse(res.content);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPresets(parsed);
              onLoaded?.(parsed);
              return;
            }
          } catch (e) {
            console.error('Failed to parse preset config:', e);
          }
        }
      }
      save(JSON.stringify(defaults, null, 2))
        .then(savedPath => {
          if (savedPath) setPath(savedPath);
        })
        .catch(e => console.error('Failed to initialize preset config:', e));
    };

    initPresetConfig(
      getDesktopPanelsConfigPath,
      loadDesktopPanelPresets,
      saveDesktopPanelPresets,
      DEFAULT_PANEL_PRESETS,
      setPanelPresets,
      setPanelsConfigPath,
      parsed => setPresetId(prev => (parsed.some(p => p.id === prev) ? prev : parsed[0].id))
    );
    initPresetConfig(
      getDesktopCardsConfigPath,
      loadDesktopCardPresets,
      saveDesktopCardPresets,
      DEFAULT_CARD_PRESETS,
      setCardPresets,
      setCardsConfigPath
    );
    initPresetConfig(
      getDesktopServersConfigPath,
      loadDesktopServerPresets,
      saveDesktopServerPresets,
      DEFAULT_SERVER_PRESETS,
      setServerPresets,
      setServersConfigPath
    );
    initPresetConfig(
      getDesktopFibersConfigPath,
      loadDesktopFiberPresets,
      saveDesktopFiberPresets,
      DEFAULT_FIBER_PRESETS,
      setFiberPresets,
      setFibersConfigPath
    );

    loadDesktopMaskLogoConfig().then(raw => {
      if (raw && raw.trim()) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            setMaskLogoConfig({
              ...DEFAULT_MASK_LOGO_CONFIG,
              ...parsed,
            });
          }
        } catch (e) {
          console.error('Failed to parse mask logo config:', e);
        }
      }
    });
  }, []);

  const handleSaveMaskLogoConfig = useCallback((newConfig: MaskLogoConfig) => {
    setMaskLogoConfig(newConfig);
    saveDesktopMaskLogoConfig(JSON.stringify(newConfig, null, 2)).catch(e =>
      console.error('Failed to save mask logo config:', e)
    );
  }, []);

  const handleSavePresets = useCallback(async (newPresets: PanelPreset[]) => {
    setPanelPresets(newPresets);
    try {
      const savedPath = await saveDesktopPanelPresets(JSON.stringify(newPresets, null, 2));
      if (savedPath) setPanelsConfigPath(savedPath);
      setPresetId(prev => (newPresets.some(p => p.id === prev) ? prev : newPresets[0]?.id || ''));
    } catch (e) {
      console.error('Failed to save panel presets:', e);
      showToast('Ошибка при сохранении panels.json');
    }
  }, [showToast]);

  const handleSaveCardPresets = useCallback(async (newPresets: CardPreset[]) => {
    setCardPresets(newPresets);
    try {
      const savedPath = await saveDesktopCardPresets(JSON.stringify(newPresets, null, 2));
      if (savedPath) setCardsConfigPath(savedPath);
    } catch (e) {
      console.error('Failed to save cards presets:', e);
      showToast('Ошибка при сохранении cards.json');
    }
  }, [showToast]);

  const handleSaveServerPresets = useCallback(async (newPresets: ServerPreset[]) => {
    setServerPresets(newPresets);
    try {
      const savedPath = await saveDesktopServerPresets(JSON.stringify(newPresets, null, 2));
      if (savedPath) setServersConfigPath(savedPath);
    } catch (e) {
      console.error('Failed to save server presets:', e);
      showToast('Ошибка при сохранении servers.json');
    }
  }, [showToast]);

  const handleSaveFiberPresets = useCallback(async (newPresets: FiberConverterPreset[]) => {
    setFiberPresets(newPresets);
    try {
      const savedPath = await saveDesktopFiberPresets(JSON.stringify(newPresets, null, 2));
      if (savedPath) setFibersConfigPath(savedPath);
    } catch (e) {
      console.error('Failed to save fiber presets:', e);
      showToast('Ошибка при сохранении fibers.json');
    }
  }, [showToast]);


  // ======== AUTO LOAD / CLI / SECOND INSTANCE / DRAG & DROP ========
  useEffect(() => {
    // 1. Initial project passed via CLI argument (e.g. double-click in explorer)
    getInitialDesktopProject().then(res => {
      if (res && res.content) {
        try {
          const data = JSON.parse(res.content);
          applyProjectData(data);
          setCurrentFilePath(res.filePath);
          showToast(`Проект загружен: ${res.filePath.split(/[\\/]/).pop()}`);
        } catch (e) {
          console.error('Failed to parse initial project:', e);
        }
      }
    });

    // 2. Project opened via second instance (when app is already running)
    const unsubProjectOpen = onDesktopProjectOpen(res => {
      if (res && res.content) {
        try {
          const data = JSON.parse(res.content);
          applyProjectData(data);
          setCurrentFilePath(res.filePath);
          showToast(`Проект загружен: ${res.filePath.split(/[\\/]/).pop()}`);
        } catch (e) {
          console.error('Failed to parse project from second instance:', e);
        }
      }
    });

    // 3. Desktop drag & drop file path
    const unsubFileDrop = setupDesktopFileDrop(async paths => {
      const ssPath = paths.find(p => {
        const lower = p.toLowerCase();
        return lower.endsWith('.ss') || lower.endsWith('.json');
      });
      if (ssPath) {
        try {
          const res = await readDesktopProjectFile(ssPath);
          if (res && res.content) {
            const data = JSON.parse(res.content);
            applyProjectData(data);
            setCurrentFilePath(res.filePath);
            showToast(`Проект загружен: ${res.filePath.split(/[\\/]/).pop()}`);
          }
        } catch (e) {
          console.error('Failed to load dropped desktop file:', e);
        }
      }
    });

    // 4. HTML5 drag & drop fallback (works in browser and webview)
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer?.files?.[0];
      if (file && (file.name.endsWith('.ss') || file.name.endsWith('.json'))) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(String(reader.result));
            applyProjectData(data);
            setCurrentFilePath(null);
            showToast(`Проект загружен: ${file.name}`);
          } catch (err) {
            console.error('Failed to parse dropped file:', err);
          }
        };
        reader.readAsText(file);
      }
    };
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      unsubProjectOpen();
      unsubFileDrop();
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [applyProjectData, showToast]);

  // ======== SAVE JSON ========
  const saveProjectToFile = useCallback(async (targetPath: string | null) => {
    const payload = {
      meta: { version: 4, presetId, rows, cols },
      wiringPages,
      activeWiringPageId,
      maskPages,
      activeMaskPageId,
      panels: activeWiringPage.panels,
      cables: activeWiringPage.cables,
      cards,
      selectedCardId,
      activeLink,
      fiberCounts,
      eventName,
      eventDate,
      serverId: servers[0]?.modelId ?? '',
      servers,
      screenGroups: activeMaskPage.screenGroups,
    };
    const jsonContent = JSON.stringify(payload, null, 2);

    if (isDesktopApp()) {
      try {
        const defaultName = `${eventName || 'project'}.ss`;
        const savedPath = await saveDesktopProject(targetPath, defaultName, jsonContent);
        if (savedPath) {
          setCurrentFilePath(savedPath);
          showToast('Сохранено');
        }
      } catch (err) {
        console.error('Failed to save project:', err);
      }
    } else {
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${eventName || 'project'}.ss`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Сохранено');
    }
  }, [presetId, rows, cols, wiringPages, activeWiringPageId, maskPages, activeMaskPageId, activeWiringPage, activeMaskPage, cards, selectedCardId, activeLink, eventName, fiberCounts, eventDate, servers, showToast]);

  const saveJSON = useCallback(() => saveProjectToFile(currentFilePath), [saveProjectToFile, currentFilePath]);
  const saveJSONAs = useCallback(() => saveProjectToFile(null), [saveProjectToFile]);

  // ======== MASK HANDLERS ========
  const onAddGroup = useCallback(() => {
    if (!selectedPanels.size) return;
    pushHistory();
    const selIds = Array.from(selectedPanels);
    const nextGroups = screenGroups
      .map(g => ({
        ...g,
        panelIds: g.panelIds.filter(id => !selectedPanels.has(id)),
      }))
      .filter(g => g.panelIds.length > 0);

    const newGroup: ScreenGroup = {
      id: uid('screen'),
      name: `Screen ${nextGroups.length + 1}`,
      panelIds: selIds,
      textureId: TEXTURES[nextGroups.length % TEXTURES.length].id,
      strokeColor: '#ffffff',
    };

    setScreenGroups([...nextGroups, newGroup]);
    setSelectedGroupIds(new Set([newGroup.id]));
  }, [selectedPanels, screenGroups, pushHistory, setScreenGroups]);

  const onAutoGroup = useCallback(() => {
    pushHistory();
    const sourcePanels = panels.length > 0 ? panels : allPanels;
    setScreenGroups(autoGroupPanels(sourcePanels, screenGroups));
    setSelectedGroupIds(new Set());
  }, [panels, allPanels, screenGroups, pushHistory, setScreenGroups]);

  const onUpdateGroup = useCallback((updated: ScreenGroup) => {
    setScreenGroups(prev => prev.map(g => (g.id === updated.id ? updated : g)));
  }, [setScreenGroups]);

  const onUpdateGroups = useCallback((updatedList: ScreenGroup[]) => {
    const map = new Map(updatedList.map(g => [g.id, g]));
    setScreenGroups(prev => prev.map(g => map.get(g.id) ?? g));
  }, [setScreenGroups]);

  const onRemoveGroup = useCallback((groupId: string) => {
    pushHistory();
    setScreenGroups(prev => prev.filter(g => g.id !== groupId));
    setSelectedGroupIds(prev => {
      const next = new Set(prev);
      next.delete(groupId);
      return next;
    });
  }, [pushHistory, setScreenGroups]);

  const onRemoveGroups = useCallback((groupIds: string[]) => {
    if (!groupIds.length) return;
    pushHistory();
    const kill = new Set(groupIds);
    setScreenGroups(prev => prev.filter(g => !kill.has(g.id)));
    setSelectedGroupIds(prev => {
      const next = new Set(prev);
      groupIds.forEach(id => next.delete(id));
      return next;
    });
  }, [pushHistory, setScreenGroups]);

  const onSelectGroupPanels = useCallback((groupId: string) => {
    const target = screenGroups.find(g => g.id === groupId);
    if (!target) return;
    setSelectedPanels(new Set(target.panelIds));
    setSelectedGroupIds(new Set([groupId]));
  }, [screenGroups]);

  const onExportMaskPNG = useCallback(() => {
    exportMaskPNG(allPanels, screenGroups, eventName, activeMaskPage.name, maskLogoConfig);
  }, [allPanels, screenGroups, eventName, activeMaskPage.name, maskLogoConfig]);

  const onExportMaskZIP = useCallback(() => {
    exportMaskZIP(allPanels, screenGroups, eventName, activeMaskPage.name, maskLogoConfig);
  }, [allPanels, screenGroups, eventName, activeMaskPage.name, maskLogoConfig]);

  const onPreviewMask = useCallback(() => {
    setPreviewModalOpen(true);
  }, []);

  const openLoadJSONDialog = useCallback(async () => {
    if (isDesktopApp()) {
      try {
        const res = await openDesktopProject();
        if (res && res.filePath && res.content) {
          const data = JSON.parse(res.content);
          applyProjectData(data);
          setCurrentFilePath(res.filePath);
        }
      } catch (err) {
        console.error('Failed to open project:', err);
      }
    } else {
      fileInputRef.current?.click();
    }
  }, [applyProjectData]);

  // ======== NEW PROJECT ========
  const [confirmNewProjectOpen, setConfirmNewProjectOpen] = useState(false);

  const resetProjectState = useCallback(() => {
    setWiringPages([{ id: 'wiring-1', name: 'Schema 1', panels: [], cables: [] }]);
    setActiveWiringPageId('wiring-1');
    setMaskPages([{ id: 'mask-1', name: 'Page 1', screenGroups: [] }]);
    setActiveMaskPageId('mask-1');
    setCards([]);
    setSelectedCardId(null);
    setActiveLink(0);
    setPresetId(panelPresets[0]?.id || PRESETS[0].id);
    setRows(0);
    setCols(0);
    setEventName('Event');
    setEventDate(new Date().toISOString().slice(0, 10));
    setServers([{ id: 'srv-1', modelId: SERVERS[0]?.id ?? 'hp-z2' }]);
    setCardId('');
    setFiberCounts({});
    setSelectedPanels(new Set());
    setSelectedCables(new Set());
    setSelectedGroupId(null);
    setDraft(null);
    setCurrentFilePath(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    undoRef.current = [];
    redoRef.current = [];
    setPan({ x: 0, y: 0 });
    setScale(1);
    showToast('Новый проект создан');
  }, [panelPresets, setSelectedGroupId, showToast]);

  const newProject = useCallback(() => {
    const hasContent = allPanels.length > 0 || cards.length > 0 || currentFilePath !== null;
    if (hasContent) {
      setConfirmNewProjectOpen(true);
      return;
    }
    resetProjectState();
  }, [allPanels.length, cards.length, currentFilePath, resetProjectState]);

  // ======== DUPLICATE SELECTED PANELS ========
  const duplicateSelectedPanels = useCallback(() => {
    if (!selectedPanels.size) return;
    const offset = { x: 20, y: 20 };
    const src = panels.filter(p => selectedPanels.has(p.id));
    if (!src.length) return;

    pushHistory();
    const clones: Panel[] = src.map(p => ({
      ...p,
      id: uid('p'),
      x: p.x + offset.x,
      y: p.y + offset.y,
      label: '', // имена пустые — автонумерация по кабелям их задаст
    }));

    setPanels(prev => [...prev, ...clones]);
    setSelectedPanels(new Set(clones.map(p => p.id)));
  }, [panels, selectedPanels, pushHistory, setPanels]);

  // ======== COPY / CUT / PASTE PANELS ========
  const copySelectedPanels = useCallback(() => {
    if (!selectedPanels.size) return;
    const srcPanels = panels.filter(p => selectedPanels.has(p.id));
    if (!srcPanels.length) return;

    const srcCables = cables.filter(c => selectedPanels.has(c.a) && selectedPanels.has(c.b));

    const payload: PanelClipboardData = {
      panels: srcPanels,
      cables: srcCables,
      sourcePageId: activeWiringPageId,
      sourcePasteCount: 0,
      isCut: false,
    };

    setClipboard(payload);
    try {
      sessionStorage.setItem('masker_panel_clipboard', JSON.stringify(payload));
    } catch {}

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(JSON.stringify({ type: 'masker_panel_clipboard', data: payload }));
      }
    } catch {}

    showToast(`Скопировано панелей: ${srcPanels.length}`);
  }, [selectedPanels, panels, cables, activeWiringPageId, showToast]);

  const cutSelectedPanels = useCallback(() => {
    if (!selectedPanels.size) return;
    const srcPanels = panels.filter(p => selectedPanels.has(p.id));
    if (!srcPanels.length) return;

    const srcCables = cables.filter(c => selectedPanels.has(c.a) && selectedPanels.has(c.b));

    const payload: PanelClipboardData = {
      panels: srcPanels,
      cables: srcCables,
      sourcePageId: activeWiringPageId,
      sourcePasteCount: 0,
      isCut: true,
    };

    setClipboard(payload);
    try {
      sessionStorage.setItem('masker_panel_clipboard', JSON.stringify(payload));
    } catch {}

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(JSON.stringify({ type: 'masker_panel_clipboard', data: payload }));
      }
    } catch {}

    pushHistory();
    const killPanels = new Set(selectedPanels);
    setPanels(ps => ps.filter(p => !killPanels.has(p.id)));
    setCables(cs => cs.filter(c => !killPanels.has(c.a) && !killPanels.has(c.b)));
    setScreenGroups(groups =>
      groups
        .map(g => ({
          ...g,
          panelIds: g.panelIds.filter(id => !killPanels.has(id)),
        }))
        .filter(g => g.panelIds.length > 0)
    );
    setSelectedPanels(new Set());
    setSelectedCables(new Set());
    setDraft(null);

    showToast(`Вырезано панелей: ${srcPanels.length}`);
  }, [selectedPanels, panels, cables, activeWiringPageId, pushHistory, setPanels, setCables, setScreenGroups, showToast]);

  const pastePanels = useCallback(() => {
    let clip = clipboard;
    if (!clip && typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('masker_panel_clipboard');
        if (saved) clip = JSON.parse(saved);
      } catch {}
    }
    if (!clip || !clip.panels || clip.panels.length === 0) return;

    pushHistory();

    const isSamePage = clip.sourcePageId === activeWiringPageId;
    let dx = 0;
    let dy = 0;

    if (isSamePage) {
      if (clip.isCut && clip.sourcePasteCount === 0) {
        dx = 0;
        dy = 0;
      } else {
        const step = (clip.sourcePasteCount + 1) * 20;
        dx = step;
        dy = step;
      }
    } else {
      const baseShift = clip.sourcePasteCount * 20;
      const hasDirectOverlap = panels.some(existing =>
        clip!.panels.some(cp =>
          Math.abs((cp.x + baseShift) - existing.x) < 5 &&
          Math.abs((cp.y + baseShift) - existing.y) < 5
        )
      );
      const shift = hasDirectOverlap ? baseShift + 20 : baseShift;
      dx = shift;
      dy = shift;
    }

    const idMap = new Map<string, string>();
    const clonedPanels: Panel[] = clip.panels.map(p => {
      const newId = uid('p');
      idMap.set(p.id, newId);
      return {
        ...p,
        id: newId,
        x: p.x + dx,
        y: p.y + dy,
        label: p.label,
      };
    });

    const clonedCables: CableEx[] = clip.cables.map(c => ({
      ...c,
      id: uid('c'),
      a: idMap.get(c.a) ?? c.a,
      b: idMap.get(c.b) ?? c.b,
    }));

    setPanels(prev => [...prev, ...clonedPanels]);
    if (clonedCables.length > 0) {
      setCables(prev => [...prev, ...clonedCables]);
    }

    setSelectedPanels(new Set(clonedPanels.map(p => p.id)));
    setSelectedCables(new Set());
    setDraft(null);

    const nextClip: PanelClipboardData = {
      ...clip,
      sourcePasteCount: clip.sourcePasteCount + 1,
      isCut: false,
    };
    setClipboard(nextClip);
    try {
      sessionStorage.setItem('masker_panel_clipboard', JSON.stringify(nextClip));
    } catch {}

    showToast(`Вставлено панелей: ${clonedPanels.length}`);
  }, [clipboard, activeWiringPageId, panels, pushHistory, setPanels, setCables, showToast]);

  // ======== LABELS: S{card}-{port}-{n} (жёсткие типы) ========

  useEffect(() => {
    const lbl = computeLabels(cables);
    setPanels(ps => {
      let changed = false;
      const nextPanels = ps.map(p => {
        const v = lbl.get(p.id) ?? '';
        if (p.label !== v) { changed = true; return { ...p, label: v }; }
        return p;
      });
      return changed ? nextPanels : ps;
    });
  }, [cables, setPanels]);

  // ======== АВТО-ПРЕСЕТЫ (учёт карты/лимитов) ========
  function runAutoPreset(kind: 'H_TL' | 'H_TR' | 'H_BL' | 'H_BR' | 'V_TL' | 'V_TR' | 'V_BL' | 'V_BR') {
    const sel = selectedPanels.size ? new Set(selectedPanels) : null;
    const base =
      kind === 'H_TL' ? autoSnakeH_TL(panels, sel) :
        kind === 'H_TR' ? autoSnakeH_TR(panels, sel) :
          kind === 'H_BL' ? autoSnakeH_BL(panels, sel) :
            kind === 'H_BR' ? autoSnakeH_BR(panels, sel) :
              kind === 'V_TL' ? autoSnakeV_TL(panels, sel) :
                kind === 'V_TR' ? autoSnakeV_TR(panels, sel) :
                  kind === 'V_BL' ? autoSnakeV_BL(panels, sel) :
                    autoSnakeV_BR(panels, sel);

    const { existing, add } = buildAddEdges(
      base, sel, selectedCard, cables,
      activeLinkRef, panelHasOtherAssignment, willPortFit,
    );
    if (!add.length && (!sel || existing.length === cables.length)) return;
    pushHistory();
    setCables(sel ? [...existing, ...add] : add);
  }

  const selectAll = useCallback(() => {
    if (activeTab === 'mask') {
      setSelectedGroupIds(new Set(screenGroups.map(g => g.id)));
    } else {
      setSelectedPanels(new Set(panels.map(p => p.id)));
    }
  }, [activeTab, screenGroups, panels]);

  // ======== HUD / HOTKEYS ========
  useHotkeys(
    {
      scale,
      selectedCables,
      selectedPanels,
      selectedGroupIds,
      tool,
      pan,
      draft,
      svgRef,
    },
    setDraft,
    marqueeStart,
    setMarquee,
    dragGroup,
    applySnapToDelta,
    setPanels,
    onPointerUp,
    setTool,
    deleteSelected,
    redo,
    undo,
    exportPNG,
    duplicateSelectedPanels,
    selectAll,
    copySelectedPanels,
    cutSelectedPanels,
    pastePanels,
    saveJSON,
    saveJSONAs,
    newProject
  );

  // ======== ZOOM ========
  const resetView = useCallback(() => { setScale(1); setPan({ x: 0, y: 0 }); }, []);

  // ======== КАРТЫ: add/select/remove ========
  const onCardAdd = useCallback((modelId: string) => {
    const model = cardPresets.find(m => m.id === modelId) ?? CARDS.find(m => m.id === modelId) ?? cardPresets[0];
    if (!model) return;
    const order = cards.length + 1;
    const id = uid('card');
    const inst: CardInstance = {
      id,
      modelId,
      order,
      color: colorForOrder(order),
      portColors: Array.from({ length: model.outputPorts }, (_, i) => LINK_COLORS_16[i % LINK_COLORS_16.length]),
    };
    pushHistory();
    setCards(prev => [...prev, inst]);
    setSelectedCardId(id);
    setActiveLink(0);
  }, [cards, colorForOrder, pushHistory, cardPresets]);

  const onCardSelect = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
    setActiveLink(0);
  }, []);

  const onCardRemove = useCallback((cardId: string) => {
    const victim = cards.find(c => c.id === cardId);
    if (!victim) return;

    pushHistory();
    // убрать все кабели этой карты и сдвинуть номера карт у кабелей последующих карт
    setCables(prev =>
      prev
        .filter(c => (c as CableEx).card !== victim.order)
        .map(c => {
          const cardNum = (c as CableEx).card;
          if (typeof cardNum === 'number' && cardNum > victim.order) {
            return { ...c, card: cardNum - 1 };
          }
          return c;
        })
    );

    // удалить карту и перенумеровать order у следующих
    setCards(prev => {
      const rest = prev
        .filter(c => c.id !== cardId)
        .map(c => c.order > victim.order ? { ...c, order: c.order - 1 } : c);
      return rest;
    });

    setSelectedCardId(prev => (prev === cardId ? null : prev));
  }, [cards, pushHistory, setCables]);

  // ======== RENDER ========
  return (
    <div className="h-full w-full bg-[#07080b] text-neutral-100 flex overflow-hidden">
      <Sidebar
        tool={tool} setTool={setTool}
        presetId={presetId} setPresetId={setPresetId}
        presets={panelPresets}
        onOpenPresetsModal={() => setIsPresetsModalOpen(true)}
        setRows={setRows} setCols={setCols}
        createMatrix={createMatrix} clearAll={clearAll}
        exportPNG={exportPNG} saveJSON={saveJSON} openLoadJSONDialog={openLoadJSONDialog}
        newProject={newProject}
        clearSelectedWiring={clearSelectedWiring}
        hasPanelSelection={selectedPanels.size > 0}
        cables={cables}
        // 8 пресетов «змейки»
        autoSnakeH_TL={() => runAutoPreset('H_TL')}
        autoSnakeH_TR={() => runAutoPreset('H_TR')}
        autoSnakeH_BL={() => runAutoPreset('H_BL')}
        autoSnakeH_BR={() => runAutoPreset('H_BR')}
        autoSnakeV_TL={() => runAutoPreset('V_TL')}
        autoSnakeV_TR={() => runAutoPreset('V_TR')}
        autoSnakeV_BL={() => runAutoPreset('V_BL')}
        autoSnakeV_BR={() => runAutoPreset('V_BR')}
        activeLink={activeLink} setActiveLink={setActiveLink}
        setSelectedPanels={setSelectedPanels}
        duplicateSelectedPanels={duplicateSelectedPanels}
        copySelectedPanels={copySelectedPanels}
        cutSelectedPanels={cutSelectedPanels}
        pastePanels={pastePanels}
        canPaste={Boolean(clipboard && clipboard.panels.length > 0)}
        clipboardCount={clipboard?.panels.length ?? 0}
        // Info вкладка
        eventName={eventName} setEventName={setEventName}
        eventDate={eventDate} setEventDate={setEventDate}
        serverName={servers[0]?.modelId ?? ''} setServerId={(id) => onServerChange(servers[0]?.id ?? 'srv-1', id)}
        servers={servers}
        serverPresets={serverPresets}
        onOpenServerPresetsModal={() => setIsServerPresetsModalOpen(true)}
        onServerAdd={onServerAdd}
        onServerRemove={onServerRemove}
        onServerChange={onServerChange}
        cardName={cardId} setCardId={setCardId}
        // Карты
        cards={cards}
        cardPresets={cardPresets}
        onOpenCardPresetsModal={() => setIsCardPresetsModalOpen(true)}
        selectedCardId={selectedCardId}
        onCardAdd={onCardAdd}
        onCardSelect={onCardSelect}
        onCardRemove={onCardRemove}
        fiberCounts={fiberCounts}
        setFiberCounts={setFiberCounts}
        fiberPresets={fiberPresets}
        onOpenFiberPresetsModal={() => setIsFiberPresetsModalOpen(true)}
        // Маска
        activeTab={activeTab}
        onTabChange={setActiveTab}
        panels={panels}
        screenGroups={screenGroups}
        selectedGroupId={selectedGroupId}
        selectedGroupIds={selectedGroupIds}
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
        wiringPages={wiringPages}
        activeWiringPageId={activeWiringPageId}
        onSelectWiringPage={switchWiringPage}
        onAddWiringPage={addWiringPage}
        onRemoveWiringPage={removeWiringPage}
        onRenameWiringPage={renameWiringPage}
        onDuplicateWiringPage={duplicateWiringPage}
        maskPages={maskPages}
        activeMaskPageId={activeMaskPageId}
        onSelectMaskPage={switchMaskPage}
        onAddMaskPage={addMaskPage}
        onRemoveMaskPage={removeMaskPage}
        onRenameMaskPage={renameMaskPage}
        onDuplicateMaskPage={duplicateMaskPage}
        allPanels={allPanels}
        allCables={allCables}
        allScreenGroups={allScreenGroups}
        onAddScreensFromWiringPage={addScreensFromWiringPage}
        maskLogoConfig={maskLogoConfig}
        onOpenMaskLogoModal={() => setIsMaskLogoModalOpen(true)}
      />

      <div className="flex-1 relative" onContextMenu={(e) => e.preventDefault()}>
        <SvgStage
          svgRef={svgRef}
          pan={pan} setPan={setPan}
          scale={scale} setScale={setScale}
          onBgPointerDown={onBgPointerDown}
          onPointerUp={onPointerUp}
          tool={tool}
          base={
            activeTab === 'mask' ? (
              <MaskLayer
                panels={allPanels}
                groups={screenGroups}
                selectedGroupId={selectedGroupId}
                selectedGroupIds={selectedGroupIds}
                onSelectGroup={onSelectGroup}
                onUpdateGroup={onUpdateGroup}
                onUpdateGroups={onUpdateGroups}
                pushHistory={pushHistory}
                scale={scale}
                showGuides={true}
                showBadges={true}
                maskLogoConfig={maskLogoConfig}
              />
            ) : (
              <PanelsLayer
                panels={panels}
                selected={selectedPanels}
                tool={tool}
                onPanelMouseDown={onPanelMouseDown}
                getPanelCardColor={getPanelCardColor}
              />
            )
          }
          top={
            activeTab === 'mask' ? (
              <SelectionMarquee rect={marquee} />
            ) : (
              <>
                <CablesLayer
                  cables={cables}
                  panelsById={panelsById}
                  draft={tool === 'cable' ? draft : null}
                  selected={selectedCables}
                  onCableMouseDown={onCableMouseDown}
                />
                <SelectionMarquee rect={marquee} />
              </>
            )
          }
        />

        {/* Верхняя инженерная панель студии */}
        <EditorToolbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedGroupCount={selectedGroupIds.size}
          selectedPanelCount={selectedPanels.size}
          panelCount={panels.length}
          cableCount={cables.length}
          clipboard={clipboard}
          deleteSelected={deleteSelected}
          copySelectedPanels={copySelectedPanels}
          cutSelectedPanels={cutSelectedPanels}
          pastePanels={pastePanels}
          duplicateSelectedPanels={duplicateSelectedPanels}
          maskPages={maskPages}
          activeMaskPageId={activeMaskPageId}
          switchMaskPage={switchMaskPage}
          addMaskPage={addMaskPage}
          removeMaskPage={removeMaskPage}
          renameMaskPage={renameMaskPage}
          duplicateMaskPage={duplicateMaskPage}
          wiringPages={wiringPages}
          activeWiringPageId={activeWiringPageId}
          switchWiringPage={switchWiringPage}
          addWiringPage={addWiringPage}
          removeWiringPage={removeWiringPage}
          renameWiringPage={renameWiringPage}
          duplicateWiringPage={duplicateWiringPage}
          undo={undo}
          redo={redo}
          scale={scale}
          setScale={setScale}
          resetView={resetView}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".ss,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return;
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const data = JSON.parse(String(reader.result));
                applyProjectData(data);
                setCurrentFilePath(null);
              } catch { /* noop */ }
              (e.target as HTMLInputElement).value = '';
            };
            reader.readAsText(f);
          }}
        />

        {/* Модальное окно предпросмотра маски */}
        <MaskPreviewModal
          open={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          panels={allPanels}
          groups={screenGroups}
          eventName={eventName}
          pageName={activeMaskPage.name}
          maskLogoConfig={maskLogoConfig}
        />

        {/* Модальное окно настройки логотипа бейджей на масках */}
        <MaskLogoModal
          open={isMaskLogoModalOpen}
          onClose={() => setIsMaskLogoModalOpen(false)}
          config={maskLogoConfig}
          onSaveConfig={handleSaveMaskLogoConfig}
        />

        {/* Модальное окно управления прессетами панелей */}
        <PanelPresetsModal
          open={isPresetsModalOpen}
          onClose={() => setIsPresetsModalOpen(false)}
          presets={panelPresets}
          onSavePresets={handleSavePresets}
          activePresetId={presetId}
          onSelectPreset={(id) => setPresetId(id)}
          filePath={panelsConfigPath}
        />

        {/* Модальное окно управления прессетами карт */}
        <CardPresetsModal
          open={isCardPresetsModalOpen}
          onClose={() => setIsCardPresetsModalOpen(false)}
          presets={cardPresets}
          onSavePresets={handleSaveCardPresets}
          filePath={cardsConfigPath}
        />

        {/* Модальное окно управления прессетами серверов */}
        <ServerPresetsModal
          open={isServerPresetsModalOpen}
          onClose={() => setIsServerPresetsModalOpen(false)}
          presets={serverPresets}
          onSavePresets={handleSaveServerPresets}
          filePath={serversConfigPath}
        />

        {/* Модальное окно управления пресетами оптических конвертеров */}
        <FiberPresetsModal
          open={isFiberPresetsModalOpen}
          onClose={() => setIsFiberPresetsModalOpen(false)}
          presets={fiberPresets}
          onSavePresets={handleSaveFiberPresets}
          filePath={fibersConfigPath}
          availableCards={cardPresets}
        />

        {/* Модальное окно подтверждения нового проекта */}
        <ConfirmModal
          open={confirmNewProjectOpen}
          title="Начать новый проект?"
          description="Все текущие панели, схемы и настройки будут удалены. Несохраненные изменения будут потеряны."
          confirmText="Начать новый проект"
          cancelText="Отмена"
          onConfirm={() => {
            setConfirmNewProjectOpen(false);
            resetProjectState();
          }}
          onClose={() => setConfirmNewProjectOpen(false)}
        />
        {/* Всплывающее уведомление (Toast) справа внизу */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 pointer-events-none z-[9999] transition-all animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="bg-[#10121a]/95 backdrop-blur-md border border-white/[0.12] text-neutral-100 px-3.5 py-2 rounded-xl shadow-2xl shadow-black/80 text-xs font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
