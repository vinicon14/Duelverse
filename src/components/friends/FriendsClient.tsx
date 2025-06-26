
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Users, Trash2, UserPlus, ShieldCheck, Crown, Image as ImageIcon, Swords } from 'lucide-react';
import Link from 'next/link';
import type { User, DuelInvitation } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

const getInitials = (name: string = "") => {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'DU';
};

const isUserOnline = (lastActiveAt: number | undefined): boolean => {
    if (!lastActiveAt) return false;
    // 5 minutes threshold
    const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
    const now = Date.now();
    return (now - lastActiveAt) < ONLINE_THRESHOLD_MS;
};

export default function FriendsClient() {
  const { user: currentUser, addFriend, removeFriend, fetchUserByUsername } = useAuth();
  const { toast } = useToast();

  const [friendUsernameInput, setFriendUsernameInput] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [isRemovingFriend, setIsRemovingFriend] = useState<string | null>(null);

  const [friendsDetails, setFriendsDetails] = useState<User[]>([]);
  const [isLoadingFriendsDetails, setIsLoadingFriendsDetails] = useState(true);

  // Invite state
  const [sentInvitations, setSentInvitations] = useState<Record<string, { status: 'pending' | 'accepted' | 'declined'; invitationId: string }>>({});
  const invitePollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchFriendsDetails = useCallback(async (isInitialLoad = false) => {
    if (!currentUser?.friendUsernames) {
      if (isInitialLoad) setIsLoadingFriendsDetails(false);
      return;
    }
    
    if (isInitialLoad) {
      setIsLoadingFriendsDetails(true);
    }

    try {
      if (currentUser.friendUsernames.length === 0) {
        setFriendsDetails([]);
        return;
      }
      const promises = currentUser.friendUsernames.map(username => fetchUserByUsername(username));
      const results = await Promise.all(promises);
      const validFriends = results.filter((friend): friend is User => friend !== null);
      const nonBannedFriends = validFriends.filter(friend => !friend.isBanned);
      setFriendsDetails(nonBannedFriends);
    } catch (error) {
      if(isInitialLoad) {
        toast({ variant: 'destructive', title: "Erro ao carregar amigos", description: "Não foi possível buscar os detalhes dos seus amigos." });
      } else {
        console.error("Failed to poll friends data:", error);
      }
    } finally {
      if (isInitialLoad) {
        setIsLoadingFriendsDetails(false);
      }
    }
  }, [currentUser?.friendUsernames, fetchUserByUsername, toast]);

  // Initial and periodic friend data fetch
  useEffect(() => {
    if (currentUser) {
      fetchFriendsDetails(true);
      const intervalId = setInterval(() => fetchFriendsDetails(false), 30000);
      return () => clearInterval(intervalId);
    }
  }, [currentUser, fetchFriendsDetails]);

  // Polling for sent invitation status
  useEffect(() => {
    const pollSentInvitations = async () => {
        const pendingInvites = Object.entries(sentInvitations).filter(([, val]) => val.status === 'pending');
        if (pendingInvites.length === 0) {
            if (invitePollingIntervalRef.current) clearInterval(invitePollingIntervalRef.current);
            invitePollingIntervalRef.current = null;
            return;
        }

        for (const [username, { invitationId }] of pendingInvites) {
            try {
                const res = await fetch(`/api/friends/invitations/status/${invitationId}`);
                if (res.ok) {
                    const data: DuelInvitation = await res.json();
                    if (data.status === 'accepted' && data.gameId && data.jitsiRoomName) {
                        const opponent = friendsDetails.find(f => f.username === username);
                        toast({ title: 'Convite Aceito!', description: `Seu duelo com ${opponent?.displayName || 'Amigo'} vai começar. Abrindo sala...` });
                        window.open(`https://meet.jit.si/${data.jitsiRoomName}`, "_blank", "noopener,noreferrer");
                        
                        // Clean up the invitation from the state so the button resets
                        setSentInvitations(prev => {
                            const newState = {...prev};
                            delete newState[username];
                            return newState;
                        });
                    } else if (data.status === 'declined' || data.status === 'expired') {
                        toast({ variant: 'destructive', title: 'Convite Recusado', description: `Seu convite para ${username} foi recusado ou expirou.`});
                        setSentInvitations(prev => {
                            const newState = {...prev};
                            delete newState[username];
                            return newState;
                        });
                    }
                } else if (res.status === 404) {
                     setSentInvitations(prev => {
                        const newState = {...prev};
                        delete newState[username];
                        return newState;
                    });
                }
            } catch (error) {
                console.error(`Error polling invitation ${invitationId}:`, error);
            }
        }
    };
    
    if (Object.values(sentInvitations).some(val => val.status === 'pending') && !invitePollingIntervalRef.current) {
        invitePollingIntervalRef.current = setInterval(pollSentInvitations, 5000);
    }

    return () => {
        if(invitePollingIntervalRef.current) clearInterval(invitePollingIntervalRef.current);
    }
  }, [sentInvitations, friendsDetails, toast]);


  const handleAddFriend = async () => {
    if (!friendUsernameInput.trim() || !currentUser) return;
    setIsAddingFriend(true);
    try {
      await addFriend(friendUsernameInput.trim());
      toast({ title: 'Sucesso!', description: `${friendUsernameInput.trim()} foi adicionado.` });
      setFriendUsernameInput('');
      await fetchFriendsDetails(false); // Refresh list without full loading screen
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Adicionar',
        description: error instanceof Error ? error.message : 'Não foi possível adicionar o amigo.',
      });
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleRemoveFriend = async (usernameToRemove: string) => {
    if (!currentUser) return;
    setIsRemovingFriend(usernameToRemove);
    try {
      await removeFriend(usernameToRemove);
      toast({ title: 'Sucesso!', description: `${usernameToRemove} foi removido.` });
      await fetchFriendsDetails(false); // Refresh list without full loading screen
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Remover',
        description: error instanceof Error ? error.message : 'Não foi possível remover o amigo.',
      });
    } finally {
      setIsRemovingFriend(null);
    }
  };

  const handleInviteFriend = async (friend: User) => {
    if (!currentUser) return;
    try {
        const res = await fetch('/api/friends/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromUserId: currentUser.id, toUsername: friend.username }),
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || 'Falha ao convidar amigo.');
        }
        setSentInvitations(prev => ({
            ...prev,
            [friend.username]: { status: 'pending', invitationId: data.id }
        }));
        toast({ title: 'Convite Enviado!', description: `Aguardando ${friend.displayName} aceitar...` });
    } catch(error) {
        toast({ variant: 'destructive', title: 'Erro ao Convidar', description: error instanceof Error ? error.message : 'Não foi possível enviar o convite.' });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 w-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
            <Users className="h-10 w-10 text-accent" />
            <div>
                <h1 className="text-3xl font-headline text-primary">Amigos</h1>
                <p className="text-lg text-muted-foreground">Gerencie seus amigos e convide-os para duelos.</p>
            </div>
        </div>
        <Button variant="outline" asChild>
            <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Link>
        </Button>
      </div>
            
      <Card className="shadow-xl mt-6">
          <CardHeader>
            <CardTitle>Adicionar e Gerenciar Amigos</CardTitle>
            <CardDescription>Adicione novos amigos e veja os detalhes dos atuais.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center space-x-2 mb-6 max-w-md">
                <Input
                    id="friendUsername"
                    type="text"
                    placeholder="Adicionar amigo por usuário..."
                    value={friendUsernameInput}
                    onChange={(e) => setFriendUsernameInput(e.target.value)}
                />
                <Button onClick={handleAddFriend} disabled={isAddingFriend || !friendUsernameInput.trim()}>
                    {isAddingFriend ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    Adicionar
                </Button>
            </div>

            {isLoadingFriendsDetails ? (
                <div className="text-center py-10">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <p className="mt-2 text-muted-foreground">Carregando lista de amigos...</p>
                </div>
            ) : friendsDetails.length > 0 ? (
                <ScrollArea className="h-[500px] -mx-6 px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {friendsDetails.map((friend) => {
                            const friendIsOnline = isUserOnline(friend.lastActiveAt);
                            const invitationStatus = sentInvitations[friend.username]?.status;
                            return (
                            <Card key={friend.id} className="flex flex-col overflow-hidden">
                                <CardHeader className="flex flex-row items-start justify-between gap-4 p-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12 border-2 relative">
                                            <AvatarImage src={friend.profilePictureUrl || undefined} data-ai-hint="avatar person" />
                                            <AvatarFallback>{getInitials(friend.displayName)}</AvatarFallback>
                                            {friendIsOnline && (
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card" title="Online" />
                                            )}
                                        </Avatar>
                                        <div>
                                            <p className="font-bold text-base">{friend.displayName}</p>
                                            <p className="text-xs text-muted-foreground">@{friend.username}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                        onClick={() => handleRemoveFriend(friend.username)}
                                        disabled={isRemovingFriend === friend.username}
                                        title={`Remover ${friend.username}`}
                                    >
                                        {isRemovingFriend === friend.username ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 space-y-3 flex-grow">
                                    <div className="flex flex-wrap gap-2">
                                        {friend.isVerified && (
                                            <Badge variant="outline" className="text-xs border-green-500 text-green-500">
                                                <ShieldCheck className="mr-1 h-3 w-3" /> Verificado
                                            </Badge>
                                        )}
                                        {friend.isJudge && (
                                            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                                                <Crown className="mr-1 h-3 w-3 fill-yellow-500" /> Juiz
                                            </Badge>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Decklist</h4>
                                        <div className="aspect-[4/3] bg-muted rounded-md flex items-center justify-center overflow-hidden">
                                            {friend.decklistImageUrl ? (
                                                <Image 
                                                    src={friend.decklistImageUrl} 
                                                    alt={`Decklist de ${friend.displayName}`} 
                                                    width={400} 
                                                    height={300} 
                                                    className="object-contain w-full h-full"
                                                    data-ai-hint="decklist yugioh"
                                                />
                                            ) : (
                                                <p className="text-xs text-muted-foreground">Nenhuma decklist enviada.</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-4 pt-0">
                                    <Button 
                                        className="w-full"
                                        variant="secondary" 
                                        disabled={!friendIsOnline || !!invitationStatus}
                                        onClick={() => handleInviteFriend(friend)}
                                    >
                                        {invitationStatus === 'pending' ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Aguardando...
                                            </>
                                        ) : (
                                            <>
                                                <Swords className="mr-2 h-4 w-4" />
                                                {friendIsOnline ? 'Convidar para Duelo' : 'Offline'}
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )})}
                    </div>
                </ScrollArea>
            ) : (
                <div className="text-center py-16 border border-dashed rounded-lg">
                    <p className="text-muted-foreground">Sua lista de amigos está vazia.</p>
                    <p className="text-sm text-muted-foreground">Use o campo acima para adicionar seu primeiro amigo!</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
