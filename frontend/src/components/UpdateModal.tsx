'use client';

import React from 'react';
import { useUpdater, formatBytes, formatSpeed } from '@/lib/useUpdater';

export default function UpdateModal() {
  const {
    currentVersion,
    updateInfo,
    checking,
    checkError,
    downloadProgress,
    downloadState,
    downloadError,
    isModalOpen,
    setIsModalOpen,
    checkForUpdatesManual,
    startDownload,
    cancelDownload,
    installAndRestart,
    openDownloadedFolder,
    openGitHubRelease,
  } = useUpdater();

  const [launching, setLaunching] = React.useState(false);

  if (!isModalOpen) return null;

  const handleInstall = async () => {
    setLaunching(true);
    try {
      await installAndRestart();
    } finally {
      setTimeout(() => setLaunching(false), 2000);
    }
  };

  const handleClose = () => {
    if (downloadState === 'downloading') {
      if (confirm('Идет скачивание обновления. Отменить?')) {
        cancelDownload();
        setIsModalOpen(false);
      }
    } else {
      setIsModalOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div
        className="w-full max-w-lg rounded-2xl bg-[#141620] border border-white/[0.1] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-[#10121a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Обновление программы</h2>
              <p className="text-[11px] text-neutral-400">Текущая версия: v{currentVersion}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.08] transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {checking && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-neutral-300 font-medium">Проверка наличия обновлений...</p>
              <p className="text-neutral-500 text-[11px]">Связываемся с репозиторием GitHub</p>
            </div>
          )}

          {!checking && checkError && (
            <div className="py-6 flex flex-col items-center text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 text-lg">
                ✕
              </div>
              <div>
                <p className="text-neutral-200 font-medium">Не удалось проверить обновления</p>
                <p className="text-red-400/80 text-[11px] mt-1 max-w-sm">{checkError}</p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={checkForUpdatesManual}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white transition font-medium"
                >
                  Повторить попытку
                </button>
                <button
                  onClick={openGitHubRelease}
                  className="px-3 py-1.5 rounded-lg bg-transparent border border-white/10 hover:bg-white/5 text-neutral-300 transition"
                >
                  Открыть GitHub
                </button>
              </div>
            </div>
          )}

          {!checking && !checkError && updateInfo && !updateInfo.hasUpdate && downloadState === 'idle' && (
            <div className="py-8 flex flex-col items-center text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium text-sm">У вас актуальная версия</p>
                <p className="text-neutral-400 text-[11px] mt-0.5">Engineering LED Tool v{currentVersion} является самой свежей версией.</p>
              </div>
              <button
                onClick={checkForUpdatesManual}
                className="mt-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white transition text-xs"
              >
                Проверить снова
              </button>
            </div>
          )}
          {!checking && !checkError && updateInfo?.hasUpdate && downloadState !== 'downloading' && downloadState !== 'completed' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Доступно обновление
                    </span>
                    <span className="font-bold text-white text-sm">{updateInfo.latestVersion}</span>
                  </div>
                  {updateInfo.releaseName && updateInfo.releaseName !== updateInfo.latestVersion && (
                    <p className="text-neutral-300 text-xs mt-1 font-medium">{updateInfo.releaseName}</p>
                  )}
                  {updateInfo.fileSize > 0 && (
                    <p className="text-neutral-400 text-[11px] mt-0.5">
                      Размер файла: <strong className="text-neutral-200">{formatBytes(updateInfo.fileSize)}</strong>
                    </p>
                  )}
                </div>
              </div>

              {updateInfo.releaseNotes && (
                <div>
                  <p className="text-neutral-400 text-[11px] font-medium mb-1.5">Что нового:</p>
                  <div className="max-h-40 overflow-y-auto p-3 rounded-xl bg-black/30 border border-white/[0.06] text-neutral-300 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                    {updateInfo.releaseNotes}
                  </div>
                </div>
              )}

              {downloadState === 'error' && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-[11px]">
                  Ошибка загрузки: {downloadError}
                </div>
              )}
            </div>
          )}

          {downloadState === 'downloading' && (
            <div className="py-4 space-y-3">
              <div className="flex items-center justify-between text-neutral-300 text-xs font-medium">
                <span>Загрузка обновления...</span>
                <span className="text-cyan-400 font-mono font-bold">
                  {downloadProgress ? Math.round(downloadProgress.percentage) : 0}%
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-200"
                  style={{ width: `${downloadProgress ? downloadProgress.percentage : 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span>
                  {downloadProgress ? formatBytes(downloadProgress.bytesDownloaded) : '0 Б'} /{' '}
                  {downloadProgress && downloadProgress.totalBytes > 0
                    ? formatBytes(downloadProgress.totalBytes)
                    : '...'}
                </span>
                <span>{downloadProgress ? formatSpeed(downloadProgress.speed) : '0 Б/с'}</span>
              </div>
            </div>
          )}

          {downloadState === 'completed' && (
            <div className="py-6 flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl">
                ✓
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Обновление готово к установке!</p>
                <p className="text-neutral-400 text-[11px] mt-1 max-w-sm">
                  Файл успешно загружен. При запуске установщика текущее приложение закроется для обновления файлов.
                </p>
              </div>
            </div>
          )}

          {downloadError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-[11px] leading-relaxed flex items-start gap-2">
              <span className="text-red-400 font-bold">✕</span>
              <div className="flex-1">
                <p className="font-semibold text-red-200">Ошибка запуска установщика</p>
                <p className="mt-0.5">{downloadError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 border-t border-white/[0.08] bg-[#10121a] flex items-center justify-between">
          <button
            onClick={openGitHubRelease}
            className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition"
          >
            <span>Страница на GitHub</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            {downloadState === 'downloading' ? (
              <button
                onClick={cancelDownload}
                className="px-3.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition font-medium text-xs"
              >
                Отмена
              </button>
            ) : downloadState === 'completed' ? (
              <>
                <button
                  onClick={openDownloadedFolder}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-neutral-200 transition font-medium text-xs cursor-pointer"
                >
                  В папке
                </button>
                <button
                  onClick={handleInstall}
                  disabled={launching}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white transition font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 cursor-pointer disabled:opacity-60"
                >
                  {launching ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Запуск...</span>
                    </>
                  ) : (
                    <span>Установить сейчас</span>
                  )}
                </button>
              </>
            ) : updateInfo?.hasUpdate ? (
              <>
                <button
                  onClick={handleClose}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-neutral-300 transition text-xs"
                >
                  Позже
                </button>
                <button
                  onClick={startDownload}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-900/30"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Скачать обновление</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleClose}
                className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white transition font-medium text-xs"
              >
                Закрыть
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

