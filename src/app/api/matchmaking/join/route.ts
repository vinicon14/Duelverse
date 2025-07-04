
import { NextResponse, type NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import { matchmakingQueue, activeGames, userGameMap, cleanupQueue } from '@/lib/matchmakingStore';
import { getServerStatus, getUserById } from '@/lib/userStore';
import type { MatchmakingQueueEntry, MatchedGame, JoinMatchmakingResponse, MatchmakingMode, User } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not set in environment variables.');
    return NextResponse.json({ status: 'error', message: 'Server configuration error.' }, { status: 500 });
  }

  let decoded: { userId: string };
  try {
    decoded = verify(token, secret) as { userId: string };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return NextResponse.json({ status: 'error', message: 'Invalid token.' }, { status: 401 });
  }

  const userId = decoded.userId;

  const serverStatus = await getServerStatus();
  if (serverStatus === 'offline') {
    return NextResponse.json({ status: 'error', message: 'O servidor está em manutenção e o matchmaking está indisponível.' }, { status: 503 });
  }

  try {
    cleanupQueue();
    const { mode } = (await request.json()) as { mode: MatchmakingMode };
    
    // Fetch user details from your database to ensure data is fresh
    const user = await getUserById(userId);
    if (!user) {
        return NextResponse.json({ status: 'error', message: 'User not found in database.' }, { status: 404 });
    }

    if (mode !== 'ranked' && mode !== 'casual') {
      return NextResponse.json({ status: 'error', message: 'Modo de jogo inválido.' }, { status: 400 });
    }

    if (userGameMap.has(userId)) {
        return NextResponse.json({ status: 'searching', message: 'Você já está em um jogo.' } as JoinMatchmakingResponse);
    }
    if (matchmakingQueue.some(p => p.userId === userId)) {
        return NextResponse.json({ status: 'searching', message: 'Você já está na fila.' } as JoinMatchmakingResponse);
    }
    
    const opponentIndex = matchmakingQueue.findIndex(p => p.userId !== userId && p.mode === mode);

    if (opponentIndex > -1) {
      const [opponent] = matchmakingQueue.splice(opponentIndex, 1);
      
      const gameId = uuidv4();
      const jitsiRoomName = `DuelVerse_Match_${gameId.substring(0, 8)}`;
      const newGame: MatchedGame = {
        gameId,
        players: [opponent, { userId: user.id, displayName: user.displayName, timestamp: Date.now(), mode }],
        jitsiRoomName,
        createdAt: Date.now(),
        mode: mode,
      };

      activeGames.set(gameId, newGame);
      userGameMap.set(opponent.userId, gameId);
      userGameMap.set(userId, gameId);
      
      return NextResponse.json({ status: 'searching', message: 'Oponente encontrado! Sincronizando...' } as JoinMatchmakingResponse);

    } else {
      const newEntry: MatchmakingQueueEntry = {
        userId: user.id,
        displayName: user.displayName,
        timestamp: Date.now(),
        mode: mode,
      };
      matchmakingQueue.push(newEntry);
      return NextResponse.json({ status: 'searching', message: 'Procurando oponente...' } as JoinMatchmakingResponse);
    }

  } catch (error) {
    console.error('Error in /api/matchmaking/join:', error);
    return NextResponse.json({ status: 'error', message: 'Erro ao entrar na fila.' }, { status: 500 });
  }
}
