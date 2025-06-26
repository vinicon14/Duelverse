// src/app/api/admin/server-status/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getServerStatus, setServerStatus } from '@/lib/userStore';

// In a real app, this route MUST be protected to ensure only admins can access it.
// This prototype relies on the frontend to gate access to the admin dashboard.

export async function GET() {
  try {
    const status = await getServerStatus();
    return NextResponse.json({ status });
  } catch (error) {
    console.error('Error fetching server status:', error);
    return NextResponse.json({ message: 'Failed to fetch server status.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { status } = await request.json();

    if (status !== 'online' && status !== 'offline') {
      return NextResponse.json({ message: 'Invalid status provided. Must be "online" or "offline".' }, { status: 400 });
    }

    await setServerStatus(status);
    return NextResponse.json({ message: `Server status successfully set to ${status}.`, status });
  } catch (error) {
    console.error('Error setting server status:', error);
    return NextResponse.json({ message: 'Failed to set server status.' }, { status: 500 });
  }
}
