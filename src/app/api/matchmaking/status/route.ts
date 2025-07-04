
import { NextResponse, type NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import { matchmakingQueue, activeGames, userGameMap } from '@/lib/matchmakingStore';
import type { MatchmakingStatusResponse, MatchedGame, MatchmakingQueueEntry } from '@/lib/types';

export async function GET(request: NextRequest) {
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

  try {
    const userId = decoded.userId;

    if (userGameMap.has(userId)) {
      const gameId = userGameMap.get(userId)!;
      const game = activeGames.get(gameId);

      if (game) {
        // Find the opponent
        const opponent = game.players.find(p => p.userId !== userId);
        
        const gameForUser = {
          gameId: game.gameId,
          jitsiRoomName: game.jitsiRoomName,
          mode: game.mode,
          opponent: {
            id: opponent?.userId || 'unknown',
            displayName: opponent?.displayName || 'Oponente Desconhecido',
          },
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
