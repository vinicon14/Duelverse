
// src/app/api/admin/ban-user/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import { banUser, getUserById, getUserByUsername } from '@/lib/userStore';

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

    const { username } = await request.json() as { username: string };

    if (!username) {
      return NextResponse.json({ message: 'Nome de usuário é obrigatório.' }, { status: 400 });
    }
    
    const userToBan = await getUserByUsername(username);

    if (!userToBan) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }
    
    if (userToBan.isAdmin || userToBan.isCoAdmin) {
        return NextResponse.json({ message: 'Administradores não podem ser banidos.' }, { status: 403 });
    }
    
    // Admins can't ban themselves (should be covered by the check above, but as a safeguard)
    if (userToBan.id === adminUser.id) {
        return NextResponse.json({ message: 'Você não pode banir a si mesmo.' }, { status: 403 });
    }

    const updatedUser = await banUser(userToBan.id);
    if (updatedUser) {
        const { password, ...safeUser } = updatedUser;
        return NextResponse.json(safeUser, { status: 200 });
    } else {
        return NextResponse.json({ message: 'Falha ao banir usuário.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in /api/admin/ban-user:', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao banir usuário.';
    const status = message.includes('Usuário não encontrado') ? 404 : 500;
    return NextResponse.json({ message }, { status });
  }
}
