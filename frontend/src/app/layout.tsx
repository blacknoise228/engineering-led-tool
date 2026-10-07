import type { Metadata } from "next";
import { Suspense } from 'react';
import "./globals.css";
import YandexMetrika from "@/components/Metrika";


export const metadata: Metadata = {
  title: "SHOW SCREEN ENGINEERING",
  description: "SHOW SCREEN ENGINEERING",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased overflow-auto hide-scrollbar max-h-screen`}
      >
        {children}
        <Suspense>
        <YandexMetrika />
        </Suspense>
      </body>
    </html>
  );
}
