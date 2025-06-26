
// src/app/api/admin/set-judge-status/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { updateUser, getUserByUsername } from '@/lib/userStore';
import type { User } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Em um aplicativo real, esta rota DEVE ser protegida e acessível apenas por administradores.
    // Para este protótipo, não há autenticação de administrador.
    const { username, isJudge } = (await request.json()) as { username: string; isJudge: boolean };

    if (!username || typeof isJudge !== 'boolean') {
      return NextResponse.json({ message: 'Nome de usuário e status de juiz (isJudge) são obrigatórios.' }, { status: 400 });
    }

    const existingUser = await getUserByUsername(username);
    if (!existingUser) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    const updatedUser = await updateUser(username, { isJudge });

    if (updatedUser) {
      return NextResponse.json(updatedUser, { status: 200 });
    } else {
      // Este caso não deve ser alcançado se getUserByUsername encontrou o usuário
      return NextResponse.json({ message: 'Falha ao atualizar status de juiz.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in /api/admin/set-judge-status:', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao atualizar status de juiz.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
