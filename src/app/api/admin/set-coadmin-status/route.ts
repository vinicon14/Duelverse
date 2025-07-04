
// src/app/api/admin/set-coadmin-status/route.ts
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

    if (!adminUser || !adminUser.isAdmin) {
      return NextResponse.json({ message: 'Acesso negado. Apenas administradores podem executar esta ação.' }, { status: 403 });
    }

    const { username, isCoAdmin } = (await request.json()) as { username: string; isCoAdmin: boolean };

    if (!username || typeof isCoAdmin !== 'boolean') {
      return NextResponse.json({ message: 'Nome de usuário e status de co-admin (isCoAdmin) são obrigatórios.' }, { status: 400 });
    }

    const targetUser = await getUserByUsername(username);
    if (!targetUser) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }
    
    // The main admin account cannot have its status changed.
    if (targetUser.isAdmin) {
        return NextResponse.json({ message: 'O status do administrador principal não pode ser alterado.' }, { status: 403 });
    }

    const updatedUser = await updateUser(targetUser.id, { isCoAdmin });

    if (updatedUser) {
      // Return a minimal user object, no sensitive data
      const { password, ...safeUser } = updatedUser;
      return NextResponse.json(safeUser, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Falha ao atualizar status de co-administrador.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in /api/admin/set-coadmin-status:', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao atualizar status de co-administrador.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
