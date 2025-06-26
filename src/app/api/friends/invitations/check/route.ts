
// src/app/api/friends/invitations/check/route.ts
import { NextResponse } from 'next/server';
import { getPendingInvitationForUser } from '@/lib/userStore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ message: 'ID do usuário não fornecido.' }, { status: 400 });
    }

    const invitation = await getPendingInvitationForUser(userId);

    // No content if no invitation
    if (!invitation) {
      return new Response(null, { status: 204 });
    }
    
    return NextResponse.json(invitation);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao verificar convites.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
