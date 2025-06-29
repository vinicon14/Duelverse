
// src/app/api/version/upgrade/route.ts
import { NextResponse } from 'next/server';
import { upgradeVersion } from '@/lib/versioning';
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
        const newVersion = await upgradeVersion();
        return NextResponse.json({ version: newVersion });
    } catch (error) {
        console.error('Failed to upgrade version:', error);
        return NextResponse.json({ message: 'Failed to upgrade version' }, { status: 500 });
    }
}
