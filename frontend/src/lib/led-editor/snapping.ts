import { Panel } from "../led-editor-svg/types";

export type XEdge = 'L' | 'R'; type YEdge = 'T' | 'B';

export function snapFunc(
    panels: Panel[],
    snapLock: React.RefObject<{
        x: {
            kind: "edge" | "grid";
            mId: string;
            mEdge: XEdge;
            target: number;
        } | null;
        y: {
            kind: "edge" | "grid";
            mId: string;
            mEdge: YEdge;
            target: number;
        } | null;
    }>,
    ids: Set<string>,
    rawDx: number,
    rawDy: number
) {
    const GRID = 10;
    const SNAP_EDGE_IN = 5, SNAP_EDGE_OUT = 10;
    const SNAP_GRID_IN = 5, SNAP_GRID_OUT = 10;
    const OVERLAP_MIN = 10;

    const nearestGrid = (v: number) => Math.round(v / GRID) * GRID;
    const edgesX = (p: Panel, dx = 0) => ({ L: p.x + dx, R: p.x + p.w + dx });
    const edgesY = (p: Panel, dy = 0) => ({ T: p.y + dy, B: p.y + p.h + dy });
    const overlap1D = (a0: number, a1: number, b0: number, b1: number) =>
        Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

    const moving = panels.filter(p => ids.has(p.id));
    if (!moving.length) return { dx: rawDx, dy: rawDy };
    const others = panels.filter(p => !ids.has(p.id));

    type CandX = {
        kind: 'edge' | 'grid';
        mId: string;
        mEdge: XEdge;
        target: number;
        delta: number;
        dist: number;
    } | null;

    type CandY = {
        kind: 'edge' | 'grid';
        mId: string;
        mEdge: YEdge;
        target: number;
        delta: number;
        dist: number;
    } | null;

    let bestX: CandX = null;
    let bestY: CandY = null;

    // --- Края к краям (если есть перекрытие по перпендикуляру) ---
    for (const m of moving) {
        const mx = edgesX(m, rawDx), my = edgesY(m, rawDy);
        for (const q of others) {
            const qx = edgesX(q, 0), qy = edgesY(q, 0);

            // X-стыковка (перекрытие по Y)
            const yOverlap = overlap1D(my.T, my.B, qy.T, qy.B);
            if (yOverlap >= OVERLAP_MIN) {
                const xPairs: Array<[XEdge, number]> = [
                    ['L', qx.L - mx.L],
                    ['R', qx.R - mx.R],
                    ['L', qx.R - mx.L],
                    ['R', qx.L - mx.R],
                ];
                for (const [mEdge, d] of xPairs) {
                    const a = Math.abs(d);
                    if (!bestX || a < bestX.dist) {
                        bestX = {
                            kind: 'edge',
                            mId: m.id,
                            mEdge,
                            target: (mEdge === 'L' ? mx.L : mx.R) + d,
                            delta: d,
                            dist: a,
                        };
                    }
                }
            }

            // Y-стыковка (перекрытие по X)
            const xOverlap = overlap1D(mx.L, mx.R, qx.L, qx.R);
            if (xOverlap >= OVERLAP_MIN) {
                const yPairs: Array<[YEdge, number]> = [
                    ['T', qy.T - my.T],
                    ['B', qy.B - my.B],
                    ['T', qy.B - my.T],
                    ['B', qy.T - my.B],
                ];
                for (const [mEdge, d] of yPairs) {
                    const a = Math.abs(d);
                    if (!bestY || a < bestY.dist) {
                        bestY = {
                            kind: 'edge',
                            mId: m.id,
                            mEdge,
                            target: (mEdge === 'T' ? my.T : my.B) + d,
                            delta: d,
                            dist: a,
                        };
                    }
                }
            }
        }
    }

    // --- Снап к сетке (fallback) ---
    for (const m of moving) {
        const mx = edgesX(m, rawDx), my = edgesY(m, rawDy);

        const gL = nearestGrid(mx.L);
        {
            const d = gL - mx.L; const a = Math.abs(d);
            if (!bestX || a < bestX.dist) {
                bestX = { kind: 'grid', mId: m.id, mEdge: 'L', target: gL, delta: d, dist: a };
            }
        }
        const gR = nearestGrid(mx.R);
        {
            const d = gR - mx.R; const a = Math.abs(d);
            if (!bestX || a < bestX.dist) {
                bestX = { kind: 'grid', mId: m.id, mEdge: 'R', target: gR, delta: d, dist: a };
            }
        }

        const gT = nearestGrid(my.T);
        {
            const d = gT - my.T; const a = Math.abs(d);
            if (!bestY || a < bestY.dist) {
                bestY = { kind: 'grid', mId: m.id, mEdge: 'T', target: gT, delta: d, dist: a };
            }
        }
        const gB = nearestGrid(my.B);
        {
            const d = gB - my.B; const a = Math.abs(d);
            if (!bestY || a < bestY.dist) {
                bestY = { kind: 'grid', mId: m.id, mEdge: 'B', target: gB, delta: d, dist: a };
            }
        }
    }

    // --- Локи с гистерезисом ---
    const inX = (k: 'edge' | 'grid') => (k === 'edge' ? SNAP_EDGE_IN : SNAP_GRID_IN);
    const outX = (k: 'edge' | 'grid') => (k === 'edge' ? SNAP_EDGE_OUT : SNAP_GRID_OUT);

    let outDX = rawDx, outDY = rawDy;

    // X
    if (snapLock.current.x) {
        const lock = snapLock.current.x;
        const m = moving.find(mm => mm.id === lock.mId);
        if (m) {
            const mx = edgesX(m, rawDx);
            const cur = lock.mEdge === 'L' ? mx.L : mx.R;
            const d = lock.target - cur;
            const a = Math.abs(d);
            if (a <= outX(lock.kind)) outDX += d; else snapLock.current.x = null;
        } else {
            snapLock.current.x = null;
        }
    }
    if (!snapLock.current.x && bestX && bestX.dist <= inX(bestX.kind)) {
        snapLock.current.x = { kind: bestX.kind, mId: bestX.mId, mEdge: bestX.mEdge, target: bestX.target };
        outDX += bestX.delta;
    }

    // Y
    if (snapLock.current.y) {
        const lock = snapLock.current.y;
        const m = moving.find(mm => mm.id === lock.mId);
        if (m) {
            const my = edgesY(m, rawDy);
            const cur = lock.mEdge === 'T' ? my.T : my.B;
            const d = lock.target - cur;
            const a = Math.abs(d);
            if (a <= outX(lock.kind)) outDY += d; else snapLock.current.y = null;
        } else {
            snapLock.current.y = null;
        }
    }
    if (!snapLock.current.y && bestY && bestY.dist <= inX(bestY.kind)) {
        snapLock.current.y = { kind: bestY.kind, mId: bestY.mId, mEdge: bestY.mEdge, target: bestY.target };
        outDY += bestY.delta;
    }

    return { dx: outDX, dy: outDY };
}