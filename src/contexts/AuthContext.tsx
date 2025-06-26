
'use client';

import type { User } from '@/lib/types';
import React, { createContext, useState, useEffect, type ReactNode, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => void;
  register: (username: string, pass: string, displayName: string, country: string) => Promise<void>;
  updateProfilePicture: (dataUrl: string) => Promise<void>;
  updateDecklistImage: (dataUrl: string) => Promise<void>;
  addFriend: (friendUsername: string) => Promise<void>;
  removeFriend: (username: string) => Promise<void>;
  fetchUserByUsername: (username: string) => Promise<User | null>;
  updateUserVerificationStatus: (isVerified: boolean) => Promise<void>;
  updateUser: (updatedData: Partial<User>) => void; // A única forma de atualizar o usuário
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutos

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearSession = useCallback(() => {
    if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
    }
    setUser(null);
    localStorage.removeItem('duelverse-user');
  }, []);

  const logout = useCallback(() => {
    console.log("[AuthContext - logout] Usuário deslogando.");
    clearSession();
    router.push('/login');
  }, [router, clearSession]);

  const sendHeartbeat = useCallback(async (userId: string) => {
    if (!userId) return;
    try {
      const response = await fetch('/api/users/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        if (data.errorCode === 'USER_BANNED') {
          console.log("[AuthContext] Heartbeat retornou 403 (Banido). Limpando sessão e redirecionando para /banned.");
          clearSession();
          router.push('/banned');
          return;
        }
      }
      
      if (!response.ok) {
        console.warn(`[AuthContext] Heartbeat falhou com status: ${response.status}`);
      }
    } catch (error) {
      console.warn('[AuthContext] Falha ao enviar heartbeat:', error);
    }
  }, [router, clearSession]);


  useEffect(() => {
    console.log("[AuthContext] Verificando usuário armazenado no localStorage.");
    const storedUser = localStorage.getItem('duelverse-user');
    if (storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        console.log("[AuthContext] Usuário encontrado no localStorage:", parsedUser.username);
        setUser({
          ...parsedUser,
          friendUsernames: parsedUser.friendUsernames || [],
          profilePictureUrl: parsedUser.profilePictureUrl || '',
          decklistImageUrl: parsedUser.decklistImageUrl || '',
          lastActiveAt: parsedUser.lastActiveAt || Date.now(),
          isVerified: parsedUser.isVerified || false,
          isJudge: parsedUser.isJudge || false,
          isPro: parsedUser.isPro || false,
        });
      } catch (e) {
        console.error("[AuthContext] Falha ao analisar usuário do localStorage:", e);
        localStorage.removeItem('duelverse-user');
      }
    } else {
      console.log("[AuthContext] Nenhum usuário encontrado no localStorage.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user?.id) {
      console.log(`[AuthContext] Usuário ${user.username} (ID: ${user.id}) definido. Iniciando/Reiniciando heartbeat.`);
      sendHeartbeat(user.id); 
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      heartbeatIntervalRef.current = setInterval(() => {
        if (document.visibilityState === 'visible' && user?.id) { // Verifica user.id novamente
            sendHeartbeat(user.id);
        }
      }, HEARTBEAT_INTERVAL);
    } else {
      if (heartbeatIntervalRef.current) {
        console.log("[AuthContext] Usuário nulo. Parando heartbeat.");
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    }
    return () => {
      if (heartbeatIntervalRef.current) {
        console.log("[AuthContext] Limpando intervalo de heartbeat no unmount.");
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [user, sendHeartbeat]);


  const updateUser = useCallback((updatedFields: Partial<User>) => {
    setUser(prevUser => {
        if (!prevUser) {
            console.warn("[AuthContext - updateUser] Tentativa de atualizar usuário local, mas prevUser é nulo.");
            return null;
        }
        const updatedUser: User = { ...prevUser, ...updatedFields };
        console.log("[AuthContext - updateUser] Atualizando localStorage para:", updatedUser.username, "com campos:", updatedFields);
        localStorage.setItem('duelverse-user', JSON.stringify(updatedUser));
        return updatedUser;
    });
  }, []);

  const processSuccessfulLoginOrRegister = async (serverUser: User) => {
    console.log("[AuthContext - processSuccessfulLoginOrRegister] Processando usuário do servidor:", serverUser.username);
    const fullUser: User = {
      ...serverUser,
      email: serverUser.email || '',
      profilePictureUrl: serverUser.profilePictureUrl || '',
      decklistImageUrl: serverUser.decklistImageUrl || '',
      friendUsernames: serverUser.friendUsernames || [],
      lastActiveAt: serverUser.lastActiveAt || Date.now(),
      isVerified: serverUser.isVerified || false,
      isJudge: serverUser.isJudge || false,
      isPro: serverUser.isPro || false,
    };

    setUser(fullUser);
    localStorage.setItem('duelverse-user', JSON.stringify(fullUser));
    console.log(`[AuthContext] Usuário ${fullUser.username} definido no estado e localStorage. Redirecionando para /dashboard.`);
    
    router.push('/dashboard');
  };


  const login = async (username: string, pass: string): Promise<void> => {
    console.log(`[AuthContext - login] Tentando login para: ${username}`);
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pass }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 403 && data.errorCode === 'USER_BANNED') {
          console.log(`[AuthContext - login] Tentativa de login de usuário banido: ${username}. Redirecionando para /banned.`);
          router.push('/banned');
          return;
        }
        console.error(`[AuthContext - login] Falha no login para ${username}: ${data.message}`);
        throw new Error(data.message || 'Falha no login.');
      }
      await processSuccessfulLoginOrRegister(data as User);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro no Login",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
      });
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, pass: string, displayName: string, country: string): Promise<void> => {
    console.log(`[AuthContext - register] Tentando registrar: ${username}`);
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pass, displayName, country }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error(`[AuthContext - register] Falha no registro para ${username}: ${data.message}`);
        throw new Error(data.message || 'Falha no registro.');
      }
      await processSuccessfulLoginOrRegister(data as User);
    } finally {
      setLoading(false);
    }
  };

  const updateProfilePicture = async (dataUrl: string): Promise<void> => {
    if (!user) throw new Error("Usuário não logado.");
    console.log(`[AuthContext - updateProfilePicture] Atualizando foto de perfil para ${user.username}`);
    const oldPicUrl = user.profilePictureUrl;
    updateUser({ profilePictureUrl: dataUrl });

    try {
      const response = await fetch('/api/users/update-profile-picture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, profilePictureUrl: dataUrl }),
      });
      const responseData = await response.json();
      if (!response.ok) {
        updateUser({ profilePictureUrl: oldPicUrl }); 
        throw new Error(responseData.message || 'Falha ao atualizar foto de perfil no servidor.');
      }
      updateUser(responseData as User); // Sincroniza com o servidor
    } catch (error) {
        updateUser({ profilePictureUrl: oldPicUrl }); 
        throw error;
    }
  };

  const updateDecklistImage = async (dataUrl: string): Promise<void> => {
    if (!user) throw new Error("Usuário não logado.");
    console.log(`[AuthContext - updateDecklistImage] Atualizando imagem de decklist para ${user.username}`);
    const oldDeckUrl = user.decklistImageUrl;
    updateUser({ decklistImageUrl: dataUrl });

    try {
      const response = await fetch('/api/users/update-decklist-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, decklistImageUrl: dataUrl }),
      });
      const responseData = await response.json();
      if (!response.ok) {
        updateUser({ decklistImageUrl: oldDeckUrl });
        throw new Error(responseData.message || 'Falha ao atualizar imagem da decklist no servidor.');
      }
      updateUser(responseData as User);
    } catch (error) {
        updateUser({ decklistImageUrl: oldDeckUrl });
        throw error;
    }
  };

  const addFriend = async (friendUsername: string): Promise<void> => {
    if (!user) throw new Error("Usuário não logado.");
    const trimmedFriendUsername = friendUsername.trim();
    console.log(`[AuthContext - addFriend] ${user.username} tentando adicionar amigo: ${trimmedFriendUsername}`);
    if (trimmedFriendUsername.toLowerCase() === user.username.toLowerCase()) throw new Error("Você não pode adicionar a si mesmo.");

    try {
      const friendExists = await fetchUserByUsername(trimmedFriendUsername);
      if (!friendExists) {
        throw new Error(`Usuário "${trimmedFriendUsername}" não encontrado.`);
      }

      const currentFriends = user.friendUsernames || [];
      if (currentFriends.map(f => f.toLowerCase()).includes(friendExists.username.toLowerCase())) {
        throw new Error(`${friendExists.displayName} já está na sua lista de amigos.`);
      }
      updateUser({ friendUsernames: [...currentFriends, friendExists.username] }); // Usa o username do amigo como retornado pela API (com capitalização correta)
    } catch (error) {
       if (error instanceof Error) {
            throw error;
        } else {
            throw new Error("Ocorreu um erro desconhecido ao adicionar amigo.");
        }
    }
  };

  const removeFriend = async (friendUsernameToRemove: string): Promise<void> => {
    if (!user) throw new Error("Usuário não logado.");
    console.log(`[AuthContext - removeFriend] ${user.username} tentando remover amigo: ${friendUsernameToRemove}`);
    const currentFriends = user.friendUsernames || [];
    updateUser({ friendUsernames: currentFriends.filter(uname => uname.toLowerCase() !== friendUsernameToRemove.toLowerCase()) });
  };

  const fetchUserByUsername = async (username: string): Promise<User | null> => {
    const trimmedUsername = username.trim();
    console.log(`[AuthContext - fetchUserByUsername] Buscando detalhes para: ${trimmedUsername}`);
    try {
      const response = await fetch(`/api/users/find/${encodeURIComponent(trimmedUsername)}`);
      if (response.status === 404) {
        console.log(`[AuthContext - fetchUserByUsername] Usuário ${trimmedUsername} não encontrado (404).`);
        return null;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Falha ao buscar usuário ${trimmedUsername}.`);
      }
      const userData: User = await response.json();
       return { 
        ...userData,
        friendUsernames: userData.friendUsernames || [],
        profilePictureUrl: userData.profilePictureUrl || '',
        decklistImageUrl: userData.decklistImageUrl || '',
        lastActiveAt: userData.lastActiveAt,
        isVerified: userData.isVerified || false,
        isJudge: userData.isJudge || false,
        isPro: userData.isPro || false,
        email: userData.email || '',
      };
    } catch (error) {
      console.error(`[AuthContext - fetchUserByUsername] Erro ao buscar ${trimmedUsername}:`, error);
      return null;
    }
  };

  const updateUserVerificationStatus = async (isVerified: boolean): Promise<void> => {
    if (!user) throw new Error("Usuário não logado.");
    console.log(`[AuthContext - updateUserVerificationStatus] Atualizando status de verificação para ${user.username} para: ${isVerified}`);
    const oldVerificationStatus = user.isVerified;
    updateUser({ isVerified });

    try {
      const response = await fetch('/api/users/update-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, isVerified }),
      });
      const responseData = await response.json();
      if (!response.ok) {
        updateUser({ isVerified: oldVerificationStatus });
        throw new Error(responseData.message || 'Falha ao atualizar status de verificação no servidor.');
      }
      updateUser(responseData as User);
    } catch (error) {
      updateUser({ isVerified: oldVerificationStatus });
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateProfilePicture, updateDecklistImage, addFriend, removeFriend, fetchUserByUsername, updateUserVerificationStatus, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
