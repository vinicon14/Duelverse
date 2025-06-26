
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      console.log("AuthGuard: Not loading, no user. Redirecting to /login.");
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    // While loading or if no user is found (and redirect is in progress),
    // render nothing. The child component will not be rendered.
    // A page-specific loader can be shown by the component itself if desired.
    return (
        <div className="flex w-full flex-grow items-center justify-center p-8">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <p className="text-muted-foreground">Verificando sua sessão...</p>
            </div>
        </div>
    );
  }

  // If loading is false and user exists, render children.
  return <>{children}</>;
}
