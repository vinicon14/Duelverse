
import { NextResponse, type NextRequest } from 'next/server';
import { createUser, getUserByUsername } from '@/lib/userStore';

export async function POST(request: NextRequest) {
  try {
    const { username, password, displayName, country } = await request.json();

    if (!username || !password || !displayName || !country) {
      console.warn("Registration API: Missing required fields.");
      return NextResponse.json({ message: 'Todos os campos são obrigatórios.' }, { status: 400 });
    }
    
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
        console.warn("Registration API: Username already exists.");
        return NextResponse.json({ message: 'Este nome de usuário já existe.' }, { status: 409 });
    }

    const uid = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    await createUser(uid, username, displayName, country, password);

    console.log(`Registration API: User '${username}' registered successfully.`);
    return NextResponse.json({ uid: uid, message: 'Usuário registrado com sucesso localmente!' }, { status: 201 });

  } catch (error: any) {
    console.error("Registration API error details:", error.stack || error);
    let message = 'Ocorreu um erro durante o registro local. Por favor, tente novamente.';
    if (error instanceof Error) {
        message = error.message; // Use the error message if it's a standard Error
    }
    console.error("Registration API error (full details):", error);
    return NextResponse.json({ message: message }, { status: 500 });
  }
}
