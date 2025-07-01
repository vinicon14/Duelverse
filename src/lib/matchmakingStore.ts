
import { adminDatabase } from '@/lib/firebaseConfig';
import type { MatchmakingQueueEntry, MatchedGame, PrivateGame, User as AuthUser, StoredMatchResult, PrivateGamePlayer } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const db = adminDatabase;

// --- Database References ---
const matchmakingQueueRef = db.ref('matchmakingQueue');
const activeGamesRef = db.ref('activeGames');
const userGameMapRef = db.ref('userGameMap'); // Maps userId to a public gameId
const privateGamesRef = db.ref('privateGames');
const userPrivateGameMapRef = db.ref('userPrivateGameMap'); // Maps userId to a private roomId
const matchResultsRef = db.ref('matchResults');

// --- Helper Functions to Interact with Realtime Database ---

// Note: The logic for cleaning up stale data (e.g., old queue entries, abandoned games)
// should be handled by a separate, scheduled process (like a Cloud Function) in a production environment.
// For this refactoring, we focus on the core matchmaking logic.

export async function createPrivateRoom(player1: AuthUser, customRoomIdInput?: string): Promise<{ success: boolean; roomId?: string; jitsiRoomName?: string; message?: string }> {
  const trimmedCustomRoomId = customRoomIdInput?.trim().toUpperCase();
  const roomId = trimmedCustomRoomId && trimmedCustomRoomId.length > 0
               ? trimmedCustomRoomId
               : uuidv4().substring(0, 6).toUpperCase();

  console.log(`[RTDB-Matchmaking] Attempting to create private room. Requested ID: "${customRoomIdInput}", Effective ID: "${roomId}" by P1: ${player1.displayName} (ID: ${player1.id})`);

  const roomRef = privateGamesRef.child(roomId);
  const userInGameRef = userPrivateGameMapRef.child(player1.id);
  const userInPublicGameRef = userGameMapRef.child(player1.id);

  // Check if user is already in any game
  if ((await userInGameRef.get()).exists() || (await userInPublicGameRef.get()).exists()) {
    console.warn(`[RTDB-Matchmaking] Private room creation failed: Player ${player1.displayName} is already in a room or queue.`);
    return { success: false, message: 'Você já está em uma sala ou na fila de pareamento público.' };
  }

  // Use a transaction to ensure atomic creation
  const { committed, snapshot } = await roomRef.transaction((currentData) => {
    if (currentData === null) {
      // Room does not exist, create it
      return {
        roomId,
        player1: { userId: player1.id, displayName: player1.displayName },
        jitsiRoomName: `DuelVerse_Private_${roomId}`,
        createdAt: Date.now(),
      };
    }
    // Room already exists, abort transaction
    return;
  });

  if (!committed) {
    console.warn(`[RTDB-Matchmaking] Private room creation failed: Room ID "${roomId}" already in use.`);
    return { success: false, message: 'ID da sala já em uso. Tente um ID diferente ou deixe em branco para gerar um aleatório.' };
  }

  // If room created successfully, map the user to the room
  await userInGameRef.set(roomId);
  const newPrivateGame = snapshot.val() as PrivateGame;
  
  console.log(`[RTDB-Matchmaking] Private room "${roomId}" CREATED by ${player1.displayName}. Jitsi: "${newPrivateGame.jitsiRoomName}".`);
  return { success: true, roomId, jitsiRoomName: newPrivateGame.jitsiRoomName };
}

export async function joinPrivateRoom(player2: AuthUser, roomIdInput: string): Promise<{ success: boolean; game?: PrivateGame; message?: string }> {
    const roomId = roomIdInput.trim().toUpperCase();
    console.log(`[RTDB-Matchmaking] Attempting to join private room "${roomId}" by P2: ${player2.displayName} (ID: ${player2.id})`);

    const roomRef = privateGamesRef.child(roomId);
    const userInGameRef = userPrivateGameMapRef.child(player2.id);
    const userInPublicGameRef = userGameMapRef.child(player2.id);

    // Check if user is already in any game
    if ((await userInGameRef.get()).exists() || (await userInPublicGameRef.get()).exists()) {
        console.warn(`[RTDB-Matchmaking] Join private room failed: Player ${player2.displayName} is already in another room or queue.`);
        return { success: false, message: 'Você já está em uma sala ou na fila de pareamento público.' };
    }
    
    let joinedGame: PrivateGame | undefined;
    const { committed, snapshot } = await roomRef.transaction((currentData: PrivateGame | null) => {
        if (currentData === null) {
            return; // Abort, room doesn't exist
        }
        if (currentData.player2) {
            return; // Abort, room is full
        }
        if (currentData.player1.userId === player2.id) {
            return; // Abort, cannot join your own room
        }
        currentData.player2 = { userId: player2.id, displayName: player2.displayName };
        return currentData;
    });

    if (!committed) {
        const game = (await roomRef.get()).val();
        if(!game) return { success: false, message: "Sala privada não encontrada." };
        if(game.player2) return { success: false, message: "Esta sala privada já está cheia." };
        if(game.player1.userId === player2.id) return { success: false, message: "Você não pode entrar na sua própria sala como oponente." };
        return { success: false, message: "Não foi possível entrar na sala." }; // Generic failure
    }
    
    await userInGameRef.set(roomId);
    joinedGame = snapshot.val() as PrivateGame;
    
    console.log(`[RTDB-Matchmaking] Player ${player2.displayName} JOINED private room "${roomId}".`);
    return { success: true, game: joinedGame };
}


