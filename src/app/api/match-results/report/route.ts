
// src/app/api/match-results/report/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { matchResults, activeGames, privateGames, userGameMap, userPrivateGameMap } from '@/lib/matchmakingStore'; 
import { updateUser, getUserById, getServerStatus } from '@/lib/userStore';
import type { ReportResultRequest, ReportResultResponse, StoredMatchResult, User } from '@/lib/types';

// --- Dynamic Scoring Constants ---
const BASE_POINTS_WIN = 15;
const BASE_POINTS_LOSS = -15; // Losing points is fixed
const POINTS_DRAW = 0;
const DURATION_BONUS_PER_X_MINUTES = 5; // Grant bonus for every X minutes
const DURATION_BONUS_POINTS = 1; // Points per bonus interval
const MAX_DURATION_BONUS = 10; // Max bonus points for long matches (e.g., for a 50 min+ game)
const MIN_MATCH_TIME_FOR_BONUS_MINUTES = 5; // Match must be at least 5 minutes to start earning bonus

async function applyScoreUpdate(userId: string, points: number): Promise<User | null> {
  console.log(`[API ReportResult - applyScoreUpdate] Attempting to update score for userId: ${userId} by ${points} points.`);
  const user = await getUserById(userId);
  if (!user) {
    console.warn(`[API ReportResult - applyScoreUpdate] User with ID ${userId} not found. Cannot update score.`);
    return null;
  }
  // No score change if points are 0, but we still want to get the latest user data back.
  if (points !== 0) {
    const newScore = Math.max(0, (user.score || 0) + points);
    console.log(`[API ReportResult - applyScoreUpdate] User ${user.username} (ID: ${userId}): oldScore=${user.score}, newScore=${newScore}`);
    return updateUser(user.username, { score: newScore });
  }
  return user; // Return the current user object if no score change
}

