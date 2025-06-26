
// src/app/api/users/notify-payment/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getUserByUsername, addPaymentNotification } from '@/lib/userStore';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json() as { username: string };

    if (!username) {
      return NextResponse.json({ message: 'Nome de usuário é obrigatório.' }, { status: 400 });
    }
    
    const user = await getUserByUsername(username);
    if (!user) {
        return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    await addPaymentNotification(user.username);
    return NextResponse.json({ message: 'Notificação de pagamento recebida.' }, { status: 200 });

  } catch (error) {
    console.error('Error in /api/users/notify-payment:', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao notificar pagamento.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
