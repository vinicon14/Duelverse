
// Use o middleware oficial do NextAuth para simplificar a proteção de rotas
export { default } from "next-auth/middleware";

// O matcher define quais rotas serão protegidas pelo middleware do NextAuth.
// Todas as rotas listadas aqui exigirão que o usuário esteja autenticado.
// Se não estiverem autenticados, serão redirecionados para a página de login
// que você definiu em `src/lib/auth.ts` (ou o padrão /login).
export const config = {
  matcher: [
    '/dashboard',
    '/admin',
    '/profile',
    '/friends',
    '/chat-lobby',
    '/card-oracle',
    '/rules-oracle',
  ],
};
