// src/app/api/chat/route.ts
import { NextResponse, type NextRequest } from 'next/server';

// This API route is deprecated as the chat functionality has been removed.
// It returns errors to ensure old clients don't hang.

const DEPRECATED_MESSAGE = { message: 'Chat functionality is no longer available.' };
const DEPRECATED_STATUS = { status: 410 }; // 410 Gone

export async function GET(request: NextRequest) {
  return NextResponse.json(DEPRECATED_MESSAGE, DEPRECATED_STATUS);
}

export async function POST(request: NextRequest) {
  return NextResponse.json(DEPRECATED_MESSAGE, DEPRECATED_STATUS);
}
