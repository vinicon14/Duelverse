
import { NextResponse, type NextRequest } from 'next/server';
import { getUserByUsername } from '@/lib/userStore';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      console.warn("Authentication API: Missing username or password.");
      return NextResponse.json({ message: 'Nome de usuário e senha são obrigatórios.' }, { status: 400 });
    }

    const user = await getUserByUsername(username);

    if (!user || user.passwordHash !== password) {
      console.warn(`Authentication API: Invalid credentials for user '${username}'.`);
      return NextResponse.json({ message: 'Credenciais inválidas.' }, { status: 401 });
    }

    if (user.isBanned) {
        console.warn(`Authentication API: User '${username}' is banned.`);
        return NextResponse.json({ message: 'Você foi banido.', errorCode: 'USER_BANNED' }, { status: 403 });
    }

    // Retorne apenas os dados do usuário que são seguros para enviar ao cliente
    const safeUser = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      score: user.score,
      isPro: user.isPro,
      profilePictureUrl: user.profilePictureUrl,
      isCoAdmin: user.isCoAdmin,
      isJudge: user.isJudge,
      isBanned: user.isBanned,
      country: user.country,
    };

    console.log(`Authentication API: User '${username}' authenticated successfully.`);
    return NextResponse.json({ user: safeUser }, { status: 200 });
  } catch (error: any) {
    // Log the full error object for better debugging
    console.error("Authentication API internal error:", error.stack || error);
    let message = 'Erro interno do servidor durante a autenticação.';
    if (error instanceof Error) {
        message = error.message; // Use the error message if it's a standard Error
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}
