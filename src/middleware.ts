
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = process.env.NEXTAUTH_SECRET;

  // Define as rotas públicas que não exigem autenticação
  const publicPaths = ['/login', '/register', '/api/auth/login', '/api/auth/register'];

  // Verifica se o caminho atual é público
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Obtém o token da sessão
  const token = await getToken({ req: request, secret });

  // Se não houver token (usuário não logado) e o caminho não for público,
  // redireciona para a página de login.
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Se o usuário estiver autenticado e tentar acessar a página de login/registro,
  // redireciona para o dashboard.
  if (token && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Para rotas de administrador, verifica o token.
  // Esta é uma camada extra de segurança.
  if (pathname.startsWith('/admin')) {
    // Você pode adicionar verificações de role aqui se o token contiver essa informação.
    // Ex: if (!token.isAdmin) { return NextResponse.redirect(new URL('/unauthorized', request.url)); }
  }

  return NextResponse.next();
}

export const config = {
  // O matcher define em quais rotas o middleware será executado.
  // Usamos uma expressão regular negativa para excluir caminhos de arquivos estáticos.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
