
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
  Loader2, ShieldAlert, UserCog, Search, Server, ServerOff, 
  Ban, GitBranch, ArrowUp, ArrowDown, Trash2, Megaphone, Video, UploadCloud, Link as LinkIcon
} from 'lucide-react';
import type { User, Advertisement, AdvertisementConfig, PopupBannerAd } from '@/lib/types';
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
import Link from 'next/link';

const ADMIN_USERNAME = 'vinicon14';

const getInitials = (name: string = "") => {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'DU';
};

export default function AdminDashboardClient() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // States
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'loading'>('loading');
  const [version, setVersion] = useState<string | null>(null);
  const [adConfig, setAdConfig] = useState<AdvertisementConfig | null>(null);
  const [popupBanner, setPopupBanner] = useState<PopupBannerAd | null>(null);
  const [userToBan, setUserToBan] = useState<User | null>(null);
  
  // Loading/Updating states
  const [isInitiallyLoading, setIsInitiallyLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isDowngrading, setIsDowngrading] = useState(false);
  const [isDeletingUsers, setIsDeletingUsers] = useState(false);
  const [isUpdatingProStatus, setIsUpdatingProStatus] = useState<string | null>(null);
  const [isUpdatingJudgeStatus, setIsUpdatingJudgeStatus] = useState<string | null>(null);
  const [isUpdatingCoAdminStatus, setIsUpdatingCoAdminStatus] = useState<string | null>(null);
  const [isBanningUser, setIsBanningUser] = useState<string | null>(null);
  
  // File Upload States
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<File | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const fetchAdminData = useCallback(async (isInitial: boolean = false) => {
    if (!currentUser) return;
    if (isInitial) setIsInitiallyLoading(true);
    try {
      const headers = { 'Authorization': currentUser.id };
      const [usersRes, statusRes, adsRes, bannerRes, versionRes] = await Promise.all([
        fetch('/api/users/all', { headers }),
        fetch('/api/admin/server-status', { headers }),
        fetch('/api/admin/ads', { headers }),
        fetch('/api/admin/ads/banner', { headers }),
        fetch('/api/version/current', { headers }),
      ]);

      if (usersRes.ok) setUsers(await usersRes.json() || []);
      if (statusRes.ok) setServerStatus((await statusRes.json()).status || 'offline');
      if (adsRes.ok) setAdConfig(await adsRes.json());
      if (bannerRes.ok) setPopupBanner(await bannerRes.json());
      if (versionRes.ok) setVersion((await versionRes.json()).version || 'unknown');

    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro de Conexão', description: "Não foi possível carregar os dados." });
    } finally {
      if (isInitial) setIsInitiallyLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (currentUser && (currentUser.username === ADMIN_USERNAME || currentUser.isCoAdmin)) {
      fetchAdminData(true);
    }
  }, [currentUser, fetchAdminData]);

  // --- API Handlers ---

  const handleFileUpload = async (
    file: File,
    formDataName: string,
    endpoint: string,
    otherFormData: Record<string, string> = {}
  ) => {
    if (!currentUser) return;
    const formData = new FormData();
    formData.append(formDataName, file);
    for (const key in otherFormData) {
        formData.append(key, otherFormData[key]);
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': currentUser.id },
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha no upload');
        }
        toast({ title: "Sucesso!", description: "Arquivo enviado com sucesso." });
        await fetchAdminData(); // Refresh all data
    } catch (error) {
        toast({ variant: "destructive", title: "Erro no Upload", description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido." });
    }
  };

  const handleVideoUpload = async () => {
    if (!selectedVideo) {
        toast({ variant: "destructive", title: "Nenhum arquivo", description: "Por favor, selecione um vídeo para enviar." });
        return;
    }
    setIsUploadingVideo(true);
    await handleFileUpload(selectedVideo, 'video', '/api/admin/ads/upload-video');
    setSelectedVideo(null); // Clear selection
    setIsUploadingVideo(false);
  };

  const handleBannerUpload = async () => {
      if (!selectedBanner) {
        toast({ variant: "destructive", title: "Nenhum arquivo", description: "Por favor, selecione uma imagem para o banner." });
        return;
    }
    setIsUploadingBanner(true);
    await handleFileUpload(
        selectedBanner, 
        'banner', 
        '/api/admin/ads/upload-banner',
        { targetUrl: popupBanner?.targetUrl || '' } // Send targetUrl along
    );
    setSelectedBanner(null); // Clear selection
    setIsUploadingBanner(false);
  };
  
  const handleToggleAdSystem = async (checked: boolean) => {
      if (!adConfig || !currentUser) return;
      const newConfig = { ...adConfig, enabled: checked };
      try {
        const res = await fetch('/api/admin/ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': currentUser.id },
            body: JSON.stringify(newConfig),
        });
        if (!res.ok) throw new Error('Falha ao atualizar');
        setAdConfig(newConfig);
        toast({ title: 'Sucesso', description: `Sistema de anúncios ${checked ? 'ativado' : 'desativado'}.`});
      } catch (error) {
         toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível alterar o status dos anúncios.'});
      }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!adConfig || !currentUser) return;
    const newVideos = adConfig.videos.filter(v => v.id !== adId);
    const newConfig = { ...adConfig, videos: newVideos };
     try {
        const res = await fetch('/api/admin/ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': currentUser.id },
            body: JSON.stringify(newConfig),
        });
        if (!res.ok) throw new Error('Falha ao remover anúncio');
        setAdConfig(newConfig);
        toast({ title: 'Sucesso', description: "Anúncio removido."});
      } catch (error) {
         toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível remover o anúncio.'});
      }
  }


  const handleToggleServerStatus = async () => { /* ... keeps the same ... */ };
  const handleVersionChange = async (type: 'upgrade' | 'downgrade') => { /* ... keeps the same ... */ };
  const handleCleanBannedUsers = async () => { /* ... keeps the same ... */ };
  const createApiHandler = (apiPath: string, stateSetter: React.Dispatch<React.SetStateAction<string | null>>, successMessage: (name: string) => string) => {
    return async (targetUser: User, body: object) => { /* ... keeps the same ... */ };
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
    <div className="container mx-auto px-4 py-8 space-y-8 w-full">
        <h1 className="text-3xl font-headline">Painel de Administração</h1>

        {/* --- Top Row Cards --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Server />Status do Servidor</CardTitle></CardHeader>
                <CardContent><Switch checked={serverStatus === 'online'} onCheckedChange={handleToggleServerStatus} disabled={isUpdatingStatus} /><Label className="ml-2">{serverStatus.toUpperCase()}</Label></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><GitBranch/>Controle de Versão</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-center text-2xl font-bold">{version || '...'}</p>
                    <div className="flex gap-2"><Button onClick={() => handleVersionChange('upgrade')} disabled={isUpgrading || isDowngrading} className="w-full"><ArrowUp className="mr-2"/>Upgrade</Button><Button onClick={() => handleVersionChange('downgrade')} disabled={isUpgrading || isDowngrading} className="w-full"><ArrowDown className="mr-2"/>Downgrade</Button></div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Trash2/>Manutenção</CardTitle></CardHeader>
                <CardContent><Button variant="destructive" onClick={handleCleanBannedUsers} disabled={isDeletingUsers} className="w-full"><Trash2 className="mr-2"/>Limpar Usuários Banidos</Button></CardContent>
            </Card>
        </div>
        
        {/* --- Ad Management --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Video />Gerenciamento de Anúncios em Vídeo</CardTitle>
                    <CardDescription>Ative o sistema e faça upload de novos vídeos de 15s.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2"><Switch id="ad-system-status" checked={adConfig?.enabled || false} onCheckedChange={handleToggleAdSystem} /><Label htmlFor="ad-system-status">Sistema de Anúncios ATIVADO</Label></div>
                    <Separator />
                    <div>
                        <Label htmlFor="video-upload">Enviar novo anúncio (vídeo)</Label>
                        <div className="flex gap-2 mt-1">
                            <Input id="video-upload" type="file" accept="video/*" onChange={(e) => setSelectedVideo(e.target.files ? e.target.files[0] : null)} />
                            <Button onClick={handleVideoUpload} disabled={isUploadingVideo || !selectedVideo}>
                                {isUploadingVideo ? <Loader2 className="h-4 w-4 animate-spin"/> : <UploadCloud className="h-4 w-4"/>}
                            </Button>
                        </div>
                    </div>
                    <div>
                        <Label>Anúncios Enviados ({adConfig?.videos.length || 0})</Label>
                        <div className="mt-1 space-y-2 rounded-md border p-2 h-32 overflow-y-auto">
                            {adConfig?.videos.map(ad => (
                                <div key={ad.id} className="flex justify-between items-center text-sm">
                                    <Link href={ad.url} target="_blank" className="truncate hover:underline">{ad.originalName || ad.id}</Link>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteAd(ad.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Megaphone />Banner de Propaganda Pop-up</CardTitle>
                    <CardDescription>Faça o upload da imagem e defina a URL de destino.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <Label htmlFor="banner-upload">Enviar nova imagem do banner</Label>
                        <div className="flex gap-2 mt-1">
                            <Input id="banner-upload" type="file" accept="image/*" onChange={(e) => setSelectedBanner(e.target.files ? e.target.files[0] : null)} />
                        </div>
                    </div>
                     <div>
                        <Label htmlFor="banner-target-url" className="flex items-center gap-2"><LinkIcon className="h-4 w-4"/>URL de Destino (clique)</Label>
                        <Input id="banner-target-url" value={popupBanner?.targetUrl || ''} onChange={(e) => setPopupBanner(p => p ? { ...p, targetUrl: e.target.value } : null)} placeholder="https://destino.com" />
                    </div>
                    <Button onClick={handleBannerUpload} disabled={isUploadingBanner || !selectedBanner} className="w-full">
                        {isUploadingBanner ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <UploadCloud className="mr-2 h-4 w-4"/>} Salvar e Publicar Banner
                    </Button>
                </CardContent>
            </Card>
        </div>

        {/* --- User Management Table --- */}
        <Card>
            <CardHeader><CardTitle>Gerenciamento de Usuários ({users.length})</CardTitle>
                <div className="relative pt-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="Buscar por nome ou usuário..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/></div>
            </CardHeader>
            <CardContent>
                 <div className="overflow-x-auto rounded-lg border">
                    <Table>{/* ... Table content remains the same ... */}</Table>
                 </div>
            </CardContent>
        </Card>

        {/* --- Ban User Dialog --- */}
        <AlertDialog open={!!userToBan} onOpenChange={(open) => !open && setUserToBan(null)}>{/* ... Dialog content remains the same ... */}</AlertDialog>
    </div>
  );
}
