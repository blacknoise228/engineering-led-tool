// frontend/src/lib/i18n/index.ts

import { ruNavTabs } from './ru_nav_tabs';
import { ruEditor } from './ru_editor';
import { ruPresets } from './ru_presets';
import { ruDialogs } from './ru_dialogs';

import { enNavTabs } from './en_nav_tabs';
import { enEditor } from './en_editor';
import { enPresets } from './en_presets';
import { enDialogs } from './en_dialogs';

export type Language = 'ru' | 'en';

export const translations = {
  ru: {
    ...ruNavTabs,
    ...ruEditor,
    ...ruPresets,
    ...ruDialogs,
  },
  en: {
    ...enNavTabs,
    ...enEditor,
    ...enPresets,
    ...enDialogs,
  },
} as const;

export type TranslationKey = keyof typeof translations.ru;
export * from './context';
