
// src/lib/matchmakingStore.ts
import type { MatchmakingQueueEntry, MatchedGame, PrivateGame, User as AuthUser, StoredMatchResult, PrivateGamePlayer } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * ATENÇÃO: Este é um armazenamento em memória.
 * Ele é INTENCIONALMENTE VOLÁTIL. Dados de partidas ativas, filas e chats
 * não precisam ser persistidos entre reinicializações do servidor para este protótipo.
 * Para um ambiente de produção, esta lógica precisaria ser movida para um
 * banco de dados rápido como Redis ou um banco de dados em tempo real como Firestore.
 * A persistência de USUÁRIOS agora é tratada em 'userStore.ts'.
 */

declare global {
  // Allow global `var` for these in-memory stores to prevent HMR issues
  // eslint-disable-next-line no-var
  var __matchmakingStores: {
    matchmakingQueue?: MatchmakingQueueEntry[];
    activeGames?: Map<string, MatchedGame>;
    userGameMap?: Map<string, string>;
    privateGames?: Map<string, PrivateGame>;
    userPrivateGameMap?: Map<string, string>;
    matchResults?: Map<string, StoredMatchResult>;
    cleanupInterval?: NodeJS.Timeout;
  } | undefined;
}

// This ensures the in-memory store is not wiped out during HMR in development.
if (!global.__matchmakingStores) {
    global.__matchmakingStores = {
        matchmakingQueue: [],
        activeGames: new Map<string, MatchedGame>(),
        userGameMap: new Map<string, string>(),
        privateGames: new Map<string, PrivateGame>(),
        userPrivateGameMap: new Map<string, string>(),
        matchResults: new Map<string, StoredMatchResult>(),
    };
    console.log('[MatchmakingStore] Initialized new global matchmaking stores object.');
}

// --- Store Exports ---
export const matchmakingQueue: MatchmakingQueueEntry[] = global.__matchmakingStores.matchmakingQueue!;
export const activeGames: Map<string, MatchedGame> = global.__matchmakingStores.activeGames!;
export const userGameMap: Map<string, string> = global.__matchmakingStores.userGameMap!;
export const privateGames: Map<string, PrivateGame> = global.__matchmakingStores.privateGames!;
export const userPrivateGameMap: Map<string, string> = global.__matchmakingStores.userPrivateGameMap!;
export const matchResults: Map<string, StoredMatchResult> = global.__matchmakingStores.matchResults!;

const PUBLIC_QUEUE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const ACTIVE_GAME_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const PRIVATE_GAME_CLEANUP_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours for private rooms
const MATCH_RESULT_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours to report results

export function cleanupQueue() {
  const cleanupTime = Date.now() - PUBLIC_QUEUE_CLEANUP_INTERVAL;
  const initialLength = matchmakingQueue.length;
  for (let i = matchmakingQueue.length - 1; i >= 0; i--) {
    if (matchmakingQueue[i].timestamp < cleanupTime) {
      matchmakingQueue.splice(i, 1);
    }
  }
  if (matchmakingQueue.length < initialLength) {
    console.log(`[MatchmakingStore] Public queue cleanup: removed ${initialLength - matchmakingQueue.length} old entries.`);
  }
}

export function cleanupGames() {
  const cleanupTime = Date.now() - ACTIVE_GAME_CLEANUP_INTERVAL;
  activeGames.forEach((game, gameId) => {
    if (game.createdAt < cleanupTime) {
      activeGames.delete(gameId);
      game.players.forEach(p => userGameMap.delete(p.userId));
      console.log(`[MatchmakingStore] Cleaned up old public game: ${gameId}`);
    }
  });
}

export function cleanupPrivateGames() {
  const cleanupTime = Date.now() - PRIVATE_GAME_CLEANUP_INTERVAL;
  privateGames.forEach((game, roomId) => {
    if (game.createdAt < cleanupTime) {
      privateGames.delete(roomId);
      userPrivateGameMap.delete(game.player1.userId);
      if (game.player2) {
        userPrivateGameMap.delete(game.player2.userId);
      }
      console.log(`[MatchmakingStore] Cleaned up old private game: ${roomId}`);
    }
  });
}

