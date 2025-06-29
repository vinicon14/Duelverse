
// src/app/api/version/downgrade/route.ts
import { NextResponse } from 'next/server';
import { downgradeVersion } from '@/lib/versioning';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { User } from '@/lib/types';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const user = session?.user as User | undefined;

    if (!user || (user.username !== 'vinicon14' && !user.isCoAdmin)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const newVersion = await downgradeVersion();
        return NextResponse.json({ version: newVersion });
    } catch (error) {
        console.error('Failed to downgrade version:', error);
        if (error instanceof Error) {
            return NextResponse.json({ message: error.message }, { status: 400 });
        }
        return NextResponse.json({ message: 'Failed to downgrade version' }, { status: 500 });
    }
}
