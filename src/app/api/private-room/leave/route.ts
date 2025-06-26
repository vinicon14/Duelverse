
// src/app/api/private-room/leave/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { leavePrivateRoom as leaveRoomInStore } from '@/lib/matchmakingStore';
import type { User, LeavePrivateRoomResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { user } = (await request.json()) as { user: User };

    if (!user || !user.id) {
      return NextResponse.json({ message: 'Usuário inválido.' } as LeavePrivateRoomResponse, { status: 400 });
    }

    const result = leaveRoomInStore(user.id);

    // Here, you could add logic to notify the opponent if `result.opponentNotified` is true,
    // e.g., using WebSockets or another notification mechanism if you implement one.
    // For now, the opponent will find out via their next status poll.

    return NextResponse.json({ message: result.message } as LeavePrivateRoomResponse, { status: result.success ? 200 : 400 });

  } catch (error) {
    console.error('Error in /api/private-room/leave:', error);
    return NextResponse.json({ message: 'Erro interno ao sair da sala privada.' } as LeavePrivateRoomResponse, { status: 500 });
  }
}
