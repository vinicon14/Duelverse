
// src/app/api/admin/set-coadmin-status/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { updateUser, getUserByUsername } from '@/lib/userStore';

export async function POST(request: NextRequest) {
  try {
    // In a real app, this MUST be protected to ensure only admins can access it.
    const { username, isCoAdmin } = (await request.json()) as { username: string; isCoAdmin: boolean };

    if (!username || typeof isCoAdmin !== 'boolean') {
      return NextResponse.json({ message: 'Nome de usuário e status de co-admin (isCoAdmin) são obrigatórios.' }, { status: 400 });
    }
    
    // The main admin account cannot have its status changed.
    if (username.toLowerCase() === 'vinicon14') {
        return NextResponse.json({ message: 'O status do administrador principal não pode ser alterado.' }, { status: 403 });
    }

    const existingUser = await getUserByUsername(username);
    if (!existingUser) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    const updatedUser = await updateUser(username, { isCoAdmin });

    if (updatedUser) {
      return NextResponse.json(updatedUser, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Falha ao atualizar status de co-administrador.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in /api/admin/set-coadmin-status:', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao atualizar status de co-administrador.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
