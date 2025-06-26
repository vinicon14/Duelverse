
// src/app/api/private-room/join/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { joinPrivateRoom as joinRoomInStore } from '@/lib/matchmakingStore';
import { getServerStatus } from '@/lib/userStore';
import type { User, JoinPrivateRoomResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  const serverStatus = await getServerStatus();
  if (serverStatus === 'offline') {
    return NextResponse.json({ status: 'error', message: 'O servidor está em manutenção. Não é possível entrar em salas privadas.' }, { status: 503 });
  }

  try {
    const { user, roomId } = (await request.json()) as { user: User; roomId: string };
    console.log(`[API /private-room/join] Request received. User: ${user?.displayName}, RoomId: "${roomId}"`);

    if (!user || !user.id || !user.displayName) {
      console.warn("[API /private-room/join] Invalid user data in request.");
      return NextResponse.json({ status: 'error', message: 'Usuário inválido.' } as JoinPrivateRoomResponse, { status: 400 });
    }
    if (!roomId || !roomId.trim()) {
      console.warn("[API /private-room/join] Room ID not provided or empty.");
      return NextResponse.json({ status: 'error', message: 'ID da sala não fornecido.' } as JoinPrivateRoomResponse, { status: 400 });
    }

    const result = joinRoomInStore(user, roomId.trim());
    console.log(`[API /private-room/join] Result from joinRoomInStore for user ${user.displayName}, room ${roomId}:`, result);

    if (!result.success || !result.game) {
      const status = result.message?.includes("cheia") ? 'full' : 'not_found';
      console.warn(`[API /private-room/join] Failed to join room for ${user.displayName}. Message: ${result.message}. Status: ${status}`);
      return NextResponse.json({ status, message: result.message || 'Falha ao entrar na sala privada.' } as JoinPrivateRoomResponse, { status: status === 'full' ? 409 : 404 });
    }
    
    console.log(`[API /private-room/join] User ${user.displayName} joined room ${result.game.roomId} successfully. The client will now poll for the 'ready_to_start' status.`);
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
