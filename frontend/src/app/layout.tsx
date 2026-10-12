import type { Metadata } from "next";
import "@/app/globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "SHOW SCREEN ENGINEERING",
  description: "SHOW SCREEN ENGINEERING",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Главный контейнер: строго высота окна, колонка, без глобального скролла */}
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0d1117] text-white">
          
          {/* Навбар: займет ровно свои 44px и никуда не уедет */}
          <NavBar />
          
          {/* Основной контент: занимает оставшееся место и скроллится внутри */}
          <main className="flex-1 overflow-y-auto relative h-[calc(100vh-44px)]">
            {children}
          </main>
          
        </div>
      </body>
    </html>
  );
}
