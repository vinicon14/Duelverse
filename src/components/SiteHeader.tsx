
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAudioControl } from '@/contexts/AudioControlContext';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, UserPlus, UserCircle, Settings, Play, Pause, ShieldCheck, Crown, UserCog, Users, LifeBuoy, GitBranch, Loader2, Gem, Brain } from 'lucide-react';
import { LogoIcon } from '@/components/icons/LogoIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

function VersionDisplay() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/version/current')
      .then(res => res.json())
      .then(data => setVersion(data.version || 'unknown'))
      .catch(() => setVersion('unknown'));
  }, []);

  return (
    <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center justify-center">
      {version ? (
        <>
          <GitBranch className="h-3 w-3 mr-1.5" /> 
          <span>{version}</span>
        </>
      ) : (
        <Loader2 className="h-3 w-3 animate-spin" />
      )}
    </div>
  );
}


export default function SiteHeader() {
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const { isPlaying, togglePlayPause, isReady: isAudioReady } = useAudioControl();
  
  const getInitials = (name: string = "") => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'DV';
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center space-x-2" aria-label="Página inicial do DuelVerse">
          <LogoIcon className="h-8 w-8" />
          <span className="font-headline text-2xl font-bold text-primary">DuelVerse</span>
          <span className="font-headline text-2xl font-light text-foreground">Remoto</span>
        </Link>
        
        <div className="flex items-center space-x-3">
          {isAudioReady && (
            <Button variant="ghost" size="icon" onClick={togglePlayPause} aria-label={isPlaying ? "Pause music" : "Play music"} title={isPlaying ? "Pause music" : "Play music"}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
          )}
          
          {!loading && (
            <>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10 border-2 border-primary hover:border-accent transition-colors">
                        <AvatarImage 
                          src={user.profilePictureUrl || ''} 
                          alt={user.displayName || 'User Avatar'} 
                        />
                        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-60" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center flex-wrap gap-x-2">
                            <p className="text-sm font-medium leading-none font-headline">{user.displayName}</p>
                            {user.isVerified && <Badge variant="outline" className="border-green-500 text-green-500 flex-shrink-0"><ShieldCheck className="h-3 w-3 mr-1"/> Verificado</Badge>}
                            {user.isPro && <Badge className="bg-purple-500 text-white flex-shrink-0"><Gem className="h-3 w-3 mr-1"/> PRO</Badge>}
                            {user.isJudge && <Badge variant="outline" className="border-yellow-500 text-yellow-600 flex-shrink-0"><Crown className="h-3 w-3 mr-1"/> Juiz</Badge>}
                            {user.isAdmin && <Badge variant="default" className="bg-blue-500 text-white flex-shrink-0"><UserCog className="h-3 w-3 mr-1"/> Admin</Badge>}
                            {user.isCoAdmin && <Badge variant="default" className="bg-indigo-500 text-white flex-shrink-0"><Users className="h-3 w-3 mr-1"/> Co-Admin</Badge>}
                        </div>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                      <UserCircle className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Editar Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/friends')}>
                      <Users className="mr-2 h-4 w-4" />
                      <span>Amigos</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/support')}>
                      <LifeBuoy className="mr-2 h-4 w-4" />
                      <span>Suporte</span>
                    </DropdownMenuItem>
                    {(user.isAdmin || user.isCoAdmin) && (
                        <DropdownMenuItem onClick={() => router.push('/admin')}>
                            <UserCog className="mr-2 h-4 w-4" />
                            <span>Painel Admin</span>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-red-500 hover:!text-red-500 hover:!bg-red-500/10 focus:text-red-500 focus:bg-red-500/10">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sair</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                     <VersionDisplay />
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button variant="outline" asChild>
                    <Link href="/login">
                      <LogIn className="mr-2 h-4 w-4" /> Login
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register">
                      <UserPlus className="mr-2 h-4 w-4" /> Registrar
                    </Link>
                  </Button>
                </div>
              )}
            </>
          )}
          {loading && <div className="h-8 w-20 animate-pulse rounded-md bg-muted"></div>}
        </div>
      </div>
    </header>
  );
}
