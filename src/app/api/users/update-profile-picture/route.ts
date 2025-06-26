
// src/app/api/users/update-profile-picture/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { updateUser, getUserByUsername } from '@/lib/userStore';

export async function POST(request: NextRequest) {
  try {
    const { username, profilePictureUrl } = await request.json();

    if (!username || typeof profilePictureUrl === 'undefined') { // Allow empty string for URL to clear it
      return NextResponse.json({ message: 'Nome de usuário e URL da foto de perfil são obrigatórios.' }, { status: 400 });
    }

    const existingUser = await getUserByUsername(username);
    if (!existingUser) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }
    
    const updatedUser = await updateUser(username, { profilePictureUrl });

    if (updatedUser) {
      return NextResponse.json(updatedUser, { status: 200 });
    } else {
      // This case should ideally not be reached if getUserByUsername found the user
      return NextResponse.json({ message: 'Falha ao atualizar foto de perfil.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in /api/users/update-profile-picture:', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao atualizar foto de perfil.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
