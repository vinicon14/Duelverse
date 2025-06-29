
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUserById } from '@/lib/userStore';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/private/')) {
    const userId = request.headers.get('Authorization');

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await getUserById(userId);

    if (!user || (!user.isCoAdmin && !user.isJudge)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/private/:path*',
};
