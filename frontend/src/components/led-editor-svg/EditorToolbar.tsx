'use client';
import React from 'react';
import type { MaskPage, WiringPage, PanelClipboardData } from '@/lib/led-editor-svg/types';
import PageBar from './PageBar';
import { useI18n } from '@/lib/i18n';

interface EditorToolbarProps {
  activeTab: 'cards' | 'wiring' | 'mask' | 'info';
  setActiveTab: (tab: 'cards' | 'wiring' | 'mask' | 'info') => void;
  selectedGroupCount: number;
  selectedPanelCount: number;
  panelCount: number;
  cableCount: number;
  clipboard: PanelClipboardData | null;
  deleteSelected: () => void;
  copySelectedPanels: () => void;
  cutSelectedPanels: () => void;
  pastePanels: () => void;
  duplicateSelectedPanels: () => void;
  maskPages: MaskPage[];
  activeMaskPageId: string;
  switchMaskPage: (id: string) => void;
  addMaskPage: () => void;
  removeMaskPage: (id: string) => void;
  renameMaskPage: (id: string, name: string) => void;
  duplicateMaskPage: (id: string) => void;
  wiringPages: WiringPage[];
  activeWiringPageId: string;
  switchWiringPage: (id: string) => void;
  addWiringPage: () => void;
  removeWiringPage: (id: string) => void;
  renameWiringPage: (id: string, name: string) => void;
  duplicateWiringPage: (id: string) => void;
  undo: () => void;
  redo: () => void;
  scale: number;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  resetView: () => void;
  activeRefreshRate?: number;
}

