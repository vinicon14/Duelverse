
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";
import { Swords, Trophy, BookOpenText, Brain, Loader2, X, ClipboardCopy, PlusCircle, LogIn as JoinIcon, MinusCircle, Users, Gem, Dices, Eye, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import type { PrivateRoomStatus, CreatePrivateRoomResponse, JoinPrivateRoomResponse, MatchmakingMode, JoinMatchmakingResponse, ActiveDuelInfo } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import MatchLoadingScreen from "@/components/match-loading/MatchLoadingScreen";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const getInitials = (name: string = "") => {
  if (!name) return 'DU';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

export default function DashboardClient() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const { toast } = useToast();
  
  const [isSearching, setIsSearching] = useState<MatchmakingMode | null>(null);
  const [privateRoomStatus, setPrivateRoomStatus] = useState<PrivateRoomStatus>('idle');
  const [privateRoomCode, setPrivateRoomCode] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  const [isJoiningPrivateRoom, setIsJoiningPrivateRoom] = useState(false);
  const [isCreatingPrivateRoom, setIsCreatingPrivateRoom] = useState(false);
  const [foundGame, setFoundGame] = useState<ActiveDuelInfo | null>(null);
  const [activeDuelInfo, setActiveDuelInfo] = useState<ActiveDuelInfo | null>(null);
  const [onlineUsersCount, setOnlineUsersCount] = useState<number | null>(null);
  const [isLoadingOnlineCount, setIsLoadingOnlineCount] = useState(true);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const onlineCountIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isAppBusy = !!isSearching || privateRoomStatus !== 'idle' || !!activeDuelInfo || !!foundGame;
  
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const resetStates = useCallback(() => {
    stopPolling();
    setIsSearching(null);
    setPrivateRoomStatus('idle');
    setCreatedRoomCode('');
    setPrivateRoomCode('');
    setFoundGame(null);
    setActiveDuelInfo(null);
    localStorage.removeItem('activeDuelInfo');
  }, [stopPolling]);

  const startPolling = useCallback((endpoint: string, onMatch: (data: any) => void) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Polling request failed');
        const data = await response.json();
        if ((data.status === 'matched' || data.status === 'ready') && data.game) {
          stopPolling();
          onMatch(data);
        }
      } catch (error) {
        console.error("Polling error:", error);
        stopPolling();
      }
    }, 5000);
  }, [stopPolling]);

  const handleApiRequest = async (endpoint: string, body: object, setLoading: (loading: boolean) => void, successCallback: (data: any) => void, errorTitle: string) => {
    setLoading(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro desconhecido');
      successCallback(data);
    } catch (error) {
      toast({ variant: 'destructive', title: errorTitle, description: error instanceof Error ? error.message : "Tente novamente." });
      resetStates();
    } finally {
      setLoading(false);
    }
  };

  const handleSearchDuel = (mode: MatchmakingMode) => {
    if (!user) return;
    handleApiRequest('/api/matchmaking/join', { mode }, () => setIsSearching(mode), (data: JoinMatchmakingResponse) => {
        if (data.status === 'matched' && data.game) { setFoundGame(data.game); } 
        else { startPolling(`/api/matchmaking/status?userId=${user.id}`, (matchData) => setFoundGame(matchData.game)); }
        toast({ title: "Buscando partida...", description: "Você foi adicionado à fila." });
      }, 'Erro ao buscar partida');
  };

  const handleCancelSearch = () => {
    handleApiRequest('/api/matchmaking/leave', {}, () => {}, () => resetStates(), 'Erro ao cancelar busca');
  };

  const handleCreatePrivateRoom = () => {
    handleApiRequest('/api/private-room/create', { roomId: privateRoomCode || undefined }, setIsCreatingPrivateRoom, (data: CreatePrivateRoomResponse) => {
        setCreatedRoomCode(data.roomId);
        setPrivateRoomStatus('waiting_for_opponent');
        startPolling(`/api/private-room/status?roomId=${data.roomId}`, (matchData) => setFoundGame(matchData.game));
        toast({ title: "Sala Criada!", description: `Código da sala: ${data.roomId}` });
      }, 'Erro ao criar sala');
  };

  const handleJoinPrivateRoom = () => {
    handleApiRequest('/api/private-room/join', { roomId: privateRoomCode }, setIsJoiningPrivateRoom, (data: JoinPrivateRoomResponse) => {
        if (data.game) setFoundGame(data.game);
      }, 'Erro ao entrar na sala');
  };

  const handleCancelPrivateOperations = () => {
    handleApiRequest('/api/private-room/leave', { roomId: createdRoomCode }, () => {}, () => resetStates(), 'Erro ao cancelar');
  };
  
  const openJitsiRoom = (gameInfo: ActiveDuelInfo) => {
    if (!user) return;
    setActiveDuelInfo(gameInfo);
    localStorage.setItem('activeDuelInfo', JSON.stringify(gameInfo));
    setFoundGame(null);
    toast({ title: "Sala pronta!", description: "Redirecionando para o duelo..."});
    window.open(`https://meet.jit.si/${gameInfo.jitsiRoomName}`);
  };

  const handleReportResult = async (outcome: 'win' | 'loss' | 'draw') => {
    if (!activeDuelInfo) return;
    await handleApiRequest( '/api/match-results/report', { gameId: activeDuelInfo.gameId, outcome }, setIsSubmittingResult, () => {
        toast({ title: "Resultado enviado", description: "Aguardando oponente..." });
        setShowResultModal(false);
      }, 'Erro ao reportar resultado'
    );
  };
  
  useEffect(() => {
    const fetchOnlineCount = async () => {
      try {
        const response = await fetch('/api/users/online-count');
        if (response.ok) setOnlineUsersCount((await response.json()).onlineCount);
      } catch (error) { console.error("Failed to fetch online users count:", error);
      } finally { setIsLoadingOnlineCount(false); }
    };
    fetchOnlineCount();
    onlineCountIntervalRef.current = setInterval(fetchOnlineCount, 30000);
    return () => { if (onlineCountIntervalRef.current) clearInterval(onlineCountIntervalRef.current) };
  }, []);

  useEffect(() => {
    try {
      const savedDuelInfo = localStorage.getItem('activeDuelInfo');
      if (savedDuelInfo) setActiveDuelInfo(JSON.parse(savedDuelInfo));
    } catch (error) { localStorage.removeItem('activeDuelInfo'); }
  }, []);
  
  if (status === 'loading' || !user) return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;
  if (foundGame) return <MatchLoadingScreen opponentDisplayName={foundGame.opponent.displayName} onProceed={() => openJitsiRoom(foundGame)} jitsiRoomName={foundGame.jitsiRoomName} />;

  return (
    <div className="container mx-auto px-4 py-8 w-full space-y-8">
      <Card className="shadow-xl overflow-hidden">
        <div className="p-6 flex items-center bg-card">
          <Avatar className="h-24 w-24 border-4 border-accent shadow-lg"><AvatarImage src={user.profilePictureUrl || ''} /><AvatarFallback>{getInitials(user.displayName)}</AvatarFallback></Avatar>
          <div className="ml-6">
            <h1 className="text-3xl font-headline font-bold">Bem-vindo, <span className="text-accent">{user.displayName}!</span></h1>
            <p className="text-lg text-muted-foreground">Pronto para o seu próximo duelo?</p>
          </div>
        </div>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-2 rounded-lg"><Trophy className="h-6 w-6 text-yellow-500" /><div><p className="text-sm font-medium text-muted-foreground">Score</p><p className="text-lg font-bold">{user.score}</p></div></div>
          <div className="flex items-center space-x-3 p-2 rounded-lg"><Users className="h-6 w-6 text-green-500" /><div><p className="text-sm font-medium text-muted-foreground">Duelistas Online</p>{isLoadingOnlineCount ? <Loader2 className="h-5 w-5 animate-spin" /> : <p className="text-lg font-bold">{onlineUsersCount ?? '...'}</p>}</div></div>
          <div className="flex items-center space-x-3 p-2 rounded-lg"><Gem className="h-6 w-6 text-purple-500" /><div><p className="text-sm font-medium text-muted-foreground">Status</p><p className={`text-lg font-bold ${user.isPro ? 'text-purple-400' : 'text-gray-400'}`}>{user.isPro ? "PRO" : "Grátis"}</p></div></div>
        </CardContent>
      </Card>
      
      {activeDuelInfo && (
        <Card className="shadow-xl border-2 border-primary animate-pulse-glow">
          <CardHeader><CardTitle className="text-2xl text-primary">Duelo em Andamento!</CardTitle><CardDescription>Você está em um duelo contra {activeDuelInfo.opponent.displayName}.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button onClick={() => openJitsiRoom(activeDuelInfo)} size="lg"><Eye className="mr-2 h-5 w-5"/>Voltar à Partida</Button>
            {activeDuelInfo.mode === 'ranked' && <Button onClick={() => setShowResultModal(true)} variant="outline" size="lg"><ShieldCheck className="mr-2 h-5 w-5"/>Reportar Resultado</Button>}
            <Button onClick={resetStates} variant="destructive" size="lg"><X className="mr-2 h-5 w-5"/>Forçar Saída</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="shadow-xl flex flex-col lg:col-span-1">
          <CardHeader><CardTitle>Duelos Privados / Torneios</CardTitle><CardDescription>Crie ou junte-se a uma sala privada.</CardDescription></CardHeader>
          <CardContent className="space-y-6 flex-grow">
            {privateRoomStatus === 'waiting_for_opponent' ? <div className="text-center p-4 rounded-lg border-dashed border-2"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" /><p className="font-semibold text-lg">Aguardando oponente...</p><div className="flex items-center justify-center gap-2 mt-2"><span className="font-bold text-lg">{createdRoomCode}</span><Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(createdRoomCode)}><ClipboardCopy className="h-5 w-5"/></Button></div></div> : <><div><Label htmlFor="create-room">Criar Sala</Label><div className="flex gap-2 mt-1"><Input id="create-room" placeholder="ID Personalizado (Opcional)" onChange={e => setPrivateRoomCode(e.target.value)} disabled={isAppBusy}/><Button onClick={handleCreatePrivateRoom} disabled={isAppBusy || isCreatingPrivateRoom}>{isCreatingPrivateRoom ? <Loader2 className="h-4 w-4 animate-spin"/> : <PlusCircle className="h-4 w-4"/>}</Button></div></div><div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">OU</span></div></div><div><Label htmlFor="join-room">Entrar em uma Sala</Label><div className="flex gap-2 mt-1"><Input id="join-room" placeholder="Código da Sala" onChange={e => setPrivateRoomCode(e.target.value)} disabled={isAppBusy}/><Button onClick={handleJoinPrivateRoom} disabled={isAppBusy || isJoiningPrivateRoom || !privateRoomCode}>{isJoiningPrivateRoom ? <Loader2 className="h-4 w-4 animate-spin"/> : <JoinIcon className="h-4 w-4"/>}</Button></div></div></>}
          </CardContent>
          {privateRoomStatus !== 'idle' && <CardFooter><Button variant="destructive" className="w-full" onClick={handleCancelPrivateOperations}><MinusCircle className="mr-2 h-4 w-4"/> Cancelar</Button></CardFooter>}
        </Card>
        <Card className="shadow-xl flex flex-col">
          <CardHeader><CardTitle>Duelo Ranqueado</CardTitle><CardDescription>Encontre um oponente e suba no ranking.</CardDescription></CardHeader>
          <CardContent className="flex-grow flex items-center justify-center">{isSearching === 'ranked' ? <div className="text-center p-4"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" /><p className="font-semibold text-lg">Procurando oponente...</p></div> : <Swords className="h-24 w-24 text-muted-foreground/20"/>}</CardContent>
          <CardFooter>{isSearching === 'ranked' ? <Button onClick={handleCancelSearch} className="w-full" variant="destructive"><X className="mr-2 h-4 w-4" /> Cancelar Busca</Button> : <Button onClick={() => handleSearchDuel('ranked')} className="w-full" disabled={isAppBusy}><Swords className="mr-2 h-4 w-4" /> Procurar Oponente</Button>}</CardFooter>
        </Card>
         <Card className="shadow-xl flex flex-col">
          <CardHeader><CardTitle>Duelo Casual</CardTitle><CardDescription>Jogue uma partida amistosa sem afetar seu score.</CardDescription></CardHeader>
          <CardContent className="flex-grow flex items-center justify-center">{isSearching === 'casual' ? <div className="text-center p-4"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" /><p className="font-semibold text-lg">Procurando oponente...</p></div> : <Dices className="h-24 w-24 text-muted-foreground/20"/>}</CardContent>
          <CardFooter>{isSearching === 'casual' ? <Button onClick={handleCancelSearch} className="w-full" variant="destructive"><X className="mr-2 h-4 w-4" /> Cancelar Busca</Button> : <Button onClick={() => handleSearchDuel('casual')} className="w-full" variant="secondary" disabled={isAppBusy}><Dices className="mr-2 h-4 w-4" /> Procurar Oponente Casual</Button>}</CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Outras Ações</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Button variant="outline" asChild disabled={isAppBusy}><Link href="/ranking"><Trophy className="mr-2 h-4 w-4" /> Ranking</Link></Button>
          <Button variant="outline" asChild disabled={isAppBusy}><Link href="/friends"><Users className="mr-2 h-4 w-4" /> Amigos</Link></Button>
          <Button variant="outline" asChild disabled={isAppBusy}><Link href="/card-oracle"><BookOpenText className="mr-2 h-4 w-4" /> Oráculo de Cartas</Link></Button>
          <Button variant="outline" asChild disabled={isAppBusy}><Link href="/rules-oracle"><Brain className="mr-2 h-4 w-4" /> Oráculo de Regras</Link></Button>
          {!user.isPro && (<Button asChild className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white"><Link href="/get-pro"><Gem className="mr-2 h-4 w-4" /> Obter PRO</Link></Button>)}
        </CardContent>
      </Card>

      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reportar Resultado da Partida</DialogTitle><DialogDescription>Por favor, reporte o resultado honestamente.</DialogDescription></DialogHeader>
          <div className="flex justify-around p-4">
            <Button onClick={() => handleReportResult('win')} disabled={isSubmittingResult} size="lg" className="bg-green-600 hover:bg-green-700">Vitória</Button>
            <Button onClick={() => handleReportResult('loss')} disabled={isSubmittingResult} size="lg" className="bg-red-600 hover:bg-red-700">Derrota</Button>
            <Button onClick={() => handleReportResult('draw')} disabled={isSubmittingResult} size="lg" variant="secondary">Empate</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
