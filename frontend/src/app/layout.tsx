import type { Metadata } from "next";
import "@/app/globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Engineering LED Tool",
  description: "Engineering LED Tool",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0d1117] text-white">
          <NavBar />
          <main className="flex-1 overflow-y-auto relative h-[calc(100vh-32px)]">
            {children}
          </main>
          
        </div>
      </body>
    </html>
  );
}
