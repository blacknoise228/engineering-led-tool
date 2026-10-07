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
}

interface WailsWindow {
  go?: {
    main?: {
      App?: WailsApp;
    };
  };
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

