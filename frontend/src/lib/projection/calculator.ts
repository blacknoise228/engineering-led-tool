import { ProjectionInputs, ProjectionComputed, SliceData, ProjectionVerdict } from './types';

export const RESOLUTION_PRESETS = [
  { label: 'WUXGA (1920×1200 • 16:10)', value: '1920x1200', w: 1920, h: 1200 },
  { label: '4K+ WQUXGA (3840×2400 • 16:10)', value: '3840x2400', w: 3840, h: 2400 },
  { label: '4K UHD (3840×2160 • 16:9)', value: '3840x2160', w: 3840, h: 2160 },
  { label: 'DCI 4K (4096×2160 • 17:9)', value: '4096x2160', w: 4096, h: 2160 },
  { label: 'Full HD (1920×1080 • 16:9)', value: '1920x1080', w: 1920, h: 1080 },
];

export const SURFACE_PRESETS = [
  { label: 'Матовый белый экран (1.0)', gain: 1.0 },
  { label: 'Светлая штукатурка / Бетон (0.8)', gain: 0.8 },
  { label: 'Серый камень / Фасад (0.6)', gain: 0.6 },
  { label: 'Красный кирпич / Дерево (0.4)', gain: 0.4 },
  { label: 'Тёмный фасад / Гранит (0.25)', gain: 0.25 },
];

export const INITIAL_INPUTS: ProjectionInputs = {
  wallW: 28.0,
  wallH: 10.0,
  targetLux: 150,
  gain: 0.8,
  calcMode: 'autoGrid',
  throwDist: 20.0,
  lensInputType: 'tr',
  tr: 1.50,
  angleDeg: 36.87,
  manualCols: 3,
  manualRows: 2,
  nativeW: 1920,
  nativeH: 1200,
  orientation: 'landscape',
  blendPercent: 15,
  lumensPerProj: 20000,
  stackMode: 1,
  efficiency: 0.85,
  canvasTab: 'front',
};

export function trToAngle(tr: number): number {
  const safeTR = Math.max(0.1, tr);
  const halfRad = Math.atan(1 / (2 * safeTR));
  return 2 * halfRad * (180 / Math.PI);
}

export function angleToTR(angleDeg: number): number {
  const safeAngle = Math.min(170, Math.max(1, angleDeg));
  const halfRad = (safeAngle / 2) * (Math.PI / 180);
  return 1 / (2 * Math.tan(halfRad));
}


