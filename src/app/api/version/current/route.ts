
// src/app/api/version/current/route.ts
import { NextResponse } from 'next/server';
import { getCurrentVersion } from '@/lib/versioning';

export async function GET() {
  try {
    const currentVersion = await getCurrentVersion();
    return NextResponse.json({ version: currentVersion });
  } catch (error) {
    console.error('Failed to get current version:', error);
    return NextResponse.json({ message: 'Failed to get current version' }, { status: 500 });
  }
}
