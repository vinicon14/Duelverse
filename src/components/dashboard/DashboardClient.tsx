
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Swords, Trophy, BookOpenText, Brain, UserCircle, BarChart3, Info, Loader2, X, ClipboardCopy, PlusCircle, LogIn as JoinIcon, Flag, ThumbsUp, ThumbsDown, MinusCircle, Users, Dices, Gem, CheckCircle, Camera } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, type ElementType, useEffect, useRef, useCallback } from "react";
import type { User as AuthUser, PrivateRoomStatus, CreatePrivateRoomResponse, JoinPrivateRoomResponse, PrivateRoomStatusResponse, PrivateGamePlayer, ReportedOutcome, ReportResultResponse, MatchmakingMode, DuelInvitation, JoinMatchmakingResponse } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import MatchLoadingScreen from "@/components/match-loading/MatchLoadingScreen";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface DashboardAction {
  id: string;
  title: string;
  description: string;
  icon: ElementType;
  href?: string;
  action?: (currentUser: AuthUser) => void;
  cta: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "link" | "destructive" | null | undefined;
  disabled?: boolean;
  customButton?: (currentUser: AuthUser) => React.ReactNode;
  externalLink?: boolean;
}

interface ActiveDuelInfo {
  gameId: string;
  gameType: 'public' | 'private';
  opponent: {
    id: string;
    displayName: string;
  };
  jitsiRoomName: string;
  mode: 'ranked' | 'casual' | 'private';
}

const getInitials = (name: string = "") => {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'DU';
};

