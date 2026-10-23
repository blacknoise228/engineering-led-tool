// frontend/src/lib/i18n/context.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { translations, Language, TranslationKey } from './index';
import {
  loadDesktopAppConfig,
  saveDesktopAppConfig,
  getDesktopSystemLanguage,
  setDesktopLanguage,
} from '@/lib/desktop';

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey | string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ru');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cfg = await loadDesktopAppConfig();
        if (!mounted) return;
        if (cfg.language === 'ru' || cfg.language === 'en') {
          setLanguageState(cfg.language);
          await setDesktopLanguage(cfg.language);
        } else {
          const sysLang = await getDesktopSystemLanguage();
          if (!mounted) return;
          setLanguageState(sysLang);
          await saveDesktopAppConfig({ language: sysLang });
          await setDesktopLanguage(sysLang);
        }
      } catch (e) {
        console.error('Failed to initialize language config:', e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    setDesktopLanguage(newLang).catch(() => {});
    saveDesktopAppConfig({ language: newLang }).catch(err => {
      console.error('Failed to save language config:', err);
    });
  }, []);

  const toggleLanguage = useCallback(() => {
    const nextLang: Language = language === 'ru' ? 'en' : 'ru';
    setLanguage(nextLang);
  }, [language, setLanguage]);

  const t = useCallback(
    (key: TranslationKey | string, params?: Record<string, string | number>): string => {
      const dict = translations[language] as Record<string, string>;
      const fallbackDict = translations.ru as Record<string, string>;

      let str = dict[key] ?? fallbackDict[key] ?? key;

      if (params && str) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }

      return str;
    },
    [language]
  );

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      language: 'ru',
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key: string, params?: Record<string, string | number>) => {
        let str = (translations.ru as Record<string, string>)[key] ?? key;
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
          }
        }
        return str;
      },
    };
  }
  return ctx;
}

export const useTranslation = useI18n;
