
// src/app/api/friends/invitations/respond/route.ts
import { NextResponse } from 'next/server';
import { getInvitationById, updateInvitation, getUserById } from '@/lib/userStore';
import { createGameFromInvitation } from '@/lib/matchmakingStore';

export async function POST(request: Request) {
  try {
    const { invitationId, response } = await request.json() as { invitationId: string, response: 'accept' | 'decline' };
    
    if (!invitationId || !response) {
      return NextResponse.json({ message: 'Dados da resposta inválidos.' }, { status: 400 });
    }

    const invitation = await getInvitationById(invitationId);
    if (!invitation || invitation.status !== 'pending') {
      return NextResponse.json({ message: 'Convite não encontrado ou já respondido.' }, { status: 404 });
    }

    if (response === 'decline') {
      await updateInvitation(invitationId, { status: 'declined' });
      return NextResponse.json({ message: 'Convite recusado.' });
    }

    if (response === 'accept') {
      const [fromUser, toUser] = await Promise.all([
          getUserById(invitation.fromUserId),
          getUserById(invitation.toUserId),
      ]);
      
      if (!fromUser || !toUser) {
        await updateInvitation(invitationId, { status: 'error' });
        return NextResponse.json({ message: 'Um dos jogadores não pôde ser encontrado.' }, { status: 404 });
      }

      const game = createGameFromInvitation(
          { userId: fromUser.id, displayName: fromUser.displayName },
          { userId: toUser.id, displayName: toUser.displayName }
      );
      
      await updateInvitation(invitationId, {
        status: 'accepted',
        gameId: game.roomId,
        jitsiRoomName: game.jitsiRoomName,
      });

      // The response to the user who accepted is the game object
      return NextResponse.json(game);
    }
    
    return NextResponse.json({ message: 'Resposta inválida.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao responder ao convite.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
