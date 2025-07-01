
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth as firebaseAuth } from "@/lib/firebaseConfig"; // Importa o auth do Firebase
import { useRouter } from "next/navigation";

const formSchema = z.object({
  username: z.string().min(3, { message: "Usuário deve ter pelo menos 3 caracteres." }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres." }),
});

export default function LoginForm() {
  const { login } = useAuth(); // Nossa função de login do context
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      // 1. Construir o email a partir do username
      const email = `${values.username.toLowerCase()}@duelverse.app`;

      // 2. Autenticar com o Firebase (client-side)
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, values.password);
      
      // 3. Obter o idToken do Firebase
      const idToken = await userCredential.user.getIdToken();

      // 4. Chamar nossa função de login do context com o idToken
      await login(idToken);
      
      toast({ title: "Login bem-sucedido!", description: "Bem-vindo de volta!" });
      router.push('/dashboard'); // Redireciona após o sucesso

    } catch (error: any) {
      let errorMessage = "Ocorreu um erro desconhecido.";
       if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = "Usuário ou senha inválidos.";
        }
      toast({
        variant: "destructive",
        title: "Erro no Login",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-headline text-primary">Login - DuelVerse</CardTitle>
        <CardDescription>Acesse sua conta para duelar!</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuário</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome de usuário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Sua senha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Entrar
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2 pt-6">
        <p className="text-sm text-muted-foreground">
          Não tem uma conta?{" "}
          <Button variant="link" asChild className="p-0 h-auto">
            <Link href="/register" className="text-accent hover:underline">
              Registre-se aqui
            </Link>
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}
