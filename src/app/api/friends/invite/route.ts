
// src/app/api/friends/invite/route.ts
import { NextResponse } from 'next/server';
import { createDuelInvitation, getUserByUsername, getUserById } from '@/lib/userStore';
import { userGameMap, userPrivateGameMap } from '@/lib/matchmakingStore';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const { fromUserId, toUsername } = await request.json();

    if (!fromUserId || !toUsername) {
      return NextResponse.json({ message: 'Dados do convite inválidos.' }, { status: 400 });
    }

    const [fromUser, toUser] = await Promise.all([
      getUserById(fromUserId),
      getUserByUsername(toUsername)
    ]);

    if (!fromUser || !toUser) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Check if users are busy
    if (userGameMap.has(fromUser.id) || userPrivateGameMap.has(fromUser.id)) {
        return NextResponse.json({ message: 'Você já está em uma partida ou sala.' }, { status: 409 });
    }
    if (userGameMap.has(toUser.id) || userPrivateGameMap.has(toUser.id)) {
        return NextResponse.json({ message: `${toUser.displayName} já está em uma partida ou sala.` }, { status: 409 });
    }

    // Check if target user is online
    const isTargetOnline = toUser.lastActiveAt && (Date.now() - toUser.lastActiveAt) < ONLINE_THRESHOLD_MS;
    if (!isTargetOnline) {
        return NextResponse.json({ message: `${toUser.displayName} não está online.` }, { status: 404 });
    }

    const invitation = await createDuelInvitation(fromUser, toUser);
    return NextResponse.json(invitation, { status: 201 });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao enviar convite.';
    const status = message.includes('Já existe um convite') ? 409 : 500;
    return NextResponse.json({ message }, { status });
  }
}
