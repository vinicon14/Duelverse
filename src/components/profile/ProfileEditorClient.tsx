
'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, UserCog, UploadCloud, Image as ImageIcon, ShieldCheck, Brain, Crown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Badge } from "@/components/ui/badge";
import { useRouter } from 'next/navigation';

export default function ProfileEditorClient() {
  const { user, loading: authLoading, updateProfilePicture, updateDecklistImage } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [decklistImagePreview, setDecklistImagePreview] = useState<string | null>(null);

  const [isSavingProfilePic, setIsSavingProfilePic] = useState(false);
  const [isSavingDecklist, setIsSavingDecklist] = useState(false);

  useEffect(() => {
    if (user?.profilePictureUrl) {
      setProfilePicPreview(user.profilePictureUrl);
    } else if (user) {
      setProfilePicPreview(null);
    }
    if (user?.decklistImageUrl) {
      setDecklistImagePreview(user.decklistImageUrl);
    } else if (user) {
      setDecklistImagePreview(null);
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="w-full flex items-center justify-center p-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">Carregando seu perfil...</p>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }

  const getInitials = (name: string = "") => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'DV';
  };

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
    setPreview: (value: string | null) => void
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ variant: 'destructive', title: 'Arquivo Muito Grande', description: 'Por favor, escolha um arquivo menor que 5MB.' });
        event.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        setPreview(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfilePicture = async () => {
    if (!profilePicPreview) {
      toast({ variant: 'destructive', title: 'Nenhuma Imagem', description: 'Selecione uma imagem para salvar.'});
      return;
    }
    if (!user) return;
    setIsSavingProfilePic(true);
    try {
      await updateProfilePicture(profilePicPreview);
      toast({ title: 'Sucesso!', description: 'Sua foto de perfil foi atualizada.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: error instanceof Error ? error.message : 'Não foi possível atualizar a foto de perfil.',
      });
    } finally {
      setIsSavingProfilePic(false);
    }
  };

  const handleSaveDecklistImage = async () => {
    if (!decklistImagePreview) {
       toast({ variant: 'destructive', title: 'Nenhuma Imagem', description: 'Selecione uma imagem da decklist para salvar.'});
      return;
    }
    if (!user) return;
    setIsSavingDecklist(true);
    try {
      await updateDecklistImage(decklistImagePreview);
      toast({ title: 'Sucesso!', description: 'Sua imagem de decklist foi atualizada.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: error instanceof Error ? error.message : 'Não foi possível atualizar a imagem da decklist.',
      });
    } finally {
      setIsSavingDecklist(false);
    }
  };

  const currentUser = user;

  return (
    <div className="container mx-auto px-4 py-8 w-full">
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <UserCog className="h-10 w-10 text-accent" />
                <div>
                    <CardTitle className="text-3xl font-headline text-primary">Editar Perfil</CardTitle>
                    <CardDescription className="text-lg">Atualize suas informações de perfil.</CardDescription>
                </div>
            </div>
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <Card className="p-4 sm:p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-xl font-headline text-primary flex items-center"><ImageIcon className="mr-2 h-5 w-5"/>Foto de Perfil</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-32 w-32 border-4 border-primary text-4xl">
                  <AvatarImage
                    src={profilePicPreview || `https://placehold.co/128x128.png?text=${getInitials(currentUser.displayName)}`}
                    alt={currentUser.displayName || 'User Avatar'}
                    data-ai-hint="avatar person"
                    className="object-cover"
                  />
                  <AvatarFallback>{getInitials(currentUser.displayName)}</AvatarFallback>
                </Avatar>
              </div>
              <div>
                <Label htmlFor="profilePicFile" className="text-base block mb-2">Escolher nova foto (max 5MB)</Label>
                <Input
                  id="profilePicFile"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, setProfilePicPreview)}
                  className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>
            </CardContent>
            <CardFooter className="p-0 pt-4">
                <Button onClick={handleSaveProfilePicture} disabled={isSavingProfilePic || !profilePicPreview || profilePicPreview === currentUser.profilePictureUrl} className="w-full sm:w-auto">
                    {isSavingProfilePic ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Foto de Perfil
                </Button>
            </CardFooter>
          </Card>

          <Separator />

          <Card className="p-4 sm:p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-xl font-headline text-primary flex items-center"><UploadCloud className="mr-2 h-5 w-5"/>Minha Decklist</CardTitle>
              <CardDescription>Faça upload de uma imagem da sua decklist principal.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              {decklistImagePreview && (
                <div className="flex justify-center">
                  <Image
                    src={decklistImagePreview}
                    alt="Decklist Preview"
                    width={400}
                    height={300}
                    className="rounded-md object-contain border max-h-[300px]"
                    data-ai-hint="decklist yugioh"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="decklistFile" className="text-base block mb-2">
                  {decklistImagePreview ? "Escolher outra imagem (max 5MB)" : "Escolher imagem da decklist (max 5MB)"}
                </Label>
                <Input
                  id="decklistFile"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, setDecklistImagePreview)}
                  className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>
            </CardContent>
             <CardFooter className="p-0 pt-4">
                <Button onClick={handleSaveDecklistImage} disabled={isSavingDecklist || !decklistImagePreview || decklistImagePreview === currentUser.decklistImageUrl} className="w-full sm:w-auto">
                    {isSavingDecklist ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Decklist
                </Button>
            </CardFooter>
          </Card>

          <Separator />

          <Card className="p-4 sm:p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-xl font-headline text-primary flex items-center"><ShieldCheck className="mr-2 h-5 w-5"/>Verificação de Conta</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {currentUser.isVerified ? (
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="h-6 w-6 text-green-500" />
                  <p className="font-medium text-green-500">Conta Verificada!</p>
                  <Badge variant="outline" className="border-green-500 text-green-500">Duelista Experiente</Badge>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    Prove seu conhecimento sobre Yu-Gi-Oh! para ganhar um selo de verificação.
                    Você precisará acertar pelo menos 30 de 50 perguntas.
                  </p>
                  <Button onClick={() => router.push('/verify-quiz')} className="w-full sm:w-auto" variant="secondary">
                    <Brain className="mr-2 h-4 w-4" /> Iniciar Quiz de Verificação
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Separator />

          <Card className="p-4 sm:p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-xl font-headline text-primary flex items-center"><Crown className="mr-2 h-5 w-5"/>Status de Juiz</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              {currentUser.isJudge ? (
                <div className="flex items-center space-x-2">
                  <Crown className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                  <p className="font-medium text-yellow-600">Você é um Juiz Reconhecido!</p>
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600">Juiz Oficial</Badge>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    O status de juiz é concedido por administradores. Entre em contato com um administrador para solicitar o seu selo.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
