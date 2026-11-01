'use client';
import React from 'react';
import { ScreenGroup, WiringPage, Panel } from '@/lib/led-editor-svg/types';
import { useI18n } from '@/lib/i18n';
import { getMaskPanelResolution } from '@/lib/led-editor-svg/mask-contour';

interface AddScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  wiringPages: WiringPage[];
  activeMaskScreenGroupIds: Set<string>;
  onAddScreen: (group: ScreenGroup) => void;
  onGoToWiring?: () => void;
}

export default function AddScreenModal({
  isOpen, onClose, wiringPages, activeMaskScreenGroupIds, onAddScreen, onGoToWiring,
}: AddScreenModalProps) {
  const { t } = useI18n();
  if (!isOpen) return null;

  const panelsById = new Map<string, Panel>();
  wiringPages.forEach(wp => wp.panels.forEach(p => panelsById.set(p.id, p)));
  const totalGroups = wiringPages.reduce((acc, wp) => acc + (wp.screenGroups?.length ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#10121a] border border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">{t('mask.addScreenModalTitle')}</h3>
            <p className="text-xs text-neutral-400 mt-0.5">{t('mask.addScreenModalSubtitle')}</p>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg bg-[#181a24] text-neutral-400 hover:text-white flex items-center justify-center">✕</button>
        </div>
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {totalGroups === 0 ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto text-xl">⊞</div>
              <div className="text-sm font-medium text-neutral-200">{t('mask.noScreensTitle')}</div>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">{t('mask.noScreensDesc')}</p>
              {onGoToWiring && (
                <button type="button" onClick={() => { onGoToWiring(); onClose(); }} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-lg shadow-blue-500/20">
                  {t('mask.goToWiring')}
                </button>
              )}
            </div>
          ) : (
            wiringPages.map(wp => {
              const groups = wp.screenGroups ?? [];
              if (groups.length === 0) return null;
              return (
                <div key={wp.id} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-neutral-300">
                    <span className="flex items-center gap-1.5"><span className="text-cyan-400">📄</span>{wp.name}</span>
                    <span className="text-[11px] text-neutral-400">{groups.length}</span>
                  </div>
                  <div className="grid gap-2">
                    {groups.map((group, gIdx) => {
                      const isAdded = activeMaskScreenGroupIds.has(group.id);
                      const gPanels = group.panelIds.map(pid => panelsById.get(pid)).filter((p): p is Panel => Boolean(p));
                      let resW = 0, resH = 0;
                      if (gPanels.length > 0) {
                        const minX = Math.min(...gPanels.map(p => p.x)), maxX = Math.max(...gPanels.map(p => p.x + p.w));
                        const minY = Math.min(...gPanels.map(p => p.y)), maxY = Math.max(...gPanels.map(p => p.y + p.h));
                        const r = getMaskPanelResolution(gPanels[0]);
                        resW = Math.round(((maxX - minX) / gPanels[0].w) * r.resW);
                        resH = Math.round(((maxY - minY) / gPanels[0].h) * r.resH);
                      }
                      return (
                        <div key={`${wp.id}-${group.id}-${gIdx}`} className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${isAdded ? 'bg-[#141620] border-cyan-500/30' : 'bg-[#141620] border-white/[0.06]'}`}>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white truncate">{group.name}</span>
                              {isAdded && <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/20">{t('mask.onCanvas')}</span>}
                            </div>
                            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                              {resW > 0 && resH > 0 && <span>{resW}×{resH} px • </span>}
                              <span>{gPanels.length} {t('mask.panelsUnit')}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={isAdded}
                            onClick={() => onAddScreen(group)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${isAdded ? 'bg-white/[0.04] text-neutral-500' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                          >
                            {isAdded ? t('mask.added') : `+ ${t('mask.add')}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
