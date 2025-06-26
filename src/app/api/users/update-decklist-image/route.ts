
// src/app/api/users/update-decklist-image/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { updateUser, getUserByUsername } from '@/lib/userStore';

export async function POST(request: NextRequest) {
  try {
    const { username, decklistImageUrl } = await request.json();

    if (!username || typeof decklistImageUrl === 'undefined') { // Allow empty string for URL
      return NextResponse.json({ message: 'Nome de usuário e URL da imagem da decklist são obrigatórios.' }, { status: 400 });
    }
    
    const existingUser = await getUserByUsername(username);
    if (!existingUser) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    const updatedUser = await updateUser(username, { decklistImageUrl });

    if (updatedUser) {
      return NextResponse.json(updatedUser, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Falha ao atualizar imagem da decklist.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in /api/users/update-decklist-image:', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao atualizar imagem da decklist.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
