
// src/app/api/auth/login/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getUserByUsername, updateUser, getServerStatus } from '@/lib/userStore';
import type { User } from '@/lib/types';

const ADMIN_USERNAME = 'vinicon14';

export async function POST(request: NextRequest) {
  console.log("[API Login] === Nova Solicitação de Login ===");
  try {
    const { username, password } = await request.json();
    console.log(`[API Login] Dados recebidos do cliente: username=${username}, senha fornecida? ${password ? 'Sim' : 'Não'}`);

    if (!username || !password) {
      console.warn("[API Login] Usuário ou senha ausentes no corpo da solicitação.");
      return NextResponse.json({ message: 'Usuário e senha são obrigatórios.' }, { status: 400 });
    }
    
    const trimmedUsername = username.trim(); 
    console.log(`[API Login] Chamando getUserByUsername (do userStore) com username trimado: "${trimmedUsername}"`);
    const user = await getUserByUsername(trimmedUsername); 
    
    const serverStatus = await getServerStatus();
    const isMainAdmin = user?.username.toLowerCase() === ADMIN_USERNAME.toLowerCase();
    const isCoAdmin = user?.isCoAdmin === true;
    const canBypassMaintenance = isMainAdmin || isCoAdmin;

    if (serverStatus === 'offline' && !canBypassMaintenance) {
      console.log(`[API Login] Servidor offline. Acesso negado para usuário não-admin: ${username}`);
      return NextResponse.json({ message: 'O servidor está em manutenção e temporariamente indisponível.' }, { status: 503 });
    }

    if (user && user.isBanned) {
        console.log(`[API Login] Acesso negado para usuário banido: ${username}`);
        return NextResponse.json({ message: 'Você foi banido por não ser honesto.', errorCode: 'USER_BANNED' }, { status: 403 });
    }

    if (user) {
      console.log(`[API Login] Usuário ENCONTRADO no userStore: ${user.username}. (Senha não verificada neste protótipo)`);
      
      console.log(`[API Login] Atualizando lastActiveAt para o usuário: ${user.username}`);
      const updatedUser = await updateUser(user.username, { lastActiveAt: Date.now() });
      
      if (!updatedUser) {
        console.error(`[API Login] FALHA ao atualizar lastActiveAt para o usuário: ${user.username}. Retornando usuário original como fallback.`);
        return NextResponse.json(user, { status: 200 }); 
      }
      console.log(`[API Login] Login BEM-SUCEDIDO para: ${updatedUser.username}. lastActiveAt: ${updatedUser.lastActiveAt}. Enviando usuário atualizado para o cliente.`);
      return NextResponse.json(updatedUser, { status: 200 });
    } else {
      console.warn(`[API Login] Usuário "${trimmedUsername}" NÃO ENCONTRADO no userStore ou senha incorreta (senha não verificada).`);
      return NextResponse.json({ message: 'Usuário não encontrado ou senha incorreta.' }, { status: 401 });
    }
  } catch (error) {
    console.error('[API Login] Erro geral na rota de login (ex: parsing JSON):', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao tentar fazer login.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
