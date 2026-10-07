'use client';
import EditorApp from '@/components/led-editor-svg/EditorApp';

export default function Page() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#07080b]">
      <main className="h-full w-full">
        <EditorApp />
      </main>
    </div>
  );
}



