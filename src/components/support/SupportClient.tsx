
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SupportClient() {
  return (
    <div className="container mx-auto px-4 py-8 w-full">
        <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
                <Mail className="h-10 w-10 text-accent" />
                <div>
                    <h1 className="text-3xl font-headline text-primary">Suporte</h1>
                    <p className="text-lg text-muted-foreground">Reporte um problema ou entre em contato.</p>
                </div>
            </div>
            <Button variant="outline" asChild>
                <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Dashboard
                </Link>
            </Button>
        </div>
        <Card className="shadow-xl max-w-2xl mx-auto mt-6">
            <CardHeader>
                <div className="flex items-center space-x-3">
                    <Mail className="h-8 w-8 text-accent" />
                    <div>
                        <CardTitle className="text-2xl font-headline">Reportar um Problema</CardTitle>
                        <CardDescription>Encontrou um bug ou um jogador com má conduta? Nos avise.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-4">
                    Para reportar um problema com a plataforma ou a conduta de outro jogador, clique no botão abaixo para abrir seu cliente de e-mail. Por favor, forneça o máximo de detalhes possível, incluindo nomes de usuário, datas e capturas de tela, se aplicável.
                </p>
                <Button asChild>
                    <a href="mailto:yugihola1@gmail.com?subject=Reporte%20-%20DuelVerse&body=Por%20favor,%20descreva%20o%20problema%20ou%20o%20usuário%20que%20você%20deseja%20reportar.%0A%0AInclua%20nomes%20de%20usuário,%20datas%20e%20capturas%20de%20tela,%20se%20possível.">
                        <Send className="mr-2 h-4 w-4" />
                        Enviar E-mail de Reporte
                    </a>
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