export async function POST(request: NextRequest) {
  const serverStatus = await getServerStatus();
  if (serverStatus === 'offline') {
    return NextResponse.json({ status: 'error', message: 'O servidor está em manutenção. Não é possível reportar resultados.' }, { status: 503 });
  }

  console.log("[API ReportResult] Received request to report match result.");
  try {
    const { gameId, userId, outcome, opponentId, isRanked } = (await request.json()) as ReportResultRequest;
    console.log(`[API ReportResult] Data: gameId=${gameId}, userId=${userId}, outcome=${outcome}, opponentId=${opponentId}, isRanked=${isRanked}`);

    if (!gameId || !userId || !outcome) {
      console.warn("[API ReportResult] Invalid data for reporting result.");
      return NextResponse.json({ status: 'error', message: 'Dados inválidos para reportar resultado.' } as ReportResultResponse, { status: 400 });
    }

    const gameDetails = activeGames.get(gameId) || privateGames.get(gameId);
    let currentStoredResult = matchResults.get(gameId);

    // --- Game Reconstruction Logic (for server restarts) ---
    if (!currentStoredResult && !gameDetails && opponentId && userId) {
        console.log(`[API ReportResult] Game ${gameId} not in memory. Reconstructing from client report.`);
        currentStoredResult = {
            player1Id: userId,
            player2Id: opponentId,
        };
    } else if (!currentStoredResult && gameDetails) {
         const p1IdFromSource = 'players' in gameDetails ? gameDetails.players[0].userId : gameDetails.player1.userId;
         const player2User = 'players' in gameDetails ? gameDetails.players[1] : gameDetails.player2;
         const p2IdFromSource = player2User?.userId;
         if (p1IdFromSource && p2IdFromSource) {
            currentStoredResult = { player1Id: p1IdFromSource, player2Id: p2IdFromSource };
         }
    }
    
    if (!currentStoredResult) {
        console.error(`[API ReportResult] CRITICAL: Cannot determine players for game ${gameId}. No details in memory and not enough info from client.`);
        matchResults.delete(gameId); 
        return NextResponse.json({ status: 'error', message: 'Jogo não encontrado ou detalhes do jogo expiraram. Não é possível reportar.' } as ReportResultResponse, { status: 404 });
    }
    // --- End Reconstruction Logic ---
    
    const finalPlayer1Id = currentStoredResult.player1Id;
    const finalPlayer2Id = currentStoredResult.player2Id;

    if (userId !== finalPlayer1Id && userId !== finalPlayer2Id) {
        console.warn(`[API ReportResult] Unauthorized report for gameId ${gameId}: User ${userId} is not part of this game (P1: ${finalPlayer1Id}, P2: ${finalPlayer2Id}).`);
        return NextResponse.json({ status: 'error', message: 'Você não faz parte deste jogo.' } as ReportResultResponse, { status: 403 });
    }

    let userRole: 'player1' | 'player2' = userId === finalPlayer1Id ? 'player1' : 'player2';

    if ((userRole === 'player1' && currentStoredResult.player1Outcome) || (userRole === 'player2' && currentStoredResult.player2Outcome)) {
        console.log(`[API ReportResult] Duplicate report for gameId ${gameId} by ${userRole} (${userId}). Current outcomes: P1=${currentStoredResult.player1Outcome}, P2=${currentStoredResult.player2Outcome}`);
        return NextResponse.json({ status: 'already_submitted', message: 'Você já reportou o resultado para esta partida.' } as ReportResultResponse, { status: 409 });
    }
    
    if (userRole === 'player1') {
        currentStoredResult.player1Outcome = outcome;
    } else {
        currentStoredResult.player2Outcome = outcome;
    }

    matchResults.set(gameId, currentStoredResult);
    console.log(`[API ReportResult] Stored outcome ${outcome} for ${userRole} (${userId}) in gameId ${gameId}. MatchResults now: P1_ID=${finalPlayer1Id}, P1_Outcome=${currentStoredResult.player1Outcome}, P2_ID=${finalPlayer2Id}, P2_Outcome=${currentStoredResult.player2Outcome}`);

    if (currentStoredResult.player1Outcome && currentStoredResult.player2Outcome) {
      console.log(`[API ReportResult] Both players reported for gameId ${gameId}. P1: ${currentStoredResult.player1Outcome}, P2: ${currentStoredResult.player2Outcome}. Processing final result.`);
      
      let p1ScoreChange = 0;
      let p2ScoreChange = 0;
      let p1Message = "";
      let p2Message = "";
      let status: ReportResultResponse['status'] = 'success';

      const isConclusiveWin = currentStoredResult.player1Outcome === 'win' && currentStoredResult.player2Outcome === 'loss';
      const isConclusiveLoss = currentStoredResult.player1Outcome === 'loss' && currentStoredResult.player2Outcome === 'win';
      const isConclusiveDraw = currentStoredResult.player1Outcome === 'draw' && currentStoredResult.player2Outcome === 'draw';

      if (isConclusiveWin || isConclusiveLoss || isConclusiveDraw) {
        const isRankedGame = (gameDetails && 'mode' in gameDetails && gameDetails.mode === 'ranked') || isRanked;
        
        if (isRankedGame) {
          let durationBonus = 0;
          if (gameDetails) {
            const matchDurationMs = Date.now() - gameDetails.createdAt;
            const matchDurationMinutes = matchDurationMs / (1000 * 60);

            if (matchDurationMinutes >= MIN_MATCH_TIME_FOR_BONUS_MINUTES) {
              const bonusIntervals = Math.floor((matchDurationMinutes - MIN_MATCH_TIME_FOR_BONUS_MINUTES) / DURATION_BONUS_PER_X_MINUTES);
              durationBonus = Math.min(MAX_DURATION_BONUS, bonusIntervals * DURATION_BONUS_POINTS);
            }
            console.log(`[API ReportResult] RANKED game. Duration: ${matchDurationMinutes.toFixed(2)} mins. Bonus: ${durationBonus}.`);
          } else {
             console.log(`[API ReportResult] RANKED game (reconstructed). NO duration bonus applied for gameId ${gameId}.`);
          }

          if (isConclusiveWin) {
            p1ScoreChange = BASE_POINTS_WIN + durationBonus;
            p2ScoreChange = BASE_POINTS_LOSS;
            p1Message = `Resultados confirmados! Você ganhou ${p1ScoreChange} pontos.`;
            p2Message = `Resultados confirmados! Você perdeu ${Math.abs(p2ScoreChange)} pontos.`;
          } else if (isConclusiveLoss) {
            p1ScoreChange = BASE_POINTS_LOSS;
            p2ScoreChange = BASE_POINTS_WIN + durationBonus;
            p1Message = `Resultados confirmados! Você perdeu ${Math.abs(p1ScoreChange)} pontos.`;
            p2Message = `Resultados confirmados! Você ganhou ${p2ScoreChange} pontos.`;
          } else { // Draw
            p1ScoreChange = p2ScoreChange = POINTS_DRAW;
            p1Message = p2Message = "Empate confirmado! Nenhuma alteração na pontuação.";
          }
        } else {
          console.log(`[API ReportResult] CASUAL or PRIVATE game. Result confirmed, but NO score updates applied for gameId ${gameId}.`);
          p1Message = p2Message = "Resultados confirmados! Nenhuma pontuação foi alterada para esta partida não ranqueada.";
        }
      } else {
        status = 'conflict';
        p1Message = p2Message = "Conflito nos resultados reportados. Nenhuma pontuação foi alterada. Contate um administrador se necessário.";
        console.warn(`[API ReportResult] Conflict in reported results for gameId ${gameId}. P1 reported ${currentStoredResult.player1Outcome}, P2 reported ${currentStoredResult.player2Outcome}.`);
      }
      
      let updatedP1: User | null = null;
      let updatedP2: User | null = null;
      
      if (status === 'success') {
        console.log(`[API ReportResult] Applying score updates for gameId ${gameId}. P1(${finalPlayer1Id}): ${p1ScoreChange}, P2(${finalPlayer2Id}): ${p2ScoreChange}`);
        // This now runs even for draws (where score change is 0) to ensure the client gets fresh user data.
        updatedP1 = await applyScoreUpdate(finalPlayer1Id, p1ScoreChange);
        updatedP2 = await applyScoreUpdate(finalPlayer2Id, p2ScoreChange);
         if(!updatedP1 && p1ScoreChange !== 0) { console.error(`[API ReportResult] CRITICAL: Failed to update score for P1 (ID: ${finalPlayer1Id})`); }
         if(!updatedP2 && p2ScoreChange !== 0) { console.error(`[API ReportResult] CRITICAL: Failed to update score for P2 (ID: ${finalPlayer2Id})`); }
      }

      matchResults.delete(gameId); 
      console.log(`[API ReportResult] Cleared entry from matchResults for gameId ${gameId}.`);
      
      if (activeGames.has(gameId)) {
          activeGames.delete(gameId);
          userGameMap.delete(finalPlayer1Id); 
          if (finalPlayer2Id) userGameMap.delete(finalPlayer2Id); 
          console.log(`[API ReportResult] Cleared public game ${gameId} from activeGames and userGameMap.`);
      } else if (privateGames.has(gameId)) {
          privateGames.delete(gameId);
          userPrivateGameMap.delete(finalPlayer1Id);
          if (finalPlayer2Id) userPrivateGameMap.delete(finalPlayer2Id);
          console.log(`[API ReportResult] Cleared private game ${gameId} from privateGames and userPrivateGameMap.`);
      }

      const reportingUserIsPlayer1 = userId === finalPlayer1Id;
      const responsePayload: ReportResultResponse = { 
        status, 
        message: reportingUserIsPlayer1 ? p1Message : p2Message, 
        updatedUser: reportingUserIsPlayer1 ? updatedP1 : updatedP2 
      };
      console.log(`[API ReportResult] Sending final response for gameId ${gameId} to user ${userId}:`, responsePayload);
      return NextResponse.json(responsePayload);

    } else {
      console.log(`[API ReportResult] Waiting for opponent's report for gameId ${gameId}. Current reporter: ${userRole} (${userId}).`);
      return NextResponse.json({ status: 'waiting', message: 'Resultado submetido. Aguardando oponente.' } as ReportResultResponse);
    }

  } catch (error) {
    console.error('[API ReportResult] General error:', error);
    const message = error instanceof Error ? error.message : 'Erro ao reportar resultado.';
    return NextResponse.json({ status: 'error', message } as ReportResultResponse, { status: 500 });
  }
}
    

