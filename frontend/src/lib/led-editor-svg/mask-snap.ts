export type ActiveMaskSnapGuide = {
  axis: 'x' | 'y';
  pos: number;
  type: 'corner-to-center' | 'center' | 'edge' | 'origin';
  label: string;
  points: Array<{ x: number; y: number; kind: 'corner' | 'center' | 'edge' }>;
  lineMin: number;
  lineMax: number;
};

export type ScreenBox = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  b: number;
  cx: number;
  cy: number;
};

type AxisPart = { ref: 'start' | 'mid' | 'end'; val: number; offset: number };
type OtherAxisPart = { ref: 'start' | 'mid' | 'end'; val: number; perp: { start: number; end: number; mid: number } };

function snapAxis1D(
  startVal: number,
  rawDelta: number,
  size: number,
  minLimit: number,
  otherTargets: OtherAxisPart[],
  snapDist: number
) {
  let delta = Math.max(-minLimit, rawDelta);
  const curPos = startVal + delta;
  let bestDiff = snapDist;
  let bestDelta = delta;
  let bestGuide: {
    pos: number;
    type: 'corner-to-center' | 'center' | 'edge' | 'origin';
    labelKey: string;
    movingRef: 'start' | 'mid' | 'end';
    targetRef: 'start' | 'mid' | 'end' | 'origin';
    targetPerp?: { start: number; end: number; mid: number };
  } | null = null;

  if (Math.abs(minLimit + delta) < bestDiff) {
    bestDiff = Math.abs(minLimit + delta);
    bestDelta = -minLimit;
    bestGuide = {
      pos: 0,
      type: 'origin',
      labelKey: 'mask.snapOrigin',
      movingRef: 'start',
      targetRef: 'origin',
    };
  }

  const movingParts: AxisPart[] = [
    { ref: 'start', val: curPos, offset: 0 },
    { ref: 'mid', val: curPos + size / 2, offset: size / 2 },
    { ref: 'end', val: curPos + size, offset: size },
  ];

  for (const oPart of otherTargets) {
    for (const mPart of movingParts) {
      const diff = mPart.val - oPart.val;
      const absDiff = Math.abs(diff);
      if (absDiff < bestDiff) {
        bestDiff = absDiff;
        bestDelta = (oPart.val - mPart.offset) - startVal;
        const isCenterToCenter = mPart.ref === 'mid' && oPart.ref === 'mid';
        const isCornerToCenter = (mPart.ref === 'mid') !== (oPart.ref === 'mid');
        const type: 'corner-to-center' | 'center' | 'edge' = isCenterToCenter
          ? 'center'
          : isCornerToCenter
          ? 'corner-to-center'
          : 'edge';
        const labelKey = isCenterToCenter
          ? 'mask.snapCenter'
          : isCornerToCenter
          ? 'mask.snapCornerToCenter'
          : 'mask.snapEdge';

        bestGuide = {
          pos: oPart.val,
          type,
          labelKey,
          movingRef: mPart.ref,
          targetRef: oPart.ref,
          targetPerp: oPart.perp,
        };
      }
    }
  }

  delta = Math.max(-minLimit, bestDelta);
  return { delta, guide: delta === bestDelta ? bestGuide : null };
}

function buildGuide(
  axis: 'x' | 'y',
  g: NonNullable<ReturnType<typeof snapAxis1D>['guide']>,
  finalPerp: number,
  movingSize: number,
  t: (key: string) => string
): ActiveMaskSnapGuide {
  const points: Array<{ x: number; y: number; kind: 'corner' | 'center' | 'edge' }> = [];
  const pos = g.pos;
  let lineMin = finalPerp - 60;
  let lineMax = finalPerp + movingSize + 60;

  const mkPt = (a: number, p: number, kind: 'corner' | 'center' | 'edge') =>
    axis === 'x' ? { x: a, y: p, kind } : { x: p, y: a, kind };

  if (g.movingRef === 'mid') {
    points.push(mkPt(pos, finalPerp + movingSize / 2, 'center'));
  } else {
    points.push(mkPt(pos, finalPerp, 'corner'));
    points.push(mkPt(pos, finalPerp + movingSize, 'corner'));
  }

  if (g.targetPerp) {
    lineMin = Math.min(lineMin, g.targetPerp.start - 60);
    lineMax = Math.max(lineMax, g.targetPerp.end + 60);
    if (g.targetRef === 'mid') {
      points.push(mkPt(pos, g.targetPerp.mid, 'center'));
    } else {
      points.push(mkPt(pos, g.targetPerp.start, 'corner'));
      points.push(mkPt(pos, g.targetPerp.end, 'corner'));
    }
  }

  return { axis, pos, type: g.type, label: t(g.labelKey), points, lineMin, lineMax };
}

export function computeMaskSnap(
  draggedItem: { startX: number; startY: number; w: number; h: number },
  minStartX: number,
  minStartY: number,
  rawDx: number,
  rawDy: number,
  otherBoxes: ScreenBox[],
  scale: number,
  t: (key: string) => string
): {
  deltaX: number;
  deltaY: number;
  guides: ActiveMaskSnapGuide[];
} {
  const snapDist = Math.max(12, Math.min(36, Math.round(18 / (scale || 1))));

  const xTargets: OtherAxisPart[] = [];
  for (const ob of otherBoxes) {
    const perp = { start: ob.y, end: ob.b, mid: ob.cy };
    xTargets.push({ ref: 'start', val: ob.x, perp });
    xTargets.push({ ref: 'mid', val: ob.cx, perp });
    xTargets.push({ ref: 'end', val: ob.r, perp });
  }

  const yTargets: OtherAxisPart[] = [];
  for (const ob of otherBoxes) {
    const perp = { start: ob.x, end: ob.r, mid: ob.cx };
    yTargets.push({ ref: 'start', val: ob.y, perp });
    yTargets.push({ ref: 'mid', val: ob.cy, perp });
    yTargets.push({ ref: 'end', val: ob.b, perp });
  }

  const resX = snapAxis1D(draggedItem.startX, rawDx, draggedItem.w, minStartX, xTargets, snapDist);
  const resY = snapAxis1D(draggedItem.startY, rawDy, draggedItem.h, minStartY, yTargets, snapDist);

  const deltaX = resX.delta;
  const deltaY = resY.delta;
  const finalX = draggedItem.startX + deltaX;
  const finalY = draggedItem.startY + deltaY;
  const guides: ActiveMaskSnapGuide[] = [];

  if (resX.guide) {
    guides.push(buildGuide('x', resX.guide, finalY, draggedItem.h, t));
  }
  if (resY.guide) {
    guides.push(buildGuide('y', resY.guide, finalX, draggedItem.w, t));
  }

  return { deltaX, deltaY, guides };
}
