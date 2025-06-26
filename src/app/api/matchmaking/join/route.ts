// src/app/api/matchmaking/join/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { matchmakingQueue, activeGames, userGameMap, cleanupQueue } from '@/lib/matchmakingStore';
import { getServerStatus } from '@/lib/userStore';
import type { User, MatchmakingQueueEntry, MatchedGame, JoinMatchmakingResponse, MatchmakingMode } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const serverStatus = await getServerStatus();
  if (serverStatus === 'offline') {
    return NextResponse.json({ status: 'error', message: 'O servidor está em manutenção e o matchmaking está indisponível.' }, { status: 503 });
  }

  try {
    cleanupQueue();
    const { user, mode } = (await request.json()) as { user: User, mode: MatchmakingMode };

    if (!user || !user.id || !user.displayName) {
      return NextResponse.json({ status: 'error', message: 'Usuário inválido.' }, { status: 400 });
    }
    
    if (mode !== 'ranked' && mode !== 'casual') {
      return NextResponse.json({ status: 'error', message: 'Modo de jogo inválido.' }, { status: 400 });
    }

    // Check if user is already in a game or in the queue.
    // This prevents duplicate entries.
    if (userGameMap.has(user.id)) {
        console.log(`[API Join] User ${user.displayName} is already in a game. Responding with 'searching'.`);
        return NextResponse.json({ status: 'searching', message: 'Você já está em um jogo.' } as JoinMatchmakingResponse);
    }
    if (matchmakingQueue.some(p => p.userId === user.id)) {
        console.log(`[API Join] User ${user.displayName} is already in the queue. Responding with 'searching'.`);
        return NextResponse.json({ status: 'searching', message: 'Você já está na fila.' } as JoinMatchmakingResponse);
    }
    
    // Look for an opponent in the queue with the same mode.
    const opponentIndex = matchmakingQueue.findIndex(p => p.userId !== user.id && p.mode === mode);

    if (opponentIndex > -1) {
      // --- MATCH FOUND ---
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

      // The core of the new system: update server state, but let clients find out via polling.
      activeGames.set(gameId, newGame);
      userGameMap.set(opponent.userId, gameId);
      userGameMap.set(user.id, gameId);
      
      console.log(`[API Join - Sistema de Pedra] Partida encontrada (${mode}): ${opponent.displayName} vs ${user.displayName}. GameID: ${gameId}. The clients will now poll /status to sync.`);
      
      // Respond with 'searching' to the joining user. Their client will pick up the 'matched' status on its next poll.
      return NextResponse.json({ status: 'searching', message: 'Oponente encontrado! Sincronizando...' } as JoinMatchmakingResponse);

    } else {
      // --- NO MATCH FOUND ---
      // Add the user to the queue.
      const newEntry: MatchmakingQueueEntry = {
        userId: user.id,
        displayName: user.displayName,
        timestamp: Date.now(),
        mode: mode,
      };
      matchmakingQueue.push(newEntry);
      console.log(`[API Join] ${newEntry.displayName} added to the matchmaking queue (${mode}). Queue size: ${matchmakingQueue.length}`);
      return NextResponse.json({ status: 'searching', message: 'Procurando oponente...' } as JoinMatchmakingResponse);
    }

  } catch (error) {
    console.error('Error in /api/matchmaking/join:', error);
    return NextResponse.json({ status: 'error', message: 'Erro ao entrar na fila.' }, { status: 500 });
  }
}
