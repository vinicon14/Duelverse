
'use client';

import type { RankingEntry, User } from "@/lib/types";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Loader2, Trophy, Globe, Star, ShieldCheck, Crown, UserCog } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const getInitials = (name: string = "") => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'DU';
}

const ADMIN_USERNAME = 'vinicon14';

export default function RankingClient() {
  const [ranking, setRanking] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRanking = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/users/all');
        if (!response.ok) {
          throw new Error('Falha ao carregar o ranking.');
        }
        const data: User[] = await response.json();
        setRanking(data); // The API already sorts by score
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: error instanceof Error ? error.message : 'Não foi possível buscar o ranking.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchRanking();
  }, [toast]);


  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Trophy className="h-10 w-10 text-accent" />
              <div>
                <CardTitle className="text-3xl font-headline text-primary">Ranking Global</CardTitle>
                <CardDescription className="text-lg">Veja os melhores duelistas do DuelVerse.</CardDescription>
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
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : ranking.length === 0 && !isLoading ? (
             <div className="flex flex-col justify-center items-center h-64 text-center">
                <Trophy className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl text-muted-foreground">O ranking ainda está vazio.</p>
                <p className="text-sm text-muted-foreground">Jogue algumas partidas ou registre usuários para aparecer aqui!</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-muted/20">
                    <TableHead className="w-[80px] text-center font-headline text-base">Rank</TableHead>
                    <TableHead className="font-headline text-base">Duelista</TableHead>
                    <TableHead className="text-center font-headline text-base">País</TableHead>
                    <TableHead className="text-right font-headline text-base">Pontuação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((entry, index) => (
                    <TableRow key={entry.id} className="hover:bg-muted/5 transition-colors duration-150">
                      <TableCell className="text-center font-medium text-lg">
                        {index + 1 === 1 && <Trophy className="inline-block h-6 w-6 text-yellow-400 mr-1" />}
                        {index + 1 === 2 && <Trophy className="inline-block h-6 w-6 text-gray-400 mr-1" />}
                        {index + 1 === 3 && <Trophy className="inline-block h-6 w-6 text-orange-400 mr-1" />}
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10 border-2 border-secondary">
                             <AvatarImage
                                src={entry.profilePictureUrl || `https://placehold.co/100x100.png?text=${getInitials(entry.displayName)}`}
                                alt={entry.displayName}
                                data-ai-hint="avatar person"
                             />
                            <AvatarFallback>{getInitials(entry.displayName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center flex-wrap gap-x-2">
                                <p className="font-medium text-base">{entry.displayName}</p>
                                {(entry.username === ADMIN_USERNAME || entry.isCoAdmin) && (
                                    <Badge variant="outline" className="px-1 py-0 text-xs border-accent text-accent">
                                        <UserCog className="mr-1 h-3 w-3" /> Admin
                                    </Badge>
                                )}
                                {entry.isVerified && (
                                    <Badge variant="outline" className="px-1 py-0 text-xs border-green-500 text-green-500">
                                        <ShieldCheck className="mr-1 h-3 w-3" /> Verificado
                                    </Badge>
                                )}
                                {entry.isJudge && (
                                    <Badge variant="outline" className="px-1 py-0 text-xs border-yellow-500 text-yellow-600">
                                        <Crown className="mr-1 h-3 w-3 fill-yellow-500" /> Juiz
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">@{entry.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center space-x-1 text-muted-foreground">
                           <Globe className="h-4 w-4" />
                           <span>{entry.country}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center space-x-1 font-bold text-lg text-primary">
                           <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                           <span>{entry.score.toLocaleString()}</span>
                        </div>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
