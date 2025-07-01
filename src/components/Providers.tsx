
'use client';

import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Carrega dinamicamente o AudioControlProvider apenas no lado do cliente
const DynamicAudioControlProvider = dynamic(
  () => import('@/contexts/AudioControlContext').then((mod) => mod.AudioControlProvider),
  { ssr: false } // Garante que nunca seja renderizado no lado do servidor
);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <DynamicAudioControlProvider>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </DynamicAudioControlProvider>
    </SessionProvider>
  );
}
