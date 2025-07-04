
import { NextResponse, type NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import { joinPrivateRoom as joinRoomInStore } from '@/lib/matchmakingStore';
import { getServerStatus, getUserById } from '@/lib/userStore';
import type { JoinPrivateRoomResponse } from '@/lib/types';

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
    return NextResponse.json({ status: 'error', message: 'O servidor está em manutenção. Não é possível entrar em salas privadas.' }, { status: 503 });
  }

  try {
    const { roomId } = (await request.json()) as { roomId: string };

    const user = await getUserById(userId);
    if (!user) {
        return NextResponse.json({ status: 'error', message: 'User not found.' }, { status: 404 });
    }
    
    if (!roomId || !roomId.trim()) {
      return NextResponse.json({ status: 'error', message: 'ID da sala não fornecido.' } as JoinPrivateRoomResponse, { status: 400 });
    }

    const result = joinRoomInStore(user, roomId.trim());

    if (!result.success || !result.game) {
      const status = result.message?.includes("cheia") ? 'full' : 'not_found';
      return NextResponse.json({ status, message: result.message || 'Falha ao entrar na sala privada.' } as JoinPrivateRoomResponse, { status: status === 'full' ? 409 : 404 });
    }
    
    return NextResponse.json({
      status: 'joined',
      roomId: result.game.roomId,
      message: 'Você entrou na sala. Aguardando início do duelo...',
    } as JoinPrivateRoomResponse);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /private-room/join] Error in /api/private-room/join:', errorMessage, error);
    return NextResponse.json({ status: 'error', message: 'Erro interno ao entrar na sala privada.' } as JoinPrivateRoomResponse, { status: 500 });
  }
}
