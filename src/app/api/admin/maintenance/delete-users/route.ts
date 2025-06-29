
// src/app/api/admin/maintenance/delete-users/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { User } from '@/lib/types';
import { deleteExpiredBannedUsers } from '@/lib/userStore';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const user = session?.user as User | undefined;

    // Only the main admin can perform this action
    if (!user || user.username !== 'vinicon14') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { deletedCount } = await deleteExpiredBannedUsers();
        
        if (deletedCount > 0) {
            return NextResponse.json({ message: `${deletedCount} usuário(s) foram permanentemente excluídos.`, deletedCount });
        } else {
            return NextResponse.json({ message: 'Nenhum usuário banido expirado encontrado para exclusão.', deletedCount: 0 });
        }

    } catch (error) {
        console.error('Failed to delete expired banned users:', error);
        return NextResponse.json({ message: 'Falha ao executar a manutenção de exclusão de usuários.' }, { status: 500 });
    }
}
