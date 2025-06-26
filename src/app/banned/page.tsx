'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

export default function BannedPage() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center shadow-2xl border-destructive">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-destructive flex items-center justify-center gap-2">
            <ShieldAlert className="h-8 w-8" />
            Acesso Restrito
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <Image
            src="https://images.ygoprodeck.com/images/cards/37742478.jpg"
            alt="Carta 'Honesto' do Yu-Gi-Oh!"
            width={200}
            height={292}
            className="rounded-lg shadow-lg border-2 border-muted"
          />
          <p className="text-xl font-semibold text-foreground pt-4">
            Você foi banido por não ser honesto.
          </p>
          <p className="text-sm text-muted-foreground">
            Sua conta foi permanentemente suspensa.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
