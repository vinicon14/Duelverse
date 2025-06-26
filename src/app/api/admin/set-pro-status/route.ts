
// src/app/api/admin/set-pro-status/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { updateUser, getUserByUsername } from '@/lib/userStore';
import type { User } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Em um aplicativo real, esta rota DEVE ser protegida e acessível apenas por administradores.
    const { username, isPro } = (await request.json()) as { username: string; isPro: boolean };

    if (!username || typeof isPro !== 'boolean') {
      return NextResponse.json({ message: 'Nome de usuário e status de PRO (isPro) são obrigatórios.' }, { status: 400 });
    }

    const existingUser = await getUserByUsername(username);
    if (!existingUser) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    const updatedUser = await updateUser(username, { isPro });

    if (updatedUser) {
      return NextResponse.json(updatedUser, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Falha ao atualizar status PRO.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in /api/admin/set-pro-status:', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao atualizar status PRO.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
