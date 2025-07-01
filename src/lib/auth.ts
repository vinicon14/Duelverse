
import { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getAdminAuth } from './firebaseAdmin'; // Importa a nova função "lazy"
import { getUserById } from './userStore';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        idToken: { label: "ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) return null;
        
        try {
          // Obtém a instância de autenticação de forma segura
          const auth = getAdminAuth();
          const decodedToken = await auth.verifyIdToken(credentials.idToken);
          const user = await getUserById(decodedToken.uid);
          return user ? { ...user, id: decodedToken.uid } as NextAuthUser : null;
        } catch (error) {
          console.error("Firebase authentication error in authorize:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.displayName = user.displayName;
        token.score = user.score;
        token.isPro = user.isPro;
        token.profilePictureUrl = user.profilePictureUrl;
      }
      
      if (trigger === "update" && session?.user) {
          const updatedUser = await getUserById(token.id as string);
          if (updatedUser) {
              token.displayName = updatedUser.displayName;
              token.profilePictureUrl = updatedUser.profilePictureUrl;
          }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.displayName = token.displayName as string;
        session.user.score = token.score as number;
        session.user.isPro = token.isPro as boolean;
        session.user.profilePictureUrl = token.profilePictureUrl as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
