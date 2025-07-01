
import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createPrivateRoom as createRoomInStore } from '@/lib/matchmakingStore';
import { getServerStatus, getUserById } from '@/lib/userStore';
import type { CreatePrivateRoomResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  const serverStatus = await getServerStatus();
  if (serverStatus === 'offline') {
    return NextResponse.json({ status: 'error', message: 'O servidor está em manutenção. Não é possível criar salas privadas.' }, { status: 503 });
  }

  try {
    const { customRoomId } = (await request.json()) as { customRoomId?: string };
    const userId = session.user.id;
    
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
