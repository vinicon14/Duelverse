
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Esta é a nova implementação do middleware, mais robusta e independente.

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const { pathname } = req.nextUrl;

  // Se o usuário não estiver logado (sem token) E estiver tentando acessar uma página protegida,
  // redireciona para a página de login.
  if (!token && pathname !== '/login' && pathname !== '/register') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Se o usuário ESTIVER logado e tentar acessar a página de login ou registro,
  // redireciona para o dashboard.
  if (token && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Se nenhuma das condições acima for atendida, permite que a requisição continue.
  return NextResponse.next();
}

// O matcher garante que o middleware seja executado em todas as rotas,
// exceto as de arquivos estáticos e da API.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
