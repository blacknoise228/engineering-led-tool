import { useEffect } from "react";
import { Panel, Tool, Vec } from "../led-editor-svg/types";
import { clientToStage, rectFromPoints } from "../led-editor-svg/utils";

export function useHotkeys(
    values: {
        scale: number,
        selectedCables: Set<string>,
        selectedPanels: Set<string>,
        selectedGroupIds?: Set<string>,
        tool: Tool,
        pan: Vec,

        draft: {
            fromId: string;
            mouse: Vec;
        } | null,
        svgRef: React.RefObject<SVGSVGElement | null>,
    },
    setDraft: (value: React.SetStateAction<{
        fromId: string;
        mouse: Vec;
    } | null>) => void,
    marqueeStart: React.RefObject<Vec | null>,
    setMarquee: (value: React.SetStateAction<{
        x: number;
        y: number;
        w: number;
        h: number;
    } | null>) => void,
    dragGroup: React.RefObject<{
        ids: string[];
        startClient: Vec;
        starts: Record<string, Vec>;
    } | null>,
    applySnapToDelta: (ids: Set<string>, rawDx: number, rawDy: number) => {
        dx: number;
        dy: number;
    },
    setPanels: (value: React.SetStateAction<Panel[]>) => void,
    onPointerUp: () => void,
    setTool: (value: React.SetStateAction<Tool>) => void,
    deleteSelected: () => void,
    redo: () => void,
    undo: () => void,

    exportPNG: () => void,
    duplicateSelectedPanels: () => void,
    selectAll?: () => void,
    copySelected?: () => void,
    cutSelected?: () => void,
    paste?: () => void,
    saveProject?: () => void,
    saveProjectAs?: () => void
) {
    const { scale, svgRef, draft, pan, tool, selectedCables, selectedPanels, selectedGroupIds } = values;
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (draft && svgRef.current) {
                const pt = clientToStage(e.clientX, e.clientY, svgRef.current, pan, scale);
                setDraft(d => (d ? ({ ...d, mouse: pt }) : null));
            }
            if (marqueeStart.current && svgRef.current) {
                const pt = clientToStage(e.clientX, e.clientY, svgRef.current, pan, scale);
                setMarquee(rectFromPoints(marqueeStart.current, pt));
            }
            const dg = dragGroup.current;
            if (dg) {
                const rawDx = (e.clientX - dg.startClient.x) / scale;
                const rawDy = (e.clientY - dg.startClient.y) / scale;
                const selSet = new Set(dg.ids);
                const { dx, dy } = applySnapToDelta(selSet, rawDx, rawDy);
                setPanels(ps => ps.map(p => selSet.has(p.id)
                    ? ({ ...p, x: dg.starts[p.id].x + dx, y: dg.starts[p.id].y + dy })
                    : p
                ));
            }
        };

        const onUp = () => onPointerUp();

        const onKey = (e: KeyboardEvent) => {
            const isCtrlOrMeta = e.ctrlKey || e.metaKey;

            if (isCtrlOrMeta && (e.code === 'KeyS' || e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы')) {
                e.preventDefault();
                if (e.shiftKey && saveProjectAs) {
                    saveProjectAs();
                } else if (saveProject) {
                    saveProject();
                }
                return;
            }

            const target = e.target as HTMLElement | null;
            const isInput = target && (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            );
            if (isInput) return;

            if (isCtrlOrMeta && (e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z' || e.key === 'я' || e.key === 'Я')) {
                e.preventDefault();
                if (e.shiftKey) redo(); else undo();
                return;
            }
            if (isCtrlOrMeta && (e.code === 'KeyY' || e.key === 'y' || e.key === 'Y' || e.key === 'н' || e.key === 'Н')) {
                e.preventDefault();
                redo();
                return;
            }
            const isDeleteKey = e.key === 'Delete' || e.key === 'Backspace' || e.code === 'Delete' || e.code === 'Backspace';
            const hasSelection = Boolean(
                selectedPanels.size ||
                selectedCables.size ||
                (selectedGroupIds && selectedGroupIds.size > 0)
            );
            if (isDeleteKey && hasSelection) {
                e.preventDefault();
                deleteSelected();
                return;
            }
            if (isCtrlOrMeta && (e.code === 'KeyA' || e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф')) {
                if (selectAll) {
                    e.preventDefault();
                    selectAll();
                    return;
                }
            }
            if (isCtrlOrMeta && (e.code === 'KeyC' || e.key === 'c' || e.key === 'C' || e.key === 'с' || e.key === 'С')) {
                if (copySelected && selectedPanels.size > 0) {
                    e.preventDefault();
                    copySelected();
                    return;
                }
            }
            if (isCtrlOrMeta && (e.code === 'KeyX' || e.key === 'x' || e.key === 'X' || e.key === 'ч' || e.key === 'Ч')) {
                if (cutSelected && selectedPanels.size > 0) {
                    e.preventDefault();
                    cutSelected();
                    return;
                }
            }
            if (isCtrlOrMeta && (e.code === 'KeyV' || e.key === 'v' || e.key === 'V' || e.key === 'м' || e.key === 'М')) {
                if (paste) {
                    e.preventDefault();
                    paste();
                    return;
                }
            }
            if (isCtrlOrMeta && (e.code === 'KeyE' || e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У')) {
                e.preventDefault();
                exportPNG();
                return;
            }
            if (e.key === 'Escape') {
                setDraft(null);
                setTool('select');
                return;
            }
            if (isCtrlOrMeta && (e.code === 'KeyD' || e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В')) {
                e.preventDefault();
                duplicateSelectedPanels();
                return;
            }
        };

        const onMouseDown = (e: MouseEvent) => {
            if (tool === 'cable' && e.button === 2) { e.preventDefault(); setDraft(null); setTool('select'); }
        };
        const onContextMenu = (e: MouseEvent) => {
            if (tool === 'cable') { e.preventDefault(); setDraft(null); setTool('select'); }
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('keydown', onKey);
        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('contextmenu', onContextMenu);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('contextmenu', onContextMenu);
        };
    }, [
        draft, pan, scale, applySnapToDelta, onPointerUp,
        deleteSelected, exportPNG, redo, undo,
        selectedPanels.size, selectedCables.size, selectedGroupIds, tool,
        duplicateSelectedPanels, selectAll, copySelected, cutSelected, paste, saveProject, saveProjectAs,
        setDraft, dragGroup, setMarquee, marqueeStart, setPanels, setTool, svgRef
    ]);
}
