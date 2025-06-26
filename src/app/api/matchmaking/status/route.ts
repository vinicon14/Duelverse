// src/app/api/matchmaking/status/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { matchmakingQueue, activeGames, userGameMap } from '@/lib/matchmakingStore';
import type { MatchmakingStatusResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ status: 'error', message: 'ID do usuário não fornecido.' }, { status: 400 });
    }

    // 1. Check if the user is in an active game. This is the highest priority.
    if (userGameMap.has(userId)) {
      const gameId = userGameMap.get(userId)!;
      const game = activeGames.get(gameId);

      if (game) {
        // SUCCESS: User is in a valid, active game.
        console.log(`[API Status] User ${userId} is 'matched' in game ${gameId}.`);
        return NextResponse.json({ status: 'matched', game } as MatchmakingStatusResponse);
      } else {
        // SELF-HEALING: User is mapped to a game that no longer exists.
        // This is an inconsistent state. We must clean up the user's mapping
        // and inform the client to reset.
        userGameMap.delete(userId);
        console.error(`[API Status - Sistema de Pedra] Data inconsistency for user ${userId}. Mapped to non-existent game ${gameId}. Cleaned up entry.`);
        return NextResponse.json(
          { status: 'error', message: 'Ocorreu um erro de sincronização. A busca foi reiniciada.' } as MatchmakingStatusResponse, 
          { status: 500 } // Use a 500-level error to signal a problem to the client.
        );
      }
    }

    // 2. If not in a game, check if the user is waiting in the queue.
    if (matchmakingQueue.some(p => p.userId === userId)) {
        console.log(`[API Status] User ${userId} is 'searching' in the queue.`);
        return NextResponse.json({ status: 'searching', message: 'Ainda procurando...' } as MatchmakingStatusResponse);
    }
    
    // 3. If not in a game or in the queue, they are idle.
    console.log(`[API Status] User ${userId} is 'idle'.`);
    return NextResponse.json({ status: 'idle', message: 'Você não está na fila de pareamento.' } as MatchmakingStatusResponse);

  } catch (error) {
    console.error('Error in /api/matchmaking/status:', error);
    return NextResponse.json({ status: 'error', message: 'Erro ao verificar status.' }, { status: 500 });
  }
}
