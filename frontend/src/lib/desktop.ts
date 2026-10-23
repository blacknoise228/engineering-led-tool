import { useEffect } from 'react';

type ToastListener = (message: string) => void;
const toastListeners = new Set<ToastListener>();

export function showToast(message: string) {
  toastListeners.forEach(listener => {
    try {
      listener(message);
    } catch (e) {
      console.error('Toast listener error:', e);
    }
  });
}

export function useToastListener(callback: ToastListener) {
  useEffect(() => {
    toastListeners.add(callback);
    return () => {
      toastListeners.delete(callback);
    };
  }, [callback]);
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseName: string;
  releaseNotes: string;
  releaseDate: string;
  downloadURL: string;
  fileName: string;
  fileSize: number;
  htmlURL: string;
  errorMessage?: string;
}

export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  speed: number;
  status: 'downloading' | 'completed' | 'error' | 'cancelled';
  filePath: string;
  error?: string;
}

interface WailsApp {
  OpenProjectDialog: () => Promise<{ filePath?: string; content?: string }>;
  SaveProject: (targetPath: string, defaultFilename: string, content: string) => Promise<string>;
  SavePNG: (defaultFilename: string, base64Data: string) => Promise<string>;
  SaveZIP: (defaultFilename: string, base64Data: string) => Promise<string>;
  GetInitialProject: () => Promise<{ filePath?: string; content?: string } | null>;
  ReadProjectFile: (filePath: string) => Promise<{ filePath?: string; content?: string }>;
  LoadPanelPresets: () => Promise<{ filePath?: string; content?: string }>;
  SavePanelPresets: (content: string) => Promise<string>;
  GetPanelsConfigPath: () => Promise<string>;
  OpenPanelsFileDialog: () => Promise<{ filePath?: string; content?: string } | null>;
  SavePanelsFileDialog: (defaultFilename: string, content: string) => Promise<string>;

  LoadCardPresets: () => Promise<{ filePath?: string; content?: string }>;
  SaveCardPresets: (content: string) => Promise<string>;
  GetCardsConfigPath: () => Promise<string>;
  OpenCardsFileDialog: () => Promise<{ filePath?: string; content?: string } | null>;
  SaveCardsFileDialog: (defaultFilename: string, content: string) => Promise<string>;

  LoadServerPresets: () => Promise<{ filePath?: string; content?: string }>;
  SaveServerPresets: (content: string) => Promise<string>;
  GetServersConfigPath: () => Promise<string>;
  OpenServersFileDialog: () => Promise<{ filePath?: string; content?: string } | null>;
  SaveServersFileDialog: (defaultFilename: string, content: string) => Promise<string>;

  LoadFiberPresets: () => Promise<{ filePath?: string; content?: string }>;
  SaveFiberPresets: (content: string) => Promise<string>;
  GetFibersConfigPath: () => Promise<string>;
  OpenFibersFileDialog: () => Promise<{ filePath?: string; content?: string } | null>;
  SaveFibersFileDialog: (defaultFilename: string, content: string) => Promise<string>;

  LoadMaskLogoConfig?: () => Promise<{ filePath?: string; content?: string }>;
  SaveMaskLogoConfig?: (content: string) => Promise<string>;

  LoadAppConfig?: () => Promise<{ filePath?: string; content?: string }>;
  SaveAppConfig?: (content: string) => Promise<string>;
  GetAppConfigPath?: () => Promise<string>;
  GetSystemLanguage?: () => Promise<string>;
  SetLanguage?: (lang: string) => Promise<void>;

  GetAppVersion?: () => Promise<string>;
  CheckForUpdates?: () => Promise<UpdateInfo>;
  StartUpdateDownload?: (downloadURL: string, fileName: string) => Promise<void>;
  CancelUpdateDownload?: () => Promise<void>;
  InstallUpdate?: (filePath: string) => Promise<void>;
  GetDownloadedUpdatePath?: () => Promise<string>;
  ShowFileInFolder?: (filePath: string) => Promise<void>;
  OpenURLInBrowser?: (url: string) => Promise<void>;
}

