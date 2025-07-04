
import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

export async function POST() {
  const cookie = serialize('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: -1, // Expire the cookie immediately
    path: '/',
    sameSite: 'lax',
  });

  return new NextResponse(JSON.stringify({ message: 'Logout bem-sucedido.' }), {
    status: 200,
    headers: { 'Set-Cookie': cookie },
  });
}
