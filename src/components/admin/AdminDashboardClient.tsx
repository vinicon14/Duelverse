
'use client';

import { useEffect, useState, useCallback, useMemo, useRef, type ChangeEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, UserCog, Crown, Search, Bell, X, Server, ServerOff, Clapperboard, UploadCloud, Video, Ban, Gem } from 'lucide-react';
import type { User, AdvertisementConfig, Advertisement } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { formatBytes } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ADMIN_USERNAME = 'vinicon14';

const getInitials = (name: string = "") => {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'DU';
};

export default function AdminDashboardClient() {
  const { user: currentUser, loading: authLoading, updateUser } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [isUpdatingJudgeStatus, setIsUpdatingJudgeStatus] = useState<string | null>(null);
  const [isUpdatingProStatus, setIsUpdatingProStatus] = useState<string | null>(null);
  const [isUpdatingCoAdminStatus, setIsUpdatingCoAdminStatus] = useState<string | null>(null);
  const [isBanningUser, setIsBanningUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isClearingNotifications, setIsClearingNotifications] = useState(false);
  
  // Server Status State
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'loading'>('loading');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Advertisement State
  const [adConfig, setAdConfig] = useState<AdvertisementConfig | null>(null);
  const [isUpdatingAdStatus, setIsUpdatingAdStatus] = useState(false);
  const [newAdFile, setNewAdFile] = useState<File | null>(null);
  const [isUploadingAd, setIsUploadingAd] = useState(false);
  
  const [isInitiallyLoading, setIsInitiallyLoading] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [userToBan, setUserToBan] = useState<User | null>(null);


  const fetchAdminData = useCallback(async (isInitial: boolean = false) => {
    if (!currentUser || (currentUser.username !== ADMIN_USERNAME && !currentUser.isCoAdmin)) return;

    if (isInitial) {
        setIsInitiallyLoading(true);
    }

    try {
        const [usersRes, notifRes, statusRes, adsRes] = await Promise.all([
            fetch('/api/users/all'),
            fetch('/api/admin/notifications'),
            fetch('/api/admin/server-status'),
            fetch('/api/admin/ads'),
        ]);

        if (usersRes.ok) {
            const data = await usersRes.json();
            setUsers(data || []);
        }
        if (notifRes.ok) {
            const data = await notifRes.json();
            setNotifications(data.notifications || []);
        }
        if (statusRes.ok) {
            const data = await statusRes.json();
            setServerStatus(data.status || 'offline');
        }
        if (adsRes.ok) {
            const data = await adsRes.json();
            setAdConfig(data);
        }

        if (!usersRes.ok || !notifRes.ok || !statusRes.ok || !adsRes.ok) {
            throw new Error("Falha ao carregar alguns dados do painel de administração.");
        }
    } catch (error) {
        console.error("Failed to fetch admin data:", error);
        toast({ variant: 'destructive', title: 'Erro ao Carregar Dados', description: error instanceof Error ? error.message : "Não foi possível carregar os dados do admin." });
        setServerStatus('offline'); // default to a safe state
    } finally {
        if (isInitial) {
            setIsInitiallyLoading(false);
        }
    }
  }, [currentUser, toast]);


  // Effect for initial load and setting up polling
  useEffect(() => {
    if (currentUser && (currentUser.username === ADMIN_USERNAME || currentUser.isCoAdmin)) {
        fetchAdminData(true); // Initial fetch

        const intervalId = setInterval(() => fetchAdminData(false), 30000);
        pollingIntervalRef.current = intervalId;

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }
  }, [currentUser, fetchAdminData]);

  const handleClearNotifications = async () => {
    setIsClearingNotifications(true);
    try {
      const response = await fetch('/api/admin/notifications', { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao limpar notificações.');
      }
      setNotifications([]);
      toast({ title: 'Notificações Limpas', description: 'A lista de novos usuários foi limpa.' });
    } catch (error) {
      console.error("Failed to clear notifications:", error);
      toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Não foi possível limpar as notificações.' });
    } finally {
      setIsClearingNotifications(false);
    }
  };

  const handleToggleJudgeStatus = async (targetUser: User) => {
    if (!currentUser || (currentUser.username !== ADMIN_USERNAME && !currentUser.isCoAdmin)) return;
    setIsUpdatingJudgeStatus(targetUser.username);
    const newJudgeStatus = !targetUser.isJudge;

    try {
      const response = await fetch('/api/admin/set-judge-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUser.username, isJudge: newJudgeStatus }),
      });
      const updatedUserFromServer: User = await response.json();

      if (!response.ok) {
        throw new Error(updatedUserFromServer.message || `Falha ao atualizar status de juiz para ${targetUser.username}.`);
      }

      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.username === targetUser.username ? { ...u, isJudge: newJudgeStatus } : u
        )
      );

      if (updatedUserFromServer.username === currentUser.username) {
        updateUser({ isJudge: newJudgeStatus });
      }

      toast({
        title: "Status Atualizado!",
        description: `Status de juiz para ${targetUser.displayName} atualizado para ${newJudgeStatus ? 'Juiz' : 'Não Juiz'}.`,
      });
    } catch (error) {
      console.error("Failed to update judge status:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Atualizar",
        description: error instanceof Error ? error.message : "Não foi possível atualizar o status de juiz.",
      });
    } finally {
      setIsUpdatingJudgeStatus(null);
    }
  };

  const handleToggleProStatus = async (targetUser: User) => {
    if (!currentUser || (currentUser.username !== ADMIN_USERNAME && !currentUser.isCoAdmin)) return;
    setIsUpdatingProStatus(targetUser.username);
    const newProStatus = !targetUser.isPro;

    try {
      const response = await fetch('/api/admin/set-pro-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUser.username, isPro: newProStatus }),
      });
      const updatedUserFromServer: User = await response.json();

      if (!response.ok) {
        throw new Error(updatedUserFromServer.message || `Falha ao atualizar status PRO para ${targetUser.username}.`);
      }

      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.username === targetUser.username ? { ...u, isPro: newProStatus } : u
        )
      );
      
      if (updatedUserFromServer.username === currentUser.username) {
        updateUser({ isPro: newProStatus });
      }

      toast({
        title: "Status PRO Atualizado!",
        description: `Status PRO para ${targetUser.displayName} atualizado para ${newProStatus ? 'PRO' : 'NÃO-PRO'}.`,
      });
    } catch (error) {
      console.error("Failed to update pro status:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Atualizar",
        description: error instanceof Error ? error.message : "Não foi possível atualizar o status PRO.",
      });
    } finally {
      setIsUpdatingProStatus(null);
    }
  };

  const handleToggleCoAdminStatus = async (targetUser: User) => {
    if (!currentUser || (currentUser.username !== ADMIN_USERNAME && !currentUser.isCoAdmin)) return;
    
    if (targetUser.username === ADMIN_USERNAME) {
        toast({ variant: 'destructive', title: 'Ação Proibida', description: 'O status do administrador principal não pode ser alterado.' });
        return;
    }

    setIsUpdatingCoAdminStatus(targetUser.username);
    const newCoAdminStatus = !targetUser.isCoAdmin;

    try {
      const response = await fetch('/api/admin/set-coadmin-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUser.username, isCoAdmin: newCoAdminStatus }),
      });
      const updatedUserFromServer: User = await response.json();

      if (!response.ok) {
        throw new Error(updatedUserFromServer.message || `Falha ao atualizar status de co-admin para ${targetUser.username}.`);
      }

      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.username === targetUser.username ? { ...u, isCoAdmin: newCoAdminStatus } : u
        )
      );

      toast({
        title: "Status Atualizado!",
        description: `Status de co-admin para ${targetUser.displayName} atualizado para ${newCoAdminStatus ? 'Co-Admin' : 'Não Co-Admin'}.`,
      });
    } catch (error) {
      console.error("Failed to update co-admin status:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Atualizar",
        description: error instanceof Error ? error.message : "Não foi possível atualizar o status de co-admin.",
      });
    } finally {
      setIsUpdatingCoAdminStatus(null);
    }
  };

  const handleBanUser = async (targetUser: User) => {
    if (!currentUser || (currentUser.username !== ADMIN_USERNAME && !currentUser.isCoAdmin)) return;

    setIsBanningUser(targetUser.username);
    try {
        const response = await fetch('/api/admin/ban-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: targetUser.username }),
        });

        const updatedUserFromServer = await response.json();

        if (!response.ok) {
            throw new Error(updatedUserFromServer.message || `Falha ao banir ${targetUser.username}.`);
        }

        setUsers(prevUsers =>
            prevUsers.map(u =>
              u.username === updatedUserFromServer.username ? updatedUserFromServer : u
            )
        );

        toast({
            title: "Usuário Banido!",
            description: `${targetUser.displayName} foi banido permanentemente.`,
        });
        
        fetch('/api/admin/notifications').then(res => res.json()).then(data => setNotifications(data.notifications || []));

    } catch (error) {
        console.error("Failed to ban user:", error);
        toast({
            variant: "destructive",
            title: "Erro ao Banir",
            description: error instanceof Error ? error.message : "Não foi possível banir o usuário.",
        });
    } finally {
        setIsBanningUser(null);
    }
  };

  const handleToggleServerStatus = async (checked: boolean) => {
    const newStatus = checked ? 'online' : 'offline';
    setIsUpdatingStatus(true);
    try {
      const response = await fetch('/api/admin/server-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Falha ao atualizar o status do servidor.');
      }
      setServerStatus(data.status);
      toast({
        title: 'Status do Servidor Atualizado!',
        description: `O servidor agora está ${data.status === 'online' ? 'ONLINE' : 'OFFLINE (em manutenção)'}.`
      });
    } catch (error) {
      console.error("Failed to update server status:", error);
      toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Não foi possível atualizar o status do servidor.' });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleToggleAdStatus = async (checked: boolean) => {
    setIsUpdatingAdStatus(true);
    try {
      const response = await fetch('/api/admin/ads/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: checked }),
      });
      const data = await response.json();
       if (!response.ok) {
        throw new Error(data.message || 'Falha ao atualizar o status dos anúncios.');
      }
       setAdConfig(prev => prev ? { ...prev, enabled: data.enabled } : null);
      toast({
        title: 'Status dos Anúncios Atualizado!',
        description: `O sistema de anúncios agora está ${data.enabled ? 'ATIVADO' : 'DESATIVADO'}.`
      });
    } catch (error) {
      console.error("Failed to update ad status:", error);
      toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Não foi possível atualizar o status dos anúncios.' });
    } finally {
      setIsUpdatingAdStatus(false);
    }
  };

  const handleAdFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({ variant: 'destructive', title: "Vídeo Muito Grande", description: "O limite para o vídeo de anúncio é de 50MB." });
        return;
      }
      setNewAdFile(file);
    }
  }

  const handleUploadAd = async () => {
    if (!newAdFile) {
        toast({ variant: 'destructive', title: "Nenhum arquivo", description: "Por favor, selecione um vídeo para enviar." });
        return;
    }
    setIsUploadingAd(true);
    try {
        const reader = new FileReader();
        reader.readAsDataURL(newAdFile);
        reader.onload = async (event) => {
            const videoDataUri = event.target?.result as string;
            
            const response = await fetch('/api/admin/ads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newAdFile.name, videoDataUri }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Falha ao enviar anúncio.");
            }
            setAdConfig(data);
            setNewAdFile(null);
            toast({ title: "Sucesso!", description: `Anúncio "${newAdFile.name}" foi enviado.` });
            setIsUploadingAd(false);
        };
        reader.onerror = (error) => {
            throw new Error("Falha ao ler o arquivo de vídeo.");
        }

    } catch (error) {
      console.error("Failed to upload ad:", error);
      toast({ variant: 'destructive', title: 'Erro de Upload', description: error instanceof Error ? error.message : 'Não foi possível enviar o anúncio.' });
      setIsUploadingAd(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const lowercasedFilter = searchTerm.toLowerCase();
    return users.filter(user =>
      user.displayName.toLowerCase().includes(lowercasedFilter) ||
      user.username.toLowerCase().includes(lowercasedFilter)
    );
  }, [users, searchTerm]);

  if (isInitiallyLoading || authLoading) {
    return (
        <div className="w-full flex items-center justify-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Carregando dados do administrador...</p>
        </div>
    );
  }

  if (!currentUser || (currentUser.username !== ADMIN_USERNAME && !currentUser.isCoAdmin)) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle className="text-2xl text-destructive">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
            {!currentUser && <p className="text-sm mt-2">Por favor, faça login.</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 w-full">
      <div className="flex items-center space-x-3">
        <UserCog className="h-10 w-10 text-accent" />
        <div>
          <h1 className="text-3xl font-headline text-primary">Painel de Administração</h1>
          <p className="text-lg text-muted-foreground">Gerenciar usuários, permissões e o status do servidor.</p>
        </div>
      </div>

      {notifications.length > 0 && (
        <Alert className="border-accent shadow-lg">
          <Bell className="h-5 w-5 text-accent" />
          <AlertTitle className="text-accent font-headline">Notificações</AlertTitle>
          <AlertDescription>
            <div className="flex justify-between items-start">
               <ScrollArea className="h-24 pr-4">
                <ul className="list-disc list-inside mt-2 font-mono text-xs space-y-1">
                  {notifications.map((notif, index) => <li key={index}>{notif}</li>)}
                </ul>
              </ScrollArea>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearNotifications}
                disabled={isClearingNotifications}
                className="text-accent hover:bg-accent/10 hover:text-accent flex-shrink-0 ml-4"
              >
                {isClearingNotifications ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                <span className="ml-1 hidden sm:inline">Limpar</span>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center gap-2">
              <Server className="text-primary" />
              Status do Servidor
            </CardTitle>
            <CardDescription>
              Ative ou desative o modo de manutenção. Quando offline, os usuários não poderão logar, registrar ou iniciar partidas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {serverStatus === 'loading' ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-muted-foreground">Carregando status...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Switch
                  id="server-status-switch"
                  checked={serverStatus === 'online'}
                  onCheckedChange={handleToggleServerStatus}
                  disabled={isUpdatingStatus}
                />
                <Label htmlFor="server-status-switch" className="flex-grow">
                  <div className="flex items-center gap-2">
                    {serverStatus === 'online' ? <Server className="text-green-500"/> : <ServerOff className="text-destructive"/>}
                    <span className={`font-bold ${serverStatus === 'online' ? 'text-green-500' : 'text-destructive'}`}>
                      Servidor {serverStatus.toUpperCase()}
                    </span>
                  </div>
                </Label>
                {isUpdatingStatus && <Loader2 className="h-5 w-5 animate-spin" />}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center gap-2">
              <Clapperboard className="text-primary" />
              Gerenciamento de Anúncios
            </CardTitle>
            <CardDescription>
              Ative ou desative o sistema de anúncios e faça upload de novos vídeos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {adConfig === null ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-muted-foreground">Carregando config. de anúncios...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-4">
                    <Switch
                    id="ad-status-switch"
                    checked={adConfig.enabled}
                    onCheckedChange={handleToggleAdStatus}
                    disabled={isUpdatingAdStatus}
                    />
                    <Label htmlFor="ad-status-switch" className="flex-grow">
                    <div className="flex items-center gap-2">
                        <span className={`font-bold ${adConfig.enabled ? 'text-green-500' : 'text-destructive'}`}>
                        Sistema de Anúncios {adConfig.enabled ? 'ATIVADO' : 'DESATIVADO'}
                        </span>
                    </div>
                    </Label>
                    {isUpdatingAdStatus && <Loader2 className="h-5 w-5 animate-spin" />}
                </div>
                <Separator />
                <div className="space-y-2">
                    <Label htmlFor="ad-upload">Enviar novo anúncio (vídeo)</Label>
                    <div className="flex items-center gap-2">
                        <Input id="ad-upload" type="file" accept="video/*" onChange={handleAdFileChange} disabled={isUploadingAd} className="flex-grow"/>
                        <Button onClick={handleUploadAd} disabled={isUploadingAd || !newAdFile}>
                            {isUploadingAd ? <Loader2 className="h-4 w-4 animate-spin"/> : <UploadCloud className="h-4 w-4"/>}
                        </Button>
                    </div>
                    {newAdFile && <p className="text-xs text-muted-foreground">Selecionado: {newAdFile.name} ({formatBytes(newAdFile.size)})</p>}
                </div>
                <Separator />
                <Label>Anúncios Enviados ({adConfig.videos.length})</Label>
                <ScrollArea className="h-24 rounded-md border p-2">
                    {adConfig.videos.length > 0 ? (
                        <ul className="space-y-1">
                            {adConfig.videos.map(ad => (
                                <li key={ad.id} className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Video className="h-4 w-4 shrink-0"/> <span className="truncate">{ad.name}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-center text-muted-foreground py-6">Nenhum anúncio enviado.</p>}
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>
      </div>


      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Gerenciamento de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label htmlFor="searchUser" className="sr-only">Buscar Usuário</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="searchUser"
                type="text"
                placeholder="Buscar por nome ou usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-1/2 lg:w-1/3"
              />
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">País</TableHead>
                  <TableHead className="text-center w-[150px]">Co-Admin</TableHead>
                  <TableHead className="text-center w-[150px]">PRO</TableHead>
                  <TableHead className="text-center w-[150px]">Juiz</TableHead>
                  <TableHead className="text-center w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? filteredUsers.map((userToList) => (
                  <TableRow key={userToList.id} className={userToList.isBanned ? 'bg-destructive/10 hover:bg-destructive/20' : ''}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 border-2 border-secondary">
                          <AvatarImage
                            src={userToList.profilePictureUrl || `https://placehold.co/100x100.png?text=${getInitials(userToList.displayName)}`}
                            alt={userToList.displayName}
                            data-ai-hint="avatar person"
                          />
                          <AvatarFallback>{getInitials(userToList.displayName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className={`font-medium ${userToList.isBanned ? 'line-through text-muted-foreground' : ''}`}>{userToList.displayName}</p>
                          <p className="text-xs text-muted-foreground">@{userToList.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{userToList.score}</TableCell>
                    <TableCell className="text-center">{userToList.country}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                          {isUpdatingCoAdminStatus === userToList.username ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                              <>
                                  {(userToList.isCoAdmin || userToList.username === ADMIN_USERNAME) && <UserCog className="h-5 w-5 text-accent" />}
                                  <Switch
                                      id={`coadmin-switch-${userToList.username}`}
                                      checked={!!userToList.isCoAdmin}
                                      onCheckedChange={() => handleToggleCoAdminStatus(userToList)}
                                      disabled={isUpdatingCoAdminStatus === userToList.username || userToList.username === ADMIN_USERNAME} 
                                      aria-label={`Tornar ${userToList.displayName} co-admin`}
                                  />
                              </>
                          )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                          {isUpdatingProStatus === userToList.username ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                              <>
                                  {userToList.isPro && <Gem className="h-5 w-5 text-purple-400" />}
                                  <Switch
                                      id={`pro-switch-${userToList.username}`}
                                      checked={!!userToList.isPro}
                                      onCheckedChange={() => handleToggleProStatus(userToList)}
                                      disabled={isUpdatingProStatus === userToList.username || userToList.username === ADMIN_USERNAME} 
                                      aria-label={`Tornar ${userToList.displayName} PRO`}
                                  />
                              </>
                          )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                          {isUpdatingJudgeStatus === userToList.username ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                              <>
                                  {userToList.isJudge && <Crown className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
                                  <Switch
                                      id={`judge-switch-${userToList.username}`}
                                      checked={!!userToList.isJudge}
                                      onCheckedChange={() => handleToggleJudgeStatus(userToList)}
                                      disabled={isUpdatingJudgeStatus === userToList.username || userToList.username === ADMIN_USERNAME} 
                                      aria-label={`Tornar ${userToList.displayName} juiz`}
                                  />
                              </>
                          )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                        <Button
                            variant={userToList.isBanned ? "secondary" : "destructive"}
                            size="sm"
                            onClick={() => setUserToBan(userToList)}
                            disabled={isBanningUser === userToList.username || userToList.username === ADMIN_USERNAME || userToList.isCoAdmin || userToList.isBanned}
                            title={userToList.isBanned ? "Usuário já banido" : `Banir ${userToList.displayName}`}
                        >
                            {isBanningUser === userToList.username ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                            <span className="ml-1 hidden sm:inline">{userToList.isBanned ? 'Banido' : 'Banir'}</span>
                        </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                       {searchTerm ? 'Nenhum usuário encontrado para sua busca.' : 'Nenhum usuário no sistema.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!userToBan} onOpenChange={(open) => !open && setUserToBan(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta ação banirá permanentemente o usuário <span className="font-bold">{userToBan?.displayName} (@{userToBan?.username})</span>.
                Ele não poderá mais acessar a plataforma. Esta ação não pode ser desfeita por esta interface.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToBan(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                    if (userToBan) {
                        handleBanUser(userToBan);
                    }
                    setUserToBan(null);
                }}
            >
                Sim, banir usuário
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
