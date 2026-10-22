// src/lib/led-editor-svg/presets.ts

// ===== Панели (как и раньше) =====
export type PanelPreset = {
  id: string;
  name: string;
  w: number;
  h: number;
  pitch_mm: number;
  special: boolean;
  resW: number;
  resH: number;
  power: number;
};

export const DEFAULT_PANEL_PRESETS: PanelPreset[] = [
  {
    id: 'dicolor-0p5m-4p8',
    name: 'Dicolor-C 0.5m (500×500) 4.8',
    w: 500,
    h: 500,
    pitch_mm: 4.8,
    special: false,
    resW: 104,
    resH: 104,
    power: 161,
  },
  {
    id: 'dicolor-1m-4p8',
    name: 'Dicolor-C 1m (500×1000) 4.8',
    w: 500,
    h: 1000,
    pitch_mm: 4.8,
    special: false,
    resW: 104,
    resH: 208,
    power: 322,
  },
];

export const PRESETS: PanelPreset[] = DEFAULT_PANEL_PRESETS;


// Полезные (по гайду) константы по ёмкости порта NovaStar (px):
export const NOVASTAR_PORT_MAX_PIXELS_50HZ = 791_667;
export const NOVASTAR_PORT_MAX_PIXELS_60HZ = 659_722;


// ===== Отправочные карты (Sending Cards) / Процессоры =====
export type CardPreset = {
  id: string;
  name: string;
  category: 'sending' | 'processor'; // для группировки в UI
  maxInput: string;                  // как в гайде
  outputPorts: number;               // количество ethernet-портов
  notes?: string;
};

export const DEFAULT_CARD_PRESETS: CardPreset[] = [
  // Sending cards
  { id: 'mctrl300', name: 'NovaStar MCTRL300', category: 'sending', maxInput: '1920×1200 @60Hz', outputPorts: 2 },
  { id: 'mctrl660', name: 'NovaStar MCTRL660', category: 'sending', maxInput: '3840×600 @60Hz', outputPorts: 4 },
  { id: 'mctrl660pro', name: 'NovaStar MCTRL660 PRO', category: 'sending', maxInput: '3840×600 @60Hz', outputPorts: 6 },
  { id: 'mctrl4k', name: 'NovaStar MCTRL4K', category: 'sending', maxInput: '7680×1080 @60Hz', outputPorts: 16 },

  // Processors
  { id: 'vx1000', name: 'NovaStar VX1000', category: 'processor', maxInput: '3840×1080 @60Hz', outputPorts: 10 },
  { id: 'novapro-jr', name: 'NovaPro Junior', category: 'processor', maxInput: '7680×1080 @60Hz', outputPorts: 16 },
  { id: 'h2', name: 'NovaStar H2', category: 'processor', maxInput: '7680×1080 @60Hz', outputPorts: 16 },
  { id: 'h5', name: 'NovaStar H5', category: 'processor', maxInput: '7680×1080 @60Hz', outputPorts: 16 },
  { id: 'h5_e', name: 'NovaStar H5 Enhanced', category: 'processor', maxInput: '7680×2160 @60Hz', outputPorts: 40 },
  { id: 'h9', name: 'NovaStar H9', category: 'processor', maxInput: '7680×1080 @60Hz', outputPorts: 16 },
  { id: 'h9_e', name: 'NovaStar H9 Enhanced', category: 'processor', maxInput: '7680×1080 @60Hz', outputPorts: 16 },
];

export const CARDS: CardPreset[] = DEFAULT_CARD_PRESETS;

// Быстрые хелперы
export const getCardById = (id: string, list: CardPreset[] = CARDS) => list.find(c => c.id === id) || null;
export const getCardName = (id: string, list: CardPreset[] = CARDS) => getCardById(id, list)?.name ?? id;

// === Оптоволоконные конвертеры (привязка — к id из CARDS) ===
export type FiberConverterPreset = {
  id: string;
  name: string;
  pairedWith?: string[];
  notes?: string;
};

export const FIBER_CONVERTERS: FiberConverterPreset[] = [
  { id: 'cvt10', name: 'NovaStar CVT10', pairedWith: ['vx1000', 'h5_e', 'h9_e'], notes: 'Пара к VX1000 (10 Ethernet-выходов).' },
  { id: 'cvt4k-s', name: 'NovaStar CVT4K-S', pairedWith: ['mctrl4k', 'novapro-jr', 'h5', 'h9'], notes: 'Пара к MCTRL4K / NovaProJR / H5 / H9.' },
];

// ===== Серверы (как в гайде) + ноутбуки и NUC =====
export type ServerPreset = {
  id: string;
  name: string;
  notes?: string;
};

export const DEFAULT_SERVER_PRESETS: ServerPreset[] = [
  { id: 'lenovo-legion', name: 'Lenovo Legion' },
  { id: 'intel-nuc', name: 'Intel NUC' },
];

export const SERVERS: ServerPreset[] = DEFAULT_SERVER_PRESETS;

export const getServerById = (id: string, list: ServerPreset[] = SERVERS) => list.find(s => s.id === id) || null;
export const getServerName = (id: string, list: ServerPreset[] = SERVERS) => getServerById(id, list)?.name ?? id;

// ===== Цвета 16 линков (как были у тебя) =====
export const LINK_COLORS_16 = [
  '#60A5FA', '#34D399', '#F472B6', '#FBBF24',
  '#A78BFA', '#F87171', '#2DD4BF', '#93C5FD',
  '#4ADE80', '#FCA5A5', '#F59E0B', '#22D3EE',
  '#E879F9', '#86EFAC', '#FDA4AF', '#C4B5FD',
];

// ===== Палитра цветов карт (для полупрозрачной заливки панелей от карты) =====
export const CARD_COLORS = [
  '#c4b5fd', // violet-300
  '#7dd3fc', // sky-300
  '#86efac', // green-300
  '#fdba74', // orange-300
  '#fca5a5', // red-300
  '#d9f99d', // lime-200
  '#99f6e4', // teal-200
  '#fde68a', // amber-200
];

