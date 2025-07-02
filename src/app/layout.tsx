
import type { Metadata, Viewport } from "next"; // Importa o tipo Viewport
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

// O metadata principal permanece como antes
export const metadata: Metadata = {
  title: "DuelVerse",
  description: "Plataforma de duelos online.",
};

// CORREÇÃO: A configuração do viewport é exportada como um objeto separado
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
      </body>
    </html>
  );
}