interface WailsRuntime {
  EventsOn?: (eventName: string, callback: (...args: unknown[]) => void) => () => void;
  EventsOnMultiple?: (eventName: string, callback: (...args: unknown[]) => void, maxCallbacks: number) => () => void;
  OnFileDrop?: (callback: (x: number, y: number, paths: string[]) => void, useDropTarget: boolean) => void;
  OnFileDropOff?: () => void;
}

interface WailsWindow {
  go?: {
    main?: {
      App?: WailsApp;
    };
  };
  runtime?: WailsRuntime;
}

function getWailsApp(): WailsApp | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as WailsWindow;
  return w.go?.main?.App ?? null;
}

export function isDesktopApp(): boolean {
  return Boolean(getWailsApp()?.SaveProject);
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function openDesktopProject(): Promise<{ filePath: string; content: string } | null> {
  const app = getWailsApp();
  if (!app) return null;
  const res = await app.OpenProjectDialog();
  if (res && res.filePath && res.content) {
    return {
      filePath: res.filePath,
      content: res.content,
    };
  }
  return null;
}

export async function saveDesktopProject(
  targetPath: string | null,
  defaultFilename: string,
  content: string
): Promise<string | null> {
  const app = getWailsApp();
  if (!app) return null;
  const res = await app.SaveProject(
    targetPath || '',
    defaultFilename,
    content
  );
  return res || null;
}

export async function savePngBlob(filename: string, blob: Blob): Promise<boolean> {
  const app = getWailsApp();
  if (app) {
    try {
      const base64 = await blobToBase64(blob);
      const savedPath = await app.SavePNG(filename, base64);
      return Boolean(savedPath);
    } catch (e) {
      console.error('Failed to save PNG in desktop app:', e);
      return false;
    }
  }

  // Browser fallback
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export async function savePngFile(filename: string, dataUrlOrBase64: string): Promise<boolean> {
  const app = getWailsApp();
  if (app) {
    try {
      const savedPath = await app.SavePNG(filename, dataUrlOrBase64);
      return Boolean(savedPath);
    } catch (e) {
      console.error('Failed to save PNG in desktop app:', e);
      return false;
    }
  }

  // Browser fallback
  const a = document.createElement('a');
  a.href = dataUrlOrBase64;
  a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}

export async function saveDesktopZIP(filename: string, base64Data: string): Promise<string | null> {
  const app = getWailsApp();
  if (!app) return null;
  try {
    const res = await app.SaveZIP(filename, base64Data);
    return res || null;
  } catch (e) {
    console.error('Failed to save ZIP in desktop app:', e);
    return null;
  }
}

export async function getInitialDesktopProject(): Promise<{ filePath: string; content: string } | null> {
  const app = getWailsApp();
  if (!app?.GetInitialProject) return null;
  try {
    const res = await app.GetInitialProject();
    if (res && res.filePath && res.content) {
      return {
        filePath: res.filePath,
        content: res.content,
      };
    }
  } catch (e) {
    console.error('Failed to get initial project:', e);
  }
  return null;
}

export async function readDesktopProjectFile(filePath: string): Promise<{ filePath: string; content: string } | null> {
  const app = getWailsApp();
  if (!app?.ReadProjectFile) return null;
  try {
    const res = await app.ReadProjectFile(filePath);
    if (res && res.filePath && res.content) {
      return {
        filePath: res.filePath,
        content: res.content,
      };
    }
  } catch (e) {
    console.error('Failed to read project file:', e);
  }
  return null;
}

function subscribeWailsEvent(eventName: string, callback: (...args: unknown[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const w = window as unknown as WailsWindow;
  if (w.runtime?.EventsOnMultiple) {
    return w.runtime.EventsOnMultiple(eventName, callback, -1);
  }
  if (w.runtime?.EventsOn) {
    return w.runtime.EventsOn(eventName, callback);
  }
  return () => {};
}

export function onDesktopProjectOpen(callback: (project: { filePath: string; content: string }) => void): () => void {
  return subscribeWailsEvent('open-project', (data: unknown) => {
    const res = data as { filePath?: string; content?: string } | null;
    if (res && res.filePath && res.content) {
      callback({
        filePath: res.filePath,
        content: res.content,
      });
    }
  });
}

export function setupDesktopFileDrop(onFilePaths: (paths: string[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const w = window as unknown as WailsWindow;
  if (w.runtime?.OnFileDrop) {
    w.runtime.OnFileDrop((_x: number, _y: number, paths: string[]) => {
      if (Array.isArray(paths) && paths.length > 0) {
        onFilePaths(paths);
      }
    }, false);
    return () => {
      if (w.runtime?.OnFileDropOff) {
        w.runtime.OnFileDropOff();
      }
    };
  }
  return () => {};
}

export interface DesktopConfigResult {
  filePath: string;
  content: string;
}

interface PresetAdapterConfig {
  defaultFileName: string;
  storageKey: string;
  loadFromApp: (app: WailsApp) => Promise<{ filePath?: string; content?: string } | null> | undefined;
  saveToApp: (app: WailsApp, content: string) => Promise<string> | undefined;
  getPathFromApp: (app: WailsApp) => Promise<string> | undefined;
  openDialogFromApp: (app: WailsApp) => Promise<{ filePath?: string; content?: string } | null> | undefined;
  saveDialogFromApp: (app: WailsApp, defaultFilename: string, content: string) => Promise<string> | undefined;
}

function downloadJsonFallback(defaultFilename: string, content: string): string {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = defaultFilename.endsWith('.json') ? defaultFilename : `${defaultFilename}.json`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return defaultFilename;
}

function createPresetAdapter(cfg: PresetAdapterConfig) {
  return {
    async load(): Promise<{ filePath: string; content: string } | null> {
      const app = getWailsApp();
      const promise = app ? cfg.loadFromApp(app) : undefined;
      if (promise) {
        try {
          const res = await promise;
          if (res && typeof res.content === 'string') {
            return {
              filePath: res.filePath || cfg.defaultFileName,
              content: res.content,
            };
          }
        } catch (e) {
          console.error(`Failed to load ${cfg.defaultFileName} from desktop:`, e);
        }
      }

      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem(cfg.storageKey);
          if (saved) {
            return { filePath: `localStorage:${cfg.defaultFileName}`, content: saved };
          }
        } catch (e) {
          console.error(`Failed to load ${cfg.defaultFileName} from localStorage:`, e);
        }
      }
      return null;
    },

    async save(content: string): Promise<string | null> {
      const app = getWailsApp();
      const promise = app ? cfg.saveToApp(app, content) : undefined;
      if (promise) {
        try {
          const path = await promise;
          return path || cfg.defaultFileName;
        } catch (e) {
          console.error(`Failed to save ${cfg.defaultFileName} to desktop:`, e);
          throw e;
        }
      }

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(cfg.storageKey, content);
          return `localStorage:${cfg.defaultFileName}`;
        } catch (e) {
          console.error(`Failed to save ${cfg.defaultFileName} to localStorage:`, e);
          throw e;
        }
      }
      return null;
    },

    async getConfigPath(): Promise<string> {
      const app = getWailsApp();
      const promise = app ? cfg.getPathFromApp(app) : undefined;
      if (promise) {
        try {
          return await promise;
        } catch (e) {
          console.error(`Failed to get ${cfg.defaultFileName} config path:`, e);
        }
      }
      return cfg.defaultFileName;
    },

    async openFileDialog(): Promise<{ filePath: string; content: string } | null> {
      const app = getWailsApp();
      const promise = app ? cfg.openDialogFromApp(app) : undefined;
      if (promise) {
        try {
          const res = await promise;
          if (res && res.filePath && typeof res.content === 'string') {
            return { filePath: res.filePath, content: res.content };
          }
        } catch (e) {
          console.error(`Failed to open ${cfg.defaultFileName} file dialog:`, e);
        }
      }
      return null;
    },

    async saveFileDialog(defaultFilename: string, content: string): Promise<string | null> {
      const app = getWailsApp();
      const promise = app ? cfg.saveDialogFromApp(app, defaultFilename, content) : undefined;
      if (promise) {
        try {
          const path = await promise;
          return path || null;
        } catch (e) {
          console.error(`Failed to save ${cfg.defaultFileName} file dialog:`, e);
          throw e;
        }
      }

      if (typeof window !== 'undefined') {
        try {
          return downloadJsonFallback(defaultFilename, content);
        } catch (e) {
          console.error(`Failed to download ${cfg.defaultFileName}:`, e);
          throw e;
        }
      }
      return null;
    },
  };
}

const panelsPresetAdapter = createPresetAdapter({
  defaultFileName: 'panels.json',
  storageKey: 'ss_panels_presets',
  loadFromApp: app => app.LoadPanelPresets?.(),
  saveToApp: (app, content) => app.SavePanelPresets?.(content),
  getPathFromApp: app => app.GetPanelsConfigPath?.(),
  openDialogFromApp: app => app.OpenPanelsFileDialog?.(),
  saveDialogFromApp: (app, name, content) => app.SavePanelsFileDialog?.(name, content),
});

export const loadDesktopPanelPresets = panelsPresetAdapter.load;
export const saveDesktopPanelPresets = panelsPresetAdapter.save;
export const getDesktopPanelsConfigPath = panelsPresetAdapter.getConfigPath;
export const openDesktopPanelsFileDialog = panelsPresetAdapter.openFileDialog;
export const saveDesktopPanelsFileDialog = panelsPresetAdapter.saveFileDialog;

const cardsPresetAdapter = createPresetAdapter({
  defaultFileName: 'cards.json',
  storageKey: 'ss_cards_presets',
  loadFromApp: app => app.LoadCardPresets?.(),
  saveToApp: (app, content) => app.SaveCardPresets?.(content),
  getPathFromApp: app => app.GetCardsConfigPath?.(),
  openDialogFromApp: app => app.OpenCardsFileDialog?.(),
  saveDialogFromApp: (app, name, content) => app.SaveCardsFileDialog?.(name, content),
});

export const loadDesktopCardPresets = cardsPresetAdapter.load;
export const saveDesktopCardPresets = cardsPresetAdapter.save;
export const getDesktopCardsConfigPath = cardsPresetAdapter.getConfigPath;
export const openDesktopCardsFileDialog = cardsPresetAdapter.openFileDialog;
export const saveDesktopCardsFileDialog = cardsPresetAdapter.saveFileDialog;

const serversPresetAdapter = createPresetAdapter({
  defaultFileName: 'servers.json',
  storageKey: 'ss_servers_presets',
  loadFromApp: app => app.LoadServerPresets?.(),
  saveToApp: (app, content) => app.SaveServerPresets?.(content),
  getPathFromApp: app => app.GetServersConfigPath?.(),
  openDialogFromApp: app => app.OpenServersFileDialog?.(),
  saveDialogFromApp: (app, name, content) => app.SaveServersFileDialog?.(name, content),
});

export const loadDesktopServerPresets = serversPresetAdapter.load;
export const saveDesktopServerPresets = serversPresetAdapter.save;
export const getDesktopServersConfigPath = serversPresetAdapter.getConfigPath;
export const openDesktopServersFileDialog = serversPresetAdapter.openFileDialog;
export const saveDesktopServersFileDialog = serversPresetAdapter.saveFileDialog;

const fibersPresetAdapter = createPresetAdapter({
  defaultFileName: 'fibers.json',
  storageKey: 'ss_fibers_presets',
  loadFromApp: app => app.LoadFiberPresets?.(),
  saveToApp: (app, content) => app.SaveFiberPresets?.(content),
  getPathFromApp: app => app.GetFibersConfigPath?.(),
  openDialogFromApp: app => app.OpenFibersFileDialog?.(),
  saveDialogFromApp: (app, name, content) => app.SaveFibersFileDialog?.(name, content),
});

export const loadDesktopFiberPresets = fibersPresetAdapter.load;
export const saveDesktopFiberPresets = fibersPresetAdapter.save;
export const getDesktopFibersConfigPath = fibersPresetAdapter.getConfigPath;
export const openDesktopFibersFileDialog = fibersPresetAdapter.openFileDialog;
export const saveDesktopFibersFileDialog = fibersPresetAdapter.saveFileDialog;

export interface AppConfig {
  language?: 'ru' | 'en';
  logo?: {
    customLogoDataUrl?: string;
    customLogoFileName?: string;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
  };
  [key: string]: unknown;
}

const APP_CONFIG_STORAGE_KEY = 'ss_app_config';
const MASK_LOGO_STORAGE_KEY = 'ss_mask_logo_config';

export function getSystemDefaultLanguage(): 'ru' | 'en' {
  if (typeof navigator !== 'undefined') {
    const navLang = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
    if (navLang.startsWith('ru')) return 'ru';
  }
  return 'en';
}

export async function getDesktopSystemLanguage(): Promise<'ru' | 'en'> {
  const app = getWailsApp();
  if (app?.GetSystemLanguage) {
    try {
      const res = await app.GetSystemLanguage();
      if (res && (res === 'ru' || res === 'en')) {
        return res;
      }
    } catch (e) {
      console.error('Failed to get system language from desktop:', e);
    }
  }
  return getSystemDefaultLanguage();
}

export async function setDesktopLanguage(lang: 'ru' | 'en'): Promise<void> {
  const app = getWailsApp();
  if (app?.SetLanguage) {
    try {
      await app.SetLanguage(lang);
    } catch (e) {
      console.error('Failed to set desktop language:', e);
    }
  }
}

export async function loadDesktopAppConfig(): Promise<AppConfig> {
  let config: AppConfig = {
    language: getSystemDefaultLanguage(),
  };

  const app = getWailsApp();
  if (app?.LoadAppConfig) {
    try {
      const res = await app.LoadAppConfig();
      if (res && typeof res.content === 'string' && res.content.trim()) {
        const parsed = JSON.parse(res.content);
        if (parsed && typeof parsed === 'object') {
          config = { ...config, ...parsed };
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(APP_CONFIG_STORAGE_KEY, JSON.stringify(config));
            } catch {}
          }
          return config;
        }
      }
    } catch (e) {
      console.error('Failed to load app config from desktop:', e);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(APP_CONFIG_STORAGE_KEY);
      if (saved && saved.trim()) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...config, ...parsed };
        }
      }
    } catch (e) {
      console.error('Failed to load app config from localStorage:', e);
    }
  }

  return config;
}

