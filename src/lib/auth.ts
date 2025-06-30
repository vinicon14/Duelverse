
import { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getUserByUsername } from '@/lib/userStore';
import { User } from '@/lib/types';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.username) {
          return null;
        }
        
        try {
          const user = await getUserByUsername(credentials.username);
          if (user) {
            // Since there's no password, we just return the user object if found.
            // This matches the app's original logic.
            return { ...user, id: user.id } as NextAuthUser;
          } else {
            return null;
          }
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      // When the user signs in, the `user` object is passed here.
      // We persist the user's ID and custom properties to the token.
      if (user) {
        const customUser = user as User;
        token.id = customUser.id;
        token.username = customUser.username;
        token.displayName = customUser.displayName;
        token.isCoAdmin = customUser.isCoAdmin;
        token.isJudge = customUser.isJudge;
        token.isPro = customUser.isPro;
      }
      return token;
    },
    async session({ session, token }) {
      // The session callback receives the token and we can pass its properties to the session object.
      // This makes the user data available on the client side.
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.displayName = token.displayName as string;
        session.user.isCoAdmin = token.isCoAdmin as boolean;
        session.user.isJudge = token.isJudge as boolean;
        session.user.isPro = token.isPro as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', // Redirect to login page on error
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
};
