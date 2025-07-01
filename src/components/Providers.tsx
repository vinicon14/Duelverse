'use client';

import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { AudioControlProvider } from '@/contexts/AudioControlContext'; // Importa o provider de áudio
import { Toaster } from '@/components/ui/toaster';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AudioControlProvider> {/* Adiciona o provider de áudio aqui */}
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </AudioControlProvider>
    </SessionProvider>
  );
}
