import { CableEx, CardInstance, Panel, Vec } from "../led-editor-svg/types";
import { boundsOfPanels, exportSvgToPng } from "../led-editor-svg/utils";

export function exportPNGFunc(
    svgRef: React.RefObject<SVGSVGElement | null>,
    panels: Panel[],
    pan: Vec,
    scale: number,
    _cables?: CableEx[],
    _serverId?: string | Array<{ id: string; modelId: string }>,
    _cardId?: string,
    _cards?: CardInstance[],
    eventName?: string,
    _eventDate?: string,
    _logoDataUrl?: string,
    _fiberCounts?: Record<string, number>,
    pageName?: string
){

    if (!svgRef.current || panels.length === 0) return;

    const pad = 80;
    const { minX, minY, maxX, maxY } = boundsOfPanels(panels);
    const left = pan.x + scale * (minX - pad);
    const top = pan.y + scale * (minY - pad);
    const width = Math.max(1, scale * ((maxX - minX) + 2 * pad));
    const height = Math.max(1, scale * ((maxY - minY) + 2 * pad));

    const safePage = pageName ? `_${pageName.replace(/[/\\?%*:|"<>]/g, '_')}` : '';
    const dateStr = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    exportSvgToPng(
      svgRef.current,
      { x: left, y: top, width, height },
      `${eventName || 'wiring'}${safePage}-${dateStr}.png`,
      null
    );
}
