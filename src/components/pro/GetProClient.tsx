
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Mail, CheckCircle, ClipboardCopy, Send } from 'lucide-react';
import Link from 'next/link';

const PIX_KEY = "1ec4a2dd-3a22-4db9-a69e-e69cd7219875";

export default function GetProClient() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isNotifying, setIsNotifying] = useState(false);
  const [hasNotified, setHasNotified] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(PIX_KEY).then(() => {
      toast({ title: "Copiado!", description: "Chave PIX copiada para a área de transferência." });
    }).catch(err => {
      toast({ variant: 'destructive', title: "Falha ao Copiar", description: "Não foi possível copiar a chave." });
    });
  };

  const handleNotifyPayment = async () => {
    if (!user) return;
    setIsNotifying(true);
    try {
      const response = await fetch('/api/users/notify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Falha ao notificar o pagamento.");
      }

      setHasNotified(true);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro na Notificação',
        description: error instanceof Error ? error.message : 'Ocorreu um erro.',
      });
    } finally {
      setIsNotifying(false);
    }
  };

  if (hasNotified) {
    return (
      <div className="container mx-auto px-4 py-8 w-full">
        <Card className="max-w-2xl mx-auto shadow-xl text-center">
          <CardHeader>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-3xl font-headline text-primary">Aviso Enviado com Sucesso!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-muted-foreground">
              Obrigado! Recebemos seu aviso de pagamento. Sua solicitação para o status PRO será analisada em até 48 horas.
            </p>
          </CardContent>
          <CardContent>
             <Button asChild>
                <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Dashboard
                </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 w-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Mail className="h-10 w-10 text-accent" />
          <div>
            <h1 className="text-3xl font-headline text-primary">Torne-se PRO</h1>
            <p className="text-lg text-muted-foreground">Siga os passos para remover os anúncios e apoiar a plataforma.</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Link>
        </Button>
      </div>
      <Card className="shadow-xl max-w-2xl mx-auto mt-6">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Passo 1: Pagamento via PIX (R$ 30,00)</CardTitle>
          <CardDescription>Use a chave PIX aleatória abaixo para realizar o pagamento único de R$ 30,00.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">Chave PIX (Copia e Cola):</p>
          <div className="flex items-center space-x-2 bg-muted p-3 rounded-md">
            <pre className="text-lg font-mono font-bold text-primary flex-grow overflow-x-auto">{PIX_KEY}</pre>
            <Button variant="ghost" size="icon" onClick={copyToClipboard} title="Copiar Chave PIX">
              <ClipboardCopy className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-xl max-w-2xl mx-auto mt-6">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Passo 2: Envie o Comprovante</CardTitle>
          <CardDescription>Envie o comprovante de pagamento para nosso e-mail de suporte.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Após realizar o pagamento, envie o comprovante para o e-mail abaixo. **Não se esqueça de incluir seu nome de usuário ({user?.username}) no e-mail!**
          </p>
          <Button asChild>
            <a href={`mailto:yugihola1@gmail.com?subject=Comprovante%20de%20Pagamento%20PRO%20-%20${user?.username || 'Seu Usuário'}&body=Olá,%20estou%20enviando%20o%20comprovante%20de%20pagamento%20para%20o%20status%20PRO.%0A%0AMeu%20nome%20de%20usuário%20é:%20${user?.username || 'Insira seu usuário aqui.'}%0A%0AAnexo%20o%20comprovante.%0A%0AObrigado!`}>
              <Mail className="mr-2 h-4 w-4" />
              Abrir Cliente de E-mail
            </a>
          </Button>
        </CardContent>
      </Card>
       <Card className="shadow-xl max-w-2xl mx-auto mt-6">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Passo 3: Notifique-nos</CardTitle>
          <CardDescription>Clique no botão abaixo para nos avisar que você enviou o e-mail. Isso agilizará o processo de verificação.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={handleNotifyPayment} disabled={isNotifying} className="w-full">
              {isNotifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Já enviei o comprovante por e-mail
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
