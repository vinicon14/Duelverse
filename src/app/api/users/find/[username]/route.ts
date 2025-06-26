
// src/app/api/users/find/[username]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getUserByUsername } from '@/lib/userStore';

interface Params {
  username: string;
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const username = params.username;
    if (!username) {
      return NextResponse.json({ message: 'Nome de usuário não fornecido.' }, { status: 400 });
    }

    const user = await getUserByUsername(username);

    if (user) {
      // Return a subset of user data, or full data depending on privacy needs
      // For this prototype, returning most fields is fine.
      const { ...userData } = user; 
      return NextResponse.json(userData, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }
  } catch (error) {
    console.error(`Error in /api/users/find/${params.username}:`, error);
    const message = error instanceof Error ? error.message : 'Erro interno ao buscar usuário.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
