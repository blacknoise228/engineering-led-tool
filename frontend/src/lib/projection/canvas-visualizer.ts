import { ProjectionComputed, CanvasTab, ProjectionColorConfig } from './types';
import { savePngBlob, showToast } from '../desktop';

export const DEFAULT_PROJECTION_COLORS: ProjectionColorConfig = {
  wallColor: '#10b981',
  blendColor: '#f59e0b',
  beamColor: '#00f0ff',
  projColor: '#06b6d4',
  customProjectorColors: {},
};

export function hexToRgba(hex: string, alpha: number): string {
  let clean = (hex || '#00f0ff').replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getZoneColor(
  colors: ProjectionColorConfig,
  zoneId: string,
  col?: number,
  row?: number
): string {
  if (colors.customProjectorColors?.[zoneId]) {
    return colors.customProjectorColors[zoneId];
  }
  if (col !== undefined && colors.customProjectorColors?.[`col-${col}`]) {
    return colors.customProjectorColors[`col-${col}`];
  }
  if (row !== undefined && colors.customProjectorColors?.[`row-${row}`]) {
    return colors.customProjectorColors[`row-${row}`];
  }
  return colors.beamColor || '#00f0ff';
}

export function renderVisualizerCanvas(
  ctx: CanvasRenderingContext2D,
  c: ProjectionComputed,
  width: number,
  height: number,
  tab: CanvasTab,
  lang: 'ru' | 'en' = 'ru',
  colors: ProjectionColorConfig = DEFAULT_PROJECTION_COLORS
) {
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = '#12141c';
  ctx.lineWidth = 1;
  const gridStep = 24;
  for (let x = 0; x < width; x += gridStep) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += gridStep) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  if (tab === 'front') {
    drawFrontElevation(ctx, c, width, height, lang, colors);
  } else if (tab === 'top') {
    drawTopDownCones(ctx, c, width, height, lang, colors);
  } else {
    drawSideElevationCones(ctx, c, width, height, lang, colors);
  }
}

