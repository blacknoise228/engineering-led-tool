import { ProjectionComputed } from './types';

export function renderVisualizerCanvas(
  ctx: CanvasRenderingContext2D,
  c: ProjectionComputed,
  width: number,
  height: number,
  tab: 'front' | 'top',
  lang: 'ru' | 'en' = 'ru'
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
    drawFrontElevation(ctx, c, width, height, lang);
  } else {
    drawTopDownCones(ctx, c, width, height, lang);
  }
}

export function drawFrontElevation(
  ctx: CanvasRenderingContext2D,
  c: ProjectionComputed,
  W: number,
  H: number,
  lang: 'ru' | 'en' = 'ru'
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

      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.fillRect(zx, zy, singlePxW, singlePxH);

      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(zx, zy, singlePxW, singlePxH);
      ctx.restore();
    }
  }

  ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
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

  const wallPxW = c.wallW * scale;
  const wallPxH = c.wallH * scale;
  const wallLeft = centerX - wallPxW / 2;
  const wallTop = centerY - wallPxH / 2;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.2;
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
      const startX = col * stepResW;
      const startY = r * stepResH;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
      const boxW = Math.min(singlePxW - 8, 112);
      const boxH = Math.min(singlePxH - 6, 38);
      if (boxW > 36 && boxH > 18) {
        ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

        ctx.fillStyle = '#06b6d4';
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

  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${wallLabel}: ${c.wallW.toFixed(2)} ${mUnit} × ${c.wallH.toFixed(2)} ${mUnit}`, centerX, wallTop - 10);

  ctx.fillStyle = '#06b6d4';
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
  lang: 'ru' | 'en' = 'ru'
) {
  const padX = 65;
  const padY = 45;
  const availW = W - padX * 2;
  const availH = H - padY * 2;

  const maxSceneW = Math.max(c.wallW, c.totalCoverageW);
  const scaleX = availW / c.throwDist;
  const scaleY = availH / maxSceneW;
  const scale = Math.min(scaleX, scaleY);

  const centerY = H / 2;
  const projLineX = (W - c.throwDist * scale) / 2;
  const wallLineX = projLineX + c.throwDist * scale;

  const arrayPxW = c.totalCoverageW * scale;
  const arrayTopY = centerY - arrayPxW / 2;
  const singlePxW = c.singleW * scale;
  const stepPxW = (c.singleW - c.overlapM_W) * scale;

  for (let col = 0; col < c.cols; col++) {
    const zoneTopY = arrayTopY + col * stepPxW;
    const zoneBotY = zoneTopY + singlePxW;
    const projY = (zoneTopY + zoneBotY) / 2;

    const grad = ctx.createLinearGradient(projLineX, projY, wallLineX, projY);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0.55)');
    grad.addColorStop(0.7, 'rgba(0, 240, 255, 0.14)');
    grad.addColorStop(1, 'rgba(0, 240, 255, 0.25)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(projLineX, projY);
    ctx.lineTo(wallLineX, zoneTopY);
    ctx.lineTo(wallLineX, zoneBotY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(projLineX, projY);
    ctx.lineTo(wallLineX, zoneTopY);
    ctx.moveTo(projLineX, projY);
    ctx.lineTo(wallLineX, zoneBotY);
    ctx.stroke();

    ctx.fillStyle = '#141419';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.fillRect(projLineX - 16, projY - 6, 14, 12);
    ctx.strokeRect(projLineX - 16, projY - 6, 14, 12);

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Col ${col + 1}`, projLineX - 22, projY + 3);
  }

  if (c.cols > 1 && c.overlapM_W > 0) {
    const blendPx = c.overlapM_W * scale;
    ctx.fillStyle = '#f59e0b';
    for (let col = 1; col < c.cols; col++) {
      const by = arrayTopY + col * stepPxW;
      ctx.fillRect(wallLineX - 4, by, 8, blendPx);
    }
  }

  const wallPxW = c.wallW * scale;
  const wallTopY = centerY - wallPxW / 2;
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(wallLineX, wallTopY);
  ctx.lineTo(wallLineX, wallTopY + wallPxW);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.textAlign = 'center';
  const distLabel = lang === 'en' ? 'Distance' : 'Дистанция';
  const lensLabel = lang === 'en' ? 'Lens' : 'Линза';
  ctx.fillText(
    `${distLabel} D = ${c.throwDist.toFixed(1)} ${lang === 'en' ? 'm' : 'м'} • ${lensLabel} TR ${c.lensTR.toFixed(2)}:1 (${c.beamAngleDeg.toFixed(1)}°)`,
    (projLineX + wallLineX) / 2,
    24
  );
}
