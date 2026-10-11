// src/lib/led-editor-svg/presets.ts

// ===== Панели (как и раньше) =====
export type PanelPreset = {
  id: string;
  name: string;
  w: number;
  h: number;
  pitch_mm: number;
  resW: number;
  resH: number;
  power: number;
};

export const PRESETS: PanelPreset[] = [
  { id: 'infiled-1m-4p6', name: 'InfiLed 1m (500×1000) 4.6', w: 500, h: 1000, pitch_mm: 4.6, resW: 108, resH: 216, power: 600 },
  { id: 'infiled-0p5m-4p6', name: 'InfiLed 0.5m (500×500) 4.6', w: 500, h: 500, pitch_mm: 4.6, resW: 108, resH: 108, power: 600 },

  { id: 'truelight-1m-3p9', name: 'TrueLight-P 1m (500×1000) 3.9', w: 500, h: 1000, pitch_mm: 3.9, resW: 128, resH: 256, power: 206 },
  { id: 'truelight-0p5m-3p9', name: 'TrueLight-P 0.5m (500×500) 3.9', w: 500, h: 500, pitch_mm: 3.9, resW: 128, resH: 128, power: 103 },

  { id: 'rpro-1m-3p9', name: 'TrueLight-R Pro 1m (500×1000) 3.9', w: 500, h: 1000, pitch_mm: 3.9, resW: 128, resH: 256, power: 206 },
  { id: 'rpro-0p5m-3p9', name: 'TrueLight-R Pro 0.5m (500×500) 3.9', w: 500, h: 500, pitch_mm: 3.9, resW: 128, resH: 128, power: 103 },
  { id: 'rpro-fc-0p5m-3p9', name: 'TrueLight-R Pro FC 0.5m (500×500) 3.9', w: 500, h: 500, pitch_mm: 3.9, resW: 128, resH: 128, power: 103 },

  { id: 'alpha-0p5m-1p9', name: 'ALPHA (500×500) 1.9', w: 500, h: 500, pitch_mm: 1.9, resW: 256, resH: 256, power: 115 },
  { id: 'alpha-fc-0p5m-1p9', name: 'ALPHA FC (500×500) 1.9', w: 500, h: 500, pitch_mm: 1.9, resW: 256, resH: 256, power: 115 },
  { id: 'alpha-vr-1p9', name: 'ALPHA VR 1.9', w: 250, h: 500, pitch_mm: 1.9, resW: 128, resH: 256, power: 75 },

  { id: 'alpha-0p5m-2p6', name: 'ALPHA (500×500) 2.6', w: 500, h: 500, pitch_mm: 2.6, resW: 192, resH: 192, power: 115 },
  { id: 'alpha-fc-0p5m-2p6', name: 'ALPHA FC (500×500) 2.6', w: 500, h: 500, pitch_mm: 2.6, resW: 192, resH: 192, power: 115 },
  { id: 'alpha-vr-2p6', name: 'ALPHA VR 2.6', w: 250, h: 500, pitch_mm: 2.6, resW: 96, resH: 192, power: 75 },

  { id: 'ipro-floor-0p5m-3p9', name: 'IPro Led Floor (500×500) 3.9', w: 500, h: 500, pitch_mm: 3.9, resW: 128, resH: 128, power: 310 },

  { id: 'galaxy-1m-3p9-7p8', name: 'Galaxy (1000×500) 3.9 - 7.8', w: 1000, h: 500, pitch_mm: 3.9, resW: 256, resH: 64, power: 268 },
  { id: 'galaxy-0p5m-3p9-7p8', name: 'Galaxy (500×500) 3.9 - 7.8', w: 500, h: 500, pitch_mm: 3.9, resW: 128, resH: 64, power: 136 },
  { id: 'galaxy-1m-7p8', name: 'Galaxy (1000×500) 7.8', w: 1000, h: 500, pitch_mm: 7.8, resW: 128, resH: 64, power: 180 },
  { id: 'galaxy-0p5m-7p8', name: 'Galaxy (500×500) 7.8', w: 500, h: 500, pitch_mm: 7.8, resW: 64, resH: 64, power: 90 },

  { id: 'dicolor-1m-4p8', name: 'Dicolor-C 1m (500×1000) 4.8', w: 500, h: 1000, pitch_mm: 4.8, resW: 104, resH: 208, power: 322 },
  { id: 'dicolor-0p5m-4p8', name: 'Dicolor-C 0.5m (500×500) 4.8', w: 500, h: 500, pitch_mm: 4.8, resW: 104, resH: 104, power: 161 },

  { id: 'rocketsign-0p5m-3p9', name: 'RocketSign Mecanus (500×500) 3.9', w: 500, h: 500, pitch_mm: 3.9, resW: 128, resH: 128, power: 115 },

  { id: 'manarbek-arena-0p5m-3p9', name: 'Arena Manarbek (500×500) 3.9', w: 500, h: 500, pitch_mm: 3.9, resW: 128, resH: 128, power: 160 },
];

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

export const CARDS: CardPreset[] = [
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

// Быстрые хелперы
export const getCardById = (id: string) => CARDS.find(c => c.id === id) || null;
export const getCardName = (id: string) => getCardById(id)?.name ?? id;

// === Оптоволоконные конвертеры (привязка — к id из CARDS) ===
export type FiberConverterPreset = {
  id: string;
  name: string;
  pairedWith?: string[]; // id из CARDS
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

export const SERVERS: ServerPreset[] = [
  { id: 'hp-z2', name: 'HP Z2' },
  { id: 'hp-z4', name: 'HP Z4' },
  { id: 'ss-z20', name: 'SS Z20' },
  { id: 'ss-c34', name: 'SS C34' },

  // Наши ноутбуки (полные названия)
  { id: 'acer-predator-new', name: 'Acer Predator (new)' },
  { id: 'acer-predator-old', name: 'Acer Predator (old)' },
  { id: 'lenovo-legion', name: 'Lenovo Legion' },

  // Наш NUC
  { id: 'intel-nuc', name: 'Intel NUC' },
  { id: 'mf-ms02', name: 'Minisforum MS-02' },
];

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