export async function leavePrivateRoom(userId: string): Promise<{ success: boolean; message: string; opponentNotified?: boolean, opponentUserId?: string }> {
  const roomIdSnapshot = await userPrivateGameMapRef.child(userId).get();
  const roomId = roomIdSnapshot.val();
  
  console.log(`[RTDB-Matchmaking] Attempting to leave private room by user ID: ${userId}. Found in room: ${roomId || 'none'}`);
  if (!roomId) {
    return { success: false, message: "Você não está em uma sala privada." };
  }

  const roomRef = privateGamesRef.child(roomId);
  const gameSnapshot = await roomRef.get();
  
  if (!gameSnapshot.exists()) {
    await userPrivateGameMapRef.child(userId).remove(); // Cleanup inconsistent mapping
    return { success: false, message: "Sala não encontrada, mas seu status foi corrigido."};
  }
  
  const game = gameSnapshot.val() as PrivateGame;
  let opponentUserId: string | undefined = undefined;

  if (game.player1.userId === userId) {
    // Player 1 leaves, the entire room is destroyed.
    if (game.player2) opponentUserId = game.player2.userId;
    
    await roomRef.remove();
    await userPrivateGameMapRef.child(userId).remove();
    if (opponentUserId) {
      await userPrivateGameMapRef.child(opponentUserId).remove();
    }
    await matchResultsRef.child(roomId).remove();
    
    console.log(`[RTDB-Matchmaking] P1 (${game.player1.displayName}) left. Room "${roomId}" destroyed.`);

  } else if (game.player2 && game.player2.userId === userId) {
    // Player 2 leaves, the room state reverts to waiting for a P2.
    opponentUserId = game.player1.userId;
    
    await roomRef.child('player2').remove();
    await userPrivateGameMapRef.child(userId).remove();
    await matchResultsRef.child(roomId).remove(); // Match is disrupted
    
    console.log(`[RTDB-Matchmaking] P2 (${game.player2.displayName}) left room "${roomId}". Room is now open again.`);
  } else {
    // Inconsistent state, user is mapped to a room they aren't in.
    await userPrivateGameMapRef.child(userId).remove();
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

  const roomRef = privateGamesRef.child(gameId);
  await roomRef.set(newGame);

  // Map both users to this new game room
  await userPrivateGameMapRef.child(player1.userId).set(gameId);
  await userPrivateGameMapRef.child(player2.userId).set(gameId);
  
  console.log(`[RTDB-Matchmaking] Game created from invitation for ${player1.displayName} vs ${player2.displayName}. Room ID: ${gameId}`);
  
  return newGame;
}

// --- Public Matchmaking ---
export async function joinMatchmakingQueue(user: AuthUser, deckId: string) {
    const queueEntry: MatchmakingQueueEntry = {
        userId: user.id,
        displayName: user.displayName,
        score: user.score || 1000,
        deckId: deckId,
        timestamp: Date.now()
    };
    await matchmakingQueueRef.child(user.id).set(queueEntry);
}

export async function leaveMatchmakingQueue(userId: string) {
    await matchmakingQueueRef.child(userId).remove();
}

export async function findMatch() {
    // This function would be triggered by a recurring task (e.g., Cloud Function)
    // It scans the queue and attempts to create matches.
    // The implementation can be complex (e.g., considering score ranges).
    // For now, we'll keep it simple and match the first two players.
    
    const snapshot = await matchmakingQueueRef.orderByChild('timestamp').limitToFirst(2).get();
    if (snapshot.numChildren() < 2) {
        return null; // Not enough players to match
    }

    const players: MatchmakingQueueEntry[] = [];
    snapshot.forEach(child => {
        players.push(child.val());
    });
    
    const [player1, player2] = players;
    
    // Create a new game
    const gameId = uuidv4();
    const newGame: MatchedGame = {
        gameId,
        players: [
            { userId: player1.userId, displayName: player1.displayName },
            { userId: player2.userId, displayName: player2.displayName }
        ],
        jitsiRoomName: `DuelVerse_Public_${gameId.substring(0,8)}`,
        createdAt: Date.now(),
        status: 'pending'
    };

    // Use a multi-path update to atomically create the game and remove players from queue
    const updates: { [key: string]: any } = {};
    updates[`/activeGames/${gameId}`] = newGame;
    updates[`/userGameMap/${player1.userId}`] = gameId;
    updates[`/userGameMap/${player2.userId}`] = gameId;
    updates[`/matchmakingQueue/${player1.userId}`] = null; // Remove from queue
    updates[`/matchmakingQueue/${player2.userId}`] = null; // Remove from queue

    await db.ref().update(updates);

    return newGame;
}

// --- Match Results ---
export async function getMatchResult(gameId: string): Promise<StoredMatchResult | null> {
    const snapshot = await matchResultsRef.child(gameId).get();
    return snapshot.exists() ? snapshot.val() : null;
}

export async function storeMatchResult(gameId: string, result: StoredMatchResult) {
    await matchResultsRef.child(gameId).set(result);
}
