
import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { matchResults, activeGames, privateGames, userGameMap, userPrivateGameMap } from '@/lib/matchmakingStore'; 
import { updateUser, getUserById, getServerStatus } from '@/lib/userStore';
import type { ReportResultRequest, ReportResultResponse, StoredMatchResult, User } from '@/lib/types';

// --- Dynamic Scoring Constants ---
const BASE_POINTS_WIN = 15;
const BASE_POINTS_LOSS = -15; 
const POINTS_DRAW = 0;
const DURATION_BONUS_PER_X_MINUTES = 5; 
const DURATION_BONUS_POINTS = 1;
const MAX_DURATION_BONUS = 10;
const MIN_MATCH_TIME_FOR_BONUS_MINUTES = 5;

async function applyScoreUpdate(userId: string, points: number): Promise<User | null> {
  const user = await getUserById(userId);
  if (!user) return null;
  if (points !== 0) {
    const newScore = Math.max(0, (user.score || 0) + points);
    // Note: Assuming updateUser now takes a UID. If it uses username, this needs adjustment.
    return updateUser(user.id, { score: newScore });
  }
  return user;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const serverStatus = await getServerStatus();
  if (serverStatus === 'offline') {
    return NextResponse.json({ status: 'error', message: 'O servidor está em manutenção. Não é possível reportar resultados.' }, { status: 503 });
  }

  try {
    const { gameId, outcome, opponentId, isRanked } = (await request.json()) as Omit<ReportResultRequest, 'userId'>;

    if (!gameId || !outcome) {
      return NextResponse.json({ status: 'error', message: 'Dados inválidos para reportar resultado.' } as ReportResultResponse, { status: 400 });
    }

    const gameDetails = activeGames.get(gameId) || privateGames.get(gameId);
    let currentStoredResult = matchResults.get(gameId);

    if (!currentStoredResult && !gameDetails && opponentId) {
        currentStoredResult = { player1Id: userId, player2Id: opponentId };
    } else if (!currentStoredResult && gameDetails) {
         const p1IdFromSource = 'players' in gameDetails ? gameDetails.players[0].userId : gameDetails.player1.userId;
         const player2User = 'players' in gameDetails ? gameDetails.players[1] : gameDetails.player2;
         const p2IdFromSource = player2User?.userId;
         if (p1IdFromSource && p2IdFromSource) {
            currentStoredResult = { player1Id: p1IdFromSource, player2Id: p2IdFromSource };
         }
    }
    
    if (!currentStoredResult) {
        matchResults.delete(gameId); 
        return NextResponse.json({ status: 'error', message: 'Jogo não encontrado ou detalhes do jogo expiraram.' } as ReportResultResponse, { status: 404 });
    }
    
    const finalPlayer1Id = currentStoredResult.player1Id;
    const finalPlayer2Id = currentStoredResult.player2Id;

    if (userId !== finalPlayer1Id && userId !== finalPlayer2Id) {
        return NextResponse.json({ status: 'error', message: 'Você não faz parte deste jogo.' } as ReportResultResponse, { status: 403 });
    }

    let userRole: 'player1' | 'player2' = userId === finalPlayer1Id ? 'player1' : 'player2';

    if ((userRole === 'player1' && currentStoredResult.player1Outcome) || (userRole === 'player2' && currentStoredResult.player2Outcome)) {
        return NextResponse.json({ status: 'already_submitted', message: 'Você já reportou o resultado.' } as ReportResultResponse, { status: 409 });
    }
    
    if (userRole === 'player1') currentStoredResult.player1Outcome = outcome;
    else currentStoredResult.player2Outcome = outcome;

    matchResults.set(gameId, currentStoredResult);

    if (currentStoredResult.player1Outcome && currentStoredResult.player2Outcome) {
      let p1ScoreChange = 0;
      let p2ScoreChange = 0;
      let p1Message = "", p2Message = "";
      let status: ReportResultResponse['status'] = 'success';

      const isConclusiveWin = currentStoredResult.player1Outcome === 'win' && currentStoredResult.player2Outcome === 'loss';
      const isConclusiveLoss = currentStoredResult.player1Outcome === 'loss' && currentStoredResult.player2Outcome === 'win';
      const isConclusiveDraw = currentStoredResult.player1Outcome === 'draw' && currentStoredResult.player2Outcome === 'draw';

      if (isConclusiveWin || isConclusiveLoss || isConclusiveDraw) {
        const isRankedGame = (gameDetails && 'mode' in gameDetails && gameDetails.mode === 'ranked') || isRanked;
        
        if (isRankedGame) {
          let durationBonus = 0;
          if (gameDetails) {
            const durationMinutes = (Date.now() - gameDetails.createdAt) / 60000;
            if (durationMinutes >= MIN_MATCH_TIME_FOR_BONUS_MINUTES) {
              const bonusIntervals = Math.floor((durationMinutes - MIN_MATCH_TIME_FOR_BONUS_MINUTES) / DURATION_BONUS_PER_X_MINUTES);
              durationBonus = Math.min(MAX_DURATION_BONUS, bonusIntervals * DURATION_BONUS_POINTS);
            }
          }

          if (isConclusiveWin) {
            p1ScoreChange = BASE_POINTS_WIN + durationBonus; p2ScoreChange = BASE_POINTS_LOSS;
            p1Message = `Resultados confirmados! Você ganhou ${p1ScoreChange} pontos.`; p2Message = `Resultados confirmados! Você perdeu ${Math.abs(p2ScoreChange)} pontos.`;
          } else if (isConclusiveLoss) {
            p1ScoreChange = BASE_POINTS_LOSS; p2ScoreChange = BASE_POINTS_WIN + durationBonus;
            p1Message = `Resultados confirmados! Você perdeu ${Math.abs(p1ScoreChange)} pontos.`; p2Message = `Resultados confirmados! Você ganhou ${p2ScoreChange} pontos.`;
          } else { // Draw
            p1ScoreChange = p2ScoreChange = POINTS_DRAW;
            p1Message = p2Message = "Empate confirmado! Nenhuma alteração na pontuação.";
          }
        } else {
          p1Message = p2Message = "Resultados confirmados! Nenhuma pontuação foi alterada para esta partida não ranqueada.";
        }
      } else {
        status = 'conflict';
        p1Message = p2Message = "Conflito nos resultados. Contate um administrador.";
      }
      
      let updatedP1: User | null = null, updatedP2: User | null = null;
      if (status === 'success') {
        updatedP1 = await applyScoreUpdate(finalPlayer1Id, p1ScoreChange);
        updatedP2 = await applyScoreUpdate(finalPlayer2Id, p2ScoreChange);
      }

      matchResults.delete(gameId); 
      if (activeGames.has(gameId)) {
          activeGames.delete(gameId); userGameMap.delete(finalPlayer1Id); if(finalPlayer2Id) userGameMap.delete(finalPlayer2Id);
      } else if (privateGames.has(gameId)) {
          privateGames.delete(gameId); userPrivateGameMap.delete(finalPlayer1Id); if(finalPlayer2Id) userPrivateGameMap.delete(finalPlayer2Id);
      }

      const reportingUserIsPlayer1 = userId === finalPlayer1Id;
      const responsePayload: ReportResultResponse = { 
        status, 
        message: reportingUserIsPlayer1 ? p1Message : p2Message, 
        updatedUser: reportingUserIsPlayer1 ? updatedP1 : updatedP2 
      };
      return NextResponse.json(responsePayload);

    } else {
      return NextResponse.json({ status: 'waiting', message: 'Resultado submetido. Aguardando oponente.' } as ReportResultResponse);
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao reportar resultado.';
    return NextResponse.json({ status: 'error', message } as ReportResultResponse, { status: 500 });
  }
}
