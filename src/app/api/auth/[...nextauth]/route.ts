
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth"; // Importa a configuração de autenticação

// Usa a configuração para criar os handlers GET e POST
export const { handlers: { GET, POST } } = NextAuth(authConfig);
