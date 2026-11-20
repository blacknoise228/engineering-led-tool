'use client';

import React from 'react';
import EditorApp from '@/components/led-editor-svg/EditorApp';
import ProjectionCalculator from '@/components/projection/ProjectionCalculator';
import { useAppMode } from '@/lib/appMode';

export default function Page() {
  const { mode } = useAppMode();

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0c0d12] text-neutral-100">
      <main className="h-full w-full relative">
        <div className={mode === 'led' ? 'h-full w-full' : 'hidden'}>
          <EditorApp />
        </div>
        <div className={mode === 'projection' ? 'h-full w-full' : 'hidden'}>
          <ProjectionCalculator />
        </div>
      </main>
    </div>
  );
}




