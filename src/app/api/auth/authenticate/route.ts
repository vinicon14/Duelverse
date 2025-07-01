
import { NextResponse, type NextRequest } from 'next/server';
import { getUserByUsername } from '@/lib/userStore';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Nome de usuário e senha são obrigatórios.' }, { status: 400 });
    }

    const user = await getUserByUsername(username);

    if (!user || user.passwordHash !== password) {
      return NextResponse.json({ message: 'Credenciais inválidas.' }, { status: 401 });
    }

    if (user.isBanned) {
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

    return NextResponse.json({ user: safeUser }, { status: 200 });
  } catch (error) {
    console.error("Authentication API error:", error);
    return NextResponse.json({ message: 'Erro interno do servidor durante a autenticação.' }, { status: 500 });
  }
}
