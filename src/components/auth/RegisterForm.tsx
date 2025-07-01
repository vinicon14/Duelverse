
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
import { UserPlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth as firebaseAuth } from "@/lib/firebaseConfig";

const formSchema = z.object({
  username: z.string().min(3, { message: "Usuário deve ter pelo menos 3 caracteres." }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres." }),
  displayName: z.string().min(3, { message: "Nome de exibição deve ter pelo menos 3 caracteres." }),
  country: z.string().min(2, { message: "País deve ter pelo menos 2 caracteres." }),
});

export default function RegisterForm() {
  const { register, login } = useAuth(); // Puxa ambas as funções do contexto
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      displayName: "",
      country: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      // 1. Chama a API de registro para criar o usuário no Firestore/Firebase Auth
      await register(values.username, values.password, values.displayName, values.country);
      
      toast({ title: "Registro bem-sucedido!", description: "Fazendo login na sua nova conta..." });

      // 2. Após o registro, faz o login automaticamente
      const email = `${values.username.toLowerCase()}@duelverse.app`;
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, values.password);
      const idToken = await userCredential.user.getIdToken();
      await login(idToken); // Chama o login do context para criar a sessão do NextAuth

      toast({ title: "Login automático!", description: "Bem-vindo ao DuelVerse!" });
      router.push('/dashboard');

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro no Registro",
        description: error instanceof Error ? error.message : "Não foi possível criar a conta.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-headline text-primary">Criar Conta - DuelVerse</CardTitle>
        <CardDescription>Junte-se à comunidade de duelistas!</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuário</FormLabel>
                  <FormControl>
                    <Input placeholder="Escolha um nome de usuário" {...field} />
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
                    <Input type="password" placeholder="Crie uma senha segura" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome de Exibição</FormLabel>
                  <FormControl>
                    <Input placeholder="Como você quer ser chamado" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>País</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu país" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Registrar
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Button variant="link" asChild className="p-0 h-auto">
            <Link href="/login" className="text-accent hover:underline">
              Faça login aqui
            </Link>
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}