export function computeProjection(inputs: ProjectionInputs, lang: 'ru' | 'en' = 'ru'): ProjectionComputed {
  const wallW = Math.max(0.5, inputs.wallW || 10);
  const wallH = Math.max(0.5, inputs.wallH || 5);
  const wallArea = wallW * wallH;

  const targetLux = Math.max(10, inputs.targetLux || 150);
  const gain = Math.max(0.1, inputs.gain || 0.8);
  const throwDist = Math.max(0.5, inputs.throwDist || 20);

  const rawW = inputs.nativeW || 1920;
  const rawH = inputs.nativeH || 1200;
  const isPortrait = inputs.orientation === 'portrait';
  const projResW = isPortrait ? rawH : rawW;
  const projResH = isPortrait ? rawW : rawH;
  const effectiveAspect = projResW / projResH;

  const blendPct = Math.min(45, Math.max(0, inputs.blendPercent || 0)) / 100;
  const blendPxW = Math.round(projResW * blendPct);
  const blendPxH = Math.round(projResH * blendPct);

  let cols = 1;
  let rows = 1;
  let singleW = 10;
  let singleH = 6.25;
  let lensTR = 1.5;
  let beamAngleDeg = 36.0;

  if (inputs.calcMode === 'autoGrid') {
    if (inputs.lensInputType === 'tr') {
      lensTR = Math.max(0.15, inputs.tr || 1.5);
      beamAngleDeg = trToAngle(lensTR);
    } else {
      beamAngleDeg = Math.min(150, Math.max(2, inputs.angleDeg || 36));
      lensTR = angleToTR(beamAngleDeg);
    }

    const nativeOpticalW = throwDist / lensTR;
    const nativeOpticalH = nativeOpticalW / (rawW / rawH);

    singleW = isPortrait ? nativeOpticalH : nativeOpticalW;
    singleH = isPortrait ? nativeOpticalW : nativeOpticalH;

    if (wallW <= singleW * 1.001) {
      cols = 1;
    } else {
      const stepW = singleW * (1 - blendPct);
      cols = 1 + Math.ceil((wallW - singleW - 0.001) / stepW);
    }

    if (wallH <= singleH * 1.001) {
      rows = 1;
    } else {
      const stepH = singleH * (1 - blendPct);
      rows = 1 + Math.ceil((wallH - singleH - 0.001) / stepH);
    }
  } else {
    cols = Math.max(1, Math.round(inputs.manualCols) || 1);
    rows = Math.max(1, Math.round(inputs.manualRows) || 1);

    const reqSingleW = wallW / (1 + (cols - 1) * (1 - blendPct));
    const reqSingleH = wallH / (1 + (rows - 1) * (1 - blendPct));

    const singleWFromH = reqSingleH * effectiveAspect;
    singleW = Math.max(reqSingleW, singleWFromH);
    singleH = singleW / effectiveAspect;

    const nativeOpticalW = isPortrait ? singleH : singleW;
    lensTR = throwDist / nativeOpticalW;
    beamAngleDeg = trToAngle(lensTR);
  }

  const overlapM_W = singleW * blendPct;
  const overlapM_H = singleH * blendPct;
  const totalCoverageW = cols === 1 ? singleW : cols * singleW - (cols - 1) * overlapM_W;
  const totalCoverageH = rows === 1 ? singleH : rows * singleH - (rows - 1) * overlapM_H;
  const totalCoverageArea = totalCoverageW * totalCoverageH;

  const totalCanvasPxW = cols === 1 ? projResW : cols * projResW - (cols - 1) * blendPxW;
  const totalCanvasPxH = rows === 1 ? projResH : rows * projResH - (rows - 1) * blendPxH;

  const wallUtilW = Math.min(1, wallW / totalCoverageW);
  const wallUtilH = Math.min(1, wallH / totalCoverageH);
  const activeWallPxW = Math.round(totalCanvasPxW * wallUtilW);
  const activeWallPxH = Math.round(totalCanvasPxH * wallUtilH);

  const overscanW = Math.max(0, totalCoverageW - wallW);
  const overscanH = Math.max(0, totalCoverageH - wallH);
  const wallPxX = Math.round((totalCanvasPxW - activeWallPxW) / 2);
  const wallPxY = Math.round((totalCanvasPxH - activeWallPxH) / 2);

  const pxPerMeter = totalCanvasPxW / totalCoverageW;
  const pixelPitchMm = 1000 / pxPerMeter;

  const lumensPerProj = Math.max(500, inputs.lumensPerProj || 20000);
  const efficiency = Math.min(1, Math.max(0.2, inputs.efficiency || 0.85));
  const zonesCount = cols * rows;

  const singleZoneArea = singleW * singleH;
  const luxPerSingleStack = (lumensPerProj * efficiency) / singleZoneArea;

  let stackMultiplier = 1;
  if (inputs.stackMode === 'auto') {
    stackMultiplier = Math.max(1, Math.ceil(targetLux / luxPerSingleStack));
  } else {
    stackMultiplier = parseInt(String(inputs.stackMode)) || 1;
  }

  const realLux = luxPerSingleStack * stackMultiplier;
  const realNits = (realLux * gain) / Math.PI;
  const totalPhysicalProjectors = zonesCount * stackMultiplier;
  const totalFleetLumens = totalPhysicalProjectors * lumensPerProj;

  const stepPxW = projResW - blendPxW;
  const stepPxH = projResH - blendPxH;
  const slices: SliceData[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const startX = c * stepPxW;
      const startY = r * stepPxH;
      const blendL = c > 0 ? blendPxW : 0;
      const blendR = c < cols - 1 ? blendPxW : 0;
      const blendT = r > 0 ? blendPxH : 0;
      const blendB = r < rows - 1 ? blendPxH : 0;

      slices.push({
        zoneId: `P${r + 1}.${c + 1}`,
        row: r + 1,
        col: c + 1,
        startX,
        startY,
        width: projResW,
        height: projResH,
        sizeM_W: singleW,
        sizeM_H: singleH,
        blendL,
        blendR,
        blendT,
        blendB,
        stackMultiplier,
      });
    }
  }

  const isEn = lang === 'en';
  let verdict: ProjectionVerdict;
  if (realLux < targetLux * 0.92) {
    const suggestedStack = Math.ceil(targetLux / (realLux / stackMultiplier));
    verdict = {
      status: 'low_light',
      badge: isEn ? 'LOW ILLUMINANCE' : 'НЕХВАТКА ЯРКОСТИ',
      headline: isEn
        ? `Illuminance ${Math.round(realLux)} lx is below target ${targetLux} lx (${Math.round(realNits)} nits)`
        : `Освещенность ${Math.round(realLux)} лк ниже целевых ${targetLux} лк (${Math.round(realNits)} нит)`,
      details: isEn
        ? `Output of ${lumensPerProj.toLocaleString('en-US')} ANSI lm per ${singleW.toFixed(1)}×${singleH.toFixed(1)} m zone is low. Recommended stack: ${suggestedStack}x (${zonesCount * suggestedStack} units total) or higher output projectors.`
        : `Один проектор ${lumensPerProj.toLocaleString('ru-RU')} лм на зону ${singleW.toFixed(1)}×${singleH.toFixed(1)} м дает мало света. Рекомендуется стек ${suggestedStack}x (всего ${zonesCount * suggestedStack} шт.) или более мощные аппараты.`,
      suggestedStack,
    };
  } else {
    const blendInfo = (cols > 1 || rows > 1)
      ? (isEn
          ? `Blend: ${overlapM_W.toFixed(2)} m (${blendPxW} px).`
          : `Полоса сшивки: ${overlapM_W.toFixed(2)} м (${blendPxW} px).`)
      : (isEn ? 'Single projector.' : 'Одиночная проекция.');

    verdict = {
      status: 'optimal',
      badge: isEn ? 'OPTIMAL SPEC' : 'ИНЖЕНЕРНАЯ НОРМА',
      headline: isEn
        ? `Array ${cols}×${rows} (${totalPhysicalProjectors} projectors) provides ${Math.round(realLux)} lx and ${realNits.toFixed(1)} nits`
        : `Массив ${cols}×${rows} (${totalPhysicalProjectors} проекторов) обеспечивает ${Math.round(realLux)} лк и ${realNits.toFixed(1)} нит`,
      details: isEn
        ? `Array coverage: ${totalCoverageW.toFixed(2)}×${totalCoverageH.toFixed(2)} m (overscan: +${overscanW.toFixed(2)} m W, +${overscanH.toFixed(2)} m H). ${blendInfo} Optics: TR ${lensTR.toFixed(2)}:1 (${beamAngleDeg.toFixed(1)}°).`
        : `Покрытие массива: ${totalCoverageW.toFixed(2)}×${totalCoverageH.toFixed(2)} м (запас за края: +${overscanW.toFixed(2)} м по W, +${overscanH.toFixed(2)} м по H). ${blendInfo} Оптика: TR ${lensTR.toFixed(2)}:1 (${beamAngleDeg.toFixed(1)}°).`,
    };
  }

  return {
    wallW, wallH, wallArea, targetLux, gain, throwDist,
    cols, rows, zonesCount, stackMultiplier, totalPhysicalProjectors,
    singleW, singleH, overlapM_W, overlapM_H, totalCoverageW, totalCoverageH, totalCoverageArea,
    overscanW, overscanH, wallPxX, wallPxY,
    projResW, projResH, blendPct, blendPxW, blendPxH,
    totalCanvasPxW, totalCanvasPxH, activeWallPxW, activeWallPxH,
    pxPerMeter, pixelPitchMm,
    lensTR, beamAngleDeg,
    lumensPerProj, totalFleetLumens, realLux, realNits, isPortrait,
    slices, verdict,
  };
}