export async function saveDesktopAppConfig(patch: Partial<AppConfig>): Promise<AppConfig> {
  let current: AppConfig = {};
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(APP_CONFIG_STORAGE_KEY);
      if (saved) current = JSON.parse(saved);
    } catch {}
  }

  const merged: AppConfig = {
    ...current,
    ...patch,
  };

  if (patch.logo && current.logo) {
    merged.logo = { ...current.logo, ...patch.logo };
  }

  const content = JSON.stringify(merged, null, 2);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(APP_CONFIG_STORAGE_KEY, content);
      if (merged.logo) {
        localStorage.setItem(MASK_LOGO_STORAGE_KEY, JSON.stringify(merged.logo, null, 2));
      }
    } catch {}
  }

  const app = getWailsApp();
  if (app?.SaveAppConfig) {
    try {
      await app.SaveAppConfig(content);
    } catch (e) {
      console.error('Failed to save app config to desktop:', e);
    }
  }

  if (merged.language) {
    await setDesktopLanguage(merged.language);
  }

  return merged;
}

export async function loadDesktopMaskLogoConfig(): Promise<string | null> {
  const cfg = await loadDesktopAppConfig();
  if (cfg.logo) {
    return JSON.stringify(cfg.logo);
  }

  const app = getWailsApp();
  if (app?.LoadMaskLogoConfig) {
    try {
      const res = await app.LoadMaskLogoConfig();
      if (res && typeof res.content === 'string' && res.content.trim()) {
        return res.content;
      }
    } catch (e) {
      console.error('Failed to load mask logo config from desktop:', e);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(MASK_LOGO_STORAGE_KEY);
      if (saved && saved.trim()) {
        return saved;
      }
    } catch (e) {
      console.error('Failed to load mask logo config from localStorage:', e);
    }
  }

  return null;
}

