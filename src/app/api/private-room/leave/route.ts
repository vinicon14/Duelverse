
import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { leavePrivateRoom as leaveRoomInStore } from '@/lib/matchmakingStore';
import type { LeavePrivateRoomResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const result = leaveRoomInStore(userId);

    return NextResponse.json({ message: result.message } as LeavePrivateRoomResponse, { status: result.success ? 200 : 400 });

  } catch (error) {
    console.error('Error in /api/private-room/leave:', error);
    return NextResponse.json({ message: 'Erro interno ao sair da sala privada.' } as LeavePrivateRoomResponse, { status: 500 });
  }
}