export function buildProjectionSpecText(c: ProjectionComputed, eventName?: string, lang: 'ru' | 'en' = 'ru'): string {
  if (lang === 'en') {
    return [
      `=== PROJECTION MAPPING SPECIFICATION (Engineering LED Tool) ===`,
      eventName ? `Event: ${eventName}` : '',
      `Surface (Wall): ${c.wallW.toFixed(2)} m (W) × ${c.wallH.toFixed(2)} m (H) | Area: ${c.wallArea.toFixed(1)} m² | Gain: ${c.gain}`,
      `Throw Distance: ${c.throwDist.toFixed(2)} m`,
      `Projector Array: ${c.cols} col. × ${c.rows} row (${c.zonesCount} zones) | Stack: ${c.stackMultiplier}x | Total Projectors: ${c.totalPhysicalProjectors} units`,
      `Orientation & Resolution: ${c.isPortrait ? 'Portrait' : 'Landscape'} | ${c.projResW}×${c.projResH} px`,
      `Optics: Throw Ratio ${c.lensTR.toFixed(2)}:1 (Beam Angle: ${c.beamAngleDeg.toFixed(1)}°)`,
      `Single Zone Beam on Wall: ${c.singleW.toFixed(2)} × ${c.singleH.toFixed(2)} m`,
      `Edge Blend Overlap: ${Math.round(c.blendPct * 100)}% -> ${c.overlapM_W.toFixed(2)} m (${c.blendPxW} px horizontal)`,
      `Total Beam Coverage: ${c.totalCoverageW.toFixed(2)} × ${c.totalCoverageH.toFixed(2)} m`,
      `Composite Blended Canvas: ${c.totalCanvasPxW} × ${c.totalCanvasPxH} px (Active on Wall: ${c.activeWallPxW} × ${c.activeWallPxH} px)`,
      `Pixel Density: ${c.pixelPitchMm.toFixed(2)} mm/px (${Math.round(c.pxPerMeter)} px/m)`,
      `Total Luminous Flux: ${c.lumensPerProj.toLocaleString('en-US')} ANSI lm × ${c.totalPhysicalProjectors} units = ${c.totalFleetLumens.toLocaleString('en-US')} ANSI lm`,
      `Calculated Illuminance: ${Math.round(c.realLux)} Lux | ${c.realNits.toFixed(1)} Nits (cd/m²)`,
      '',
      `=== MEDIA SERVER SLICE COORDINATES (RESOLUME / DISGUISE) ===`,
      ...c.slices.map(
        (s) =>
          `${s.zoneId}: Start [${s.startX}, ${s.startY}] px | Res: ${s.width}×${s.height} px | Blend H: L=${s.blendL} R=${s.blendR} | Blend V: T=${s.blendT} B=${s.blendB}`
      ),
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    `=== СПЕЦИФИКАЦИЯ ВИДЕОМЭППИНГА (Engineering LED Tool) ===`,
    eventName ? `Событие: ${eventName}` : '',
    `Поверхность (Стена): ${c.wallW.toFixed(2)} м (Ш) × ${c.wallH.toFixed(2)} м (В) | Площадь: ${c.wallArea.toFixed(1)} м² | Gain: ${c.gain}`,
    `Дистанция проекции (Throw Distance): ${c.throwDist.toFixed(2)} м`,
    `Сетка проекторов: ${c.cols} кол. × ${c.rows} ряд. (${c.zonesCount} зон) | Стек: ${c.stackMultiplier}x | Всего аппаратов: ${c.totalPhysicalProjectors} шт.`,
    `Ориентация и матрица: ${c.isPortrait ? 'Портрет (Portrait)' : 'Альбом (Landscape)'} | ${c.projResW}×${c.projResH} px`,
    `Оптика: Throw Ratio ${c.lensTR.toFixed(2)}:1 (Угол раскрытия: ${c.beamAngleDeg.toFixed(1)}°)`,
    `Размер 1 зоны на стене: ${c.singleW.toFixed(2)} × ${c.singleH.toFixed(2)} м`,
    `Перекрытие сшивки (Edge Blend): ${Math.round(c.blendPct * 100)}% -> ${c.overlapM_W.toFixed(2)} м (${c.blendPxW} px по гориз.)`,
    `Общий размер засветки: ${c.totalCoverageW.toFixed(2)} × ${c.totalCoverageH.toFixed(2)} м`,
    `Итоговый холст (Blended Canvas): ${c.totalCanvasPxW} × ${c.totalCanvasPxH} px (Активно на стене: ${c.activeWallPxW} × ${c.activeWallPxH} px)`,
    `Плотность пикселя: ${c.pixelPitchMm.toFixed(2)} мм/px (${Math.round(c.pxPerMeter)} px/м)`,
    `Световой поток: ${c.lumensPerProj.toLocaleString('ru-RU')} ANSI лм × ${c.totalPhysicalProjectors} шт. = ${c.totalFleetLumens.toLocaleString('ru-RU')} ANSI лм`,
    `Расчетная освещенность и яркость: ${Math.round(c.realLux)} Lux | ${c.realNits.toFixed(1)} Nits (кд/м²)`,
    '',
    `=== КООРДИНАТЫ СЛАЙСОВ (RESOLUME / DISGUISE) ===`,
    ...c.slices.map(
      (s) =>
        `${s.zoneId}: Start [${s.startX}, ${s.startY}] px | Res: ${s.width}×${s.height} px | Blend H: L=${s.blendL} R=${s.blendR} | Blend V: T=${s.blendT} B=${s.blendB}`
    ),
  ]
    .filter(Boolean)
    .join('\n');
}
