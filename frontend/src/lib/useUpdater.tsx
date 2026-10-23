'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import React from 'react';
import {
  checkForUpdates as apiCheckForUpdates,
  getAppVersion as apiGetAppVersion,
  startUpdateDownload as apiStartUpdateDownload,
  cancelUpdateDownload as apiCancelUpdateDownload,
  installUpdate as apiInstallUpdate,
  showFileInFolder as apiShowFileInFolder,
  openExternalUrl,
  onUpdateDownloadProgress,
  UpdateInfo,
  DownloadProgress,
} from './desktop';

export interface UpdaterContextType {
  currentVersion: string;
  updateInfo: UpdateInfo | null;
  checking: boolean;
  checkError: string | null;
  downloadProgress: DownloadProgress | null;
  downloadState: 'idle' | 'downloading' | 'completed' | 'error' | 'cancelled';
  downloadError: string | null;
  downloadedFilePath: string | null;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  checkForUpdatesManual: () => Promise<void>;
  startDownload: () => Promise<void>;
  cancelDownload: () => Promise<void>;
  installAndRestart: () => Promise<void>;
  openDownloadedFolder: () => Promise<void>;
  openGitHubRelease: () => Promise<void>;
}

const UpdaterContext = createContext<UpdaterContextType | null>(null);

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 Б';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 Б/с';
  return `${formatBytes(bytesPerSec)}/с`;
}

export function UpdaterProvider({ children }: { children: ReactNode }) {
  const [currentVersion, setCurrentVersion] = useState<string>('0.1.0');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'completed' | 'error' | 'cancelled'>('idle');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadedFilePath, setDownloadedFilePath] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    apiGetAppVersion().then(v => {
      if (v) setCurrentVersion(v);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onUpdateDownloadProgress((progress) => {
      setDownloadProgress(progress);
      if (progress.status === 'downloading') {
        setDownloadState('downloading');
      } else if (progress.status === 'completed') {
        setDownloadState('completed');
        setDownloadedFilePath(progress.filePath);
      } else if (progress.status === 'error') {
        setDownloadState('error');
        setDownloadError(progress.error || 'Ошибка при загрузке обновления');
      } else if (progress.status === 'cancelled') {
        setDownloadState('cancelled');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const checkForUpdatesManual = useCallback(async () => {
    setChecking(true);
    setCheckError(null);
    try {
      const res = await apiCheckForUpdates();
      if (res) {
        setUpdateInfo(res);
        if (res.currentVersion) {
          setCurrentVersion(res.currentVersion);
        }
      }
    } catch (e: unknown) {
      console.error('Update check failed:', e);
      setCheckError(e instanceof Error ? e.message : 'Не удалось связаться с сервером обновлений');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkForUpdatesManual().catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, [checkForUpdatesManual]);

  const startDownload = useCallback(async () => {
    if (!updateInfo?.downloadURL) {
      if (updateInfo?.htmlURL) {
        await openExternalUrl(updateInfo.htmlURL);
      }
      return;
    }

    setDownloadState('downloading');
    setDownloadError(null);
    setDownloadProgress(null);

    try {
      const success = await apiStartUpdateDownload(updateInfo.downloadURL, updateInfo.fileName || '');
      if (!success) {
        if (updateInfo.downloadURL.startsWith('http')) {
          await openExternalUrl(updateInfo.downloadURL);
        }
      }
    } catch (e: unknown) {
      setDownloadState('error');
      setDownloadError(e instanceof Error ? e.message : 'Ошибка запуска скачивания');
    }
  }, [updateInfo]);

  const cancelDownload = useCallback(async () => {
    await apiCancelUpdateDownload();
    setDownloadState('cancelled');
  }, []);

  const installAndRestart = useCallback(async () => {
    if (downloadedFilePath) {
      try {
        await apiInstallUpdate(downloadedFilePath);
      } catch (e: unknown) {
        setDownloadError(e instanceof Error ? e.message : 'Не удалось запустить установщик');
      }
    }
  }, [downloadedFilePath]);

  const openDownloadedFolder = useCallback(async () => {
    if (downloadedFilePath) {
      await apiShowFileInFolder(downloadedFilePath);
    }
  }, [downloadedFilePath]);

  const openGitHubRelease = useCallback(async () => {
    const url = updateInfo?.htmlURL || 'https://github.com/blacknoise228/engineering-led-tool/releases';
    await openExternalUrl(url);
  }, [updateInfo]);

  return (
    <UpdaterContext.Provider
      value={{
        currentVersion,
        updateInfo,
        checking,
        checkError,
        downloadProgress,
        downloadState,
        downloadError,
        downloadedFilePath,
        isModalOpen,
        setIsModalOpen,
        checkForUpdatesManual,
        startDownload,
        cancelDownload,
        installAndRestart,
        openDownloadedFolder,
        openGitHubRelease,
      }}
    >
      {children}
    </UpdaterContext.Provider>
  );
}

export function useUpdater(): UpdaterContextType {
  const ctx = useContext(UpdaterContext);
  if (!ctx) {
    throw new Error('useUpdater must be used within an UpdaterProvider');
  }
  return ctx;
}
