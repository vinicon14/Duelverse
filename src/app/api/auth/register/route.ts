
import { NextResponse, type NextRequest } from 'next/server';
import { createUser, getUserByUsername } from '@/lib/userStore';

export async function POST(request: NextRequest) {
  try {
    const { username, password, displayName, country } = await request.json();

    if (!username || !password || !displayName || !country) {
      return NextResponse.json({ message: 'Todos os campos são obrigatórios.' }, { status: 400 });
    }
    
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
        return NextResponse.json({ message: 'Este nome de usuário já existe.' }, { status: 409 });
    }

    const uid = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    await createUser(uid, username, displayName, country, password);

    return NextResponse.json({ uid: uid, message: 'Usuário registrado com sucesso localmente!' }, { status: 201 });

  } catch (error: any) {
    console.error("Registration error details (local mode):", error.stack || error);
    let message = 'Ocorreu um erro durante o registro local.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
