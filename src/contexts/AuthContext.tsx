
'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  register: (username: string, password: string, displayName: string, country: string) => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => Promise<void>;
  refetchUser: () => Promise<void>;
  updateProfilePicture: (dataUrl: string) => Promise<void>;
  updateDecklistImage: (dataUrl: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeUser = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const sessionUser = await response.json();
          setUser(sessionUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initializeUser();
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      console.log('Attempting login for:', username);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      console.log('Login API response status:', response.status);
      if (response.ok) {
        const loggedInUser = await response.json();
        setUser(loggedInUser);
        setLoading(false);
        console.log('Login successful. Redirecting to /dashboard');
        router.push('/dashboard');
        return { success: true };
      } else {
        const errorData = await response.json();
        console.error('Login failed with status:', response.status, 'Error:', errorData.message);
        setLoading(false);
        return { success: false, message: errorData.message || 'Usuário ou senha inválidos.' };
      }
    } catch (error) {
      console.error('Login failed:', error);
      setLoading(false);
      return { success: false, message: 'Erro de conexão. Tente novamente mais tarde.' };
    }
  };

  const register = async (username: string, password: string, displayName: string, country: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName, country }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Falha no registro.');
      }
      
      router.push('/login');
    } catch (error) {
        throw error;
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  const updateUser = useCallback(async (updatedUserData: Partial<User>) => {
    if (!user) return;
    try {
      const response = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUserData),
      });

      if(response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
      } else {
        console.error("Failed to update user from server");
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  }, [user]);

  const updateProfilePicture = useCallback(async (dataUrl: string) => {
    if (!user) throw new Error("Usuário não autenticado");
    const response = await fetch('/api/users/update-profile-picture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Falha ao atualizar a foto de perfil");
    }
    const updatedUser = await response.json();
    setUser(updatedUser);
  }, [user]);

  const updateDecklistImage = useCallback(async (dataUrl: string) => {
    if (!user) throw new Error("Usuário não autenticado");
    const response = await fetch('/api/users/update-decklist-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Falha ao atualizar a imagem da decklist");
    }
    const updatedUser = await response.json();
    setUser(updatedUser);
  }, [user]);

  const refetchUser = useCallback(async () => {
    if (!user) return;
    try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
            const sessionUser = await response.json();
            setUser(sessionUser);
        }
    } catch (error) {
        console.error('Failed to refetch user:', error);
    }
  }, [user]);


  const value = { user, loading, login, logout, register, updateUser, refetchUser, updateProfilePicture, updateDecklistImage };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
