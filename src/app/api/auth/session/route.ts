
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { parse } from 'cookie';
import { getUserById } from '@/lib/userStore';

export async function GET(req: NextRequest) {
  const cookies = parse(req.headers.get('cookie') || '');
  const token = cookies.auth_token;

  if (!token) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET não está definido');
    return NextResponse.json({ message: 'Erro de configuração do servidor' }, { status: 500 });
  }

  try {
    const decoded = verify(token, secret) as { userId: string };
    const user = await getUserById(decoded.userId);

    if (!user) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });
    }

    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error) {
    console.error('Erro de sessão:', error);
    // Return a new response to clear the cookie if the token is invalid
    const response = NextResponse.json(
      { message: 'Sessão inválida ou expirada' },
      { status: 401 }
    );
    response.headers.set('Set-Cookie', 'auth_token=; Path=/; Max-Age=0');
    return response;
  }
}
