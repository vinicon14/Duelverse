
// src/app/api/admin/ban-user/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { banUser, getUserByUsername } from '@/lib/userStore';

export async function POST(request: NextRequest) {
  try {
    // In a real app, this MUST be protected to ensure only admins can access it.
    const { username } = await request.json() as { username: string };

    if (!username) {
      return NextResponse.json({ message: 'Nome de usuário é obrigatório.' }, { status: 400 });
    }
    
    const userToBan = await getUserByUsername(username);

    if (!userToBan) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }
    
    if (userToBan.username.toLowerCase() === 'vinicon14' || userToBan.isCoAdmin) {
        return NextResponse.json({ message: 'Administradores não podem ser banidos.' }, { status: 403 });
    }

    const updatedUser = await banUser(username);
    return NextResponse.json(updatedUser, { status: 200 });

  } catch (error) {
    console.error('Error in /api/admin/ban-user:', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao banir usuário.';
    const status = message.includes('Usuário não encontrado') ? 404 : 500;
    return NextResponse.json({ message }, { status });
  }
}
