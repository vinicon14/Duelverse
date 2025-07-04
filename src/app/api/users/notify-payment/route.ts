
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { updateUser } from '@/lib/userStore';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET não está definido');
    return NextResponse.json({ message: 'Erro de configuração do servidor' }, { status: 500 });
  }

  try {
    const decoded = verify(token, secret) as { userId: string };
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ message: 'Nome de usuário é obrigatório' }, { status: 400 });
    }

    // In a real application, you would have a more robust system for this.
    // For this project, we'll just log it and assume an admin will verify.
    console.log(`User ${decoded.userId} (${username}) has notified payment for PRO status.`);
    
    // You might want to add a field to the user to track this, e.g., 'proStatus: "pending"'
    await updateUser(decoded.userId, { proStatus: "pending" });

    return NextResponse.json({ message: 'Notificação recebida com sucesso!' }, { status: 200 });

  } catch (error) {
    console.error('Erro na notificação de pagamento:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ message: 'Token inválido' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Ocorreu um erro interno.' }, { status: 500 });
  }
}