export function drawFrontElevation(
  ctx: CanvasRenderingContext2D,
  c: ProjectionComputed,
  W: number,
  H: number,
  lang: 'ru' | 'en' = 'ru',
  colors: ProjectionColorConfig = DEFAULT_PROJECTION_COLORS
) {
  const padX = 65;
  const padY = 52;
  const availW = W - padX * 2;
  const availH = H - padY * 2;

  const maxSceneW = Math.max(c.wallW, c.totalCoverageW);
  const maxSceneH = Math.max(c.wallH, c.totalCoverageH);
  const scale = Math.min(availW / maxSceneW, availH / maxSceneH);

  const centerX = W / 2;
  const centerY = H / 2;

  const arrayPxW = c.totalCoverageW * scale;
  const arrayPxH = c.totalCoverageH * scale;
  const arrayLeft = centerX - arrayPxW / 2;
  const arrayTop = centerY - arrayPxH / 2;

  const singlePxW = c.singleW * scale;
  const singlePxH = c.singleH * scale;
  const stepM_W = c.singleW - c.overlapM_W;
  const stepM_H = c.singleH - c.overlapM_H;
  const stepPxW = stepM_W * scale;
  const stepPxH = stepM_H * scale;

  for (let r = 0; r < c.rows; r++) {
    for (let col = 0; col < c.cols; col++) {
      const zx = arrayLeft + col * stepPxW;
      const zy = arrayTop + r * stepPxH;
      const zoneId = `P${r + 1}.${col + 1}`;
      const zoneColor = getZoneColor(colors, zoneId, col + 1, r + 1);

      ctx.fillStyle = hexToRgba(zoneColor, 0.08);
      ctx.fillRect(zx, zy, singlePxW, singlePxH);

      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = hexToRgba(zoneColor, 0.65);
      ctx.lineWidth = 1.2;
      ctx.strokeRect(zx, zy, singlePxW, singlePxH);
      ctx.restore();
    }
  }

  // Edge Blend Zones
  ctx.fillStyle = hexToRgba(colors.blendColor, 0.28);
  ctx.strokeStyle = hexToRgba(colors.blendColor, 0.85);
  ctx.lineWidth = 1;

  if (c.cols > 1 && c.overlapM_W > 0) {
    const blendW_px = c.overlapM_W * scale;
    for (let col = 1; col < c.cols; col++) {
      const bx = arrayLeft + col * stepPxW;
      ctx.fillRect(bx, arrayTop, blendW_px, arrayPxH);
      ctx.strokeRect(bx, arrayTop, blendW_px, arrayPxH);
    }
  }

  if (c.rows > 1 && c.overlapM_H > 0) {
    const blendH_px = c.overlapM_H * scale;
    for (let r = 1; r < c.rows; r++) {
      const by = arrayTop + r * stepPxH;
      ctx.fillRect(arrayLeft, by, arrayPxW, blendH_px);
      ctx.strokeRect(arrayLeft, by, arrayPxW, blendH_px);
    }
  }

  // Target Wall Outline
  const wallPxW = c.wallW * scale;
  const wallPxH = c.wallH * scale;
  const wallLeft = centerX - wallPxW / 2;
  const wallTop = centerY - wallPxH / 2;

  ctx.strokeStyle = colors.wallColor;
  ctx.lineWidth = 2.4;
  ctx.strokeRect(wallLeft, wallTop, wallPxW, wallPxH);

  const stepResW = c.projResW - c.blendPxW;
  const stepResH = c.projResH - c.blendPxH;

  for (let r = 0; r < c.rows; r++) {
    for (let col = 0; col < c.cols; col++) {
      const zx = arrayLeft + col * stepPxW;
      const zy = arrayTop + r * stepPxH;
      const cx = zx + singlePxW / 2;
      const cy = zy + singlePxH / 2;

      const zoneId = `P${r + 1}.${col + 1}`;
      const zoneColor = getZoneColor(colors, zoneId, col + 1, r + 1);
      const startX = col * stepResW;
      const startY = r * stepResH;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
      const boxW = Math.min(singlePxW - 8, 112);
      const boxH = Math.min(singlePxH - 6, 38);
      if (boxW > 36 && boxH > 18) {
        ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
        ctx.strokeStyle = hexToRgba(zoneColor, 0.65);
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

        ctx.fillStyle = zoneColor;
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${zoneId}${c.stackMultiplier > 1 ? ' (' + c.stackMultiplier + 'x)' : ''}`,
          cx,
          cy - (boxH > 28 ? 3 : -4)
        );

        if (boxH > 28 && boxW > 75) {
          ctx.fillStyle = '#a1a1aa';
          ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
          ctx.fillText(`@${startX},${startY}px`, cx, cy + 10);
        }
      }
    }
  }

  const mUnit = lang === 'en' ? 'm' : 'м';
  const wallLabel = lang === 'en' ? 'WALL' : 'СТЕНА';
  const arrayLabel = lang === 'en' ? 'ARRAY' : 'МАССИВ';

  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.textAlign = 'center';

  ctx.fillStyle = colors.wallColor;
  ctx.fillText(`${wallLabel}: ${c.wallW.toFixed(2)} ${mUnit} × ${c.wallH.toFixed(2)} ${mUnit}`, centerX, wallTop - 10);

  ctx.fillStyle = colors.beamColor;
  ctx.fillText(
    `${arrayLabel}: ${c.totalCoverageW.toFixed(2)} × ${c.totalCoverageH.toFixed(2)} ${mUnit} (${c.totalCanvasPxW}×${c.totalCanvasPxH} px)`,
    centerX,
    arrayTop + arrayPxH + 18
  );
}

export function drawTopDownCones(
  ctx: CanvasRenderingContext2D,
  c: ProjectionComputed,
  W: number,
  H: number,
  lang: 'ru' | 'en' = 'ru',
  colors: ProjectionColorConfig = DEFAULT_PROJECTION_COLORS
) {
  const padX = 65;
  const padY = 55;
  const availW = W - padX * 2;
  const availH = H - padY * 2;

  const maxSceneW = Math.max(c.wallW, c.totalCoverageW);
  const scaleX = availW / maxSceneW;
  const scaleY = availH / c.throwDist;
  const scale = Math.min(scaleX, scaleY);

  const centerX = W / 2;
  const scenePxH = c.throwDist * scale;
  const wallLineY = (H - scenePxH) / 2 + 15;
  const projLineY = wallLineY + scenePxH;

  const arrayPxW = c.totalCoverageW * scale;
  const arrayLeftX = centerX - arrayPxW / 2;
  const singlePxW = c.singleW * scale;
  const stepPxW = (c.singleW - c.overlapM_W) * scale;

  for (let col = 0; col < c.cols; col++) {
    const zoneLeftX = arrayLeftX + col * stepPxW;
    const zoneRightX = zoneLeftX + singlePxW;
    const projX = (zoneLeftX + zoneRightX) / 2;

    const colColor = getZoneColor(colors, `P1.${col + 1}`, col + 1, undefined);

    const grad = ctx.createLinearGradient(projX, projLineY, projX, wallLineY);
    grad.addColorStop(0, hexToRgba(colColor, 0.55));
    grad.addColorStop(0.7, hexToRgba(colColor, 0.14));
    grad.addColorStop(1, hexToRgba(colColor, 0.25));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(projX, projLineY);
    ctx.lineTo(zoneLeftX, wallLineY);
    ctx.lineTo(zoneRightX, wallLineY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = hexToRgba(colColor, 0.65);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(projX, projLineY);
    ctx.lineTo(zoneLeftX, wallLineY);
    ctx.moveTo(projX, projLineY);
    ctx.lineTo(zoneRightX, wallLineY);
    ctx.stroke();

    ctx.fillStyle = '#141419';
    ctx.strokeStyle = colors.projColor;
    ctx.lineWidth = 1.5;
    ctx.fillRect(projX - 8, projLineY, 16, 12);
    ctx.strokeRect(projX - 8, projLineY, 16, 12);

    ctx.fillStyle = colColor;
    ctx.beginPath();
    ctx.arc(projX, projLineY, 2.5, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = colColor;
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Col ${col + 1}`, projX, projLineY + 24);
  }

  if (c.cols > 1 && c.overlapM_W > 0) {
    const blendPx = c.overlapM_W * scale;
    ctx.fillStyle = colors.blendColor;
    for (let col = 1; col < c.cols; col++) {
      const bx = arrayLeftX + col * stepPxW;
      ctx.fillRect(bx, wallLineY - 4, blendPx, 8);
    }
  }

  const wallPxW = c.wallW * scale;
  const wallLeftX = centerX - wallPxW / 2;
  ctx.strokeStyle = colors.wallColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(wallLeftX, wallLineY);
  ctx.lineTo(wallLeftX + wallPxW, wallLineY);
  ctx.stroke();

  const mUnit = lang === 'en' ? 'm' : 'м';
  ctx.fillStyle = colors.wallColor;
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${lang === 'en' ? 'WALL' : 'СТЕНА'}: ${c.wallW.toFixed(2)} ${mUnit} (${c.cols} ${lang === 'en' ? 'columns' : 'кол.'})`,
    centerX,
    wallLineY - 10
  );

  const dimX = Math.max(20, arrayLeftX - 35);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(dimX, wallLineY); ctx.lineTo(dimX, projLineY);
  ctx.moveTo(dimX - 5, wallLineY); ctx.lineTo(dimX + 5, wallLineY);
  ctx.moveTo(dimX - 5, projLineY); ctx.lineTo(dimX + 5, projLineY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.save();
  ctx.translate(dimX - 8, (wallLineY + projLineY) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`D = ${c.throwDist.toFixed(1)} ${mUnit}`, 0, 0);
  ctx.restore();

  const distLabel = lang === 'en' ? 'Distance' : 'Дистанция';
  const lensLabel = lang === 'en' ? 'Lens' : 'Линза';
  ctx.fillStyle = '#ffffff';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${distLabel} D = ${c.throwDist.toFixed(1)} ${mUnit} • ${lensLabel} TR ${c.lensTR.toFixed(2)}:1 (${c.beamAngleDeg.toFixed(1)}°)`,
    centerX,
    H - 12
  );
}


