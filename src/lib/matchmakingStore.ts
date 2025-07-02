import type { MatchmakingQueueEntry, MatchedGame, PrivateGame, User as AuthUser, StoredMatchResult, PrivateGamePlayer } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// In-memory data stores
// NOTE: Data stored here will NOT persist across server restarts.
// For persistence, you would integrate with a database like Firebase, PostgreSQL, etc.
export const matchmakingQueue = new Map<string, MatchmakingQueueEntry>(); // userId -> entry
export const activeGames = new Map<string, MatchedGame | PrivateGame>(); // gameId -> game
export const userGameMap = new Map<string, string>(); // userId -> gameId (public or private)
export const privateGames = new Map<string, PrivateGame>(); // roomId -> private game
export const userPrivateGameMap = new Map<string, string>(); // userId -> private roomId
export const matchResults = new Map<string, StoredMatchResult>(); // gameId -> result

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes (for cleanup logic)

// Utility function to clean up stale entries (simplified for in-memory)
export function cleanupQueue() {
  const now = Date.now();
  // Remove entries older than threshold (e.g., 5 minutes for demonstration)
  for (const [userId, entry] of matchmakingQueue.entries()) {
    if (now - entry.timestamp > ONLINE_THRESHOLD_MS) {
      matchmakingQueue.delete(userId);
      console.log(`[InMemory-Matchmaking] Cleaned up stale queue entry for ${userId}`);
    }
  }
}

export async function createPrivateRoom(player1: AuthUser, customRoomIdInput?: string): Promise<{ success: boolean; roomId?: string; jitsiRoomName?: string; message?: string }> {
  const trimmedCustomRoomId = customRoomIdInput?.trim().toUpperCase();
  const roomId = trimmedCustomRoomId && trimmedCustomIdInput.length > 0
               ? trimmedCustomRoomId
               : uuidv4().substring(0, 6).toUpperCase();

  console.log(`[InMemory-Matchmaking] Attempting to create private room. Requested ID: "${customRoomIdInput}", Effective ID: "${roomId}" by P1: ${player1.displayName} (ID: ${player1.id})`);

  // Check if user is already in any game
  if (userPrivateGameMap.has(player1.id) || userGameMap.has(player1.id)) {
    console.warn(`[InMemory-Matchmaking] Private room creation failed: Player ${player1.displayName} is already in a room or queue.`);
    return { success: false, message: 'Você já está em uma sala ou na fila de pareamento público.' };
  }

  // Check if room ID already exists
  if (privateGames.has(roomId)) {
    console.warn(`[InMemory-Matchmaking] Private room creation failed: Room ID "${roomId}" already in use.`);
    return { success: false, message: 'ID da sala já em uso. Tente um ID diferente ou deixe em branco para gerar um aleatório.' };
  }

  const newPrivateGame: PrivateGame = {
    roomId,
    player1: { userId: player1.id, displayName: player1.displayName },
    jitsiRoomName: `DuelVerse_Private_${roomId}`,
    createdAt: Date.now(),
  };

  privateGames.set(roomId, newPrivateGame);
  userPrivateGameMap.set(player1.id, roomId);
  
  console.log(`[InMemory-Matchmaking] Private room "${roomId}" CREATED by ${player1.displayName}. Jitsi: "${newPrivateGame.jitsiRoomName}".`);
  return { success: true, roomId, jitsiRoomName: newPrivateGame.jitsiRoomName };
}

export async function joinPrivateRoom(player2: AuthUser, roomIdInput: string): Promise<{ success: boolean; game?: PrivateGame; message?: string }> {
    const roomId = roomIdInput.trim().toUpperCase();
    console.log(`[InMemory-Matchmaking] Attempting to join private room "${roomId}" by P2: ${player2.displayName} (ID: ${player2.id})`);

    // Check if user is already in any game
    if (userPrivateGameMap.has(player2.id) || userGameMap.has(player2.id)) {
        console.warn(`[InMemory-Matchmaking] Join private room failed: Player ${player2.displayName} is already in another room or queue.`);
        return { success: false, message: 'Você já está em uma sala ou na fila de pareamento público.' };
    }
    
    const game = privateGames.get(roomId);
    if (!game) {
        return { success: false, message: "Sala privada não encontrada." };
    }
    if (game.player2) {
        return { success: false, message: "Esta sala privada já está cheia." };
    }
    if (game.player1.userId === player2.id) {
        return { success: false, message: "Você não pode entrar na sua própria sala como oponente." };
    }

    // Join the room
    game.player2 = { userId: player2.id, displayName: player2.displayName };
    privateGames.set(roomId, game); // Update the in-memory game object
    userPrivateGameMap.set(player2.id, roomId);
    
    console.log(`[InMemory-Matchmaking] Player ${player2.displayName} JOINED private room "${roomId}".`);
    return { success: true, game };
}


