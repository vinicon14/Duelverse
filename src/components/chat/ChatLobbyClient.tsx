'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import type { ChatMessage } from '@/lib/chatStore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const getInitials = (name: string = "") => {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'DU';
};

export default function ChatLobbyClient() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollViewport) {
      setTimeout(() => {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }, 100);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch('/api/chat');
      if (!response.ok) {
        throw new Error('Falha ao buscar mensagens.');
      }
      const data: ChatMessage[] = await response.json();
      setMessages(data);
    } catch (error) {
      console.error(error);
      // Don't toast on polling errors to avoid spamming the user
    } finally {
      if (isLoadingMessages) {
        setIsLoadingMessages(false);
      }
    }
  }, [isLoadingMessages]);

  useEffect(() => {
    fetchMessages().then(scrollToBottom);
    
    pollingIntervalRef.current = setInterval(fetchMessages, 5000); // Poll every 5 seconds

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchMessages, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, text: newMessage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao enviar mensagem.');
      }
      
      setNewMessage('');
      await fetchMessages(); // Fetch immediately after sending
      scrollToBottom();

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Enviar',
        description: error instanceof Error ? error.message : 'Não foi possível enviar sua mensagem.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <Card className="flex-grow flex flex-col shadow-xl">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-headline">Lobby Global</CardTitle>
              <CardDescription>Converse com todos os duelistas online.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden p-2 sm:p-4">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="space-y-4 pr-4">
              {isLoadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <p className="text-muted-foreground">Nenhuma mensagem ainda. Seja o primeiro!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex items-start gap-3",
                      msg.userId === user?.id ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <Avatar className="h-8 w-8 border">
                      <AvatarImage src={msg.profilePictureUrl || undefined} data-ai-hint="avatar person" />
                      <AvatarFallback>{getInitials(msg.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "flex flex-col max-w-xs md:max-w-md",
                      msg.userId === user?.id ? "items-end" : "items-start"
                    )}>
                      <div className={cn(
                        "p-3 rounded-lg",
                        msg.userId === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {msg.displayName} &bull; {format(new Date(msg.timestamp), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <form onSubmit={handleSendMessage} className="w-full flex items-center space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              disabled={isSending || authLoading}
            />
            <Button type="submit" disabled={isSending || authLoading || !newMessage.trim()}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
