
import { NextResponse, type NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import { privateGames, userPrivateGameMap } from '@/lib/matchmakingStore';
import type { PrivateRoomStatusResponse } from '@/lib/types';
import { getUserById } from '@/lib/userStore';

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
    const userId = decoded.userId; // Use userId from decoded token
    const { searchParams } = new URL(request.url);
    const clientRoomIdInput = searchParams.get('roomId'); 
    console.log(`[API /private-room/status] Request received. UserId: ${userId}, ClientRoomIdInput: "${clientRoomIdInput}"`);

    // Fetch user from the database - ensure user exists and is active
    const user = await getUserById(userId);
    if (!user) {
      console.warn(`[API /private-room/status] User with ID "${userId}" not found.`);
      return NextResponse.json({ status: 'error', message: 'Usuário não encontrado.' } as PrivateRoomStatusResponse, { status: 404 });
    }

    const clientRoomId = clientRoomIdInput?.trim().toUpperCase();
    const actualRoomId = clientRoomId || userPrivateGameMap.get(userId);
    console.log(`[API /private-room/status] Effective RoomId for lookup: "${actualRoomId}" (Client provided: "${clientRoomId}", Map derived: "${userPrivateGameMap.get(userId)}")`);

    if (!actualRoomId) {
      console.log(`[API /private-room/status] User ${userId} not in any private room or no roomId provided. Status: idle.`);
      return NextResponse.json({ status: 'idle', message: 'Você não está em uma sala privada ou ID da sala não fornecido.' } as PrivateRoomStatusResponse);
    }

    const game = privateGames.get(actualRoomId);

    if (!game) {
      // If the user is in the map but the game doesn't exist, it's an inconsistent state.
      if (userPrivateGameMap.has(userId)) {
        userPrivateGameMap.delete(userId);
        console.error(`[API Private Status] Data inconsistency for user ${userId}. Mapped to non-existent room ${actualRoomId}. Cleaned up entry.`);
        return NextResponse.json(
          { status: 'error', message: 'Ocorreu um erro de sincronização com a sala. Por favor, tente novamente.' } as PrivateRoomStatusResponse,
          { status: 500 }
        );
      }
      // If the user is not in the map (e.g., they provided a wrong ID), it's just 'not found'.
      console.warn(`[API /private-room/status] Game with ID "${actualRoomId}" not found in privateGames map.`);
      return NextResponse.json({ status: 'not_found', message: 'Sala privada não encontrada ou expirou.' } as PrivateRoomStatusResponse, { status: 404 });
    }
    
    // Ensure the polling user is actually part of this game (either player1 or player2)
    const isPlayerInRoom = game.player1.userId === userId || (game.player2 && game.player2.userId === userId);
    if (!isPlayerInRoom) {
        console.warn(`[API /private-room/status] User ${userId} is not part of room ${actualRoomId}. Unauthorized access attempt.`);
        return NextResponse.json({ status: 'error', message: 'Acesso negado à esta sala.' } as PrivateRoomStatusResponse, { status: 403 });
    }

    console.log(`[API /private-room/status] Game "${actualRoomId}" found. P1: ${game.player1.displayName}, P2: ${game.player2?.displayName || 'N/A'}. Jitsi: ${game.jitsiRoomName}`);

    const isRoomCreator = game.player1.userId === userId;

    if (game.player2) {
      console.log(`[API /private-room/status] Room "${actualRoomId}" ready. User ${userId} is ${isRoomCreator ? 'creator' : 'joiner'}. Opponent: ${isRoomCreator ? game.player2.displayName : game.player1.displayName}`);
      return NextResponse.json({
        status: 'ready_to_start',
        roomId: game.roomId,
        jitsiRoomName: game.jitsiRoomName,
        opponent: isRoomCreator ? game.player2 : game.player1,
        isRoomCreator,
        message: 'Oponente encontrado! Preparando para iniciar o duelo.',
      } as PrivateRoomStatusResponse);
    } else {
      if (isRoomCreator) {
        console.log(`[API /private-room/status] Room "${actualRoomId}" waiting for opponent. User ${userId} is creator.`);
        return NextResponse.json({
          status: 'waiting_for_opponent',
          roomId: game.roomId,
          jitsiRoomName: game.jitsiRoomName, 
          isRoomCreator,
          message: 'Aguardando oponente entrar na sala.',
        } as PrivateRoomStatusResponse);
      } else {
        // User is not P1 and P2 hasn't joined yet. This means the user is polling for a room they haven't successfully joined as P2, or an invalid room.
        console.warn(`[API /private-room/status] User ${userId} polling for room "${actualRoomId}" but is not P1 and P2 is not present. Status: not_found (effectively).`);
        return NextResponse.json({ status: 'not_found', message: 'Sala não encontrada ou você não faz parte dela ainda.' } as PrivateRoomStatusResponse, { status: 404 });
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /private-room/status] Error in /api/private-room/status:', errorMessage, error);
    return NextResponse.json({ status: 'error', message: 'Erro ao verificar status da sala privada.' } as PrivateRoomStatusResponse, { status: 500 });
  }
}
