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

/**
 * Checks whether an unknown parsed JSON object represents a projection project file
 */
export function isProjectionProjectData(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (d.module === 'projection') return true;
  if (typeof d.format === 'string' && (d.format.includes('projection') || d.format === 'projection')) return true;
  if (d.inputs && typeof d.inputs === 'object') {
    const inp = d.inputs as Record<string, unknown>;
    if ('wallW' in inp || 'lumensPerProj' in inp || 'projModel' in inp || 'targetLux' in inp || 'throwDist' in inp) {
      return true;
    }
  }
  if (d.projectionInputs) return true;
  if (d.wallW !== undefined && (d.lumensPerProj !== undefined || d.targetLux !== undefined)) return true;
  if (Array.isArray(d.presets) && (d.presets[0] as Record<string, unknown>)?.inputs) return true;
  return false;
}

/**
 * Extracts event/project name from loaded projection project data or fallback file path
 */
export function extractProjectionProjectName(data: unknown, filePath?: string): string {
  if (!data || typeof data !== 'object') return '';
  const d = data as Record<string, unknown>;

  const rawName =
    (typeof d.eventName === 'string' && d.eventName.trim()) ||
    (typeof d.projectName === 'string' && d.projectName.trim()) ||
    (typeof d.name === 'string' && d.name.trim()) ||
    (typeof d.title === 'string' && d.title.trim()) ||
    (typeof d.projectTitle === 'string' && d.projectTitle.trim()) ||
    (typeof d.event === 'string' && d.event.trim()) ||
    '';

  if (rawName) return rawName;

  if (Array.isArray(data) && typeof (data[0] as Record<string, unknown>)?.name === 'string') {
    const arrName = ((data[0] as Record<string, unknown>).name as string).trim();
    if (arrName) return arrName;
  }
  if (Array.isArray(d.presets) && typeof (d.presets[0] as Record<string, unknown>)?.name === 'string') {
    const presetName = ((d.presets[0] as Record<string, unknown>).name as string).trim();
    if (presetName) return presetName;
  }

  if (filePath) {
    const fileName = filePath.split(/[\\/]/).pop() || '';
    const cleanName = fileName.replace(/\.(projection|json|ss)$/i, '').trim();
    if (cleanName && cleanName.toLowerCase() !== 'project') {
      return cleanName;
    }
  }

  return '';
}

