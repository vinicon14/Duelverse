
'use client';

import React, { createContext, type ReactNode, useCallback } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import type { User } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

// O novo AuthContext será muito mais simples.
// Ele basicamente re-expõe a sessão do NextAuth e as funções de login/logout.
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (idToken: string) => Promise<void>;
  logout: () => void;
  // A função de registro agora só precisa chamar a API,
  // e o login cuidará do resto.
  register: (username: string, pass: string, displayName: string, country: string) => Promise<any>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// O AuthProvider agora é um wrapper em torno do SessionProvider do NextAuth.
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  
  // O estado de 'loading' vem diretamente do 'useSession'.
  const loading = status === 'loading';
  
  // O objeto 'user' é derivado da sessão do NextAuth.
  const user = session?.user as User | null;

  const login = useCallback(async (idToken: string) => {
    // Usamos a função 'signIn' do NextAuth com o provider 'credentials'.
    const result = await signIn('credentials', {
      idToken,
      redirect: false, // Evita o redirecionamento automático do NextAuth.
    });

    if (result?.error) {
        toast({
            variant: "destructive",
            title: "Erro no Login",
            description: "Credenciais inválidas ou erro no servidor.",
        });
        throw new Error(result.error);
    }
  }, [toast]);

  const logout = useCallback(async () => {
    // A função 'signOut' do NextAuth cuida de limpar a sessão.
    await signOut({ redirect: true, callbackUrl: '/login' });
  }, []);

  const register = useCallback(async (username: string, pass: string, displayName: string, country: string) => {
    // A função de registro permanece similar, mas não manipula mais o estado do usuário.
    // Ela apenas cria o usuário no backend. O login é um passo separado.
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
      return data;
  }, [toast]);

  return (
    // As funções e estados simplificados são passados para o provider.
    // As outras funções (updateProfile, addFriend) precisam ser movidas para
    // um contexto separado ou se tornarem hooks, pois não dependem mais do estado local.
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};
