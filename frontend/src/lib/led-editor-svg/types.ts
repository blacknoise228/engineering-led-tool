// src/lib/led-editor-svg/types.ts

export type Vec = { x:number; y:number };
export type Rotation = 0|90|180|270;
export type Tool = 'select'|'cable';

export type Preset = { id:string; name:string; w:number; h:number };

export type Panel = {
  id:string; row:number; col:number;
  x:number; y:number; w:number; h:number;
  r:Rotation; label:string; presetId:string;
  presetName:string;
  pitch_mm: number;
  special: boolean;
  resW: number;   // пиксели
  resH: number;   // пиксели
};

export type Cable = {
  id:string;
  a:string;  // panelId
  b:string;  // panelId
  link:number;    // 0..15 (порт внутри карты)
  /** НОВОЕ: порядковый номер карты (1..N). Опционально для обратной совместимости. */
  card?: number;
  color?: string; // цвет от порта; может быть оверрайд
  dash?: number[];
};

/** Расширение кабеля под номер карты (обратная совместимость сохраняется) */
export type CableEx = Cable & { card?: number };

/** Инстанс добавленной карты */
export type CardInstance = {
  id: string;
  modelId: string;
  order: number;       // S{order}-port-index
  color: string;       // цвет панелей этой карты (полупрозрачный)
  portColors: string[];// цвета кабелей (по портам)
};

/** Инстанс сервера */
export type ServerInstance = {
  id: string;
  modelId: string;
};

/** Группа экранов для формирования маски */
export type ScreenGroup = {
  id: string;
  name: string;
  panelIds: string[];
  textureId: string;   // 'quad_01' .. 'quad_12'
  strokeColor?: string;
  posX?: number;       // Пользовательская позиция X на маске в пикселях
  posY?: number;       // Пользовательская позиция Y на маске в пикселях
  badgeOffsetX?: number; // Смещение бейджа по X относительно центра скрина (+/- px)
  badgeOffsetY?: number; // Смещение бейджа по Y относительно центра скрина (+/- px)
  badgeScale?: number;   // Множитель размера бейджа (1.0 = дефолтный 100%)
};

/** Страница расключения (независимый лист с панелями и кабелями) */
export type WiringPage = {
  id: string;
  name: string;
  panels: Panel[];
  cables: CableEx[];
};

/** Страница маски (независимый холст с экранами и их раскладкой) */
export type MaskPage = {
  id: string;
  name: string;
  screenGroups: ScreenGroup[];
};

/** Буфер обмена для панелей расключения */
export type PanelClipboardData = {
  panels: Panel[];
  cables: CableEx[];
  sourcePageId: string;
  sourcePasteCount: number;
  isCut?: boolean;
};




