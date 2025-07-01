
import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin'; // Importa a função "lazy"
import { createUserInFirestore, getUserByUsername } from '@/lib/userStore';

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

    // Obtém a instância de autenticação de forma segura
    const auth = getAdminAuth(); 
    const userRecord = await auth.createUser({
      email: `${username.toLowerCase()}@duelverse.app`,
      password: password,
      displayName: displayName,
    });

    await createUserInFirestore(userRecord.uid, username, displayName, country);

    return NextResponse.json({ uid: userRecord.uid, message: 'Usuário registrado com sucesso!' }, { status: 201 });

  } catch (error: any) {
    console.error("Registration error:", error);
    let message = 'Ocorreu um erro durante o registro.';
    if (error.code === 'auth/email-already-exists') {
      message = 'Este nome de usuário (e-mail associado) já está em uso.';
    } else if (error.code === 'auth/invalid-password') {
      message = 'A senha deve ter pelo menos 6 caracteres.';
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}
