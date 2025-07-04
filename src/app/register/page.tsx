
'use client';

import RegisterForm from '@/components/auth/RegisterForm';
import SiteHeader from '@/components/SiteHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RegisterPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
        router.replace('/dashboard');
        }
    }, [user, loading, router]);

    if (loading || user) {
        return null; // or a loading spinner
    }

    return (
        <div className="flex flex-col min-h-screen bg-background">
        <SiteHeader />
        <main className="flex-grow flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold">Crie sua Conta</CardTitle>
                <CardDescription>Junte-se ao DuelVerse e comece a duelar!</CardDescription>
            </CardHeader>
            <CardContent>
                <RegisterForm />
                <p className="mt-4 text-center text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <Link href="/login" className="underline text-primary">
                    Faça login
                </Link>
                </p>
            </CardContent>
            </Card>
        </main>
        </div>
    );
}
