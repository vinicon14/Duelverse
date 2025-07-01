
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers"; // Importa o novo componente

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DuelVerse",
  description: "Plataforma de duelos online.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Usa o componente Providers que é um Client Component */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
