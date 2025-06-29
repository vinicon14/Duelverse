
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
import { 
  Loader2, ShieldAlert, UserCog, Crown, Search, Bell, X, Server, ServerOff, 
  Clapperboard, UploadCloud, Video, Ban, Gem, GitBranch, ArrowUp, ArrowDown, Rocket, Trash2
} from 'lucide-react';
import type { User, AdvertisementConfig } from '@/lib/types';
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
  
  // Versioning State
  const [version, setVersion] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isDowngrading, setIsDowngrading] = useState(false);

  // Maintenance State
  const [isDeletingUsers, setIsDeletingUsers] = useState(false);
  
  const [isInitiallyLoading, setIsInitiallyLoading] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [userToBan, setUserToBan] = useState<User | null>(null);


  const fetchAdminData = useCallback(async (isInitial: boolean = false) => {
    if (!currentUser || (currentUser.username !== ADMIN_USERNAME && !currentUser.isCoAdmin)) return;

    if (isInitial) {
        setIsInitiallyLoading(true);
    }

    try {
        const [usersRes, notifRes, statusRes, adsRes, versionRes] = await Promise.all([
            fetch('/api/users/all'),
            fetch('/api/admin/notifications'),
            fetch('/api/admin/server-status'),
            fetch('/api/admin/ads'),
            fetch('/api/version/current'),
        ]);

        if (usersRes.ok) setUsers(await usersRes.json() || []);
        if (notifRes.ok) setNotifications((await notifRes.json()).notifications || []);
        if (statusRes.ok) setServerStatus((await statusRes.json()).status || 'offline');
        if (adsRes.ok) setAdConfig(await adsRes.json());
        if (versionRes.ok) setVersion((await versionRes.json()).version || 'unknown');

    } catch (error) {
        console.error("Failed to fetch admin data:", error);
        toast({ variant: 'destructive', title: 'Erro ao Carregar Dados', description: "Não foi possível carregar os dados do admin." });
        setServerStatus('offline');
    } finally {
        if (isInitial) {
            setIsInitiallyLoading(false);
        }
    }
  }, [currentUser, toast]);


  useEffect(() => {
    if (currentUser && (currentUser.username === ADMIN_USERNAME || currentUser.isCoAdmin)) {
        fetchAdminData(true);
        const intervalId = setInterval(() => fetchAdminData(false), 30000);
        pollingIntervalRef.current = intervalId;
        return () => { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); };
    }
  }, [currentUser, fetchAdminData]);

  const handleDeleteExpiredUsers = async () => {
    setIsDeletingUsers(true);
    try {
      const res = await fetch('/api/admin/purge', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Falha ao excluir usuários.');
      
      toast({
        title: 'Manutenção Concluída',
        description: data.message,
      });

      // Refresh user list after deletion
      fetchAdminData(false);

    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro de Manutenção', description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.' });
    } finally {
      setIsDeletingUsers(false);
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const res = await fetch('/api/version/upgrade', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Falha ao fazer upgrade da versão.');
      setVersion(data.version);
      toast({ title: 'Versão Atualizada!', description: `A plataforma agora está na versão ${data.version} (apenas para admins).` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.' });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleDowngrade = async () => {
    setIsDowngrading(true);
    try {
      const res = await fetch('/api/version/downgrade', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Falha ao fazer downgrade da versão.');
      setVersion(data.version);
      toast({ title: 'Versão Revertida!', description: `A plataforma agora está na versão ${data.version} (apenas para admins).` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.' });
    } finally {
      setIsDowngrading(false);
    }
  };

  const handlePublish = () => {
    toast({
      title: 'Publicação Iniciada!',
      description: `As alterações da versão ${version} estão a ser publicadas para todos os usuários.`,
    });
  };

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
      if (!response.ok) throw new Error('Falha ao atualizar status de juiz.');

      setUsers(prevUsers => prevUsers.map(u => u.username === targetUser.username ? { ...u, isJudge: newJudgeStatus } : u));
      if (targetUser.username === currentUser.username) updateUser({ isJudge: newJudgeStatus });

      toast({
        title: "Status Atualizado!",
        description: `Status de juiz para ${targetUser.displayName} atualizado para ${newJudgeStatus ? 'Juiz' : 'Não Juiz'}.`,
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao Atualizar", description: error instanceof Error ? error.message : "Erro desconhecido." });
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
      if (!response.ok) throw new Error('Falha ao atualizar status PRO.');
      
      setUsers(prevUsers => prevUsers.map(u => u.username === targetUser.username ? { ...u, isPro: newProStatus } : u));
      if (targetUser.username === currentUser.username) updateUser({ isPro: newProStatus });

      toast({ title: "Status PRO Atualizado!", description: `Status PRO para ${targetUser.displayName} atualizado.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao Atualizar", description: error instanceof Error ? error.message : "Erro desconhecido." });
    } finally {
      setIsUpdatingProStatus(null);
    }
  };

  const handleToggleCoAdminStatus = async (targetUser: User) => {
    if (!currentUser || currentUser.username !== ADMIN_USERNAME) return;
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
      if (!response.ok) throw new Error('Falha ao atualizar status de co-admin.');

      setUsers(prevUsers => prevUsers.map(u => u.username === targetUser.username ? { ...u, isCoAdmin: newCoAdminStatus } : u));
      toast({ title: "Status Atualizado!", description: `Status de co-admin para ${targetUser.displayName} atualizado.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao Atualizar", description: error instanceof Error ? error.message : "Erro desconhecido." });
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
        if (!response.ok) throw new Error('Falha ao banir usuário.');
        const updatedUser = await response.json();
        setUsers(prevUsers => prevUsers.map(u => u.username === targetUser.username ? updatedUser : u));
        toast({ title: "Usuário Banido!", description: `${targetUser.displayName} foi banido permanentemente.` });
    } catch (error) {
        toast({ variant: "destructive", title: "Erro ao Banir", description: error instanceof Error ? error.message : "Erro desconhecido." });
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
      if (!response.ok) throw new Error('Falha ao atualizar o status do servidor.');
      setServerStatus(newStatus);
      toast({ title: 'Status do Servidor Atualizado!', description: `O servidor agora está ${newStatus.toUpperCase()}.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Erro desconhecido.' });
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
      if (!response.ok) throw new Error('Falha ao atualizar o status dos anúncios.');
      const data = await response.json();
      setAdConfig(prev => prev ? { ...prev, enabled: data.enabled } : null);
      toast({ title: 'Status dos Anúncios Atualizado!', description: `O sistema de anúncios agora está ${data.enabled ? 'ATIVADO' : 'DESATIVADO'}.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Erro desconhecido.' });
    } finally {
      setIsUpdatingAdStatus(false);
    }
  };

  const handleAdFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({ variant: 'destructive', title: "Vídeo Muito Grande", description: "O limite para o vídeo de anúncio é de 50MB." });
        return;
      }
      setNewAdFile(file);
    }
  }

  const handleUploadAd = async () => {
    if (!newAdFile) return;
    setIsUploadingAd(true);
    const reader = new FileReader();
    reader.readAsDataURL(newAdFile);
    reader.onload = async (event) => {
        try {
            const videoDataUri = event.target?.result as string;
            const response = await fetch('/api/admin/ads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newAdFile.name, videoDataUri }),
            });
            if (!response.ok) throw new Error('Falha ao enviar anúncio.');
            const data = await response.json();
            setAdConfig(data);
            setNewAdFile(null);
            toast({ title: "Sucesso!", description: `Anúncio "${newAdFile.name}" foi enviado.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro de Upload', description: error instanceof Error ? error.message : 'Erro desconhecido.' });
        } finally {
            setIsUploadingAd(false);
        }
    };
    reader.onerror = () => {
        toast({ variant: 'destructive', title: 'Erro de Leitura', description: 'Não foi possível ler o ficheiro de vídeo.' });
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
              <Button variant="ghost" size="sm" onClick={handleClearNotifications} disabled={isClearingNotifications}>
                {isClearingNotifications ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                <span className="ml-1 hidden sm:inline">Limpar</span>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center gap-2"><Server className="text-primary" />Status do Servidor</CardTitle>
            <CardDescription>Ative ou desative o modo de manutenção para o servidor.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Switch id="server-status-switch" checked={serverStatus === 'online'} onCheckedChange={handleToggleServerStatus} disabled={isUpdatingStatus} />
              <Label htmlFor="server-status-switch" className="flex-grow flex items-center gap-2">
                {serverStatus === 'online' ? <Server className="text-green-500"/> : <ServerOff className="text-destructive"/>}
                <span className={`font-bold ${serverStatus === 'online' ? 'text-green-500' : 'text-destructive'}`}>Servidor {serverStatus.toUpperCase()}</span>
              </Label>
              {isUpdatingStatus && <Loader2 className="h-5 w-5 animate-spin" />}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center gap-2"><GitBranch className="text-primary" />Controle de Versão</CardTitle>
            <CardDescription>Faça upgrade, downgrade e publique novas versões.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center p-2 bg-muted rounded-lg">
              <span className="font-mono text-lg text-primary">{version || <Loader2 className="h-5 w-5 animate-spin" />}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleUpgrade} disabled={isUpgrading || isDowngrading}>
                {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <ArrowUp className="h-4 w-4 mr-2"/>}
                Upgrade
              </Button>
              <Button variant="outline" onClick={handleDowngrade} disabled={isUpgrading || isDowngrading}>
                {isDowngrading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <ArrowDown className="h-4 w-4 mr-2"/>}
                Downgrade
              </Button>
            </div>
            <Button onClick={handlePublish} className="w-full">
              <Rocket className="h-4 w-4 mr-2"/>
              Publicar Alterações
            </Button>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-xl font-headline flex items-center gap-2"><Trash2 className="text-primary" />Manutenção</CardTitle>
                <CardDescription>Execute tarefas de manutenção na base de dados.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button variant="destructive" onClick={handleDeleteExpiredUsers} disabled={isDeletingUsers} className="w-full">
                    {isDeletingUsers ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Trash2 className="h-4 w-4 mr-2"/>}
                    Limpar Usuários Banidos
                </Button>
                 <p className="text-xs text-muted-foreground mt-2">
                    Isto excluirá permanentemente os usuários banidos há mais de 30 dias. Esta ação é irreversível.
                </p>
            </CardContent>
        </Card>
      </div>


      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Gerenciamento de Usuários</CardTitle>
          <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input id="searchUser" type="text" placeholder="Buscar por nome ou usuário..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full sm:w-1/2 lg:w-1/3" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">País</TableHead>
                  <TableHead className="text-center">Co-Admin</TableHead>
                  <TableHead className="text-center">PRO</TableHead>
                  <TableHead className="text-center">Juiz</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? filteredUsers.map((userToList) => (
                  <TableRow key={userToList.id} className={userToList.isBanned ? 'bg-destructive/10' : ''}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 border-2 border-secondary"><AvatarImage src={userToList.profilePictureUrl || ''} /><AvatarFallback>{getInitials(userToList.displayName)}</AvatarFallback></Avatar>
                        <div>
                          <p className={`font-medium ${userToList.isBanned ? 'line-through' : ''}`}>{userToList.displayName}</p>
                          <p className="text-xs text-muted-foreground">@{userToList.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{userToList.score}</TableCell>
                    <TableCell className="text-center">{userToList.country}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        {isUpdatingCoAdminStatus === userToList.username ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                          <Switch id={`coadmin-switch-${userToList.username}`} checked={!!userToList.isCoAdmin} onCheckedChange={() => handleToggleCoAdminStatus(userToList)} disabled={isUpdatingCoAdminStatus === userToList.username || userToList.username === ADMIN_USERNAME} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        {isUpdatingProStatus === userToList.username ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                          <Switch id={`pro-switch-${userToList.username}`} checked={!!userToList.isPro} onCheckedChange={() => handleToggleProStatus(userToList)} disabled={isUpdatingProStatus === userToList.username} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        {isUpdatingJudgeStatus === userToList.username ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                          <Switch id={`judge-switch-${userToList.username}`} checked={!!userToList.isJudge} onCheckedChange={() => handleToggleJudgeStatus(userToList)} disabled={isUpdatingJudgeStatus === userToList.username} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                        <Button variant="destructive" size="sm" onClick={() => setUserToBan(userToList)} disabled={isBanningUser === userToList.username || userToList.username === ADMIN_USERNAME || userToList.isCoAdmin || userToList.isBanned}>
                            {isBanningUser === userToList.username ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                        </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center">Nenhum usuário encontrado.</TableCell></TableRow>
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
                Esta ação banirá permanentemente o usuário <span className="font-bold">{userToBan?.displayName} (@{userToBan?.username})</span>. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToBan(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (userToBan) handleBanUser(userToBan); setUserToBan(null); }}>
                Sim, banir
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
