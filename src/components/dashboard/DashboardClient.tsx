
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
  customButton?: (
    currentUser: AuthUser
  ) => React.ReactNode;
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
  
  // Public Matchmaking State
  const [isSearching, setIsSearching] = useState<MatchmakingMode | null>(null);

  // Private Room State
  const [privateRoomStatus, setPrivateRoomStatus] = useState<PrivateRoomStatus>('idle');
  const [privateRoomCode, setPrivateRoomCode] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  const [isJoiningPrivateRoom, setIsJoiningPrivateRoom] = useState(false);
  const [isCreatingPrivateRoom, setIsCreatingPrivateRoom] = useState(false);
  
  // NEW: Dedicated state for a found game, before proceeding to the active duel state.
  const [foundGame, setFoundGame] = useState<ActiveDuelInfo | null>(null);

  // Active Duel & Reporting State
  const [activeDuelInfo, setActiveDuelInfo] = useState<ActiveDuelInfo | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showHonestModal, setShowHonestModal] = useState(false);
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const [isWaitingForOpponentResult, setIsWaitingForOpponentResult] = useState(false);
  const [showClearStuckNotificationDialog, setShowClearStuckNotificationDialog] = useState(false);
  
  // Duel Invitation State
  const [incomingInvite, setIncomingInvite] = useState<DuelInvitation | null>(null);
  const [isRespondingToInvite, setIsRespondingToInvite] = useState(false);
  
  // Misc State
  const [onlineUsersCount, setOnlineUsersCount] = useState<number | null>(null);
  const [isLoadingOnlineCount, setIsLoadingOnlineCount] = useState(true);

  // Refs for intervals
  const publicPollingRef = useRef<NodeJS.Timeout | null>(null);
  const privatePollingRef = useRef<NodeJS.Timeout | null>(null);
  const invitationPollingRef = useRef<NodeJS.Timeout | null>(null);
  const onlineCountIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const resultPollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // General flag to disable actions when the user is busy
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

  // --- DATA FETCHING & POLLING ---

  // Restore active duel from localStorage on mount
  useEffect(() => {
    try {
      const savedDuelInfo = localStorage.getItem('activeDuelInfo');
      if (savedDuelInfo) {
        const parsedInfo: ActiveDuelInfo = JSON.parse(savedDuelInfo);
        setActiveDuelInfo(parsedInfo);
        console.log("Restored active duel info from localStorage.");
      }
    } catch (error) {
      console.error("Failed to parse active duel info from localStorage:", error);
      localStorage.removeItem('activeDuelInfo');
    }
  }, []);

  // Fetch online user count
  useEffect(() => {
    const fetchOnlineUserCount = async () => {
        try {
            const response = await fetch('/api/users/online-count');
            if (response.ok) {
                const data = await response.json();
                setOnlineUsersCount(data.onlineCount);
            }
        } catch (error) {
            console.error('Error fetching online user count:', error);
        } finally {
            setIsLoadingOnlineCount(false);
        }
    };
    fetchOnlineUserCount();
    onlineCountIntervalRef.current = setInterval(fetchOnlineUserCount, 30000);
    return () => {
      if (onlineCountIntervalRef.current) clearInterval(onlineCountIntervalRef.current);
    };
  }, []);

  // Poll for public matchmaking status (SISTEMA DE PEDRA)
  useEffect(() => {
    if (!isSearching || !user) {
      if (publicPollingRef.current) clearInterval(publicPollingRef.current);
      publicPollingRef.current = null;
      return;
    }

    const poll = async () => {
      if (!isSearching || !user) return; // Re-check inside interval
      try {
        const res = await fetch(`/api/matchmaking/status?userId=${user.id}`);
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            if (res.status >= 500) {
                 toast({ variant: 'destructive', title: "Erro de Conexão", description: errorData.message || "Erro no servidor de pareamento. A busca foi reiniciada." });
                 resetAllMatchmakingStates();
            }
            return;
        }

        const data = await res.json();
        
        if (data.status === 'matched' && data.game) {
          const opponent = data.game.players.find((p: any) => p.userId !== user.id);
          setFoundGame({
            gameId: data.game.gameId,
            gameType: 'public',
            opponent: { id: opponent.userId, displayName: opponent?.displayName || 'Oponente' },
            jitsiRoomName: data.game.jitsiRoomName,
            mode: data.game.mode,
          });
          toast({ title: "Partida Encontrada!", description: `Você duelará contra ${opponent?.displayName || 'Oponente'}.` });
          setIsSearching(null); // This stops the polling
        } else if (data.status === 'error') {
            toast({ variant: 'destructive', title: "Erro de Sincronização", description: data.message || "A busca foi reiniciada." });
            resetAllMatchmakingStates();
        }
      } catch (error) {
        console.error("Public matchmaking polling error:", error);
      }
    };

    publicPollingRef.current = setInterval(poll, 3000);
    
    return () => {
      if (publicPollingRef.current) clearInterval(publicPollingRef.current);
    };

  }, [isSearching, user, toast, resetAllMatchmakingStates]);

  // Poll for private room status
  useEffect(() => {
    if (privateRoomStatus !== 'waiting_for_opponent' || !user) {
        if (privatePollingRef.current) clearInterval(privatePollingRef.current);
        privatePollingRef.current = null;
        return;
    }
    
    const poll = async () => {
        if (privateRoomStatus !== 'waiting_for_opponent' || !user) return;
        try {
            const res = await fetch(`/api/private-room/status?userId=${user.id}&roomId=${createdRoomCode}`);
            const data = await res.json() as PrivateRoomStatusResponse;

            if (data.status === 'ready_to_start' && data.jitsiRoomName && data.opponent) {
                setFoundGame({
                    gameId: createdRoomCode,
                    gameType: 'private',
                    opponent: { id: data.opponent.userId, displayName: data.opponent.displayName },
                    jitsiRoomName: data.jitsiRoomName,
                    mode: 'private',
                });
                toast({ title: "Oponente Entrou!", description: `Duelo contra ${data.opponent?.displayName || 'Oponente'} está pronto.` });
                setPrivateRoomStatus('ready_to_start'); // This stops the polling
            } else if (data.status === 'not_found' || data.status === 'error' || data.status === 'cancelled') {
                toast({ variant: 'destructive', title: "Sala Fechada", description: "A sala privada não existe mais ou expirou." });
                resetAllMatchmakingStates();
            }
        } catch(error) {
            console.error("Private room polling error:", error);
            toast({ variant: 'destructive', title: "Erro de Conexão", description: "Perda de conexão com a sala privada." });
            resetAllMatchmakingStates();
        }
    };

    privatePollingRef.current = setInterval(poll, 3000);

    return () => {
        if (privatePollingRef.current) clearInterval(privatePollingRef.current);
    };

  }, [privateRoomStatus, createdRoomCode, user, toast, resetAllMatchmakingStates]);

  // Poll for incoming duel invitations
  useEffect(() => {
    const pollInvitations = async () => {
      if (!user || isAppBusyGeneral) return;
      try {
        const res = await fetch(`/api/friends/invitations/check?userId=${user.id}`);
        if (res.status === 200) {
          const invitation: DuelInvitation = await res.json();
          setIncomingInvite(invitation);
        }
      } catch (error) {
        console.error("Error polling for invitations:", error);
      }
    };

    invitationPollingRef.current = setInterval(pollInvitations, 7000);

    return () => {
      if (invitationPollingRef.current) clearInterval(invitationPollingRef.current);
    };
  }, [user, isAppBusyGeneral]);

  // Poll for match result status (for the first player who reported)
  useEffect(() => {
    if (!isWaitingForOpponentResult || !activeDuelInfo?.gameId || !user) {
        if (resultPollingRef.current) {
            clearInterval(resultPollingRef.current);
            resultPollingRef.current = null;
        }
        return;
    }

    const poll = async () => {
        try {
            const res = await fetch(`/api/match-results/status/${activeDuelInfo.gameId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'resolved') {
                    toast({ title: "Partida Finalizada", description: "O resultado foi processado. Verifique sua pontuação." });
                    // Fetch the user again to get the updated score
                    fetchUserByUsername(user.username).then(updatedUser => {
                        if (updatedUser) {
                            updateUser(updatedUser);
                        }
                    });
                    resetAllMatchmakingStates(); // This will stop the polling and clear the UI
                }
            } else {
                console.error("Result polling failed:", res.status);
                resetAllMatchmakingStates();
            }
        } catch (error) {
            console.error("Error polling for match result status:", error);
            resetAllMatchmakingStates();
        }
    };

    resultPollingRef.current = setInterval(poll, 7000);

    return () => {
        if (resultPollingRef.current) {
            clearInterval(resultPollingRef.current);
        }
    };
  }, [isWaitingForOpponentResult, activeDuelInfo, user, toast, resetAllMatchmakingStates, fetchUserByUsername, updateUser]);


  // --- HANDLER FUNCTIONS ---

  const handleSearchDuel = async (mode: MatchmakingMode) => {
    if (!user || isAppBusyGeneral) return;
    resetAllMatchmakingStates();

    setIsSearching(mode); // This state change is what activates the polling useEffect.

    try {
      const response = await fetch('/api/matchmaking/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, mode }),
      });
      
      const data: JoinMatchmakingResponse = await response.json();

      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Falha ao entrar na fila.');
      }
      
      toast({ title: "Buscando Oponente...", description: `Você foi adicionado à fila ${mode === 'ranked' ? 'ranqueada' : 'casual'}.` });

    } catch (error) {
      console.error("Search duel error:", error);
      toast({ variant: 'destructive', title: "Erro ao Buscar Duelo", description: error instanceof Error ? error.message : "Ocorreu um erro." });
      resetAllMatchmakingStates(); // Clean up state if the initial join fails.
    }
  };

  const handleCancelSearch = async () => {
    if (!user || !isSearching) return;
    try {
      await fetch('/api/matchmaking/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user }),
      });
      toast({ title: "Busca Cancelada", description: "Você saiu da fila." });
    } catch (error) {
      console.error("Cancel search error:", error);
      toast({ variant: 'destructive', title: "Erro ao Cancelar", description: error instanceof Error ? error.message : "Ocorreu um erro." });
    } finally {
        setIsSearching(null); // This stops the polling
    }
  };
  
  const handleCreatePrivateRoom = async (currentUser: AuthUser) => {
    if (!currentUser || isAppBusyGeneral) return;
    resetAllMatchmakingStates();
    setIsCreatingPrivateRoom(true);
    try {
        const response = await fetch('/api/private-room/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: currentUser, customRoomId: privateRoomCode || undefined }),
        });
        const data = await response.json() as CreatePrivateRoomResponse;
        if (!response.ok || data.status === 'error' || !data.roomId) {
            throw new Error(data.message || 'Falha ao criar sala privada.');
        }
        setCreatedRoomCode(data.roomId);
        setPrivateRoomStatus('waiting_for_opponent'); // This starts the polling
        toast({ title: "Sala Privada Criada!", description: `ID da Sala: ${data.roomId}. Compartilhe com seu oponente.` });
    } catch (error) {
        toast({ variant: 'destructive', title: "Erro ao Criar Sala", description: error instanceof Error ? error.message : "Ocorreu um erro." });
        resetAllMatchmakingStates();
    } finally {
        setIsCreatingPrivateRoom(false);
    }
  };

  const handleJoinPrivateRoom = async (currentUser: AuthUser) => {
    if (!currentUser || !privateRoomCode.trim() || isAppBusyGeneral) {
        toast({ variant: 'destructive', title: "Ação Inválida", description: "Insira um ID de sala ou aguarde a operação atual." });
        return;
    }
    resetAllMatchmakingStates();
    setIsJoiningPrivateRoom(true);
    try {
        const response = await fetch('/api/private-room/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: currentUser, roomId: privateRoomCode.trim() }),
        });
        const data = await response.json() as JoinPrivateRoomResponse;
        if (!response.ok || !data.roomId) throw new Error(data.message || 'Não foi possível entrar na sala.');
        
        if (data.status === 'joined') {
            setCreatedRoomCode(data.roomId);
            setPrivateRoomStatus('waiting_for_opponent');
            toast({ title: "Entrou na Sala!", description: `Sincronizando com a sala ${privateRoomCode.trim()}...` });
        } else {
            throw new Error(data.message || "Resposta inesperada do servidor.");
        }
    } catch (error) {
        toast({ variant: 'destructive', title: "Erro ao Entrar na Sala", description: error instanceof Error ? error.message : "Ocorreu um erro." });
        resetAllMatchmakingStates();
    } finally {
        setIsJoiningPrivateRoom(false);
    }
  };
  
  const handleCancelPrivateOperations = async (currentUser: AuthUser) => {
    if (!currentUser) return;
    try {
        await fetch('/api/private-room/leave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: currentUser }),
        });
        toast({ title: "Sala Privada", description: "Você saiu da sala ou cancelou a criação." });
    } catch (error) {
         toast({ variant: 'destructive', title: "Erro ao Sair", description: error instanceof Error ? error.message : "Ocorreu um erro." });
    } finally {
        resetAllMatchmakingStates();
    }
  };
  
  const handleReportResult = async (outcome: ReportedOutcome) => {
    if (!user || !activeDuelInfo) return;
    setIsSubmittingResult(true);
    try {
      const response = await fetch('/api/match-results/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameId: activeDuelInfo.gameId, 
          userId: user.id, 
          outcome,
          opponentId: activeDuelInfo.opponent.id,
          isRanked: activeDuelInfo.mode === 'ranked',
        }),
      });
      const data: ReportResultResponse = await response.json();
      if (!response.ok) throw new Error(data.message || "Falha ao reportar resultado.");
      
      setShowResultModal(false); // Close modal on any valid response
      
      if (data.status === 'waiting') {
        setIsWaitingForOpponentResult(true);
        toast({ title: "Resultado Submetido", description: data.message });
      } else if (data.status === 'success') {
        toast({ title: "Resultados Confirmados!", description: data.message });
        if (data.updatedUser) {
          updateUser(data.updatedUser);
        }
        resetAllMatchmakingStates();
      } else if (data.status === 'conflict') {
        setShowHonestModal(true);
        resetAllMatchmakingStates();
      } else if (data.status === 'already_submitted') {
        toast({ title: "Resultado Já Enviado", description: data.message });
        resetAllMatchmakingStates();
      }
    } catch (error) {
      toast({ variant: 'destructive', title: "Erro ao Reportar", description: error instanceof Error ? error.message : "Ocorreu um erro." });
    } finally {
      setIsSubmittingResult(false);
    }
  };

  const handleFinishCasualDuel = () => {
      toast({title: "Sessão de Duelo Finalizada", description: "Você já pode iniciar um novo duelo."});
      resetAllMatchmakingStates();
  };
  
  const handleRespondToInvite = async (response: 'accept' | 'decline') => {
    if (!incomingInvite || !user) return;
    setIsRespondingToInvite(true);
    try {
      const res = await fetch('/api/friends/invitations/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId: incomingInvite.id, response }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Falha ao responder ao convite.');
      
      if (response === 'accept') {
        toast({ title: "Duelo Aceito!", description: "Abrindo a sala de duelo..." });
        // Set foundGame state to trigger MatchLoadingScreen
        setFoundGame({
            gameId: data.roomId,
            gameType: 'private',
            opponent: { id: incomingInvite.fromUserId, displayName: incomingInvite.fromUserDisplayName },
            jitsiRoomName: data.jitsiRoomName,
            mode: 'private',
        });
      } else {
        toast({ title: "Convite Recusado." });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Não foi possível processar sua resposta.' });
    } finally {
      setIsRespondingToInvite(false);
      setIncomingInvite(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast({ title: "Copiado!", description: "ID da sala copiado para a área de transferência." }))
      .catch(err => toast({ variant: 'destructive', title: "Falha ao Copiar", description: "Não foi possível copiar o ID da sala." }));
  };

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

  if (!user) return null; // AuthGuard handles this, but for type safety.
  
  if (foundGame) {
    return (
      <MatchLoadingScreen
        jitsiRoomName={foundGame.jitsiRoomName}
        opponentDisplayName={foundGame.opponent.displayName}
        isPrivateRoom={foundGame.gameType === 'private'}
        onProceed={() => {
            setActiveDuelInfo(foundGame);
            localStorage.setItem('activeDuelInfo', JSON.stringify(foundGame));
            setFoundGame(null); // Hide loading screen and move to active duel state
            window.open(`https://meet.jit.si/${foundGame.jitsiRoomName}`, "_blank", "noopener,noreferrer");
        }}
      />
    );
  }


  return (
    <div className="container mx-auto px-4 py-8 w-full">
      <Card className="mb-8 overflow-hidden shadow-xl bg-card/80 backdrop-blur-sm">
        <div className="md:flex">
          <div className="md:w-1/3 relative">
             <Image
              src={user.profilePictureUrl || "https://placehold.co/600x400.png"}
              alt={user.profilePictureUrl ? `Foto de perfil de ${user.displayName}` : "Yu-Gi-Oh! Duel Scene"}
              width={600}
              height={400}
              className="object-cover w-full h-48 md:h-full"
              data-ai-hint={user.profilePictureUrl ? "avatar person" : "card game duel"}
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent md:bg-gradient-to-r"></div>
          </div>
          <div className="md:w-2/3 p-6 md:p-8 relative">
            <h1 className="text-3xl sm:text-4xl font-headline font-bold text-primary mb-2">
              Bem-vindo, <span className="text-accent">{user.displayName}!</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              Pronto para o seu próximo duelo? Explore as funcionalidades abaixo.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex items-center space-x-2 text-sm bg-secondary text-secondary-foreground py-2 px-3 rounded-lg shadow-sm">
                    <UserCircle className="h-5 w-5 text-accent" />
                    <span>{user.username}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm bg-secondary text-secondary-foreground py-2 px-3 rounded-lg shadow-sm">
                    <BarChart3 className="h-5 w-5 text-accent" />
                    <span>Score: {user.score}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm bg-secondary text-secondary-foreground py-2 px-3 rounded-lg shadow-sm">
                    <Info className="h-5 w-5 text-accent" />
                    <span>País: {user.country}</span>
                </div>
            </div>
            <div className="flex items-center space-x-2 text-sm bg-card text-card-foreground py-2 px-3 rounded-lg shadow-sm border border-primary/50 max-w-max">
                <Users className="h-5 w-5 text-primary" />
                {isLoadingOnlineCount ? (
                  <span className="text-muted-foreground">Carregando jogadores online...</span>
                ) : onlineUsersCount !== null ? (
                  <span><span className="font-bold text-primary">{onlineUsersCount}</span> Duelista{onlineUsersCount === 1 ? '' : 's'} Online</span>
                ) : (
                  <span className="text-muted-foreground">Não foi possível carregar jogadores online.</span>
                )}
            </div>
          </div>
        </div>
      </Card>
      
      {activeDuelInfo && activeDuelInfo.mode !== 'ranked' && (
        <Card className="mb-8 shadow-xl border-secondary">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-secondary-foreground">Duelo Casual/Privado em Andamento</CardTitle>
            <CardDescription>Você está em um duelo contra {activeDuelInfo.opponent.displayName}.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-2 items-center justify-center">
            <Button onClick={() => window.open(`https://meet.jit.si/${activeDuelInfo.jitsiRoomName}`, "_blank", "noopener,noreferrer")} variant="secondary" size="lg">
              <Camera className="mr-2 h-5 w-5" /> Reabrir Sala de Duelo
            </Button>
            <Button onClick={handleFinishCasualDuel} variant="outline" size="lg">
                 <CheckCircle className="mr-2 h-4 w-4" /> Finalizar Sessão de Duelo
            </Button>
          </CardContent>
        </Card>
      )}

      {activeDuelInfo && activeDuelInfo.mode === 'ranked' && (
        <Card className="mb-8 shadow-xl border-accent">
            <CardHeader>
                <CardTitle className="text-2xl font-headline text-accent">Reportar Resultado do Duelo Ranqueado</CardTitle>
                <CardDescription>Reporte o resultado do seu duelo contra {activeDuelInfo.opponent.displayName}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
                {isWaitingForOpponentResult ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center text-lg text-muted-foreground p-2">
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Aguardando oponente reportar...
                        </div>
                        <p className="text-xs text-muted-foreground">Se esta mensagem não desaparecer, você pode forçar a limpeza.</p>
                    </div>
                ) : (
                    <p className="text-muted-foreground">Reporte o resultado da sua partida ranqueada.</p>
                )}
                <div className="flex flex-col sm:flex-row gap-2 items-center justify-center">
                    {!isWaitingForOpponentResult && (
                        <Button onClick={() => setShowResultModal(true)} variant="default" size="lg" disabled={isSubmittingResult}>
                            <Flag className="mr-2 h-5 w-5" /> Reportar Meu Resultado
                        </Button>
                    )}
                    <Button onClick={() => window.open(`https://meet.jit.si/${activeDuelInfo.jitsiRoomName}`, "_blank", "noopener,noreferrer")} variant="secondary" size="lg">
                        <Camera className="mr-2 h-5 w-5" /> Reabrir Sala
                    </Button>
                    {isWaitingForOpponentResult && (
                        <Button variant="destructive" size="lg" onClick={() => setShowClearStuckNotificationDialog(true)}>
                            <X className="mr-2 h-4 w-4" /> Limpar Notificação
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
      )}

      {!activeDuelInfo && (
        <Card className="mb-8 shadow-xl">
            <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary">Duelos Privados / Torneios</CardTitle>
            <CardDescription>Crie ou junte-se a uma sala privada para duelar com amigos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
            {privateRoomStatus === 'waiting_for_opponent' && createdRoomCode ? (
                <div className="p-4 border border-dashed border-accent rounded-lg bg-accent/10 text-center">
                    <p className="text-lg font-medium text-accent-foreground">Sua sala está pronta!</p>
                    <p className="text-muted-foreground mb-2">ID da Sala (compartilhe com seu oponente):</p>
                    <div className="flex items-center justify-center space-x-2 bg-background p-3 rounded-md max-w-xs mx-auto">
                        <span className="text-2xl font-mono font-bold text-primary">{createdRoomCode}</span>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(createdRoomCode)} title="Copiar ID da Sala">
                        <ClipboardCopy className="h-5 w-5" />
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">Aguardando oponente...</p>
                    <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto mt-2" />
                    <Button variant="outline" size="sm" onClick={() => handleCancelPrivateOperations(user)} className="mt-4">
                        <X className="mr-2 h-4 w-4" /> Cancelar Sala Privada
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div>
                    <Label htmlFor="createRoomCode" className="text-base font-medium">Criar Sala Privada</Label>
                    <p className="text-xs text-muted-foreground mb-2">Deixe em branco para um ID aleatório ou insira um personalizado.</p>
                    <div className="flex space-x-2">
                    <Input
                        id="createRoomCode"
                        placeholder="ID da Sala (opcional)"
                        value={privateRoomCode}
                        onChange={(e) => setPrivateRoomCode(e.target.value.toUpperCase())}
                        disabled={isAppBusyGeneral || isCreatingPrivateRoom}
                        className="flex-grow"
                    />
                    <Button onClick={() => handleCreatePrivateRoom(user)} disabled={isAppBusyGeneral || isCreatingPrivateRoom}>
                        {isCreatingPrivateRoom ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Criar
                    </Button>
                    </div>
                </div>

                <div>
                    <Label htmlFor="joinRoomCode" className="text-base font-medium">Entrar em Sala Privada</Label>
                    <p className="text-xs text-muted-foreground mb-2">Insira o ID da sala fornecido pelo seu oponente.</p>
                    <div className="flex space-x-2">
                    <Input
                        id="joinRoomCode"
                        placeholder="ID da Sala para Entrar"
                        value={privateRoomCode} 
                        onChange={(e) => setPrivateRoomCode(e.target.value.toUpperCase())}
                        disabled={isAppBusyGeneral || isJoiningPrivateRoom}
                        className="flex-grow"
                    />
                    <Button onClick={() => handleJoinPrivateRoom(user)} disabled={isAppBusyGeneral || isJoiningPrivateRoom || !privateRoomCode.trim()} variant="secondary">
                        {isJoiningPrivateRoom ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <JoinIcon className="mr-2 h-4 w-4" />}
                        Entrar
                    </Button>
                    </div>
                </div>
                </div>
            )}
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

      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar Resultado do Duelo</DialogTitle>
            <DialogDescription>
              Partida contra: {activeDuelInfo?.opponent.displayName || "Oponente Desconhecido"}.<br/>
              Selecione o resultado da sua perspectiva.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 py-4">
            <Button variant="default" size="lg" onClick={() => handleReportResult('win')} disabled={isSubmittingResult} className="bg-green-600 hover:bg-green-700">
              {isSubmittingResult ? <Loader2 className="h-5 w-5 animate-spin"/> : <ThumbsUp className="mr-2 h-5 w-5" />} Vitória
            </Button>
            <Button variant="destructive" size="lg" onClick={() => handleReportResult('loss')} disabled={isSubmittingResult}>
              {isSubmittingResult ? <Loader2 className="h-5 w-5 animate-spin"/> : <ThumbsDown className="mr-2 h-5 w-5" />} Derrota
            </Button>
            <Button variant="secondary" size="lg" onClick={() => handleReportResult('draw')} disabled={isSubmittingResult}>
             {isSubmittingResult ? <Loader2 className="h-5 w-5 animate-spin"/> : <MinusCircle className="mr-2 h-5 w-5" />} Empate
            </Button>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmittingResult}>Cancelar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showHonestModal} onOpenChange={setShowHonestModal}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle className="text-center text-2xl font-headline text-destructive">Conflito de Resultados</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center space-y-4 py-4">
                <Image
                    src="https://images.ygoprodeck.com/images/cards/37742478.jpg"
                    alt="Carta 'Honesto' do Yu-Gi-Oh!"
                    width={200}
                    height={292}
                    className="rounded-lg shadow-lg"
                />
                <p className="text-lg text-center font-semibold text-foreground">
                    Você não foi honesto. Não repita isso.
                </p>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary" className="w-full">
                        Fechar
                    </Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!incomingInvite} onOpenChange={(open) => !open && setIncomingInvite(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="text-2xl font-headline text-primary">Convite para Duelo!</DialogTitle>
                <DialogDescription>
                    Você recebeu um convite para um duelo casual.
                </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-4 py-4">
                 <Avatar className="h-16 w-16 border-2 border-accent">
                    <AvatarImage src={incomingInvite?.fromUserPfp || undefined} data-ai-hint="avatar person" />
                    <AvatarFallback>{getInitials(incomingInvite?.fromUserDisplayName)}</AvatarFallback>
                </Avatar>
                <p className="text-lg">
                    <span className="font-bold text-accent">{incomingInvite?.fromUserDisplayName}</span> convidou você para um duelo.
                </p>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => handleRespondToInvite('decline')} disabled={isRespondingToInvite}>
                    {isRespondingToInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Recusar'}
                </Button>
                <Button onClick={() => handleRespondToInvite('accept')} disabled={isRespondingToInvite}>
                    {isRespondingToInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aceitar'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showClearStuckNotificationDialog} onOpenChange={setShowClearStuckNotificationDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Limpar notificação de reporte?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta ação irá limpar a notificação de reporte da sua tela. Use isso apenas se a notificação parecer presa por muito tempo.
                Você não poderá mais reportar o resultado para esta partida e ela será considerada abandonada. Isso não pode ser desfeito.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                    resetAllMatchmakingStates();
                    toast({ title: 'Notificação Limpa', description: 'O estado da partida foi reiniciado.' });
                }}
            >
                Sim, Limpar e Abandonar
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
