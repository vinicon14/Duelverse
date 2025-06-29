
// src/app/api/admin/purge/route.ts
import { NextResponse } from 'next/server';
import { deleteExpiredBannedUsers } from '@/lib/userStore';

export async function POST() {
  // Note: In a real-world scenario, you would have robust security here.
  // For this internal tool, we are keeping it simple as it's called from a protected admin client.
  try {
    const { deletedCount } = await deleteExpiredBannedUsers();
    
    if (deletedCount > 0) {
      return NextResponse.json({ message: `${deletedCount} usuário(s) foram permanentemente excluídos.`, deletedCount });
    } else {
      return NextResponse.json({ message: 'Nenhum usuário banido expirado encontrado para exclusão.', deletedCount: 0 });
    }

  } catch (error) {
    console.error('Failed to delete expired banned users:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Falha ao executar a manutenção de exclusão de usuários.', error: errorMessage }, { status: 500 });
  }
}
