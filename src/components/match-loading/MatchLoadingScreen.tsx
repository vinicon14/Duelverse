
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Camera, Users, MessageSquare, CheckCircle } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";

interface MatchLoadingScreenProps {
  jitsiRoomName: string;
  opponentDisplayName?: string;
  isPrivateRoom?: boolean;
  onProceed: () => void;
}

export default function MatchLoadingScreen({
  jitsiRoomName,
  opponentDisplayName,
  isPrivateRoom = false,
  onProceed,
}: MatchLoadingScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (isLoading) {
      const timer = setInterval(() => {
        setCountdown((prevCountdown) => {
          if (prevCountdown <= 1) {
            clearInterval(timer);
            setIsLoading(false);
            return 0;
          }
          return prevCountdown - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isLoading]);

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex justify-center p-4 z-[100] animate-fadeIn overflow-y-auto pt-8 md:pt-4 md:items-center">
      <Card className="w-full max-w-3xl shadow-2xl self-start md:self-auto mb-8">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {isLoading ? (
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            ) : (
              <CheckCircle className="h-16 w-16 text-green-500" />
            )}
          </div>
          <CardTitle className="text-3xl font-headline text-primary">
            {isLoading ? "Preparando seu Duelo!" : "Duelo Pronto!"}
          </CardTitle>
          <CardDescription className="text-lg">
            {opponentDisplayName
              ? `Você enfrentará ${opponentDisplayName}. `
              : isPrivateRoom ? "Aguardando você iniciar o duelo privado. " : "Seu oponente foi encontrado. "}
            Siga as instruções abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Camera className="h-6 w-6 text-accent" />
                  <CardTitle className="text-xl font-headline">Configuração da Câmera</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Posicione sua câmera para que seu oponente possa ver claramente seu campo de duelo, cemitério e deck extra.
                </p>
                <div className="grid grid-cols-2 gap-2">
                    <Image
                        src="https://ms.yugipedia.com/0/06/Remote_Duel_mat_layout.png"
                        alt="Exemplo de layout de campo para Remote Duel"
                        width={300}
                        height={200}
                        className="rounded-md border object-cover"
                        data-ai-hint="duel field"
                    />
                    <Image
                        src="https://ms.yugipedia.com/thumb/e/e0/RemoteDuel-GameMat.png/600px-RemoteDuel-GameMat.png"
                        alt="Playmat oficial do Yu-Gi-Oh! Remote Duel"
                        width={300}
                        height={200}
                        className="rounded-md border object-cover"
                        data-ai-hint="playmat duel"
                    />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Users className="h-6 w-6 text-accent" />
                  <CardTitle className="text-xl font-headline">Etiqueta de Duelo</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Anuncie todas as fases e etapas do turno claramente.</li>
                  <li>Comunique os efeitos das cartas e suas ativações.</li>
                  <li>Aguarde a confirmação do oponente antes de prosseguir com ações.</li>
                  <li>Mantenha uma conduta respeitosa e esportiva.</li>
                  <li>Em caso de desconexão, tentem se reconectar rapidamente.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
          <Separator />
          <div className="text-center">
            <Button
              size="lg"
              onClick={onProceed}
              disabled={isLoading}
              className="w-full sm:w-auto font-bold text-lg py-3 px-6"
            >
              {isLoading ? `Entrar no Duelo em ${countdown}s...` : "Entrar no Duelo Agora!"}
              {!isLoading && <MessageSquare className="ml-2 h-5 w-5" />}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              A sala de vídeo abrirá em uma nova aba: {jitsiRoomName}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
