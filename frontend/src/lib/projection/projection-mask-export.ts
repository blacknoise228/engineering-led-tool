import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { savePngBlob, saveDesktopZIP, blobToBase64, isDesktopApp, showToast } from '../desktop';
import { ProjectionComputed, MaskExportConfig, SliceData } from './types';
import { buildProjectionSpecText } from './calculator';

export function renderFullCanvasMask(
  ctx: CanvasRenderingContext2D,
  c: ProjectionComputed,
  cfg: MaskExportConfig
) {
  const W = c.totalCanvasPxW;
  const H = c.totalCanvasPxH;

  ctx.save();
  ctx.clearRect(0, 0, W, H);

  if (cfg.style === 'alpha') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(c.wallPxX, c.wallPxY, c.activeWallPxW, c.activeWallPxH);
    ctx.restore();
    return;
  }

  // 1. Background
  ctx.fillStyle = '#07080b';
  ctx.fillRect(0, 0, W, H);

  // 2. Alignment Grid
  if (cfg.showGrid) {
    const minorStep = 50;
    const majorStep = 200;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += minorStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += minorStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += majorStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += majorStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  // 3. Projector Zones
  for (const s of c.slices) {
    ctx.fillStyle = 'rgba(0, 240, 255, 0.03)';
    ctx.fillRect(s.startX, s.startY, s.width, s.height);

    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(s.startX, s.startY, s.width, s.height);
    ctx.restore();

    const cx = s.startX + s.width / 2;
    const cy = s.startY + s.height / 2;

    if (cfg.showTargets) {
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.startX, s.startY); ctx.lineTo(s.startX + s.width, s.startY + s.height);
      ctx.moveTo(s.startX + s.width, s.startY); ctx.lineTo(s.startX, s.startY + s.height);
      ctx.stroke();

      const radius = Math.min(s.width, s.height) * 0.25;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      const chLen = 30;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - chLen, cy); ctx.lineTo(cx + chLen, cy);
      ctx.moveTo(cx, cy - chLen); ctx.lineTo(cx, cy + chLen);
      ctx.stroke();
    }

    if (cfg.showSliceLabels) {
      const boxW = Math.min(s.width - 16, 260);
      const boxH = 46;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(s.startX + 14, s.startY + 14, boxW, boxH);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(s.startX + 14, s.startY + 14, boxW, boxH);

      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${s.zoneId}  [${s.startX}, ${s.startY} px]`, s.startX + 24, s.startY + 34);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.fillText(`Res: ${s.width}×${s.height} px • Stack: ${s.stackMultiplier}x`, s.startX + 24, s.startY + 50);
    }
  }

  // 4. Edge Blend Overlap Zones
  if (cfg.showBlendZones) {
    const stepPxW = c.projResW - c.blendPxW;
    const stepPxH = c.projResH - c.blendPxH;

    if (c.cols > 1 && c.blendPxW > 0) {
      for (let col = 1; col < c.cols; col++) {
        const bx = col * stepPxW;
        const bw = c.blendPxW;

        if (cfg.style === 'blendRamp') {
          const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
          grad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
          grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.5)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
        }
        ctx.fillRect(bx, 0, bw, H);

        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, 0, bw, H);
        ctx.restore();
      }
    }

    if (c.rows > 1 && c.blendPxH > 0) {
      for (let r = 1; r < c.rows; r++) {
        const by = r * stepPxH;
        const bh = c.blendPxH;

        if (cfg.style === 'blendRamp') {
          const grad = ctx.createLinearGradient(0, by, 0, by + bh);
          grad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
          grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.5)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
        }
        ctx.fillRect(0, by, W, bh);

        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0, by, W, bh);
        ctx.restore();
      }
    }
  }

  // 5. Active Target Wall Outline
  if (cfg.showWallBounds) {
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.strokeRect(c.wallPxX, c.wallPxY, c.activeWallPxW, c.activeWallPxH);

    const tagH = 26;
    ctx.fillStyle = '#10b981';
    ctx.fillRect(c.wallPxX, Math.max(0, c.wallPxY - tagH), Math.min(c.activeWallPxW, 450), tagH);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.textAlign = 'left';
    const wallTag = cfg.lang === 'en' ? 'WALL' : 'СТЕНА';
    const mTag = cfg.lang === 'en' ? 'm' : 'м';
    ctx.fillText(
      `${wallTag}: ${c.wallW.toFixed(2)}×${c.wallH.toFixed(2)} ${mTag}  [${c.activeWallPxW}×${c.activeWallPxH} px]`,
      c.wallPxX + 10,
      Math.max(16, c.wallPxY - 8)
    );
  }

  // 6. Info Stamp
  if (cfg.showInfoStamp) {
    const stampW = 340;
    const stampH = 110;
    const sx = Math.max(10, W - stampW - 16);
    const sy = Math.max(10, H - stampH - 16);

    ctx.fillStyle = 'rgba(10, 10, 14, 0.92)';
    ctx.fillRect(sx, sy, stampW, stampH);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx, sy, stampW, stampH);

    const isEn = cfg.lang === 'en';
    const mUnit = isEn ? 'm' : 'м';
    const unitsWord = isEn ? 'units' : 'шт.';

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ARRAYMAPPER PRO // MASK', sx + 14, sy + 22);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillText(`${isEn ? 'Canvas' : 'Холст'}: ${c.totalCanvasPxW} × ${c.totalCanvasPxH} px`, sx + 14, sy + 40);
    ctx.fillText(`${isEn ? 'Wall' : 'Стена'}: ${c.wallW.toFixed(1)}×${c.wallH.toFixed(1)} ${mUnit} (${c.activeWallPxW}×${c.activeWallPxH} px)`, sx + 14, sy + 55);
    ctx.fillText(`${isEn ? 'Array' : 'Сетка'}: ${c.cols}×${c.rows} (${c.totalPhysicalProjectors} ${unitsWord}) • TR ${c.lensTR.toFixed(2)}:1`, sx + 14, sy + 70);
    ctx.fillText(`${isEn ? 'Blend' : 'Сшивка'}: ${Math.round(c.blendPct * 100)}% (${c.blendPxW} px) • ${Math.round(c.realLux)} Lux`, sx + 14, sy + 85);
    ctx.fillText(cfg.eventName || 'Engineering LED Tool', sx + 14, sy + 100);
  }

  ctx.restore();
}

export function renderProjectorSliceMask(
  ctx: CanvasRenderingContext2D,
  s: SliceData,
  c: ProjectionComputed,
  cfg: MaskExportConfig
) {
  const W = s.width;
  const H = s.height;

  ctx.save();
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#07080b';
  ctx.fillRect(0, 0, W, H);

  if (cfg.showGrid) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, W, H);

  if (cfg.showTargets) {
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(W, H);
    ctx.moveTo(W, 0); ctx.lineTo(0, H);
    ctx.stroke();

    const cx = W / 2;
    const cy = H / 2;
    const maxR = Math.min(W, H) * 0.42;

    [0.25, 0.5, 0.75, 1.0].forEach((mul) => {
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * mul, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 40, cy); ctx.lineTo(cx + 40, cy);
    ctx.moveTo(cx, cy - 40); ctx.lineTo(cx, cy + 40);
    ctx.stroke();
  }

  if (cfg.showBlendZones) {
    if (s.blendL > 0) {
      const grad = ctx.createLinearGradient(0, 0, s.blendL, 0);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.96)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s.blendL, H);

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(s.blendL, 0); ctx.lineTo(s.blendL, H); ctx.stroke();
      ctx.restore();
    }

    if (s.blendR > 0) {
      const grad = ctx.createLinearGradient(W - s.blendR, 0, W, 0);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.96)');
      ctx.fillStyle = grad;
      ctx.fillRect(W - s.blendR, 0, s.blendR, H);

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(W - s.blendR, 0); ctx.lineTo(W - s.blendR, H); ctx.stroke();
      ctx.restore();
    }

    if (s.blendT > 0) {
      const grad = ctx.createLinearGradient(0, 0, 0, s.blendT);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.96)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, s.blendT);

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, s.blendT); ctx.lineTo(W, s.blendT); ctx.stroke();
      ctx.restore();
    }

    if (s.blendB > 0) {
      const grad = ctx.createLinearGradient(0, H - s.blendB, 0, H);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.96)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, H - s.blendB, W, s.blendB);

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, H - s.blendB); ctx.lineTo(W, H - s.blendB); ctx.stroke();
      ctx.restore();
    }
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
  ctx.fillRect(20, 20, 320, 75);
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(20, 20, 320, 75);

  ctx.fillStyle = '#06b6d4';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`PROJECTOR ${s.zoneId}`, 34, 48);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.fillText(`Canvas Offset: [${s.startX}, ${s.startY}] px`, 34, 68);
  ctx.fillText(`Output Res: ${s.width}×${s.height} px • Stack: ${s.stackMultiplier}x`, 34, 84);

  ctx.restore();
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

export async function exportCanvasPNG(c: ProjectionComputed, cfg: MaskExportConfig): Promise<boolean> {
  const canvas = document.createElement('canvas');
  canvas.width = c.totalCanvasPxW;
  canvas.height = c.totalCanvasPxH;
  const ctx = canvas.getContext('2d')!;
  renderFullCanvasMask(ctx, c, cfg);

  const blob = await canvasToBlob(canvas);
  const safeName = (cfg.eventName || 'projection').replace(/[/\\?%*:|"<>]/g, '_');
  const filename = `${safeName}_canvas_${c.totalCanvasPxW}x${c.totalCanvasPxH}_mask.png`;

  const ok = await savePngBlob(filename, blob);
  if (ok) showToast('Маска холста сохранена');
  return ok;
}

export async function exportSlicePNG(s: SliceData, c: ProjectionComputed, cfg: MaskExportConfig): Promise<boolean> {
  const canvas = document.createElement('canvas');
  canvas.width = s.width;
  canvas.height = s.height;
  const ctx = canvas.getContext('2d')!;
  renderProjectorSliceMask(ctx, s, c, cfg);

  const blob = await canvasToBlob(canvas);
  const safeName = (cfg.eventName || 'projection').replace(/[/\\?%*:|"<>]/g, '_');
  const filename = `${safeName}_${s.zoneId}_${s.width}x${s.height}_mask.png`;

  const ok = await savePngBlob(filename, blob);
  if (ok) showToast(`Маска для ${s.zoneId} сохранена`);
  return ok;
}

export async function exportAllMasksZIP(c: ProjectionComputed, cfg: MaskExportConfig): Promise<boolean> {
  const zip = new JSZip();
  const safeName = (cfg.eventName || 'projection').replace(/[/\\?%*:|"<>]/g, '_');

  // 1. Full Canvas Mask
  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = c.totalCanvasPxW;
  fullCanvas.height = c.totalCanvasPxH;
  const fullCtx = fullCanvas.getContext('2d')!;
  renderFullCanvasMask(fullCtx, c, cfg);
  const fullBlob = await canvasToBlob(fullCanvas);
  zip.file(`Full_Canvas_${c.totalCanvasPxW}x${c.totalCanvasPxH}_Mask.png`, fullBlob);

  // 2. Individual Projector Slice Masks
  const slicesFolder = zip.folder('projector_slices');
  for (const s of c.slices) {
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = s.width;
    sliceCanvas.height = s.height;
    const sliceCtx = sliceCanvas.getContext('2d')!;
    renderProjectorSliceMask(sliceCtx, s, c, cfg);
    const sliceBlob = await canvasToBlob(sliceCanvas);
    slicesFolder?.file(`${s.zoneId}_${s.width}x${s.height}_Mask.png`, sliceBlob);
  }

  // 3. Technical Specification TXT
  const specText = buildProjectionSpecText(c, cfg.eventName, cfg.lang);
  zip.file('Projection_Specification.txt', specText);

  // 4. Generate & Save ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const filename = `${safeName}_projection_masks.zip`;

  if (isDesktopApp()) {
    const base64 = await blobToBase64(zipBlob);
    const saved = await saveDesktopZIP(filename, base64);
    if (saved) {
      showToast('ZIP архив с масками сохранен');
      return true;
    }
    return false;
  } else {
    saveAs(zipBlob, filename);
    showToast('ZIP архив с масками сохранен');
    return true;
  }
}


