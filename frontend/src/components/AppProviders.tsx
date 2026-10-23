'use client';

import React from 'react';
import { UpdaterProvider } from '@/lib/useUpdater';
import UpdateModal from '@/components/UpdateModal';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <UpdaterProvider>
      {children}
      <UpdateModal />
    </UpdaterProvider>
  );
}