export function cleanupMatchResults() {
    const cleanupTime = Date.now() - MATCH_RESULT_CLEANUP_INTERVAL;
    matchResults.forEach((result, gameId) => {
        const gameEntry = activeGames.get(gameId) || privateGames.get(gameId);
        if (!gameEntry || gameEntry.createdAt < cleanupTime) {
             matchResults.delete(gameId);
             console.log(`[MatchmakingStore] Cleaned up old/stale match result entry for game: ${gameId}`);
        }
    });
}


// --- Global Cleanup Interval ---
if (typeof setInterval !== 'undefined' && !global.__matchmakingStores.cleanupInterval) {
  global.__matchmakingStores.cleanupInterval = setInterval(() => {
    cleanupQueue();
    cleanupGames();
    cleanupPrivateGames();
    cleanupMatchResults();
  }, 60 * 1000); 
  console.log('[MatchmakingStore] Started global cleanup interval.');
}

// --- Helper for Private Rooms ---
export function createPrivateRoom(player1: AuthUser, customRoomIdInput?: string): { success: boolean; roomId?: string; jitsiRoomName?: string; message?: string } {
  const trimmedCustomRoomId = customRoomIdInput?.trim().toUpperCase();
  const roomId = trimmedCustomRoomId && trimmedCustomRoomId.length > 0 
               ? trimmedCustomRoomId 
               : uuidv4().substring(0, 6).toUpperCase();

  console.log(`[MatchmakingStore] Attempting to create private room. Requested ID: "${customRoomIdInput}", Effective ID: "${roomId}" by P1: ${player1.displayName} (ID: ${player1.id})`);

  if (privateGames.has(roomId)) {
    console.warn(`[MatchmakingStore] Private room creation failed: Room ID "${roomId}" already in use.`);
    return { success: false, message: 'ID da sala já em uso. Tente um ID diferente ou deixe em branco para gerar um aleatório.' };
  }
  if (userPrivateGameMap.has(player1.id) || userGameMap.has(player1.id)) {
     console.warn(`[MatchmakingStore] Private room creation failed: Player ${player1.displayName} is already in a room or queue.`);
     return { success: false, message: 'Você já está em uma sala ou na fila de pareamento público.' };
  }

  const jitsiRoomName = `DuelVerse_Private_${roomId}`;
  const newPrivateGame: PrivateGame = {
    roomId,
    player1: { userId: player1.id, displayName: player1.displayName },
    jitsiRoomName,
    createdAt: Date.now(),
  };

  privateGames.set(roomId, newPrivateGame);
  userPrivateGameMap.set(player1.id, roomId);
  console.log(`[MatchmakingStore] Private room "${roomId}" CREATED by ${player1.displayName}. Jitsi: "${jitsiRoomName}". Current private games: ${privateGames.size}`);
  return { success: true, roomId, jitsiRoomName };
}

export function joinPrivateRoom(player2: AuthUser, roomIdInput: string): { success: boolean; game?: PrivateGame; message?: string } {
  const roomId = roomIdInput.trim().toUpperCase();
  console.log(`[MatchmakingStore] Attempting to join private room "${roomId}" by P2: ${player2.displayName} (ID: ${player2.id})`);
  const game = privateGames.get(roomId);

  if (!game) {
    console.warn(`[MatchmakingStore] Join private room failed: Room "${roomId}" not found.`);
    return { success: false, message: 'Sala privada não encontrada.' };
  }
  if (game.player2) {
    console.warn(`[MatchmakingStore] Join private room failed: Room "${roomId}" is full. Current P2: ${game.player2.displayName}`);
    return { success: false, message: 'Esta sala privada já está cheia.' };
  }
  if (game.player1.userId === player2.id) {
    console.warn(`[MatchmakingStore] Join private room failed: Player ${player2.displayName} cannot join their own room as P2.`);
    return { success: false, message: 'Você não pode entrar na sua própria sala como oponente.' };
  }
   if (userPrivateGameMap.has(player2.id) || userGameMap.has(player2.id)) {
     console.warn(`[MatchmakingStore] Join private room failed: Player ${player2.displayName} is already in another room or queue.`);
     return { success: false, message: 'Você já está em uma sala ou na fila de pareamento público.' };
  }

  game.player2 = { userId: player2.id, displayName: player2.displayName };
  userPrivateGameMap.set(player2.id, roomId);
  privateGames.set(roomId, game); 
  console.log(`[MatchmakingStore] Player ${player2.displayName} JOINED private room "${roomId}". Jitsi for this room: "${game.jitsiRoomName}". P1: ${game.player1.displayName}`);
  return { success: true, game };
}

