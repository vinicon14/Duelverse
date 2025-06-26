
// src/app/api/users/heartbeat/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { updateUser, getUserById } from '@/lib/userStore';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      // console.warn("[API Heartbeat] ID do usuário ausente na solicitação.");
      return NextResponse.json({ message: 'ID do usuário é obrigatório.' }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) {
      console.warn(`[API Heartbeat] Usuário com ID "${userId}" não encontrado no userStore para heartbeat.`);
      // É possível que o usuário tenha sido limpo do userStore em memória se o servidor reiniciou.
      // Não é necessariamente um erro crítico do lado do cliente neste cenário.
      return NextResponse.json({ message: 'Usuário não encontrado para heartbeat (pode ter sido deslogado ou servidor reiniciado).' }, { status: 200 });
    }

    // NEW: Check for banned status
    if (user.isBanned) {
      console.log(`[API Heartbeat] Acesso negado para usuário banido: ${user.username} (ID: ${userId})`);
      return NextResponse.json({ message: 'Você foi banido por não ser honesto.', errorCode: 'USER_BANNED' }, { status: 403 });
    }


    const updatedUser = await updateUser(user.username, { lastActiveAt: Date.now() });
    if (!updatedUser) {
        console.error(`[API Heartbeat] Falha ao atualizar lastActiveAt para ${user.username} (ID: ${userId}) no userStore.`);
         // Se updateUser falhar, ainda retornamos 200 para não quebrar o cliente, mas logamos o erro.
        return NextResponse.json({ message: 'Heartbeat recebido, mas falha ao atualizar o status no servidor.' }, { status: 200 });
    }
    // console.log(`[API Heartbeat] Heartbeat recebido e lastActiveAt atualizado para ${updatedUser.username} (ID: ${userId}) no userStore. Novo lastActiveAt: ${updatedUser.lastActiveAt}`);
    return NextResponse.json({ message: 'Heartbeat recebido.' }, { status: 200 });

  } catch (error) {
    console.error('[API Heartbeat] Erro geral:', error);
    const message = error instanceof Error ? error.message : 'Erro interno no heartbeat.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
