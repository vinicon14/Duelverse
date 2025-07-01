
import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { matchmakingQueue, userGameMap } from '@/lib/matchmakingStore';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const userId = session.user.id;

    const queueIndex = matchmakingQueue.findIndex(p => p.userId === userId);
    if (queueIndex > -1) {
      matchmakingQueue.splice(queueIndex, 1);
      return NextResponse.json({ message: 'Você saiu da fila de pareamento.' });
    }

    if (userGameMap.has(userId)) {
        return NextResponse.json({ message: 'Você já está em uma partida. Reporte o resultado para sair.' }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'Você não estava na fila.' });

  } catch (error) {
    console.error('Error in /api/matchmaking/leave:', error);
    return NextResponse.json({ message: 'Erro ao sair da fila.' }, { status: 500 });
  }
}
