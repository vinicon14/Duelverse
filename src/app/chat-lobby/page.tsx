'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';

// This page is deprecated and redirects to the new friends/chat page.
export default function ChatLobbyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/friends');
  }, [router]);

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-lg text-muted-foreground">Redirecionando para Amigos & Chat...</p>
        </div>
      </main>
    </div>
  );
}
