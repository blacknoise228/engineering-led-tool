'use client';

import React from 'react';
import { UpdaterProvider } from '@/lib/useUpdater';
import { I18nProvider } from '@/lib/i18n';
import UpdateModal from '@/components/UpdateModal';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <UpdaterProvider>
        {children}
        <UpdateModal />
      </UpdaterProvider>
    </I18nProvider>
  );
}
