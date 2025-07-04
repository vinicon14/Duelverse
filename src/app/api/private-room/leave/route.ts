
import { NextResponse, type NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import { leavePrivateRoom as leaveRoomInStore } from '@/lib/matchmakingStore';
import type { LeavePrivateRoomResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET não está definido nas variáveis de ambiente');
    return NextResponse.json({ message: 'Erro de configuração do servidor.' }, { status: 500 });
  }

  let decoded: { userId: string };
  try {
    decoded = verify(token, secret) as { userId: string };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return NextResponse.json({ message: 'Token inválido.' }, { status: 401 });
  }

  try {
    const userId = decoded.userId;
    const result = leaveRoomInStore(userId);

    return NextResponse.json({ message: result.message } as LeavePrivateRoomResponse, { status: result.success ? 200 : 400 });

  } catch (error) {
    console.error('Error in /api/private-room/leave:', error);
    return NextResponse.json({ message: 'Erro interno ao sair da sala privada.' } as LeavePrivateRoomResponse, { status: 500 });
  }
}