export function leavePrivateRoom(userId: string): { success: boolean; message: string; opponentNotified?: boolean, opponentUserId?: string } {
    const roomId = userPrivateGameMap.get(userId);
    console.log(`[MatchmakingStore] Attempting to leave private room by user ID: ${userId}. Found in room: ${roomId || 'none'}`);
    if (!roomId) {
        return { success: false, message: "Você não está em uma sala privada." };
    }

    const game = privateGames.get(roomId);
    if (!game) {
        userPrivateGameMap.delete(userId); 
        console.warn(`[MatchmakingStore] User ${userId} was in userPrivateGameMap for room "${roomId}", but room not found in privateGames. Cleaned map entry.`);
        return { success: false, message: "Sala não encontrada, mas você foi removido do rastreamento."};
    }

    let opponentUserId: string | undefined = undefined;
    const leavingPlayerDisplayName = game.player1.userId === userId ? game.player1.displayName : game.player2?.displayName;

    if (game.player1.userId === userId) { // Player 1 is leaving
        if (game.player2) opponentUserId = game.player2.userId;
        privateGames.delete(roomId); 
        userPrivateGameMap.delete(userId);
        if (game.player2) userPrivateGameMap.delete(game.player2.userId);
        matchResults.delete(roomId);
        console.log(`[MatchmakingStore] Player 1 (${leavingPlayerDisplayName}, ID: ${userId}) left private room "${roomId}". Room and results deleted. Current private games: ${privateGames.size}`);
    } else if (game.player2 && game.player2.userId === userId) { // Player 2 is leaving
        opponentUserId = game.player1.userId;
        game.player2 = undefined; // Player 2 leaves, P1 remains
        privateGames.set(roomId, game); 
        userPrivateGameMap.delete(userId);
        matchResults.delete(roomId); // Clear results if P2 leaves, as match is disrupted
        console.log(`[MatchmakingStore] Player 2 (${leavingPlayerDisplayName}, ID: ${userId}) left private room "${roomId}". P1 (${game.player1.displayName}) is now waiting. Match results cleared. Current private games: ${privateGames.size}`);
    } else {
        // User was in userPrivateGameMap, but not P1 or P2 of the game. Should not happen.
        userPrivateGameMap.delete(userId);
        console.error(`[MatchmakingStore] Consistency error: User ${userId} in userPrivateGameMap for room "${roomId}" but not P1 or P2. Cleaned map entry.`);
        return { success: false, message: "Erro: Você não foi encontrado na sala especificada de forma consistente." };
    }
    
    return { success: true, message: "Você saiu da sala privada.", opponentNotified: !!opponentUserId, opponentUserId };
}

export function createGameFromInvitation(player1: PrivateGamePlayer, player2: PrivateGamePlayer): PrivateGame {
  const gameId = uuidv4();
  const jitsiRoomName = `DuelVerse_Match_${gameId.substring(0, 8)}`;
  
  const newGame: PrivateGame = {
    roomId: gameId, // Use gameId as roomId for consistency
    player1,
    player2,
    jitsiRoomName,
    createdAt: Date.now(),
  };

  privateGames.set(gameId, newGame);
  userPrivateGameMap.set(player1.userId, gameId);
  userPrivateGameMap.set(player2.userId, gameId);
  console.log(`[MatchmakingStore] Game created from invitation for ${player1.displayName} vs ${player2.displayName}. Room ID: ${gameId}`);
  
  return newGame;
}
