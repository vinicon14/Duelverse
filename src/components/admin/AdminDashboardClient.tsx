
'use client';

import { useEffect, useState, useCallback, useMemo, type ChangeEvent } from 'react';
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
  Ban, GitBranch, ArrowUp, ArrowDown, Trash2, Megaphone, Video, UploadCloud, Link as LinkIcon, Save, Image as ImageIcon, MapPin
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
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const getInitials = (name: string = "") => {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'DU';
};

const AdminDashboardSkeleton = () => (
    <div className="container mx-auto px-4 py-8 space-y-8 w-full animate-pulse">
        <Skeleton className="h-9 w-1/2" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent></Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-8"/><Skeleton className="h-20" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-8"/><Skeleton className="h-8" /><Skeleton className="h-10" /></CardContent></Card>
        </div>
        <Card>
            <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
            <CardContent><Skeleton className="h-48 w-full" /></CardContent>
        </Card>
    </div>
);

export default function AdminDashboardClient() {
    const { user: currentUser, loading: authLoading } = useAuth();
    const { toast } = useToast();
    
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'loading'>('loading');
    const [version, setVersion] = useState<string | null>(null);
    const [adConfig, setAdConfig] = useState<AdvertisementConfig | null>(null);
    const [popupBanner, setPopupBanner] = useState<PopupBannerAd | null>(null);
    const [userToBan, setUserToBan] = useState<User | null>(null);
    
    const [isInitiallyLoading, setIsInitiallyLoading] = useState(true);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [isDowngrading, setIsDowngrading] = useState(false);
    const [isSavingVersion, setIsSavingVersion] = useState(false);
    const [isDeletingUsers, setIsDeletingUsers] = useState(false);
    const [isUpdatingProStatus, setIsUpdatingProStatus] = useState<string | null>(null);
    const [isUpdatingJudgeStatus, setIsUpdatingJudgeStatus] = useState<string | null>(null);
    const [isUpdatingCoAdminStatus, setIsUpdatingCoAdminStatus] = useState<string | null>(null);
    const [isBanningUser, setIsBanningUser] = useState<string | null>(null);
    
    const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [selectedBanner, setSelectedBanner] = useState<File | null>(null);
    const [isUploadingBanner, setIsUploadingBanner] = useState(false);

    const [leftImage, setLeftImage] = useState<File | null>(null);
    const [rightImage, setRightImage] = useState<File | null>(null);
    const [isUploadingLeftImage, setIsUploadingLeftImage] = useState(false);
    const [isUploadingRightImage, setIsUploadingRightImage] = useState(false);

    const hasAdminAccess = useMemo(() => {
        return currentUser?.isAdmin || currentUser?.isCoAdmin;
    }, [currentUser]);

    const fetchAdminData = useCallback(async (isInitial: boolean = false) => {
        if (isInitial) setIsInitiallyLoading(true);
        if (!currentUser) return;
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
            toast({ variant: 'destructive', title: 'Erro de Conexão', description: "Não foi possível carregar os dados do painel." });
        } finally {
            if (isInitial) setIsInitiallyLoading(false);
        }
    }, [currentUser, toast]);

    useEffect(() => {
        if (hasAdminAccess) {
            fetchAdminData(true);
        }
    }, [hasAdminAccess, fetchAdminData]);

    const handleFileUpload = async (file: File, formDataName: string, endpoint: string, otherFormData: Record<string, string> = {}) => {
        if (!currentUser) return;
        const formData = new FormData();
        formData.append(formDataName, file);
        Object.keys(otherFormData).forEach(key => formData.append(key, otherFormData[key]));

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Authorization': currentUser.id },
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Falha no upload');
            toast({ title: "Sucesso!", description: data.message });
            await fetchAdminData();
        } catch (error) {
            toast({ variant: "destructive", title: "Erro no Upload", description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido." });
        }
    };

    const handleVideoUpload = async () => {
        if (!selectedVideo) return;
        setIsUploadingVideo(true);
        await handleFileUpload(selectedVideo, 'video', '/api/admin/ads/upload-video');
        setSelectedVideo(null);
        setIsUploadingVideo(false);
    };

    const handleBannerUpload = async () => {
        if (!selectedBanner) return;
        setIsUploadingBanner(true);
        await handleFileUpload(selectedBanner, 'banner', '/api/admin/ads/upload-banner', { targetUrl: popupBanner?.targetUrl || '' });
        setSelectedBanner(null);
        setIsUploadingBanner(false);
    };

    const handleDuelImageUpload = async (imageType: 'left' | 'right') => {
        const file = imageType === 'left' ? leftImage : rightImage;
        if (!file) return;

        const stateSetter = imageType === 'left' ? setIsUploadingLeftImage : setIsUploadingRightImage;
        stateSetter(true);
        
        await handleFileUpload(file, 'image', `/api/admin/duel-setup-image?type=${imageType}`);
        
        if (imageType === 'left') setLeftImage(null);
        else setRightImage(null);
        
        stateSetter(false);
    };
    
    const handleToggleAdSystem = async (checked: boolean) => {
        if (!adConfig || !currentUser) return;
        const newConfig = { ...adConfig, enabled: checked };
        try {
            const res = await fetch('/api/admin/ads', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': currentUser.id }, body: JSON.stringify(newConfig) });
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
            const res = await fetch('/api/admin/ads', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': currentUser.id }, body: JSON.stringify(newConfig) });
            if (!res.ok) throw new Error('Falha ao remover anúncio');
            setAdConfig(newConfig);
            toast({ title: 'Sucesso', description: "Anúncio removido."});
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível remover o anúncio.'});
        }
    };

    const createApiRequest = async (endpoint: string, method: string, body: object | null = null) => {
        if(!currentUser) return;
        try {
            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': currentUser.id },
                body: body ? JSON.stringify(body) : null,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            toast({ title: 'Sucesso!', description: data.message });
            await fetchAdminData();
            return data;
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : "Ocorreu uma falha." });
        }
    };

    const handleToggleServerStatus = async () => {
        setIsUpdatingStatus(true);
        await createApiRequest('/api/admin/server-status', 'POST', { status: serverStatus === 'online' ? 'offline' : 'online' });
        setIsUpdatingStatus(false);
    };

    const handleVersionChange = async (type: 'upgrade' | 'downgrade' | 'save') => {
        const stateSetter = type === 'upgrade' ? setIsUpgrading : type === 'downgrade' ? setIsDowngrading : setIsSavingVersion;
        stateSetter(true);
        await createApiRequest(`/api/version/${type}`, 'POST');
        stateSetter(false);
    };

    const handleCleanBannedUsers = async () => {
        setIsDeletingUsers(true);
        await createApiRequest('/api/admin/maintenance/delete-users', 'POST');
        setIsDeletingUsers(false);
    };
    
    const createApiHandler = (apiPath: string, stateSetter: React.Dispatch<React.SetStateAction<string | null>>, successMessage: (name: string) => string) => {
        return async (targetUser: User, body: object) => {
            stateSetter(targetUser.username);
            await createApiRequest(apiPath, 'POST', body);
            stateSetter(null);
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

    if (isInitiallyLoading || authLoading) return <AdminDashboardSkeleton />;
    if (!hasAdminAccess) return <div className="p-8"><Card className="p-8 text-center"><ShieldAlert className="h-16 w-16 mx-auto text-destructive" /><CardTitle>Acesso Negado</CardTitle></Card></div>;

    return (
        <div className="container mx-auto px-4 py-8 space-y-8 w-full">
            <h1 className="text-3xl font-headline">Painel de Administração</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Server />Status do Servidor</CardTitle></CardHeader>
                    <CardContent><div className="flex items-center space-x-2"><Switch id="server-status" checked={serverStatus === 'online'} onCheckedChange={handleToggleServerStatus} disabled={isUpdatingStatus}/><Label htmlFor="server-status">{isUpdatingStatus ? "Atualizando..." : `Servidor ${serverStatus.toUpperCase()}`}</Label></div></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><GitBranch/>Controle de Versão</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-center text-2xl font-bold">{version || '...'}</p>
                        <Button onClick={() => handleVersionChange('save')} disabled={isSavingVersion} className="w-full">
                            {isSavingVersion ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>} Salvar Versão
                        </Button>
                        <div className="flex gap-2">
                            <Button onClick={() => handleVersionChange('upgrade')} disabled={isUpgrading || isDowngrading || isSavingVersion} className="w-full"><ArrowUp className="mr-2"/>Upgrade</Button>
                            <Button onClick={() => handleVersionChange('downgrade')} disabled={isUpgrading || isDowngrading || isSavingVersion} className="w-full"><ArrowDown className="mr-2"/>Downgrade</Button>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Trash2/>Manutenção</CardTitle></CardHeader>
                    <CardContent><Button variant="destructive" onClick={handleCleanBannedUsers} disabled={isDeletingUsers} className="w-full">{isDeletingUsers ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4"/>}Limpar Usuários Banidos</Button></CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Video />Gerenciamento de Anúncios</CardTitle><CardDescription>Ative o sistema e faça upload de novos vídeos de 15s.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2"><Switch id="ad-system-status" checked={adConfig?.enabled || false} onCheckedChange={handleToggleAdSystem} /><Label htmlFor="ad-system-status">Sistema de Anúncios ATIVADO</Label></div>
                        <Separator />
                        <div><Label htmlFor="video-upload">Enviar novo anúncio (vídeo)</Label><div className="flex gap-2 mt-1"><Input id="video-upload" type="file" accept="video/*" onChange={(e) => setSelectedVideo(e.target.files ? e.target.files[0] : null)} /><Button onClick={handleVideoUpload} disabled={isUploadingVideo || !selectedVideo}>{isUploadingVideo ? <Loader2 className="h-4 w-4 animate-spin"/> : <UploadCloud className="h-4 w-4"/>}</Button></div></div>
                        <div><Label>Anúncios Enviados ({adConfig?.videos.length || 0})</Label><div className="mt-1 space-y-2 rounded-md border p-2 h-32 overflow-y-auto">{adConfig?.videos.map(ad => (<div key={ad.id} className="flex justify-between items-center text-sm"><Link href={ad.url} target="_blank" className="truncate hover:underline">{ad.originalName || ad.id}</Link><Button variant="ghost" size="icon" onClick={() => handleDeleteAd(ad.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button></div>))}</div></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone />Banner Pop-up</CardTitle><CardDescription>Faça o upload da imagem e defina a URL de destino.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                        <div><Label htmlFor="banner-upload">Enviar nova imagem</Label><div className="flex gap-2 mt-1"><Input id="banner-upload" type="file" accept="image/*" onChange={(e) => setSelectedBanner(e.target.files ? e.target.files[0] : null)} /></div></div>
                        <div><Label htmlFor="banner-target-url" className="flex items-center gap-2"><LinkIcon className="h-4 w-4"/>URL de Destino</Label><Input id="banner-target-url" value={popupBanner?.targetUrl || ''} onChange={(e) => setPopupBanner(p => p ? { ...p, targetUrl: e.target.value } : null)} placeholder="https://destino.com" /></div>
                        <Button onClick={handleBannerUpload} disabled={isUploadingBanner || !selectedBanner} className="w-full">{isUploadingBanner ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <UploadCloud className="mr-2 h-4 w-4"/>} Salvar e Publicar</Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ImageIcon />Imagens de Configuração do Duelo</CardTitle>
                    <CardDescription>Faça o upload das imagens de exemplo para a tela de configuração de câmera.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="left-image-upload">Layout de Campo (Esquerda)</Label>
                        <div className="flex gap-2">
                            <Input id="left-image-upload" type="file" accept="image/*" onChange={(e) => setLeftImage(e.target.files ? e.target.files[0] : null)} />
                            <Button onClick={() => handleDuelImageUpload('left')} disabled={isUploadingLeftImage || !leftImage}>
                                {isUploadingLeftImage ? <Loader2 className="h-4 w-4 animate-spin"/> : <UploadCloud className="h-4 w-4"/>}
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="right-image-upload">Playmat Oficial (Direita)</Label>
                        <div className="flex gap-2">
                            <Input id="right-image-upload" type="file" accept="image/*" onChange={(e) => setRightImage(e.target.files ? e.target.files[0] : null)} />
                            <Button onClick={() => handleDuelImageUpload('right')} disabled={isUploadingRightImage || !rightImage}>
                                {isUploadingRightImage ? <Loader2 className="h-4 w-4 animate-spin"/> : <UploadCloud className="h-4 w-4"/>}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Gerenciamento de Usuários ({users.length})</CardTitle>
                    <div className="relative pt-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="Buscar por nome ou usuário..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/></div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-lg border">
                        <Table>
                            <TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead className="text-center">Score</TableHead><TableHead className="text-center">País</TableHead><TableHead className="text-center">Co-Admin</TableHead><TableHead className="text-center">PRO</TableHead><TableHead className="text-center">Juiz</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredUsers.length > 0 ? filteredUsers.map((userToList) => (
                                    <TableRow key={userToList.id} className={userToList.isBanned ? 'bg-destructive/10' : ''}>
                                        <TableCell>
                                            <div className="flex items-center space-x-3">
                                                <Avatar className="h-10 w-10 border"><AvatarImage src={userToList.profilePictureUrl || ''} /><AvatarFallback>{getInitials(userToList.displayName)}</AvatarFallback></Avatar>
                                                <div>
                                                    <p className={`font-medium ${userToList.isBanned ? 'line-through' : ''}`}>{userToList.displayName}</p>
                                                    <p className="text-xs text-muted-foreground">@{userToList.username}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">{userToList.score}</TableCell>
                                        <TableCell className="text-center">{userToList.country}</TableCell>
                                        <TableCell className="text-center"><Switch checked={!!userToList.isCoAdmin} onCheckedChange={() => handleToggleCoAdminStatus(userToList, { username: userToList.username, isCoAdmin: !userToList.isCoAdmin })} disabled={isUpdatingCoAdminStatus === userToList.username || userToList.isAdmin} /></TableCell>
                                        <TableCell className="text-center"><Switch checked={!!userToList.isPro} onCheckedChange={() => handleToggleProStatus(userToList, { username: userToList.username, isPro: !userToList.isPro })} disabled={isUpdatingProStatus === userToList.username} /></TableCell>
                                        <TableCell className="text-center"><Switch checked={!!userToList.isJudge} onCheckedChange={() => handleToggleJudgeStatus(userToList, { username: userToList.username, isJudge: !userToList.isJudge })} disabled={isUpdatingJudgeStatus === userToList.username} /></TableCell>
                                        <TableCell className="text-center"><Button variant="destructive" size="sm" onClick={() => setUserToBan(userToList)} disabled={isBanningUser === userToList.username || userToList.isBanned || userToList.isAdmin || userToList.isCoAdmin}><Ban className="h-4 w-4" /></Button></TableCell>
                                    </TableRow>
                                )) : (<TableRow><TableCell colSpan={7} className="h-24 text-center">Nenhum usuário encontrado.</TableCell></TableRow>)}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={!!userToBan} onOpenChange={(open) => !open && setUserToBan(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Isto banirá permanentemente o usuário <span className="font-bold">{userToBan?.displayName}</span>.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setUserToBan(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => { if (userToBan) { handleBanUserAction(userToBan, { username: userToBan.username }); setUserToBan(null); } }}>Sim, banir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
