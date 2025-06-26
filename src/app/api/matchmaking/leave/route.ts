// src/app/api/matchmaking/leave/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { matchmakingQueue, userGameMap } from '@/lib/matchmakingStore';
import type { User } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { user } = (await request.json()) as { user: User };

    if (!user || !user.id) {
      return NextResponse.json({ message: 'Usuário inválido.' }, { status: 400 });
    }

    // This action is primarily for leaving the *queue*.
    const queueIndex = matchmakingQueue.findIndex(p => p.userId === user.id);
    if (queueIndex > -1) {
      matchmakingQueue.splice(queueIndex, 1);
      console.log(`[API Leave] User ${user.displayName || user.id} left the matchmaking queue. Queue size: ${matchmakingQueue.length}`);
      return NextResponse.json({ message: 'Você saiu da fila de pareamento.' });
    }

    // A user in a game cannot call this route from the new client logic,
    // but this check handles edge cases.
    if (userGameMap.has(user.id)) {
        console.warn(`[API Leave] User ${user.displayName || user.id} tried to leave, but was already in a game.`);
        return NextResponse.json({ message: 'Você já está em uma partida. Reporte o resultado para sair.' }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'Você não estava na fila.' });

  } catch (error) {
    console.error('Error in /api/matchmaking/leave:', error);
    return NextResponse.json({ message: 'Erro ao sair da fila.' }, { status: 500 });
  }
}
