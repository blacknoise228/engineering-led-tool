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

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += minorStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += minorStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.5;
    for (let x = 0; x <= W; x += majorStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += majorStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  // 3. Projector Zones (White high-visibility lines)
  for (const s of c.slices) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(s.startX, s.startY, s.width, s.height);

    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(s.startX, s.startY, s.width, s.height);
    ctx.restore();

    const cx = s.startX + s.width / 2;
    const cy = s.startY + s.height / 2;

    if (cfg.showTargets) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
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
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - chLen, cy); ctx.lineTo(cx + chLen, cy);
      ctx.moveTo(cx, cy - chLen); ctx.lineTo(cx, cy + chLen);
      ctx.stroke();

      // Full slice zone center cross lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, s.startY); ctx.lineTo(cx, s.startY + s.height);
      ctx.moveTo(s.startX, cy); ctx.lineTo(s.startX + s.width, cy);
      ctx.stroke();
    }

    if (cfg.showSliceLabels) {
      // Positioned below center so center crosshair remains visible
      const boxW = Math.min(s.width - 20, 270);
      const boxH = 50;
      const bx = cx - boxW / 2;
      const by = cy + 30;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(bx, by, boxW, boxH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${s.zoneId}  [${s.startX}, ${s.startY} px]`, cx, by + 22);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.fillText(`Res: ${s.width}×${s.height} px • Stack: ${s.stackMultiplier}x`, cx, by + 40);
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

  // 5. Active Target Wall Outline (Wall badge removed per user request)
  if (cfg.showWallBounds) {
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.strokeRect(c.wallPxX, c.wallPxY, c.activeWallPxW, c.activeWallPxH);
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
    ctx.fillText('Engineering LED Tool Projection', sx + 14, sy + 22);

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

  if (cfg.style === 'alpha') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return;
  }

  // 1. Background
  ctx.fillStyle = '#07080b';
  ctx.fillRect(0, 0, W, H);

  const cx = Math.round(W / 2);
  const cy = Math.round(H / 2);

  // 2. Alignment Grid (Symmetrical from optical center cx, cy)
  if (cfg.showGrid) {
    const minorStep = 50;
    const majorStep = 200;

    // Minor lines (step 50px)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = cx - minorStep; x >= 0; x -= minorStep) {
      if ((cx - x) % majorStep !== 0) {
        const px = Math.floor(x) + 0.5;
        ctx.moveTo(px, 0); ctx.lineTo(px, H);
      }
    }
    for (let x = cx + minorStep; x <= W; x += minorStep) {
      if ((x - cx) % majorStep !== 0) {
        const px = Math.floor(x) + 0.5;
        ctx.moveTo(px, 0); ctx.lineTo(px, H);
      }
    }
    for (let y = cy - minorStep; y >= 0; y -= minorStep) {
      if ((cy - y) % majorStep !== 0) {
        const py = Math.floor(y) + 0.5;
        ctx.moveTo(0, py); ctx.lineTo(W, py);
      }
    }
    for (let y = cy + minorStep; y <= H; y += minorStep) {
      if ((y - cy) % majorStep !== 0) {
        const py = Math.floor(y) + 0.5;
        ctx.moveTo(0, py); ctx.lineTo(W, py);
      }
    }
    ctx.stroke();

    // Major lines (step 200px)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = cx - majorStep; x >= 0; x -= majorStep) {
      const px = Math.floor(x) + 0.5;
      ctx.moveTo(px, 0); ctx.lineTo(px, H);
    }
    for (let x = cx + majorStep; x <= W; x += majorStep) {
      const px = Math.floor(x) + 0.5;
      ctx.moveTo(px, 0); ctx.lineTo(px, H);
    }
    for (let y = cy - majorStep; y >= 0; y -= majorStep) {
      const py = Math.floor(y) + 0.5;
      ctx.moveTo(0, py); ctx.lineTo(W, py);
    }
    for (let y = cy + majorStep; y <= H; y += majorStep) {
      const py = Math.floor(y) + 0.5;
      ctx.moveTo(0, py); ctx.lineTo(W, py);
    }
    ctx.stroke();
  }

  // 3. Center Lines (Prominent full-length crosshair edge-to-edge through center)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
  ctx.moveTo(0, cy); ctx.lineTo(W, cy);
  ctx.stroke();

  // Calibration tick marks along the center axes
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = cx - 50; x >= 0; x -= 50) {
    const isMajor = (cx - x) % 200 === 0;
    const len = isMajor ? 8 : 4;
    const px = Math.floor(x) + 0.5;
    ctx.moveTo(px, cy - len); ctx.lineTo(px, cy + len);
  }
  for (let x = cx + 50; x <= W; x += 50) {
    const isMajor = (x - cx) % 200 === 0;
    const len = isMajor ? 8 : 4;
    const px = Math.floor(x) + 0.5;
    ctx.moveTo(px, cy - len); ctx.lineTo(px, cy + len);
  }
  for (let y = cy - 50; y >= 0; y -= 50) {
    const isMajor = (cy - y) % 200 === 0;
    const len = isMajor ? 8 : 4;
    const py = Math.floor(y) + 0.5;
    ctx.moveTo(cx - len, py); ctx.lineTo(cx + len, py);
  }
  for (let y = cy + 50; y <= H; y += 50) {
    const isMajor = (y - cy) % 200 === 0;
    const len = isMajor ? 8 : 4;
    const py = Math.floor(y) + 0.5;
    ctx.moveTo(cx - len, py); ctx.lineTo(cx + len, py);
  }
  ctx.stroke();

  // Optical center reticle circles
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Optical Targets (Diagonals and Concentric Circles)
  if (cfg.showTargets) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(W, H);
    ctx.moveTo(W, 0); ctx.lineTo(0, H);
    ctx.stroke();

    const maxR = Math.min(W, H) * 0.42;
    [0.25, 0.5, 0.75, 1.0].forEach((mul) => {
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * mul, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  // 5. Outer Slice Border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, W - 3, H - 3);

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

  // 7. Slice Info Badge (Positioned below center reticle so center is unobstructed)
  if (cfg.showSliceLabels) {
    const boxW = Math.min(W - 20, 320);
    const boxH = 75;
    const bx = (W - boxW) / 2;
    const by = cy + 55;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(bx, by, boxW, boxH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`PROJECTOR ${s.zoneId}`, W / 2, by + 28);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillText(`Canvas Offset: [${s.startX}, ${s.startY}] px`, W / 2, by + 48);
    ctx.fillText(`Output Res: ${s.width}×${s.height} px • Stack: ${s.stackMultiplier}x`, W / 2, by + 64);
  }

  ctx.restore();
}

function renderWallBlendZones(
  ctx: CanvasRenderingContext2D,
  c: ProjectionComputed,
  cfg: MaskExportConfig,
  W: number,
  H: number
) {
  // Vertical blend zones
  if (c.cols > 1 && c.blendPxW > 0) {
    const stepX = c.projResW - c.blendPxW;
    for (let col = 1; col < c.cols; col++) {
      const bx = col * stepX - c.wallPxX;
      const bw = c.blendPxW;

      if (cfg.style === 'blendRamp') {
        const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
        grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.6)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
      }
      ctx.fillRect(bx, 0, bw, H);

      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, 0); ctx.lineTo(bx, H);
      ctx.moveTo(bx + bw, 0); ctx.lineTo(bx + bw, H);
      ctx.stroke();

      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx + bw / 2, 0); ctx.lineTo(bx + bw / 2, H);
      ctx.stroke();
      ctx.restore();

      const badgeW = 160;
      const badgeH = 44;
      const badgeX = bx + bw / 2 - badgeW / 2;

      [35, H - 35 - badgeH].forEach((badgeY) => {
        ctx.fillStyle = 'rgba(15, 15, 20, 0.92)';
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`BLEND ZONE: ${c.blendPxW} px`, bx + bw / 2, badgeY + 17);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
        ctx.fillText(`${c.overlapM_W.toFixed(2)} m • P*.${col} ◄► P*.${col + 1}`, bx + bw / 2, badgeY + 34);
      });
    }
  }

  // Horizontal blend zones
  if (c.rows > 1 && c.blendPxH > 0) {
    const stepY = c.projResH - c.blendPxH;
    for (let r = 1; r < c.rows; r++) {
      const by = r * stepY - c.wallPxY;
      const bh = c.blendPxH;

      if (cfg.style === 'blendRamp') {
        const grad = ctx.createLinearGradient(0, by, 0, by + bh);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
        grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.6)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
      }
      ctx.fillRect(0, by, W, bh);

      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, by); ctx.lineTo(W, by);
      ctx.moveTo(0, by + bh); ctx.lineTo(W, by + bh);
      ctx.stroke();

      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, by + bh / 2); ctx.lineTo(W, by + bh / 2);
      ctx.stroke();
      ctx.restore();

      const badgeW = 160;
      const badgeH = 44;
      const badgeY = by + bh / 2 - badgeH / 2;

      [35, W - 35 - badgeW].forEach((badgeX) => {
        ctx.fillStyle = 'rgba(15, 15, 20, 0.92)';
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`BLEND ZONE: ${c.blendPxH} px`, badgeX + badgeW / 2, badgeY + 17);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
        ctx.fillText(`${c.overlapM_H.toFixed(2)} m • P${r}.* ▲▼ P${r + 1}.*`, badgeX + badgeW / 2, badgeY + 34);
      });
    }
  }
}

function renderWallGridAndTargets(
  ctx: CanvasRenderingContext2D,
  cfg: MaskExportConfig,
  W: number,
  H: number,
  cx: number,
  cy: number
) {
  // Alignment Grid (Symmetrical from optical wall center)
  if (cfg.showGrid) {
    const minorStep = 50;
    const majorStep = 200;

    // Minor lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = cx - minorStep; x >= 0; x -= minorStep) {
      if ((cx - x) % majorStep !== 0) {
        const px = Math.floor(x) + 0.5;
        ctx.moveTo(px, 0); ctx.lineTo(px, H);
      }
    }
    for (let x = cx + minorStep; x <= W; x += minorStep) {
      if ((x - cx) % majorStep !== 0) {
        const px = Math.floor(x) + 0.5;
        ctx.moveTo(px, 0); ctx.lineTo(px, H);
      }
    }
    for (let y = cy - minorStep; y >= 0; y -= minorStep) {
      if ((cy - y) % majorStep !== 0) {
        const py = Math.floor(y) + 0.5;
        ctx.moveTo(0, py); ctx.lineTo(W, py);
      }
    }
    for (let y = cy + minorStep; y <= H; y += minorStep) {
      if ((y - cy) % majorStep !== 0) {
        const py = Math.floor(y) + 0.5;
        ctx.moveTo(0, py); ctx.lineTo(W, py);
      }
    }
    ctx.stroke();

    // Major lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = cx - majorStep; x >= 0; x -= majorStep) {
      const px = Math.floor(x) + 0.5;
      ctx.moveTo(px, 0); ctx.lineTo(px, H);
    }
    for (let x = cx + majorStep; x <= W; x += majorStep) {
      const px = Math.floor(x) + 0.5;
      ctx.moveTo(px, 0); ctx.lineTo(px, H);
    }
    for (let y = cy - majorStep; y >= 0; y -= majorStep) {
      const py = Math.floor(y) + 0.5;
      ctx.moveTo(0, py); ctx.lineTo(W, py);
    }
    for (let y = cy + majorStep; y <= H; y += majorStep) {
      const py = Math.floor(y) + 0.5;
      ctx.moveTo(0, py); ctx.lineTo(W, py);
    }
    ctx.stroke();
  }

  // Center Lines of Wall
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
  ctx.moveTo(0, cy); ctx.lineTo(W, cy);
  ctx.stroke();

  // Calibration tick marks along the center axes
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = cx - 50; x >= 0; x -= 50) {
    const isMajor = (cx - x) % 200 === 0;
    const len = isMajor ? 8 : 4;
    const px = Math.floor(x) + 0.5;
    ctx.moveTo(px, cy - len); ctx.lineTo(px, cy + len);
  }
  for (let x = cx + 50; x <= W; x += 50) {
    const isMajor = (x - cx) % 200 === 0;
    const len = isMajor ? 8 : 4;
    const px = Math.floor(x) + 0.5;
    ctx.moveTo(px, cy - len); ctx.lineTo(px, cy + len);
  }
  for (let y = cy - 50; y >= 0; y -= 50) {
    const isMajor = (cy - y) % 200 === 0;
    const len = isMajor ? 8 : 4;
    const py = Math.floor(y) + 0.5;
    ctx.moveTo(cx - len, py); ctx.lineTo(cx + len, py);
  }
  for (let y = cy + 50; y <= H; y += 50) {
    const isMajor = (y - cy) % 200 === 0;
    const len = isMajor ? 8 : 4;
    const py = Math.floor(y) + 0.5;
    ctx.moveTo(cx - len, py); ctx.lineTo(cx + len, py);
  }
  ctx.stroke();

  // Wall center reticle
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, Math.PI * 2);
  ctx.stroke();

  // Optical Targets (Diagonals & Concentric Circles)
  if (cfg.showTargets) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(W, H);
    ctx.moveTo(W, 0); ctx.lineTo(0, H);
    ctx.stroke();

    const maxR = Math.min(W, H) * 0.38;
    [0.25, 0.5, 0.75, 1.0].forEach((mul) => {
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * mul, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
}

export function renderWallMask(
  ctx: CanvasRenderingContext2D,
  c: ProjectionComputed,
  cfg: MaskExportConfig
) {
  const W = c.activeWallPxW;
  const H = c.activeWallPxH;

  ctx.save();
  ctx.clearRect(0, 0, W, H);

  if (cfg.style === 'alpha') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return;
  }

  // 1. Background
  ctx.fillStyle = '#07080b';
  ctx.fillRect(0, 0, W, H);

  const cx = Math.round(W / 2);
  const cy = Math.round(H / 2);

  // 2. Grid & Center lines & Optical Targets
  renderWallGridAndTargets(ctx, cfg, W, H, cx, cy);

  // 3. Projector Coverage Outlines on Wall
  for (const s of c.slices) {
    const sx = s.startX - c.wallPxX;
    const sy = s.startY - c.wallPxY;
    const sw = s.width;
    const sh = s.height;

    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.restore();

    if (cfg.showSliceLabels) {
      const labelW = 120;
      const labelH = 26;
      const labelX = Math.max(10, Math.min(W - labelW - 10, sx + sw / 2 - labelW / 2));
      const labelY = Math.max(10, Math.min(H - labelH - 10, sy + 30));
      ctx.fillStyle = 'rgba(10, 12, 18, 0.88)';
      ctx.fillRect(labelX, labelY - 4, labelW, labelH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(labelX, labelY - 4, labelW, labelH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(s.zoneId, labelX + labelW / 2, labelY + 14);
    }
  }

  // 4. Designation of Blend Zones on Wall
  if (cfg.showBlendZones) {
    renderWallBlendZones(ctx, c, cfg, W, H);
  }

  // 5. Outer Wall Border (Emerald) & Corner Accents
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, W - 3, H - 3);

  const cornerL = 25;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(2, cornerL); ctx.lineTo(2, 2); ctx.lineTo(cornerL, 2);
  ctx.moveTo(W - cornerL, 2); ctx.lineTo(W - 2, 2); ctx.lineTo(W - 2, cornerL);
  ctx.moveTo(2, H - cornerL); ctx.lineTo(2, H - 2); ctx.lineTo(cornerL, H - 2);
  ctx.moveTo(W - cornerL, H - 2); ctx.lineTo(W - 2, H - 2); ctx.lineTo(W - 2, H - cornerL);
  ctx.stroke();

  // 6. Info Stamp on Wall Mask
  if (cfg.showInfoStamp) {
    const stampW = 340;
    const stampH = 110;
    const sx = Math.max(10, W - stampW - 16);
    const sy = Math.max(10, H - stampH - 16);

    ctx.fillStyle = 'rgba(10, 10, 14, 0.94)';
    ctx.fillRect(sx, sy, stampW, stampH);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx, sy, stampW, stampH);

    const isEn = cfg.lang === 'en';
    const mUnit = isEn ? 'm' : 'м';

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(isEn ? 'WALL CONTENT MASK' : 'МАСКА СТЕНЫ ДЛЯ КОНТЕНТА', sx + 14, sy + 22);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillText(`${isEn ? 'Wall Size' : 'Размер стены'}: ${c.wallW.toFixed(2)} × ${c.wallH.toFixed(2)} ${mUnit} (${W} × ${H} px)`, sx + 14, sy + 40);
    ctx.fillText(`${isEn ? 'Projectors' : 'Проекторы'}: ${c.cols} × ${c.rows} (${c.totalPhysicalProjectors} ${isEn ? 'units' : 'шт.'})`, sx + 14, sy + 55);
    ctx.fillText(`${isEn ? 'Edge Blend' : 'Зона сшивки'}: ${Math.round(c.blendPct * 100)}% (${c.blendPxW} px / ${c.overlapM_W.toFixed(2)} ${mUnit})`, sx + 14, sy + 70);
    ctx.fillText(`${isEn ? 'Pixel Density' : 'Плотность'}: ${c.pixelPitchMm.toFixed(2)} ${isEn ? 'mm/px' : 'мм/px'} (${Math.round(c.pxPerMeter)} px/${mUnit})`, sx + 14, sy + 85);
    ctx.fillText(cfg.eventName || 'Engineering LED Tool', sx + 14, sy + 100);
  }

  ctx.restore();
}

export async function exportWallPNG(c: ProjectionComputed, cfg: MaskExportConfig): Promise<boolean> {
  const canvas = document.createElement('canvas');
  canvas.width = c.activeWallPxW;
  canvas.height = c.activeWallPxH;
  const ctx = canvas.getContext('2d')!;
  renderWallMask(ctx, c, cfg);

  const blob = await canvasToBlob(canvas);
  const safeName = (cfg.eventName || 'projection').replace(/[/\\?%*:|"<>]/g, '_');
  const filename = `${safeName}_wall_${c.activeWallPxW}x${c.activeWallPxH}_mask.png`;

  const ok = await savePngBlob(filename, blob);
  if (ok) showToast('Маска стены сохранена');
  return ok;
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

  // 2. Active Wall Mask (Wall content size with designated blend areas)
  const wallCanvas = document.createElement('canvas');
  wallCanvas.width = c.activeWallPxW;
  wallCanvas.height = c.activeWallPxH;
  const wallCtx = wallCanvas.getContext('2d')!;
  renderWallMask(wallCtx, c, cfg);
  const wallBlob = await canvasToBlob(wallCanvas);
  zip.file(`Wall_${c.activeWallPxW}x${c.activeWallPxH}_Mask.png`, wallBlob);

  // 3. Individual Projector Slice Masks
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