export default function EditorToolbar({
  activeTab,
  setActiveTab,
  selectedGroupCount,
  selectedPanelCount,
  panelCount,
  cableCount,
  clipboard,
  deleteSelected,
  copySelectedPanels,
  cutSelectedPanels,
  pastePanels,
  duplicateSelectedPanels,
  maskPages,
  activeMaskPageId,
  switchMaskPage,
  addMaskPage,
  removeMaskPage,
  renameMaskPage,
  duplicateMaskPage,
  wiringPages,
  activeWiringPageId,
  switchWiringPage,
  addWiringPage,
  removeWiringPage,
  renameWiringPage,
  duplicateWiringPage,
  undo,
  redo,
  scale,
  setScale,
  resetView,
  activeRefreshRate,
}: EditorToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
      <div className="pointer-events-auto flex items-center gap-2 bg-[#0c0d14]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/[0.08] shadow-2xl">
        {activeTab === 'mask' && selectedGroupCount > 0 ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-xs text-neutral-300">
              {t('toolbar.selectedScreens', { count: selectedGroupCount })}
            </span>
            <div className="w-px h-3.5 bg-white/[0.1] mx-0.5" />
            <button
              onClick={deleteSelected}
              className="px-1.5 py-0.5 rounded text-[11px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
              title={t('toolbar.deleteScreens')}
            >
              ✕
            </button>
          </>
        ) : selectedPanelCount > 0 ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-xs text-neutral-300">
              {t('toolbar.selectedPanels', { count: selectedPanelCount })}
            </span>
            <div className="w-px h-3.5 bg-white/[0.1] mx-0.5" />
            <button
              onClick={copySelectedPanels}
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 border border-white/[0.08] transition"
              title={t('toolbar.copyTitle')}
            >
              {t('toolbar.copy')}
            </button>
            <button
              onClick={cutSelectedPanels}
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 border border-white/[0.08] transition"
              title={t('toolbar.cutTitle')}
            >
              {t('toolbar.cut')}
            </button>
            {clipboard && clipboard.panels.length > 0 && (
              <button
                onClick={pastePanels}
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-600/30 hover:bg-blue-600/45 text-blue-200 border border-blue-500/40 transition"
                title={t('toolbar.pasteTitle')}
              >
                {t('toolbar.paste', { count: clipboard.panels.length })}
              </button>
            )}
            <button
              onClick={duplicateSelectedPanels}
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 border border-white/[0.08] transition"
              title={t('toolbar.duplicateTitle')}
            >
              {t('toolbar.duplicate')}
            </button>
            <button
              onClick={deleteSelected}
              className="px-1.5 py-0.5 rounded text-[11px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
              title={t('toolbar.delete')}
            >
              ✕
            </button>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80"></span>
            <span className="text-xs text-neutral-400">
              {t('toolbar.panelsCount', { count: panelCount })}
            </span>
            {cableCount > 0 && (
              <>
                <span className="text-neutral-600 text-xs">•</span>
                <span className="text-xs text-neutral-400">
                  {t('toolbar.cablesCount', { count: cableCount })}
                </span>
              </>
            )}
            {activeTab !== 'mask' && typeof activeRefreshRate === 'number' && (
              <>
                <span className="text-neutral-600 text-xs">•</span>
                <span className="text-xs text-neutral-400">
                  {t('toolbar.rate', { rate: activeRefreshRate })}
                </span>
              </>
            )}
            {clipboard && clipboard.panels.length > 0 && (
              <>
                <div className="w-px h-3.5 bg-white/[0.1] mx-0.5" />
                <button
                  onClick={pastePanels}
                  className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-blue-600/25 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 transition flex items-center gap-1.5"
                  title={t('toolbar.pasteTitle')}
                >
                  <span>{t('toolbar.paste', { count: clipboard.panels.length })}</span>
                  <span className="text-[9px] text-blue-400/80 font-mono">Ctrl+V</span>
                </button>
              </>
            )}
          </>
        )}
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="pointer-events-auto flex items-center p-1 rounded-xl bg-[#0c0d14]/90 backdrop-blur-md border border-white/[0.08] shadow-2xl">
          <button
            onClick={() => setActiveTab('wiring')}
            className={[
              'px-4 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2',
              activeTab !== 'mask'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]',
            ].join(' ')}
          >
            <span>{t('toolbar.wiring')}</span>
          </button>
          <button
            onClick={() => setActiveTab('mask')}
            className={[
              'px-4 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2',
              activeTab === 'mask'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]',
            ].join(' ')}
          >
            <span>{t('toolbar.mask')}</span>
          </button>
        </div>

        <div className="pointer-events-auto">
          {activeTab === 'mask' ? (
            <PageBar
              pages={maskPages.map((mp) => ({
                id: mp.id,
                name: mp.name,
                count: mp.screenGroups.length,
                countLabel: t('pagebar.scrUnit'),
              }))}
              activePageId={activeMaskPageId}
              onSelectPage={switchMaskPage}
              onAddPage={addMaskPage}
              onRemovePage={removeMaskPage}
              onRenamePage={renameMaskPage}
              onDuplicatePage={duplicateMaskPage}
              addTitle={t('pagebar.addPage')}
              addBtnText={t('pagebar.page')}
              badgeSuffix={t('pagebar.scrUnit')}
            />
          ) : (
            <PageBar
              pages={wiringPages.map((wp) => ({
                id: wp.id,
                name: wp.name,
                count: wp.panels.length,
                countLabel: t('pagebar.cabUnit'),
              }))}
              activePageId={activeWiringPageId}
              onSelectPage={switchWiringPage}
              onAddPage={addWiringPage}
              onRemovePage={removeWiringPage}
              onRenamePage={renameWiringPage}
              onDuplicatePage={duplicateWiringPage}
              addTitle={t('pagebar.addSchema')}
              addBtnText={t('pagebar.schema')}
              badgeSuffix={t('pagebar.cabUnit')}
            />
          )}
        </div>
      </div>

      <div className="pointer-events-auto flex items-center gap-1.5 bg-[#0c0d14]/90 backdrop-blur-md px-2 py-1 rounded-xl border border-white/[0.08] shadow-2xl">
        <button
          onClick={undo}
          title={t('toolbar.undo')}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition text-xs"
        >
          ↶
        </button>
        <button
          onClick={redo}
          title={t('toolbar.redo')}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition text-xs"
        >
          ↷
        </button>
        <div className="w-px h-3.5 bg-white/[0.1] mx-0.5" />
        <button
          onClick={() => setScale((s) => Math.max(0.1, s / 1.15))}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] font-mono text-sm transition"
          title={t('toolbar.zoomOut')}
        >
          −
        </button>
        <span className="text-xs font-mono text-neutral-300 min-w-[38px] text-center">
          {(scale * 100).toFixed(0)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(4, s * 1.15))}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] font-mono text-sm transition"
          title={t('toolbar.zoomIn')}
        >
          +
        </button>
        <button
          className="px-2 py-1 text-[11px] rounded-lg border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 transition"
          onClick={resetView}
          title={t('toolbar.resetZoom')}
        >
          100%
        </button>
      </div>
    </div>
  );
}