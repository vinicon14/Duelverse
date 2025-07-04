
// src/app/api/admin/set-pro-status/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import { updateUser, getUserById, getUserByUsername } from '@/lib/userStore';
import type { User } from '@/lib/types';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.json({ message: 'Erro de configuração do servidor' }, { status: 500 });
  }

  try {
    const decoded = verify(token, secret) as { userId: string };
    const adminUser = await getUserById(decoded.userId);

    if (!adminUser || (!adminUser.isAdmin && !adminUser.isCoAdmin)) {
      return NextResponse.json({ message: 'Acesso negado. Apenas administradores podem executar esta ação.' }, { status: 403 });
    }

    const { username, isPro } = (await request.json()) as { username: string; isPro: boolean };

    if (!username || typeof isPro !== 'boolean') {
      return NextResponse.json({ message: 'Nome de usuário e status de PRO (isPro) são obrigatórios.' }, { status: 400 });
    }

    const targetUser = await getUserByUsername(username);
    if (!targetUser) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    const updatedUser = await updateUser(targetUser.id, { isPro });

    if (updatedUser) {
      const { password, ...safeUser } = updatedUser;
      return NextResponse.json(safeUser, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Falha ao atualizar status PRO.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in /api/admin/set-pro-status:', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao atualizar status PRO.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
