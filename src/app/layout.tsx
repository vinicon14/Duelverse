import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';
import { AudioControlProvider } from '@/contexts/AudioControlContext';
import { AdProvider } from '@/contexts/AdContext';
import AdManager from '@/components/AdManager';

export const metadata: Metadata = {
  title: 'DuelVerse Remote',
  description: 'Remote dueling platform for Yu-Gi-Oh! players.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning={true}>
      <head>
        <meta name="application-name" content="DuelVerse Remote" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="DuelVerse" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#1E3A8A" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#0F172A" />

        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body bg-background text-foreground min-h-screen flex flex-col">
        <AuthProvider>
          <AdProvider>
            <AudioControlProvider>
              {children}
              <Toaster />
              <AdManager />
            </AudioControlProvider>
          </AdProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
