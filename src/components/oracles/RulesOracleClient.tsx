'use client';

import { askOracle } from "@/ai/flows/oracle-rules";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft, Loader2, Send, Brain, ServerCrash, Wand2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

export default function RulesOracleClient() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      toast({
        variant: "destructive",
        title: "Pergunta Vazia",
        description: "Por favor, digite sua dúvida sobre as regras.",
      });
      return;
    }

    setIsLoading(true);
    setAnswer(null);

    try {
      const result = await askOracle({ ruleQuestion: question });
      setAnswer(result.ruleAnswer);
    } catch (err) {
      console.error("Error asking oracle:", err);
      toast({
        variant: "destructive",
        title: "Erro ao Consultar Oráculo",
        description: err instanceof Error ? err.message : "Não foi possível obter uma resposta. Tente novamente.",
      });
      setAnswer("Desculpe, não consegui processar sua pergunta no momento.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <Brain className="h-10 w-10 text-accent" />
                <div>
                    <CardTitle className="text-3xl font-headline text-primary">Oráculo de Regras (IA)</CardTitle>
                    <CardDescription className="text-lg">Pergunte à IA sobre as regras de Yu-Gi-Oh!.</CardDescription>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Digite sua pergunta sobre uma regra específica... (ex: 'Como funciona a prioridade de ativação de efeitos rápidos?')"
              rows={4}
              className="text-base"
              aria-label="Pergunta sobre regras"
            />
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Send className="mr-2 h-5 w-5" />
              )}
              Perguntar ao Oráculo
            </Button>
          </form>

          {isLoading && (
            <div className="flex justify-center items-center py-10 mt-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Consultando os pergaminhos antigos...</p>
            </div>
          )}

          {answer && !isLoading && (
            <Card className="mt-6 bg-muted/30">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Wand2 className="h-6 w-6 text-primary" />
                  <CardTitle className="font-headline text-xl">Resposta do Oráculo</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-auto max-h-[400px] pr-3">
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line leading-relaxed text-base text-foreground">
                    {answer}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
