
import { NextResponse, type NextRequest } from 'next/server';
import { matchmakingQueue, activeGames, userGameMap } from '@/lib/matchmakingStore';
import type { MatchmakingStatusResponse, MatchedGame, MatchmakingQueueEntry } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ status: 'error', message: 'ID do usuário não fornecido.' }, { status: 400 });
    }

    if (userGameMap.has(userId)) {
      const gameId = userGameMap.get(userId)!;
      const game = activeGames.get(gameId);

      if (game) {
        // Find the opponent
        const opponent = game.players.find(p => p.userId !== userId);
        
        // This is the critical fix: create a new game object for the response
        // that is tailored to the requesting user.
        const gameForUser = {
          gameId: game.gameId,
          jitsiRoomName: game.jitsiRoomName,
          mode: game.mode,
          opponent: {
            id: opponent?.userId || 'unknown',
            displayName: opponent?.displayName || 'Oponente Desconhecido',
          },
          // We no longer need to send the full player list
        };

        return NextResponse.json({ status: 'matched', game: gameForUser });
      } else {
        userGameMap.delete(userId);
        return NextResponse.json({ status: 'error', message: 'Erro de sincronização.' }, { status: 500 });
      }
    }

    if (matchmakingQueue.some(p => p.userId === userId)) {
      return NextResponse.json({ status: 'searching' });
    }
    
    return NextResponse.json({ status: 'idle' });

  } catch (error) {
    console.error('Error in /api/matchmaking/status:', error);
    return NextResponse.json({ status: 'error', message: 'Erro ao verificar status.' }, { status: 500 });
  }
}
