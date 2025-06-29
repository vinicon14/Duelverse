
import { NextResponse, type NextRequest } from 'next/server';
import { sign } from 'jsonwebtoken';
import type { User } from '@/lib/types';

// This would be in your environment variables in a real production app
const JITSI_APP_ID = process.env.JITSI_APP_ID || 'default-app-id';
const JITSI_SECRET = process.env.JITSI_SECRET || 'default-secret';

interface TokenPayload {
  user: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
  room: string;
}

export async function POST(request: NextRequest) {
  try {
    const { room, user } = await request.json() as { room: string; user: User };

    if (!room || !user) {
      return NextResponse.json({ message: 'Room and user are required' }, { status: 400 });
    }
     if (!JITSI_APP_ID || !JITSI_SECRET) {
      console.error("Jitsi App ID or Secret is not configured in environment variables.");
      return NextResponse.json({ message: 'Jitsi integration is not configured on the server.' }, { status: 500 });
    }

    const payload = {
      context: {
        user: {
          id: user.id,
          name: user.displayName,
          avatar: user.profilePictureUrl || undefined,
          email: user.email || `${user.username}@duelverse.app`,
        },
        features: {
            "recording": "disabled",
            "live-streaming": "disabled",
            "screen-sharing": "enabled",
            "chat": "enabled",
            "reactions": "enabled",
        }
      },
      aud: 'jitsi',
      iss: JITSI_APP_ID,
      sub: '*', // Allow access to any room for simplicity, but we target with the room name
      room: room,
      // Set expiration to 2 hours from now
      exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60), 
      nbf: Math.floor(Date.now() / 1000) - 10 // Not before, accounts for clock skew
    };

    const token = sign(payload, JITSI_SECRET);

    return NextResponse.json({ token });

  } catch (error) {
    console.error('Error generating Jitsi token:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
