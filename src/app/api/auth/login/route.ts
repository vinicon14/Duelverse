
import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import { serialize } from 'cookie';
import { getUserByUsername } from '@/lib/userStore';
import type { User } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Usuário e senha são obrigatórios.' }, { status: 400 });
    }

    const user = await getUserByUsername(username);

    if (!user || !user.password) {
      return NextResponse.json({ message: 'Usuário ou senha inválidos.' }, { status: 401 });
    }

    const isPasswordValid = password === user.password;

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Usuário ou senha inválidos.' }, { status: 401 });
    }

    const { password: userPassword, ...userWithoutPassword } = user;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET não está definido nas variáveis de ambiente');
    }

    const token = sign({ userId: user.id }, secret, { expiresIn: '7d' });

    const cookie = serialize('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
      sameSite: 'lax',
    });

    return new NextResponse(JSON.stringify(userWithoutPassword), {
      status: 200,
      headers: { 'Set-Cookie': cookie },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Ocorreu um erro interno.' }, { status: 500 });
  }
}
