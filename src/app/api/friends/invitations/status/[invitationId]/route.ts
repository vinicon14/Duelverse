
// src/app/api/friends/invitations/status/[invitationId]/route.ts
import { NextResponse } from 'next/server';
import { getInvitationById } from '@/lib/userStore';

interface Params {
  invitationId: string;
}

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { invitationId } = params;
    if (!invitationId) {
      return NextResponse.json({ message: 'ID do convite não fornecido.' }, { status: 400 });
    }
    
    const invitation = await getInvitationById(invitationId);
    if (!invitation) {
      return NextResponse.json({ message: 'Convite não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(invitation);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar status do convite.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
