
'use client';

import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <div className="flex-grow flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        </div>
    );
  }


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SiteHeader />
      <main className="flex-grow flex items-center justify-center text-center p-4">
        <div className="space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold font-headline text-primary animate-fade-in-down">
            Bem-vindo ao DuelVerse
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in-up">
            A plataforma definitiva para duelos de card games online. Junte-se a uma comunidade de jogadores, participe de torneios e mostre suas habilidades.
          </p>
          <div className="space-x-4 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <Button asChild size="lg">
              <Link href="/register">Comece Agora <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Já tenho uma conta</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