export async function leavePrivateRoom(userId: string): Promise<{ success: boolean; message: string; opponentNotified?: boolean, opponentUserId?: string }> {
  const roomId = userPrivateGameMap.get(userId);
  
  console.log(`[InMemory-Matchmaking] Attempting to leave private room by user ID: ${userId}. Found in room: ${roomId || 'none'}`);
  if (!roomId) {
    return { success: false, message: "Você não está em uma sala privada." };
  }

  const game = privateGames.get(roomId);
  
  if (!game) {
    userPrivateGameMap.delete(userId); // Cleanup inconsistent mapping
    return { success: false, message: "Sala não encontrada, mas seu status foi corrigido."};
  }
  
  let opponentUserId: string | undefined = undefined;

  if (game.player1.userId === userId) {
    // Player 1 leaves, the entire room is destroyed.
    if (game.player2) opponentUserId = game.player2.userId;
    
    privateGames.delete(roomId);
    userPrivateGameMap.delete(userId);
    if (opponentUserId) {
      userPrivateGameMap.delete(opponentUserId);
    }
    matchResults.delete(roomId);
    
    console.log(`[InMemory-Matchmaking] P1 (${game.player1.displayName}) left. Room "${roomId}" destroyed.`);

  } else if (game.player2 && game.player2.userId === userId) {
    // Player 2 leaves, the room state reverts to waiting for a P2.
    opponentUserId = game.player1.userId;
    
    game.player2 = undefined; // Remove player2
    privateGames.set(roomId, game); // Update the in-memory game object
    userPrivateGameMap.delete(userId);
    matchResults.delete(roomId); // Match is disrupted
    
    console.log(`[InMemory-Matchmaking] P2 (${game.player2?.displayName || 'unknown'}) left room "${roomId}". Room is now open again.`);
  } else {
    // Inconsistent state, user is mapped to a room they aren't in.
    userPrivateGameMap.delete(userId);
    return { success: false, message: "Erro de consistência: Você não estava na sala designada." };
  }

  return { success: true, message: "Você saiu da sala privada.", opponentNotified: !!opponentUserId, opponentUserId };
}

export async function createGameFromInvitation(player1: PrivateGamePlayer, player2: PrivateGamePlayer): Promise<PrivateGame> {
  const gameId = uuidv4();
  const jitsiRoomName = `DuelVerse_Match_${gameId.substring(0, 8)}`;
  
  const newGame: PrivateGame = {
    roomId: gameId,
    player1,
    player2,
    jitsiRoomName,
    createdAt: Date.now(),
  };

  privateGames.set(gameId, newGame);

  // Map both users to this new game room
  userPrivateGameMap.set(player1.userId, gameId);
  userPrivateGameMap.set(player2.userId, gameId);
  
  console.log(`[InMemory-Matchmaking] Game created from invitation for ${player1.displayName} vs ${player2.displayName}. Room ID: ${gameId}`);
  
  return newGame;
}

// --- Public Matchmaking ---
export async function joinMatchmakingQueue(user: AuthUser, mode: MatchmakingQueueEntry['mode']) {
    const queueEntry: MatchmakingQueueEntry = {
        userId: user.id,
        displayName: user.displayName,
        score: user.score || 1000,
        timestamp: Date.now(),
        mode: mode,
    };
    matchmakingQueue.set(user.id, queueEntry);
    console.log(`[InMemory-Matchmaking] User ${user.displayName} (${user.id}) joined ${mode} queue.`);
}

export async function leaveMatchmakingQueue(userId: string) {
    if (matchmakingQueue.delete(userId)) {
      console.log(`[InMemory-Matchmaking] User ${userId} left matchmaking queue.`);
    } else {
      console.log(`[InMemory-Matchmaking] User ${userId} was not in matchmaking queue.`);
    }
}

export async function findMatch() {
    // This function would typically be triggered by a recurring task.
    // Here, it will just try to find a match among current queue entries.
    cleanupQueue(); // Ensure queue is clean before attempting to match

    const rankedPlayers: MatchmakingQueueEntry[] = [];
    const casualPlayers: MatchmakingQueueEntry[] = [];

    for (const entry of matchmakingQueue.values()) {
      if (entry.mode === 'ranked') {
        rankedPlayers.push(entry);
      } else if (entry.mode === 'casual') {
        casualPlayers.push(entry);
      }
    }

    let matchedGame: MatchedGame | null = null;

    // Prioritize matching ranked players
    if (rankedPlayers.length >= 2) {
        const [player1, player2] = rankedPlayers.splice(0, 2); // Take first two
        matchedGame = {
            gameId: uuidv4(),
            players: [
                { userId: player1.userId, displayName: player1.displayName },
                { userId: player2.userId, displayName: player2.displayName }
            ],
            jitsiRoomName: `DuelVerse_Public_${uuidv4().substring(0,8)}`,
            createdAt: Date.now(),
            mode: 'ranked'
        };
    } else if (casualPlayers.length >= 2) {
        const [player1, player2] = casualPlayers.splice(0, 2); // Take first two
        matchedGame = {
            gameId: uuidv4(),
            players: [
                { userId: player1.userId, displayName: player1.displayName },
                { userId: player2.userId, displayName: player2.displayName }
            ],
            jitsiRoomName: `DuelVerse_Public_${uuidv4().substring(0,8)}`,
            createdAt: Date.now(),
            mode: 'casual'
        };
    }

    if (matchedGame) {
        // Remove players from queue
        matchmakingQueue.delete(matchedGame.players[0].userId);
        matchmakingQueue.delete(matchedGame.players[1].userId);

        // Store the active game and map users to it
        activeGames.set(matchedGame.gameId, matchedGame);
        userGameMap.set(matchedGame.players[0].userId, matchedGame.gameId);
        userGameMap.set(matchedGame.players[1].userId, matchedGame.gameId);

        console.log(`[InMemory-Matchmaking] Matched game ${matchedGame.gameId} between ${matchedGame.players[0].displayName} and ${matchedGame.players[1].displayName}`);
        return matchedGame;
    }

    return null; // No match found
}

// --- Match Results ---
export async function getMatchResult(gameId: string): Promise<StoredMatchResult | null> {
    return matchResults.get(gameId) || null;
}

export async function storeMatchResult(gameId: string, result: StoredMatchResult) {
    matchResults.set(gameId, result);
    console.log(`[InMemory-Matchmaking] Stored result for game ${gameId}`);
}
