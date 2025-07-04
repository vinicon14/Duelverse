
import { NextResponse, type NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import { createPrivateRoom as createRoomInStore } from '@/lib/matchmakingStore';
import { getServerStatus, getUserById } from '@/lib/userStore';
import type { CreatePrivateRoomResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ status: 'error', message: 'Não autorizado' }, { status: 401 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET não está definido nas variáveis de ambiente');
    return NextResponse.json({ status: 'error', message: 'Erro de configuração do servidor.' }, { status: 500 });
  }

  let decoded: { userId: string };
  try {
    decoded = verify(token, secret) as { userId: string };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return NextResponse.json({ status: 'error', message: 'Token inválido.' }, { status: 401 });
  }

  const userId = decoded.userId;

  const serverStatus = await getServerStatus();
  if (serverStatus === 'offline') {
    return NextResponse.json({ status: 'error', message: 'O servidor está em manutenção. Não é possível criar salas privadas.' }, { status: 503 });
  }

  try {
    const { roomId: customRoomId } = (await request.json()) as { roomId?: string };
    
    const user = await getUserById(userId);
    if (!user) {
        return NextResponse.json({ status: 'error', message: 'User not found.' }, { status: 404 });
    }

    const result = createRoomInStore(user, customRoomId);

    if (!result.success || !result.roomId || !result.jitsiRoomName) {
      return NextResponse.json({ status: 'error', message: result.message || 'Falha ao criar sala privada.' } as CreatePrivateRoomResponse, { status: 409 });
    }
    
    return NextResponse.json({
      status: 'waiting_for_opponent',
      roomId: result.roomId,
      jitsiRoomName: result.jitsiRoomName,
      message: 'Sala privada criada. Compartilhe o ID com seu oponente.',
    } as CreatePrivateRoomResponse);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /private-room/create] Error in /api/private-room/create:', errorMessage, error);
    return NextResponse.json({ status: 'error', message: 'Erro interno ao criar sala privada.' } as CreatePrivateRoomResponse, { status: 500 });
  }
}