export function drawSideElevationCones(
  ctx: CanvasRenderingContext2D,
  c: ProjectionComputed,
  W: number,
  H: number,
  lang: 'ru' | 'en' = 'ru',
  colors: ProjectionColorConfig = DEFAULT_PROJECTION_COLORS
) {
  const padX = 70;
  const padY = 50;
  const availW = W - padX * 2;
  const availH = H - padY * 2;

  const maxSceneH = Math.max(c.wallH, c.totalCoverageH);
  const scaleX = availW / c.throwDist;
  const scaleY = availH / maxSceneH;
  const scale = Math.min(scaleX, scaleY);

  const centerY = H / 2;
  const projLineX = (W - c.throwDist * scale) / 2;
  const wallLineX = projLineX + c.throwDist * scale;

  const arrayPxH = c.totalCoverageH * scale;
  const arrayTopY = centerY - arrayPxH / 2;
  const singlePxH = c.singleH * scale;
  const stepPxH = (c.singleH - c.overlapM_H) * scale;

  for (let r = 0; r < c.rows; r++) {
    const zoneTopY = arrayTopY + r * stepPxH;
    const zoneBotY = zoneTopY + singlePxH;
    const projY = (zoneTopY + zoneBotY) / 2;

    const rowColor = getZoneColor(colors, `P${r + 1}.1`, undefined, r + 1);

    const grad = ctx.createLinearGradient(projLineX, projY, wallLineX, projY);
    grad.addColorStop(0, hexToRgba(rowColor, 0.55));
    grad.addColorStop(0.7, hexToRgba(rowColor, 0.14));
    grad.addColorStop(1, hexToRgba(rowColor, 0.25));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(projLineX, projY);
    ctx.lineTo(wallLineX, zoneTopY);
    ctx.lineTo(wallLineX, zoneBotY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = hexToRgba(rowColor, 0.65);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(projLineX, projY);
    ctx.lineTo(wallLineX, zoneTopY);
    ctx.moveTo(projLineX, projY);
    ctx.lineTo(wallLineX, zoneBotY);
    ctx.stroke();

    ctx.fillStyle = '#141419';
    ctx.strokeStyle = colors.projColor;
    ctx.lineWidth = 1.5;
    ctx.fillRect(projLineX - 16, projY - 6, 14, 12);
    ctx.strokeRect(projLineX - 16, projY - 6, 14, 12);

    ctx.fillStyle = rowColor;
    ctx.beginPath();
    ctx.arc(projLineX - 2, projY, 2.5, -Math.PI / 2, Math.PI / 2);
    ctx.fill();

    ctx.fillStyle = rowColor;
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Row ${r + 1}`, projLineX - 20, projY + 3);
  }

  if (c.rows > 1 && c.overlapM_H > 0) {
    const blendPx = c.overlapM_H * scale;
    ctx.fillStyle = colors.blendColor;
    for (let r = 1; r < c.rows; r++) {
      const by = arrayTopY + r * stepPxH;
      ctx.fillRect(wallLineX - 4, by, 8, blendPx);
    }
  }

  const wallPxH = c.wallH * scale;
  const wallTopY = centerY - wallPxH / 2;
  ctx.strokeStyle = colors.wallColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(wallLineX, wallTopY);
  ctx.lineTo(wallLineX, wallTopY + wallPxH);
  ctx.stroke();

  const mUnit = lang === 'en' ? 'm' : 'м';
  ctx.fillStyle = colors.wallColor;
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(
    `${lang === 'en' ? 'WALL' : 'СТЕНА'}: ${c.wallH.toFixed(2)} ${mUnit} (${c.rows} ${lang === 'en' ? 'rows' : 'ряд.'})`,
    wallLineX + 12,
    centerY
  );

  const distLabel = lang === 'en' ? 'Distance' : 'Дистанция';
  const lensLabel = lang === 'en' ? 'Lens' : 'Линза';
  ctx.fillStyle = '#ffffff';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${distLabel} D = ${c.throwDist.toFixed(1)} ${mUnit} • ${lensLabel} TR ${c.lensTR.toFixed(2)}:1 (${c.beamAngleDeg.toFixed(1)}°)`,
    (projLineX + wallLineX) / 2,
    24
  );
}


export function renderFullSchemeCanvas(
  canvas: HTMLCanvasElement,
  c: ProjectionComputed,
  tab: CanvasTab,
  lang: 'ru' | 'en' = 'ru',
  colors: ProjectionColorConfig = DEFAULT_PROJECTION_COLORS,
  eventName = ''
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const isEn = lang === 'en';
  const mUnit = isEn ? 'm' : 'м';

  const headerH = 76;
  const footerH = 76;
  const stageH = H - headerH - footerH;

  // 1. Fill entire canvas background
  ctx.fillStyle = '#07080b';
  ctx.fillRect(0, 0, W, H);

  // 2. Draw middle stage viewport area (with clipping so nothing leaks into header/footer)
  ctx.save();
  ctx.translate(0, headerH);
  ctx.beginPath();
  ctx.rect(0, 0, W, stageH);
  ctx.clip();

  // Grid
  ctx.strokeStyle = '#12141c';
  ctx.lineWidth = 1;
  const gridStep = 24;
  for (let x = 0; x < W; x += gridStep) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, stageH); ctx.stroke();
  }
  for (let y = 0; y < stageH; y += gridStep) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Draw scene
  if (tab === 'front') {
    drawFrontElevation(ctx, c, W, stageH, lang, colors);
  } else if (tab === 'top') {
    drawTopDownCones(ctx, c, W, stageH, lang, colors);
  } else {
    drawSideElevationCones(ctx, c, W, stageH, lang, colors);
  }
  ctx.restore();

  // 3. Draw Header on top of everything (solid, crisp, never clipped or overwritten)
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(0, 0, W, headerH);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, headerH); ctx.lineTo(W, headerH); ctx.stroke();

  // Cyan brand accent line at the top
  ctx.fillStyle = '#00f0ff';
  ctx.fillRect(0, 0, W, 3);

  // Left Title
  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('ENGINEERING LED TOOL // PROJECTION', 32, 34);

  const viewTitles: Record<CanvasTab, string> = {
    front: isEn ? 'FRONT ELEVATION // WALL COVERAGE' : 'ВИД СПЕРЕДИ // СХЕМА ЗАСВЕТКИ СТЕНЫ',
    top: isEn ? 'TOP-DOWN VIEW // BEAM THROW & CONES (-90°)' : 'ВИД СВЕРХУ // РАСХОЖДЕНИЕ ЛУЧЕЙ (-90°)',
    side: isEn ? 'RIGHT SIDE VIEW // VERTICAL ELEVATION' : 'ВИД СПРАВА // ВЕРТИКАЛЬНЫЙ ПРОФИЛЬ',
  };

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.fillText(viewTitles[tab], 32, 58);

  // Right Title (Project / Preset Name)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.fillText(eventName || (isEn ? 'Projection Setup' : 'Схема проекции'), W - 32, 34);

  const now = new Date().toLocaleDateString(isEn ? 'en-US' : 'ru-RU', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  ctx.fillStyle = '#64748b';
  ctx.font = '11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.fillText(now, W - 32, 56);

  // 4. Draw Footer
  const footY = H - footerH;
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(0, footY, W, footerH);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath(); ctx.moveTo(0, footY); ctx.lineTo(W, footY); ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';

  // Metrics
  ctx.fillStyle = '#ffffff';
  ctx.fillText(
    `${isEn ? 'Wall' : 'Стена'}: ${c.wallW.toFixed(2)}×${c.wallH.toFixed(2)} ${mUnit} (${c.wallArea.toFixed(1)} ${mUnit}²)  •  ` +
    `${isEn ? 'Array' : 'Сетка'}: ${c.cols}×${c.rows} (${c.totalPhysicalProjectors} ${isEn ? 'units' : 'апп.'})  •  ` +
    `${isEn ? 'Stack' : 'Стек'}: ${c.stackMultiplier}x  •  ` +
    `${isEn ? 'Lens' : 'Оптика'}: TR ${c.lensTR.toFixed(2)}:1 (${c.beamAngleDeg.toFixed(1)}°)  •  ` +
    `${isEn ? 'Throw' : 'Дистанция'}: ${c.throwDist.toFixed(1)} ${mUnit}`,
    32,
    footY + 30
  );

  ctx.fillStyle = '#06b6d4';
  ctx.fillText(
    `${isEn ? 'Illuminance' : 'Освещенность'}: ${Math.round(c.realLux)} Lux (${Math.round(c.realNits)} nits)  •  ` +
    `${isEn ? 'Canvas' : 'Холст'}: ${c.totalCanvasPxW}×${c.totalCanvasPxH} px  •  ` +
    `${isEn ? 'Fleet' : 'Суммарный поток'}: ${Math.round(c.totalFleetLumens / 1000)}k ANSI lm  •  ` +
    `${isEn ? 'Pixel Pitch' : 'Шаг пикселя'}: ${c.pixelPitchMm.toFixed(2)} ${isEn ? 'mm' : 'мм'}`,
    32,
    footY + 54
  );

  // Legend on right side of footer
  const legendX = W - 360;
  ctx.fillStyle = colors.wallColor;
  ctx.fillRect(legendX, footY + 26, 12, 12);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(legendX, footY + 26, 12, 12);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(isEn ? 'Wall' : 'Стена', legendX + 18, footY + 37);

  ctx.fillStyle = colors.beamColor;
  ctx.fillRect(legendX + 85, footY + 26, 12, 12);
  ctx.strokeRect(legendX + 85, footY + 26, 12, 12);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(isEn ? 'Beam' : 'Луч', legendX + 103, footY + 37);

  ctx.fillStyle = colors.blendColor;
  ctx.fillRect(legendX + 165, footY + 26, 12, 12);
  ctx.strokeRect(legendX + 165, footY + 26, 12, 12);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(isEn ? 'Blend' : 'Сшивка', legendX + 183, footY + 37);
}

