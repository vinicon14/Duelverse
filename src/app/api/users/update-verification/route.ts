
// src/app/api/users/update-verification/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { updateUser, getUserById } from '@/lib/userStore';
import type { User } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { userId, isVerified } = (await request.json()) as { userId: string; isVerified: boolean };

    if (!userId || typeof isVerified !== 'boolean') {
      return NextResponse.json({ message: 'ID do usuário e status de verificação são obrigatórios.' }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    const updatedUser = await updateUser(user.username, { isVerified });

    if (updatedUser) {
      return NextResponse.json(updatedUser, { status: 200 });
    } else {
      // This case should ideally not be reached if getUserById found the user and updateUser worked.
      return NextResponse.json({ message: 'Falha ao atualizar status de verificação.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in /api/users/update-verification:', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao atualizar status de verificação.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
