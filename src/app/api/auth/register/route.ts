
// src/app/api/auth/register/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { addUser, getServerStatus } from '@/lib/userStore';
import type { User } from '@/lib/types';

export async function POST(request: NextRequest) {
  const serverStatus = await getServerStatus();
  if (serverStatus === 'offline') {
    return NextResponse.json({ message: 'O servidor está em manutenção e temporariamente indisponível. O registro de novas contas está desativado.' }, { status: 503 });
  }

  console.log("[API Register] === Nova Solicitação de Registro ===");
  try {
    const requestBody = await request.json();
    console.log("[API Register] Corpo da solicitação recebido:", JSON.stringify(requestBody));

    const { username, password, displayName, country } = requestBody as Omit<User, 'id' | 'score' | 'friendUsernames' | 'profilePictureUrl' | 'decklistImageUrl' | 'lastActiveAt' | 'isVerified' | 'isJudge'> & { password?: string };
    console.log(`[API Register] Dados extraídos do corpo: username=${username}, displayName=${displayName}, country=${country}, senha fornecida? ${password ? 'Sim' : 'Não'}`);

    if (!username || !password || !displayName || !country) {
      console.warn("[API Register] Campos obrigatórios ausentes. Verifique se todos os campos (username, password, displayName, country) foram enviados.");
      return NextResponse.json({ message: 'Todos os campos são obrigatórios (username, password, displayName, country).' }, { status: 400 });
    }

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim(); 
    const trimmedDisplayName = displayName.trim();
    const trimmedCountry = country.trim();
    console.log(`[API Register] Dados trimados: username="${trimmedUsername}", displayName="${trimmedDisplayName}", country="${trimmedCountry}"`);

    if (trimmedPassword.length < 6) {
        console.warn("[API Register] Senha muito curta.");
        return NextResponse.json({ message: 'Senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
    }
    if (trimmedUsername.length < 3) {
        console.warn("[API Register] Nome de usuário muito curto.");
        return NextResponse.json({ message: 'Usuário deve ter pelo menos 3 caracteres.' }, { status: 400 });
    }
    if (trimmedDisplayName.length < 1) { 
        console.warn("[API Register] Nome de exibição vazio.");
        return NextResponse.json({ message: 'Nome de exibição não pode ser vazio.' }, { status: 400 });
    }
     if (trimmedCountry.length < 2) { 
        console.warn("[API Register] País muito curto.");
        return NextResponse.json({ message: 'País deve ter pelo menos 2 caracteres.' }, { status: 400 });
    }

    try {
      console.log(`[API Register] Chamando addUser no userStore com: username="${trimmedUsername}", displayName="${trimmedDisplayName}", country="${trimmedCountry}"`);
      
      const newUser = await addUser({ username: trimmedUsername, displayName: trimmedDisplayName, country: trimmedCountry });
      console.log(`[API Register] addUser (do userStore) retornou: ${JSON.stringify(newUser)}`);
      
      // The logic to notify the admin is now inside the addUser function itself.

      console.log(`[API Register] Usuário registrado com sucesso no userStore: ${newUser.username}. Redirecionando para cliente.`);
      return NextResponse.json(newUser, { status: 201 });
    } catch (error) {
      if (error instanceof Error) {
        console.error(`[API Register] Erro ao chamar addUser (do userStore): ${error.message}`, error);
        if (error.message.includes('Nome de usuário já existe')) {
          console.warn(`[API Register] Tentativa de registrar nome de usuário existente: "${trimmedUsername}"`);
          return NextResponse.json({ message: error.message }, { status: 409 }); 
        }
        return NextResponse.json({ message: `Erro ao tentar registrar usuário: ${error.message}` }, { status: 500 });
      } else {
        console.error('[API Register] Erro desconhecido ao chamar addUser (do userStore):', error);
        return NextResponse.json({ message: 'Erro desconhecido ao tentar registrar usuário no userStore.' }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('[API Register] Erro geral na rota de registro (ex: parsing JSON):', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao registrar usuário.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
