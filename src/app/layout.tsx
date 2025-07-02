
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'; // Importa o novo componente

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DuelVerse",
  description: "Plataforma de duelos online.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
        {/* Renderiza o novo componente para registrar o Service Worker */}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
