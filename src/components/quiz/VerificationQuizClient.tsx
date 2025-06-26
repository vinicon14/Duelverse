
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { generateQuizQuestions, type QuizQuestion, type QuizOutput } from '@/ai/flows/yugioh-quiz-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Send, CheckCircle, XCircle, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';

const TOTAL_QUESTIONS = 50;
const MIN_CORRECT_TO_VERIFY = 30;

export default function VerificationQuizClient() {
  const { user, updateUserVerificationStatus } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({}); // question.id -> selectedOption
  const [score, setScore] = useState(0);
  const [quizState, setQuizState] = useState<'loading' | 'in_progress' | 'submitted' | 'error'>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.isVerified) {
      toast({ title: "Já Verificado", description: "Sua conta já está verificada!" });
      router.replace('/profile');
      return;
    }

    const fetchQuestions = async () => {
      if (!user) return;
      setQuizState('loading');

      let quizLanguage = "English"; // Default language
      if (user.country?.toLowerCase() === "brasil") {
        quizLanguage = "Português";
      }
      // Add more country-to-language mappings here if needed

      try {
        const quizData: QuizOutput = await generateQuizQuestions({ 
          numberOfQuestions: TOTAL_QUESTIONS,
          language: quizLanguage 
        });
        if (quizData.questions && quizData.questions.length > 0) {
          // Ensure unique IDs for client-side keying if AI doesn't provide them or they collide
          const questionsWithClientIds = quizData.questions.map((q, idx) => ({
            ...q,
            id: q.id || `client-q-${idx}` // Fallback ID
          }));
          setQuestions(questionsWithClientIds);
          setQuizState('in_progress');
        } else {
          throw new Error("A IA não retornou perguntas para o quiz.");
        }
      } catch (error) {
        console.error("Failed to fetch quiz questions:", error);
        toast({ variant: 'destructive', title: 'Erro ao Carregar Quiz', description: error instanceof Error ? error.message : 'Não foi possível buscar as perguntas.' });
        setQuizState('error');
      }
    };

    if (user) {
        fetchQuestions();
    }
  }, [user, toast, router]);

  const handleAnswerSelect = (questionId: string, option: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    setIsSubmitting(true);
    let calculatedScore = 0;
    questions.forEach(q => {
      if (selectedAnswers[q.id] === q.correctAnswer) {
        calculatedScore++;
      }
    });
    setScore(calculatedScore);

    const passed = calculatedScore >= MIN_CORRECT_TO_VERIFY;
    if (passed && user) {
      try {
        await updateUserVerificationStatus(true);
        toast({ title: 'Parabéns!', description: `Você foi verificado! Pontuação: ${calculatedScore}/${TOTAL_QUESTIONS}.`, duration: 5000 });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erro ao Verificar', description: 'Não foi possível atualizar seu status de verificação. Tente novamente.' });
      }
    } else if (!passed) {
        toast({ title: 'Não foi desta vez!', description: `Você acertou ${calculatedScore}/${TOTAL_QUESTIONS}. Você precisa de ${MIN_CORRECT_TO_VERIFY} para ser verificado.`, duration: 5000, variant: "destructive" });
    }
    setQuizState('submitted');
    setIsSubmitting(false);
  };

  if (quizState === 'loading') {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-lg">Carregando o Quiz de Verificação...</p>
        <p className="text-sm text-muted-foreground">A IA está preparando suas perguntas!</p>
      </div>
    );
  }

  if (quizState === 'error') {
    return (
      <div className="w-full text-center">
        <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">Erro ao Carregar o Quiz</h1>
        <p className="text-muted-foreground mb-4">Não foi possível buscar as perguntas. Por favor, tente novamente mais tarde.</p>
        <Button asChild variant="outline">
          <Link href="/profile"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Perfil</Link>
        </Button>
      </div>
    );
  }

  if (quizState === 'submitted') {
    const passed = score >= MIN_CORRECT_TO_VERIFY;
    return (
      <div className="w-full flex justify-center items-center">
        <Card className="w-full max-w-xl text-center shadow-xl">
          <CardHeader>
            {passed ? <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" /> : <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />}
            <CardTitle className="text-3xl font-headline">Resultado do Quiz</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl mb-2">
              Você acertou <span className={`font-bold ${passed ? 'text-green-500' : 'text-destructive'}`}>{score}</span> de {TOTAL_QUESTIONS} perguntas.
            </p>
            {passed ? (
              <p className="text-green-500 font-medium">Parabéns! Sua conta foi verificada com sucesso.</p>
            ) : (
              <p className="text-destructive font-medium">
                Infelizmente, você não atingiu a pontuação mínima de {MIN_CORRECT_TO_VERIFY} acertos para verificação.
              </p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-center gap-2">
            <Button asChild variant="default">
              <Link href="/dashboard">Voltar ao Dashboard</Link>
            </Button>
             <Button asChild variant="outline">
              <Link href="/profile">Ver Perfil</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
     return (
      <div className="w-full text-center">
        <p className="text-muted-foreground">Nenhuma pergunta para exibir ou quiz finalizado inesperadamente.</p>
         <Button asChild variant="outline" className="mt-4">
          <Link href="/profile"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Perfil</Link>
        </Button>
      </div>
    );
  }

  const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;


  return (
    <div className="container mx-auto px-4 py-8 w-full">
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                    <Brain className="h-8 w-8 text-accent" />
                    <CardTitle className="text-2xl font-headline text-primary">Quiz de Verificação Yu-Gi-Oh!</CardTitle>
                </div>
                 <Button variant="outline" size="sm" asChild>
                    <Link href="/profile"><ArrowLeft className="mr-1 h-4 w-4" /> Sair do Quiz</Link>
                </Button>
            </div>
          <CardDescription className="text-base">
            Pergunta {currentQuestionIndex + 1} de {questions.length}. Responda corretamente para verificar sua conta.
          </CardDescription>
           <Progress value={progressPercentage} className="w-full mt-2" />
        </CardHeader>
        <CardContent className="min-h-[250px]">
          <h2 className="text-lg font-semibold mb-4 whitespace-pre-line">{currentQuestion.question}</h2>
          <RadioGroup
            value={selectedAnswers[currentQuestion.id] || ""}
            onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}
            className="space-y-3"
          >
            {currentQuestion.options.map((option, index) => (
              <div key={`${currentQuestion.id}-option-${index}`} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors cursor-pointer has-[input:checked]:bg-accent/20 has-[input:checked]:border-accent">
                <RadioGroupItem value={option} id={`${currentQuestion.id}-option-${index}`} />
                <Label htmlFor={`${currentQuestion.id}-option-${index}`} className="text-base flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <Button variant="outline" onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0 || isSubmitting}>
            Anterior
          </Button>
          <div className="text-sm text-muted-foreground">
            {Object.keys(selectedAnswers).length} / {questions.length} respondidas
          </div>
          {currentQuestionIndex === questions.length - 1 ? (
            <Button onClick={handleSubmitQuiz} disabled={isSubmitting || Object.keys(selectedAnswers).length !== questions.length}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Finalizar Quiz
            </Button>
          ) : (
            <Button onClick={handleNextQuestion} disabled={!selectedAnswers[currentQuestion.id] || isSubmitting}>
              Próxima
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