export async function exportVisualizerSchemePNG(
  c: ProjectionComputed,
  tab: CanvasTab,
  lang: 'ru' | 'en' = 'ru',
  colors: ProjectionColorConfig = DEFAULT_PROJECTION_COLORS,
  eventName = ''
): Promise<boolean> {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  renderFullSchemeCanvas(canvas, c, tab, lang, colors, eventName);

  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const safeName = (eventName || 'projection').replace(/[/\\?%*:|"<>]/g, '_');
      const filename = `${safeName}_${tab}_view_scheme.png`;
      const ok = await savePngBlob(filename, blob);
      if (ok) showToast(lang === 'en' ? 'Scheme image saved' : 'Схема проекции сохранена');
      resolve(ok);
    }, 'image/png');
  });
}


export async function copyVisualizerSchemeImage(
  c: ProjectionComputed,
  tab: CanvasTab,
  lang: 'ru' | 'en' = 'ru',
  colors: ProjectionColorConfig = DEFAULT_PROJECTION_COLORS,
  eventName = ''
): Promise<boolean> {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  renderFullSchemeCanvas(canvas, c, tab, lang, colors, eventName);

  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      try {
        if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          showToast(lang === 'en' ? 'Scheme copied to clipboard' : 'Схема скопирована в буфер обмена');
          resolve(true);
        } else {
          const safeName = (eventName || 'projection').replace(/[/\\?%*:|"<>]/g, '_');
          await savePngBlob(`${safeName}_${tab}_scheme.png`, blob);
          showToast(lang === 'en' ? 'Scheme downloaded' : 'Схема сохранена');
          resolve(true);
        }
      } catch (e) {
        console.error('Clipboard copy failed:', e);
        showToast(lang === 'en' ? 'Clipboard copy failed' : 'Не удалось скопировать в буфер');
        resolve(false);
      }
    }, 'image/png');
  });
}