export async function saveDesktopMaskLogoConfig(content: string): Promise<void> {
  try {
    const logoParsed = JSON.parse(content);
    await saveDesktopAppConfig({ logo: logoParsed });
  } catch {
    // If not JSON, save as legacy
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(MASK_LOGO_STORAGE_KEY, content);
    } catch {}
  }

  const app = getWailsApp();
  if (app?.SaveMaskLogoConfig) {
    try {
      await app.SaveMaskLogoConfig(content);
    } catch (e) {
      console.error('Failed to save mask logo config to desktop:', e);
    }
  }
}


export async function getAppVersion(): Promise<string> {
  const app = getWailsApp();
  if (app?.GetAppVersion) {
    try {
      return await app.GetAppVersion();
    } catch (e) {
      console.error('Failed to get app version:', e);
    }
  }
  return '0.1.0';
}

export async function checkForUpdates(): Promise<UpdateInfo | null> {
  const app = getWailsApp();
  if (app?.CheckForUpdates) {
    try {
      const res = await app.CheckForUpdates();
      return res;
    } catch (e) {
      console.error('Failed to check for updates:', e);
      throw e;
    }
  }
  return null;
}

export async function startUpdateDownload(downloadURL: string, fileName: string): Promise<boolean> {
  const app = getWailsApp();
  if (app?.StartUpdateDownload) {
    try {
      await app.StartUpdateDownload(downloadURL, fileName);
      return true;
    } catch (e) {
      console.error('Failed to start update download:', e);
      throw e;
    }
  }
  return false;
}

