
// src/app/api/private-room/create/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createPrivateRoom as createRoomInStore } from '@/lib/matchmakingStore';
import { getServerStatus } from '@/lib/userStore';
import type { User, CreatePrivateRoomResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  const serverStatus = await getServerStatus();
  if (serverStatus === 'offline') {
    return NextResponse.json({ status: 'error', message: 'O servidor está em manutenção. Não é possível criar salas privadas.' }, { status: 503 });
  }

  try {
    const { user, customRoomId } = (await request.json()) as { user: User; customRoomId?: string };
    console.log(`[API /private-room/create] Request received. User: ${user?.displayName}, CustomRoomId: "${customRoomId}"`);

    if (!user || !user.id || !user.displayName) {
      console.warn("[API /private-room/create] Invalid user data in request.");
      return NextResponse.json({ status: 'error', message: 'Usuário inválido.' } as CreatePrivateRoomResponse, { status: 400 });
    }

    const result = createRoomInStore(user, customRoomId);
    console.log(`[API /private-room/create] Result from createRoomInStore for user ${user.displayName}:`, result);

    if (!result.success || !result.roomId || !result.jitsiRoomName) {
      console.warn(`[API /private-room/create] Failed to create room for ${user.displayName}. Message: ${result.message}`);
      return NextResponse.json({ status: 'error', message: result.message || 'Falha ao criar sala privada.' } as CreatePrivateRoomResponse, { status: 409 });
    }
    
    console.log(`[API /private-room/create] Room created successfully for ${user.displayName}. RoomId: ${result.roomId}, JitsiRoomName: ${result.jitsiRoomName}`);
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
