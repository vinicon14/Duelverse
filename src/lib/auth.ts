import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { User } from "@/lib/types";
import { getUserByUsername } from "@/lib/userStore";
import bcrypt from "bcryptjs"; // Import bcryptjs

export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials.password) return null;

        try {
          const user = await getUserByUsername(credentials.username as string);
          
          // Compare the provided password with the stored hash
          if (user && await bcrypt.compare(credentials.password as string, user.passwordHash)) {
            if (user.isBanned) {
              throw new Error("Este usuário foi banido."); 
            }
            return user;
          }

          return null;

        } catch (error: any) {
          console.error("Authorize error:", error.message);
          throw new Error(error.message || "Erro durante a autenticação.");
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const authUser = user as User;
        token.id = authUser.id;
        token.displayName = authUser.displayName;
        token.score = authUser.score;
        token.isPro = authUser.isPro;
        token.profilePictureUrl = authUser.profilePictureUrl;
        token.isCoAdmin = authUser.isCoAdmin;
        token.isJudge = authUser.isJudge;
        token.isBanned = authUser.isBanned;
      }

      if (trigger === "update" && session?.user) {
        if (session.user.id === token.id) {
            token.displayName = session.user.displayName;
            token.profilePictureUrl = session.user.profilePictureUrl;
            token.score = (session.user as User).score;
            token.isPro = (session.user as User).isPro;
            token.isCoAdmin = (session.user as User).isCoAdmin;
            token.isJudge = (session.user as User).isJudge;
            token.isBanned = (session.user as User).isBanned;
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
        session.user.isCoAdmin = token.isCoAdmin as boolean;
        session.user.isJudge = token.isJudge as boolean;
        session.user.isBanned = token.isBanned as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;
