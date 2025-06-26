// src/app/api/users/online-count/route.ts
import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/userStore';
import type { User } from '@/lib/types';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const allUsers: User[] = await getAllUsers();
    const now = Date.now();

    // Use a more robust loop to prevent crashes from unexpected data shapes.
    let onlineCount = 0;
    for (const user of allUsers) {
      // Defensively check if the user object and the timestamp are valid before using them.
      if (user && typeof user.lastActiveAt === 'number') {
        if ((now - user.lastActiveAt) < ONLINE_THRESHOLD_MS) {
          onlineCount++;
        }
      }
    }
    
    return NextResponse.json({ onlineCount }, { status: 200 });
  } catch (error) {
    console.error('Error in /api/users/online-count:', error);
    const message = error instanceof Error ? error.message : 'Internal error counting online users in userStore.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
