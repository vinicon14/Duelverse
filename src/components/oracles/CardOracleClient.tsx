
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader2, Search, Info, HelpCircle, BookOpenText, XCircle, Wand2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getCardInfo, type CardInfoOutput } from "@/ai/flows/card-info-flow"; // Updated import

export default function CardOracleClient() {
  const [cardName, setCardName] = useState("");
  const [cardData, setCardData] = useState<CardInfoOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const { toast } = useToast();

  const fetchCardDataWithAI = async () => {
    if (!cardName.trim()) {
      setError("Por favor, insira um nome de carta.");
      setCardData(null);
      setSearched(true);
      toast({
        variant: "destructive",
        title: "Nome da Carta Inválido",
        description: "Por favor, insira um nome de carta para buscar.",
      });
      return;
    }
    setIsLoading(true);
    setError(null);
    setCardData(null);
    setSearched(true);

    try {
      const result = await getCardInfo({ cardName: cardName.trim() });
      setCardData(result);
    } catch (err) {
      console.error("Error asking card oracle AI:", err);
      const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido ao buscar informações da carta.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Erro ao Consultar Oráculo de Cartas",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCardDataWithAI();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="shadow-xl">
        <CardHeader>
           <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <BookOpenText className="h-10 w-10 text-accent" />
                <div>
                    <CardTitle className="text-3xl font-headline text-primary">Oráculo de Cartas (IA)</CardTitle>
                    <CardDescription className="text-lg">Encontre informações sobre qualquer carta de Yu-Gi-Oh! usando IA.</CardDescription>
                </div>
            </div>
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Dashboard
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex items-center space-x-2 mb-6">
            <Input
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="Digite o nome da carta (ex: Dark Magician)"
              className="flex-grow text-base"
              aria-label="Nome da Carta"
            />
            <Button type="submit" disabled={isLoading} className="px-6">
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Search className="mr-2 h-5 w-5" />
              )}
              Buscar com IA
            </Button>
          </form>

          {isLoading && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
               <p className="ml-4 text-muted-foreground">A IA está buscando informações sobre {cardName}...</p>
            </div>
          )}

          {!isLoading && error && (
            <Alert variant="destructive" className="mt-6">
              <XCircle className="h-5 w-5" />
              <AlertTitle>Erro na Busca com IA</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {!isLoading && !error && !cardData && searched && (
             <Alert className="mt-6">
              <Info className="h-5 w-5" />
              <AlertTitle>Nenhuma Informação Encontrada</AlertTitle>
              <AlertDescription>A IA não encontrou informações para "{cardName}". Verifique o nome e tente novamente.</AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && cardData && (
            <Card className="mt-6 overflow-hidden transition-all duration-500 ease-in-out animate-fadeIn">
                <div className="md:flex">
                    <div className="md:w-1/3 p-4 flex flex-col justify-center items-center bg-muted/30 space-y-4">
                        <Image
                            src={cardData.imageUrl || `https://placehold.co/300x438.png?text=${encodeURIComponent(cardData.name.substring(0,15))}`}
                            alt={`Arte de ${cardData.name}`}
                            width={300}
                            height={438}
                            className="rounded-lg shadow-lg object-contain max-h-[300px] sm:max-h-[400px]"
                            data-ai-hint={`${cardData.type} ${cardData.name}`}
                            priority
                        />
                         <Card className="w-full">
                            <CardHeader className="p-3">
                                <CardTitle className="text-sm font-headline text-accent">Descrição Visual (IA)</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                                <ScrollArea className="h-[80px] pr-2">
                                    <p className="text-xs whitespace-pre-line leading-relaxed">{cardData.visualDescription}</p>
                                </ScrollArea>
                            </CardContent>
                         </Card>
                    </div>
                    <div className="md:w-2/3">
                        <CardHeader>
                            <CardTitle className="text-3xl font-headline text-accent">{cardData.name}</CardTitle>
                            <div className="flex flex-wrap gap-2 mt-1">
                                <Badge variant="outline">{cardData.type}</Badge>
                                {cardData.monsterType && <Badge variant="secondary">{cardData.monsterType}</Badge>}
                                {cardData.attribute && <Badge variant="secondary">{cardData.attribute}</Badge>}
                                {cardData.level !== undefined && <Badge>Level/Rank/Link {cardData.level}</Badge>}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-headline text-primary mb-1">Efeito da Carta (IA):</h4>
                                <ScrollArea className="h-[150px] pr-4 p-3 border rounded-md bg-background">
                                    <p className="text-base whitespace-pre-line leading-relaxed">{cardData.effect}</p>
                                </ScrollArea>
                            </div>
                            {(cardData.atk !== undefined || cardData.def !== undefined) && (
                                <>
                                <Separator className="my-4" />
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    {cardData.atk !== undefined && (
                                    <div>
                                        <p className="text-sm text-muted-foreground font-headline">ATK</p>
                                        <p className="text-2xl font-bold text-primary">{cardData.atk}</p>
                                    </div>
                                    )}
                                    {cardData.def !== undefined && (
                                    <div>
                                        <p className="text-sm text-muted-foreground font-headline">DEF</p>
                                        <p className="text-2xl font-bold text-primary">{cardData.def}</p>
                                    </div>
                                    )}
                                </div>
                                </>
                            )}
                        </CardContent>
                    </div>
                </div>
            </Card>
          )}
          
          {!isLoading && !error && !cardData && !searched && (
             <div className="text-center py-10 text-muted-foreground">
                <HelpCircle className="h-12 w-12 mx-auto mb-2" />
                <p className="text-lg">Use o campo de busca acima para que a IA encontre detalhes sobre uma carta.</p>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