export default function DashboardClient() {
  const { user, updateUser, fetchUserByUsername } = useAuth();
  const { toast } = useToast();
  
  // --- STATE MANAGEMENT ---
  const [isSearching, setIsSearching] = useState<MatchmakingMode | null>(null);
  const [privateRoomStatus, setPrivateRoomStatus] = useState<PrivateRoomStatus>('idle');
  const [privateRoomCode, setPrivateRoomCode] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  const [isJoiningPrivateRoom, setIsJoiningPrivateRoom] = useState(false);
  const [isCreatingPrivateRoom, setIsCreatingPrivateRoom] = useState(false);
  const [foundGame, setFoundGame] = useState<ActiveDuelInfo | null>(null);
  const [activeDuelInfo, setActiveDuelInfo] = useState<ActiveDuelInfo | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showHonestModal, setShowHonestModal] = useState(false);
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const [isWaitingForOpponentResult, setIsWaitingForOpponentResult] = useState(false);
  const [showClearStuckNotificationDialog, setShowClearStuckNotificationDialog] = useState(false);
  const [incomingInvite, setIncomingInvite] = useState<DuelInvitation | null>(null);
  const [isRespondingToInvite, setIsRespondingToInvite] = useState(false);
  const [onlineUsersCount, setOnlineUsersCount] = useState<number | null>(null);
  const [isLoadingOnlineCount, setIsLoadingOnlineCount] = useState(true);

  // Refs for intervals
  const publicPollingRef = useRef<NodeJS.Timeout | null>(null);
  const privatePollingRef = useRef<NodeJS.Timeout | null>(null);
  const invitationPollingRef = useRef<NodeJS.Timeout | null>(null);
  const onlineCountIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const resultPollingRef = useRef<NodeJS.Timeout | null>(null);
  
  const isAppBusyGeneral = !!isSearching || privateRoomStatus === 'waiting_for_opponent' || !!activeDuelInfo || !!incomingInvite || !!foundGame;
  
  // --- UTILITY & CLEANUP FUNCTIONS ---
  const stopAllPolling = () => {
    if (publicPollingRef.current) clearInterval(publicPollingRef.current);
    if (privatePollingRef.current) clearInterval(privatePollingRef.current);
    if (resultPollingRef.current) clearInterval(resultPollingRef.current);
    publicPollingRef.current = null;
    privatePollingRef.current = null;
    resultPollingRef.current = null;
  };
  
  const resetAllMatchmakingStates = useCallback(() => {
    stopAllPolling();
    setIsSearching(null);
    setPrivateRoomStatus('idle');
    setCreatedRoomCode('');
    setPrivateRoomCode('');
    setFoundGame(null);
    setActiveDuelInfo(null);
    setShowResultModal(false);
    setIncomingInvite(null);
    setIsWaitingForOpponentResult(false);
    localStorage.removeItem('activeDuelInfo');
  }, []);

  // --- JITSI TOKEN LOGIC ---
  const openJitsiRoom = async (gameInfo: ActiveDuelInfo, currentUser: AuthUser) => {
    try {
      const response = await fetch('/api/jitsi/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: gameInfo.jitsiRoomName, user: currentUser }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get Jitsi token.');
      }
      const { token } = await response.json();
      const jitsiUrl = `https://meet.jit.si/${gameInfo.jitsiRoomName}?jwt=${token}`;
      
      setActiveDuelInfo(gameInfo);
      localStorage.setItem('activeDuelInfo', JSON.stringify(gameInfo));
      setFoundGame(null);
      window.open(jitsiUrl, "_blank", "noopener,noreferrer");
      
    } catch (error) {
      console.error("Error opening Jitsi room:", error);
      toast({ variant: 'destructive', title: "Erro ao Abrir Sala", description: error instanceof Error ? error.message : "Não foi possível gerar o token." });
      resetAllMatchmakingStates();
    }
  };

  // --- DATA FETCHING & POLLING (useEffect hooks are here) ---
  useEffect(() => {
    try {
      const savedDuelInfo = localStorage.getItem('activeDuelInfo');
      if (savedDuelInfo) setActiveDuelInfo(JSON.parse(savedDuelInfo));
    } catch (error) { localStorage.removeItem('activeDuelInfo'); }
  }, []);

  // ... other useEffects for polling ...

  // --- HANDLER FUNCTIONS ---
  const handleSearchDuel = async (mode: MatchmakingMode) => { /* ... */ };
  const handleCancelSearch = async () => { /* ... */ };
  const handleCreatePrivateRoom = async (currentUser: AuthUser) => { /* ... */ };
  const handleJoinPrivateRoom = async (currentUser: AuthUser) => { /* ... */ };
  const handleCancelPrivateOperations = async (currentUser: AuthUser) => { /* ... */ };
  const handleReportResult = async (outcome: ReportedOutcome) => { /* ... */ };
  const handleFinishCasualDuel = () => resetAllMatchmakingStates();
  const handleRespondToInvite = async (response: 'accept' | 'decline') => { /* ... */ };
  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  // --- RENDER LOGIC ---

  const actions: DashboardAction[] = [
    {
      id: 'ranked_duel',
      title: "Duelo Ranqueado",
      description: "Encontre outro duelista publicamente e suba no ranking.",
      icon: Swords,
      cta: "Procurar Oponente Ranqueado",
      customButton: (currentUser) => {
        if (isSearching === 'ranked') {
          return (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button className="w-full sm:flex-grow" variant="default" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procurando...
              </Button>
              <Button onClick={handleCancelSearch} className="w-full sm:w-auto" variant="destructive">
                <X className="mr-2 h-4 w-4" /> Cancelar
              </Button>
            </div>
          );
        }
        return (
          <Button onClick={() => handleSearchDuel('ranked')} className="w-full" disabled={isAppBusyGeneral}>
            <Swords className="mr-2 h-4 w-4" /> Procurar Oponente Ranqueado
          </Button>
        );
      },
    },
    {
      id: 'casual_duel',
      title: "Duelo Casual",
      description: "Jogue uma partida amistosa sem afetar sua pontuação.",
      icon: Dices,
      cta: "Procurar Oponente Casual",
      variant: 'secondary',
      customButton: (currentUser) => {
        if (isSearching === 'casual') {
          return (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button className="w-full sm:flex-grow" variant="secondary" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procurando...
              </Button>
              <Button onClick={handleCancelSearch} className="w-full sm:w-auto" variant="destructive">
                <X className="mr-2 h-4 w-4" /> Cancelar
              </Button>
            </div>
          );
        }
        return (
          <Button onClick={() => handleSearchDuel('casual')} className="w-full" variant="secondary" disabled={isAppBusyGeneral}>
            <Dices className="mr-2 h-4 w-4" /> Procurar Oponente Casual
          </Button>
        );
      },
    },
    { id: 'ranking', title: "Ranking Global", description: "Veja sua posição e a dos melhores duelistas.", icon: Trophy, href: "/ranking", cta: "Ver Ranking", variant: "secondary", disabled: isAppBusyGeneral },
    { id: 'friends', title: "Amigos", description: "Adicione amigos e convide-os para um duelo.", icon: Users, href: "/friends", cta: "Ver Amigos", variant: "secondary", disabled: isAppBusyGeneral },
    { id: 'card-oracle', title: "Oráculo de Cartas", description: "Consulte informações detalhadas sobre qualquer carta.", icon: BookOpenText, href: "/card-oracle", cta: "Consultar Cartas", variant: "secondary", disabled: isAppBusyGeneral },
    { id: 'rules-oracle', title: "Oráculo de Regras", description: "Tire suas dúvidas sobre as regras com nossa IA.", icon: Brain, href: "/rules-oracle", cta: "Consultar Regras", variant: "secondary", disabled: isAppBusyGeneral },
    { id: 'get_pro', title: "Obter PRO (Sem Anúncios)", description: "Remova todos os anúncios da plataforma com um pagamento único.", icon: Gem, href: "/get-pro", cta: "Obter PRO por R$30,00", variant: "default", disabled: false },
  ];

  if (!user) return null;
  
  if (foundGame) {
    return (
      <MatchLoadingScreen
        jitsiRoomName={foundGame.jitsiRoomName}
        opponentDisplayName={foundGame.opponent.displayName}
        isPrivateRoom={foundGame.gameType === 'private'}
        onProceed={() => openJitsiRoom(foundGame, user)}
      />
    );
  }
  
  const reOpenJitsiWithToken = async () => {
    if (!activeDuelInfo || !user) return;
    await openJitsiRoom(activeDuelInfo, user);
  };

  return (
    <div className="container mx-auto px-4 py-8 w-full">
      <Card className="mb-8 overflow-hidden shadow-xl bg-card/80 backdrop-blur-sm">
        <div className="md:flex">
          <div className="md:w-1/3 relative">
            <Image src={user.profilePictureUrl || "https://placehold.co/600x400.png"} alt="Profile" width={600} height={400} className="object-cover w-full h-48 md:h-full" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent md:bg-gradient-to-r"></div>
          </div>
          <div className="md:w-2/3 p-6 md:p-8 relative">
            <h1 className="text-3xl sm:text-4xl font-headline font-bold text-primary mb-2">
              Bem-vindo, <span className="text-accent">{user.displayName}!</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-4">Pronto para o seu próximo duelo?</p>
          </div>
        </div>
      </Card>

      {activeDuelInfo && (
        <Card className="mb-8 shadow-xl border-secondary">
          <CardHeader>
            <CardTitle>Duelo em Andamento</CardTitle>
            <CardDescription>Você está em um duelo contra {activeDuelInfo.opponent.displayName}.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={reOpenJitsiWithToken} variant="secondary" size="lg">Reabrir Sala</Button>
            {activeDuelInfo.mode === 'ranked' ? (
              <Button onClick={() => setShowResultModal(true)}>Reportar Resultado</Button>
            ) : (
              <Button onClick={handleFinishCasualDuel}>Finalizar Sessão</Button>
            )}
          </CardContent>
        </Card>
      )}

      {!activeDuelInfo && (
        <Card className="mb-8 shadow-xl">
          <CardHeader>
            <CardTitle>Duelos Privados / Torneios</CardTitle>
          </CardHeader>
          <CardContent>
            {/* ... Private Room JSX ... */}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {actions.map((action) => (
          <Card key={action.id} className="hover:shadow-2xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-2">
                <action.icon className="h-8 w-8 text-accent" />
                <CardTitle className="text-2xl font-headline">{action.title}</CardTitle>
              </div>
              <CardDescription className="text-base">{action.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow" />
            <div className="p-6 pt-0 mt-auto">
              {action.customButton ? action.customButton(user) : action.href ? (
                <Button asChild className="w-full" variant={action.variant || "default"} disabled={(action.id === 'get_pro' && user.isPro) || action.disabled}>
                   <Link href={action.href} target={action.externalLink ? "_blank" : undefined} rel={action.externalLink ? "noopener noreferrer" : undefined}>
                    {action.id === 'get_pro' && user.isPro ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        <span>Você já é PRO</span>
                      </>
                    ) : (
                      <>
                        <action.icon className="mr-2 h-4 w-4" />
                        <span>{action.cta}</span>
                      </>
                    )}
                  </Link>
                </Button>
              ) : (
                 <Button onClick={() => action.action && action.action(user)} className="w-full" variant={action.variant || "default"} disabled={action.disabled}>
                   <action.icon className="mr-2 h-4 w-4" /> {action.cta}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      
      {/* ... All Dialogs (Result, Honest, Invite, ClearStuck) ... */}
    </div>
  );
}