export async function cancelUpdateDownload(): Promise<boolean> {
  const app = getWailsApp();
  if (app?.CancelUpdateDownload) {
    try {
      await app.CancelUpdateDownload();
      return true;
    } catch (e) {
      console.error('Failed to cancel update download:', e);
    }
  }
  return false;
}

export async function installUpdate(filePath: string): Promise<boolean> {
  const app = getWailsApp();
  if (app?.InstallUpdate) {
    try {
      await app.InstallUpdate(filePath);
      return true;
    } catch (e) {
      console.error('Failed to install update:', e);
      throw e;
    }
  }
  return false;
}

export async function showFileInFolder(filePath: string): Promise<boolean> {
  const app = getWailsApp();
  if (app?.ShowFileInFolder) {
    try {
      await app.ShowFileInFolder(filePath);
      return true;
    } catch (e) {
      console.error('Failed to show file in folder:', e);
    }
  }
  return false;
}

export async function openExternalUrl(url: string): Promise<void> {
  const app = getWailsApp();
  if (app?.OpenURLInBrowser) {
    try {
      await app.OpenURLInBrowser(url);
      return;
    } catch (e) {
      console.error('Failed to open URL in browser via desktop:', e);
    }
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
  }
}

export async function getDownloadedUpdatePath(): Promise<string> {
  const app = getWailsApp();
  if (app?.GetDownloadedUpdatePath) {
    try {
      return await app.GetDownloadedUpdatePath();
    } catch (e) {
      console.error('Failed to get downloaded update path:', e);
    }
  }
  return '';
}

export function onUpdateDownloadProgress(callback: (progress: DownloadProgress) => void): () => void {
  return subscribeWailsEvent('update-download-progress', (data: unknown) => {
    if (data && typeof data === 'object') {
      callback(data as DownloadProgress);
    }
  });
}




