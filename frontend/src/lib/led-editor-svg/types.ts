export type Vec = { x: number; y: number };
export type Rotation = 0 | 90 | 180 | 270;
export type Tool = 'select' | 'cable';

export type Preset = { id: string; name: string; w: number; h: number };

export type Panel = {
  id: string;
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
  r: Rotation;
  label: string;
  presetId: string;
  presetName: string;
  pitch_mm: number;
  special: boolean;
  resW: number;
  resH: number;
};

export type Cable = {
  id: string;
  a: string;
  b: string;
  link: number;
  card?: number;
  color?: string;
  dash?: number[];
};

export type CableEx = Cable;

export type CardInstance = {
  id: string;
  modelId: string;
  order: number;
  color: string;
  portColors: string[];
};

export type ServerInstance = {
  id: string;
  modelId: string;
  specs?: string;
};

export type ScreenGroup = {
  id: string;
  name: string;
  panelIds: string[];
  textureId: string;
  strokeColor?: string;
  posX?: number;
  posY?: number;
  badgeOffsetX?: number;
  badgeOffsetY?: number;
  badgeScale?: number;
};

export type WiringPage = {
  id: string;
  name: string;
  panels: Panel[];
  cables: CableEx[];
  refreshRate?: number;
};

export type MaskPage = {
  id: string;
  name: string;
  screenGroups: ScreenGroup[];
};

export type PanelClipboardData = {
  panels: Panel[];
  cables: CableEx[];
  sourcePageId: string;
  sourcePasteCount: number;
  isCut?: boolean;
};

export type MaskLogoConfig = {
  customLogoDataUrl?: string;
  customLogoFileName?: string;
  scale: number;
  offsetX: number;
  offsetY: number;
};

export const DEFAULT_MASK_LOGO_URL = '/logo3.png';

export const DEFAULT_MASK_LOGO_CONFIG: MaskLogoConfig = {
  customLogoDataUrl: '',
  customLogoFileName: '',
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};


