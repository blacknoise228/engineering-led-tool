export type CalcMode = 'autoGrid' | 'manualGrid';
export type LensInputType = 'tr' | 'angle';
export type Orientation = 'landscape' | 'portrait';
export type CanvasTab = 'front' | 'top' | 'side';

export interface ProjectionColorConfig {
  wallColor: string;
  blendColor: string;
  beamColor: string;
  projColor: string;
  customProjectorColors?: Record<string, string>;
}

export interface ProjectionInputs {
  wallW: number;
  wallH: number;
  targetLux: number;
  gain: number;

  calcMode: CalcMode;
  throwDist: number;
  lensInputType: LensInputType;
  tr: number;
  angleDeg: number;

  manualCols: number;
  manualRows: number;

  nativeW: number;
  nativeH: number;
  orientation: Orientation;
  blendPercent: number;

  lumensPerProj: number;
  stackMode: number | 'auto';
  efficiency: number;

  canvasTab: CanvasTab;
}

export interface CustomProjectionPreset {
  id: string;
  name: string;
  createdAt?: number;
  inputs: ProjectionInputs;
}

export interface SliceData {
  zoneId: string;
  row: number;
  col: number;
  startX: number;
  startY: number;
  width: number;
  height: number;
  sizeM_W: number;
  sizeM_H: number;
  blendL: number;
  blendR: number;
  blendT: number;
  blendB: number;
  stackMultiplier: number;
}

export interface ProjectionVerdict {
  status: 'optimal' | 'low_light' | 'overscan';
  badge: string;
  headline: string;
  details: string;
  suggestedStack?: number;
}

export interface ProjectionComputed {
  wallW: number;
  wallH: number;
  wallArea: number;
  targetLux: number;
  gain: number;
  throwDist: number;

  cols: number;
  rows: number;
  zonesCount: number;
  stackMultiplier: number;
  totalPhysicalProjectors: number;

  singleW: number;
  singleH: number;
  overlapM_W: number;
  overlapM_H: number;
  totalCoverageW: number;
  totalCoverageH: number;
  totalCoverageArea: number;

  overscanW: number;
  overscanH: number;
  wallPxX: number;
  wallPxY: number;

  projResW: number;
  projResH: number;
  blendPct: number;
  blendPxW: number;
  blendPxH: number;

  totalCanvasPxW: number;
  totalCanvasPxH: number;
  activeWallPxW: number;
  activeWallPxH: number;

  pxPerMeter: number;
  pixelPitchMm: number;

  lensTR: number;
  beamAngleDeg: number;

  lumensPerProj: number;
  totalFleetLumens: number;
  realLux: number;
  realNits: number;
  isPortrait: boolean;

  slices: SliceData[];
  verdict: ProjectionVerdict;
}

export type MaskExportStyle = 'engineering' | 'alpha' | 'blendRamp';

export interface MaskExportConfig {
  style: MaskExportStyle;
  showGrid: boolean;
  showTargets: boolean;
  showBlendZones: boolean;
  showWallBounds: boolean;
  showInfoStamp: boolean;
  showSliceLabels: boolean;
  eventName: string;
  lang?: 'ru' | 'en';
}
