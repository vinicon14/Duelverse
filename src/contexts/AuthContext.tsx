
'use client';

import React, { createContext, type ReactNode, useCallback } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react'; // Importa signIn e signOut *apenas* de next-auth/react
import type { User } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (username: string, pass: string, displayName: string, country: string) => Promise<any>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  
  const loading = status === 'loading';
  const user = session?.user as User | null;

  const login = useCallback(async (username: string, password: string) => {
    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
        toast({
            variant: "destructive",
            title: "Erro no Login",
            description: result.error || "Credenciais inválidas ou erro no servidor.",
        });
        throw new Error(result.error);
    }
  }, [toast]);

  const logout = useCallback(async () => {
    await signOut({ redirect: true, redirectTo: '/login' });
  }, []);

  const register = useCallback(async (username: string, pass: string, displayName: string, country: string) => {
    const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pass, displayName, country }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast({
            variant: "destructive",
            title: "Erro no Registro",
            description: data.message || "Não foi possível completar o registro.",
        });
        throw new Error(data.message || 'Falha no registro.');
      }
      
      await login(username, pass);
      
      toast({
        title: "Registro bem-sucedido!",
        description: "Você foi registrado e logado com sucesso.",
      });

      return data;
  }, [toast, login]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};
