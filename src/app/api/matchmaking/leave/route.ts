
import { NextResponse, type NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import { matchmakingQueue, userGameMap } from '@/lib/matchmakingStore';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET não está definido nas variáveis de ambiente');
    return NextResponse.json({ message: 'Erro de configuração do servidor' }, { status: 500 });
  }

  let decoded: { userId: string };
  try {
    decoded = verify(token, secret) as { userId: string };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return NextResponse.json({ message: 'Token inválido' }, { status: 401 });
  }

  try {
    const userId = decoded.userId;

    const queueIndex = matchmakingQueue.findIndex(p => p.userId === userId);
    if (queueIndex > -1) {
      matchmakingQueue.splice(queueIndex, 1);
      return NextResponse.json({ message: 'Você saiu da fila de pareamento.' });
    }

    if (userGameMap.has(userId)) {
        return NextResponse.json({ message: 'Você já está em uma partida. Reporte o resultado para sair.' }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'Você não estava na fila.' });

  } catch (error) {
    console.error('Error in /api/matchmaking/leave:', error);
    return NextResponse.json({ message: 'Erro ao sair da fila.' }, { status: 500 });
  }
}
