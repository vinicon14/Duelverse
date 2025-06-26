
// src/app/api/users/all/route.ts
import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/userStore';
import type { User } from '@/lib/types';

export async function GET() {
  console.log("[API /users/all] === Recebida solicitação para buscar todos os usuários ===");
  try {
    const usersFromStore: User[] = await getAllUsers();
    console.log(`[API /users/all] getAllUsers (do userStore) retornou ${usersFromStore.length} usuários (antes do filtro).`);

    // Filtra usuários banidos
    const activeUsers = usersFromStore.filter(user => !user.isBanned);
    console.log(`[API /users/all] ${activeUsers.length} usuários ativos após filtrar banidos.`);

    // Ordena por pontuação decrescente para o ranking
    const rankedUsers = activeUsers.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    console.log(`[API /users/all] Enviando ${rankedUsers.length} usuários ordenados para o cliente.`);
    return NextResponse.json(rankedUsers, { status: 200 });
  } catch (error) {
    console.error('Erro em /api/users/all:', error);
    const message = error instanceof Error ? error.message : 'Erro interno ao buscar todos os usuários do userStore.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
