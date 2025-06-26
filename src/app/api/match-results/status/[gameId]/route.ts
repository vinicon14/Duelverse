// src/app/api/match-results/status/[gameId]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { activeGames, privateGames, matchResults } from '@/lib/matchmakingStore';

interface Params {
  gameId: string;
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const { gameId } = params;

    if (!gameId) {
      return NextResponse.json({ status: 'error', message: 'ID do jogo não fornecido.' }, { status: 400 });
    }

    // A partida é considerada 'resolvida' (e a notificação pode ser limpa)
    // se ela não estiver mais nos mapas de jogos ativos E não estiver mais nos resultados pendentes.
    // A rota de reporte principal limpa esses mapas assim que o resultado é finalizado.
    const gameExists = activeGames.has(gameId) || privateGames.has(gameId);
    const resultIsPending = matchResults.has(gameId);

    if (gameExists || resultIsPending) {
      // O jogo ainda existe ou resultado está pendente, então estamos aguardando o outro jogador.
      return NextResponse.json({ status: 'waiting' });
    } else {
      // O jogo não existe mais, o que significa que foi resolvido.
      return NextResponse.json({ status: 'resolved' });
    }

  } catch (error) {
    console.error('Error in /api/match-results/status:', error);
    const message = error instanceof Error ? error.message : 'Erro ao verificar o status do resultado da partida.';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}
