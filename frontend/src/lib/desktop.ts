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
}

interface WailsRuntime {
  EventsOn?: (eventName: string, callback: (data: unknown) => void) => () => void;
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

export function onDesktopProjectOpen(callback: (project: { filePath: string; content: string }) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const w = window as unknown as WailsWindow;
  if (w.runtime?.EventsOn) {
    return w.runtime.EventsOn('open-project', (data: unknown) => {
      const res = data as { filePath?: string; content?: string } | null;
      if (res && res.filePath && res.content) {
        callback({
          filePath: res.filePath,
          content: res.content,
        });
      }
    });
  }
  return () => {};
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

export async function loadDesktopPanelPresets(): Promise<{ filePath: string; content: string } | null> {
  const app = getWailsApp();
  if (app?.LoadPanelPresets) {
    try {
      const res = await app.LoadPanelPresets();
      if (res && typeof res.content === 'string') {
        return {
          filePath: res.filePath || 'panels.json',
          content: res.content,
        };
      }
    } catch (e) {
      console.error('Failed to load panel presets from desktop:', e);
    }
  }

  // Browser fallback using localStorage
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('ss_panels_presets');
      if (saved) {
        return { filePath: 'localStorage:panels.json', content: saved };
      }
    } catch (e) {
      console.error('Failed to load presets from localStorage:', e);
    }
  }

  return null;
}

export async function saveDesktopPanelPresets(content: string): Promise<string | null> {
  const app = getWailsApp();
  if (app?.SavePanelPresets) {
    try {
      const path = await app.SavePanelPresets(content);
      return path || 'panels.json';
    } catch (e) {
      console.error('Failed to save panel presets to desktop:', e);
      throw e;
    }
  }

  // Browser fallback using localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('ss_panels_presets', content);
      return 'localStorage:panels.json';
    } catch (e) {
      console.error('Failed to save presets to localStorage:', e);
      throw e;
    }
  }

  return null;
}

export async function getDesktopPanelsConfigPath(): Promise<string> {
  const app = getWailsApp();
  if (app?.GetPanelsConfigPath) {
    try {
      return await app.GetPanelsConfigPath();
    } catch (e) {
      console.error('Failed to get panels config path:', e);
    }
  }
  return 'panels.json';
}

export async function openDesktopPanelsFileDialog(): Promise<{ filePath: string; content: string } | null> {
  const app = getWailsApp();
  if (app?.OpenPanelsFileDialog) {
    try {
      const res = await app.OpenPanelsFileDialog();
      if (res && res.filePath && typeof res.content === 'string') {
        return {
          filePath: res.filePath,
          content: res.content,
        };
      }
    } catch (e) {
      console.error('Failed to open panels file dialog:', e);
    }
  }
  return null;
}

export async function saveDesktopPanelsFileDialog(defaultFilename: string, content: string): Promise<string | null> {
  const app = getWailsApp();
  if (app?.SavePanelsFileDialog) {
    try {
      const path = await app.SavePanelsFileDialog(defaultFilename, content);
      return path || null;
    } catch (e) {
      console.error('Failed to save panels file dialog:', e);
      throw e;
    }
  }

  // Browser fallback download
  if (typeof window !== 'undefined') {
    try {
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
    } catch (e) {
      console.error('Failed to download panels json:', e);
      throw e;
    }
  }

  return null;
}



