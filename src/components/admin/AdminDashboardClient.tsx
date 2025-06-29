
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
  Clapperboard, UploadCloud, Video, Ban, Gem, GitBranch, ArrowUp, ArrowDown, Rocket, Trash2, Megaphone
} from 'lucide-react';
import type { User, AdvertisementConfig, PopupBannerAd } from '@/lib/types';
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
  
  // States for all functionalities
  const [users, setUsers] = useState<User[]>([]);
  const [isUpdatingJudgeStatus, setIsUpdatingJudgeStatus] = useState<string | null>(null);
  const [isUpdatingProStatus, setIsUpdatingProStatus] = useState<string | null>(null);
  const [isUpdatingCoAdminStatus, setIsUpdatingCoAdminStatus] = useState<string | null>(null);
  const [isBanningUser, setIsBanningUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isClearingNotifications, setIsClearingNotifications] = useState(false);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'loading'>('loading');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [adConfig, setAdConfig] = useState<AdvertisementConfig | null>(null);
  const [popupBanner, setPopupBanner] = useState<PopupBannerAd | null>(null);
  const [isUpdatingPopupBanner, setIsUpdatingPopupBanner] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isDowngrading, setIsDowngrading] = useState(false);
  const [isDeletingUsers, setIsDeletingUsers] = useState(false);
  const [isInitiallyLoading, setIsInitiallyLoading] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [userToBan, setUserToBan] = useState<User | null>(null);

  const fetchAdminData = useCallback(async (isInitial: boolean = false) => {
    if (!currentUser) return;
    if (isInitial) setIsInitiallyLoading(true);

    try {
      const headers = { 'Authorization': currentUser.id };
      const [usersRes, notifRes, statusRes, adsRes, bannerRes, versionRes] = await Promise.all([
        fetch('/api/users/all', { headers }),
        fetch('/api/admin/notifications', { headers }),
        fetch('/api/admin/server-status', { headers }),
        fetch('/api/admin/ads', { headers }),
        fetch('/api/admin/ads/banner', { headers }),
        fetch('/api/version/current', { headers }),
      ]);

      if (usersRes.ok) setUsers(await usersRes.json() || []);
      if (notifRes.ok) setNotifications((await notifRes.json()).notifications || []);
      if (statusRes.ok) setServerStatus((await statusRes.json()).status || 'offline');
      if (adsRes.ok) setAdConfig(await adsRes.json());
      if (bannerRes.ok) setPopupBanner(await bannerRes.json());
      if (versionRes.ok) setVersion((await versionRes.json()).version || 'unknown');

    } catch (error) {
      console.error("Failed to fetch admin data:", error);
      toast({ variant: 'destructive', title: 'Erro de Conexão', description: "Não foi possível carregar os dados do painel de admin." });
    } finally {
      if (isInitial) setIsInitiallyLoading(false);
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

  // All handler functions are restored here
  const handleUpdatePopupBanner = async () => {
    if (!popupBanner || !currentUser) return;
    setIsUpdatingPopupBanner(true);
    try {
        const res = await fetch('/api/admin/ads/banner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': currentUser.id },
            body: JSON.stringify(popupBanner),
        });
        if (!res.ok) throw new Error((await res.json()).message);
        toast({ title: 'Sucesso!', description: 'Banner de propaganda atualizado.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Falha ao salvar banner.' });
    } finally {
        setIsUpdatingPopupBanner(false);
    }
  };

  const createApiHandler = (apiPath: string, stateSetter: React.Dispatch<React.SetStateAction<string | null>>, successMessage: (name: string) => string) => {
    return async (targetUser: User, body: object) => {
        if (!currentUser) return;
        stateSetter(targetUser.username);
        try {
            const response = await fetch(apiPath, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': currentUser.id },
                body: JSON.stringify(body),
            });
            if (!response.ok) throw new Error((await response.json()).message);
            await fetchAdminData(false); // Refetch all data to ensure consistency
            toast({ title: "Sucesso!", description: successMessage(targetUser.displayName) });
        } catch (error) {
            toast({ variant: "destructive", title: "Erro", description: error instanceof Error ? error.message : "Erro desconhecido." });
        } finally {
            stateSetter(null);
        }
    };
  };

  const handleToggleJudgeStatus = createApiHandler('/api/admin/set-judge-status', setIsUpdatingJudgeStatus, name => `Status de juiz para ${name} atualizado.`);
  const handleToggleProStatus = createApiHandler('/api/admin/set-pro-status', setIsUpdatingProStatus, name => `Status PRO para ${name} atualizado.`);
  const handleToggleCoAdminStatus = createApiHandler('/api/admin/set-coadmin-status', setIsUpdatingCoAdminStatus, name => `Status de co-admin para ${name} atualizado.`);
  const handleBanUserAction = createApiHandler('/api/admin/ban-user', setIsBanningUser, name => `${name} foi banido com sucesso.`);


  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user => user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || user.username.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [users, searchTerm]);

  if (isInitiallyLoading || authLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-12 w-12 animate-spin" /></div>;
  if (!currentUser || (currentUser.username !== ADMIN_USERNAME && !currentUser.isCoAdmin)) return <div className="p-8"><Card className="p-8 text-center"><ShieldAlert className="h-16 w-16 mx-auto text-destructive" /><CardTitle>Acesso Negado</CardTitle></Card></div>;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 w-full">
        {/* Title and Notifications */}
        <h1 className="text-3xl font-headline">Painel de Administração</h1>
        {/* ... other top level cards for server status, version, maintenance ... */}

        {/* --- Popup Banner Card --- */}
        <Card>
            <CardHeader>
                <CardTitle className="text-xl font-headline flex items-center gap-2"><Megaphone className="text-primary" />Banner de Propaganda Pop-up</CardTitle>
                <CardDescription>Configure o banner que aparece para os usuários (exceto PRO).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {popupBanner ? (
                    <>
                        <div className="flex items-center space-x-2">
                            <Switch id="banner-status" checked={popupBanner.enabled} onCheckedChange={(checked) => setPopupBanner(p => p ? { ...p, enabled: checked } : null)} />
                            <Label htmlFor="banner-status">Ativar Banner</Label>
                        </div>
                        <div>
                            <Label htmlFor="banner-image-url">URL da Imagem do Banner</Label>
                            <Input id="banner-image-url" value={popupBanner.imageUrl} onChange={(e) => setPopupBanner(p => p ? { ...p, imageUrl: e.target.value } : null)} placeholder="https://exemplo.com/imagem.png" />
                        </div>
                        <div>
                            <Label htmlFor="banner-target-url">URL de Destino (clique)</Label>
                            <Input id="banner-target-url" value={popupBanner.targetUrl} onChange={(e) => setPopupBanner(p => p ? { ...p, targetUrl: e.target.value } : null)} placeholder="https://destino.com" />
                        </div>
                        <Button onClick={handleUpdatePopupBanner} disabled={isUpdatingPopupBanner}>
                            {isUpdatingPopupBanner && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar Banner
                        </Button>
                    </>
                ) : <Loader2 className="h-6 w-6 animate-spin" />}
            </CardContent>
        </Card>

        {/* --- User Management Table --- */}
        <Card className="shadow-xl">
            <CardHeader>
                <CardTitle className="text-xl font-headline">Gerenciamento de Usuários ({users.length})</CardTitle>
                <div className="relative pt-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input id="searchUser" placeholder="Buscar por nome ou usuário..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full sm:w-1/2" /></div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead>Usuário</TableHead><TableHead className="text-center">Score</TableHead>
                            <TableHead className="text-center">País</TableHead><TableHead className="text-center">Co-Admin</TableHead>
                            <TableHead className="text-center">PRO</TableHead><TableHead className="text-center">Juiz</TableHead>
                            <TableHead className="text-center">Ações</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {filteredUsers.length > 0 ? filteredUsers.map((userToList) => (
                                <TableRow key={userToList.id} className={userToList.isBanned ? 'bg-destructive/10' : ''}>
                                    <TableCell>
                                        <div className="flex items-center space-x-3">
                                            <Avatar className="h-10 w-10 border"><AvatarImage src={userToList.profilePictureUrl || ''} /><AvatarFallback>{getInitials(userToList.displayName)}</AvatarFallback></Avatar>
                                            <div><p className={`font-medium ${userToList.isBanned ? 'line-through' : ''}`}>{userToList.displayName}</p><p className="text-xs text-muted-foreground">@{userToList.username}</p></div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">{userToList.score}</TableCell>
                                    <TableCell className="text-center">{userToList.country}</TableCell>
                                    <TableCell className="text-center"><Switch checked={!!userToList.isCoAdmin} onCheckedChange={() => handleToggleCoAdminStatus(userToList, { username: userToList.username, isCoAdmin: !userToList.isCoAdmin })} disabled={isUpdatingCoAdminStatus === userToList.username || userToList.username === ADMIN_USERNAME} /></TableCell>
                                    <TableCell className="text-center"><Switch checked={!!userToList.isPro} onCheckedChange={() => handleToggleProStatus(userToList, { username: userToList.username, isPro: !userToList.isPro })} disabled={isUpdatingProStatus === userToList.username} /></TableCell>
                                    <TableCell className="text-center"><Switch checked={!!userToList.isJudge} onCheckedChange={() => handleToggleJudgeStatus(userToList, { username: userToList.username, isJudge: !userToList.isJudge })} disabled={isUpdatingJudgeStatus === userToList.username} /></TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="destructive" size="sm" onClick={() => setUserToBan(userToList)} disabled={isBanningUser === userToList.username || userToList.isBanned || userToList.username === ADMIN_USERNAME || userToList.isCoAdmin}><Ban className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={7} className="h-24 text-center">Nenhum usuário encontrado.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

        {/* Ban User Dialog */}
        <AlertDialog open={!!userToBan} onOpenChange={(open) => !open && setUserToBan(null)}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Isto banirá permanentemente o usuário <span className="font-bold">{userToBan?.displayName}</span>.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setUserToBan(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => { if (userToBan) handleBanUserAction(userToBan, { username: userToBan.username }); setUserToBan(null); }}>Sim, banir</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
