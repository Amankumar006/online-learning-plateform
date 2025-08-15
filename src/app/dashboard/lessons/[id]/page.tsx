
"use client";

import { getLesson, getExercises, updateUserTimeSpent, Lesson, Exercise } from "@/lib/data";
import { notFound, useParams } from "next/navigation";
import LessonContent from "@/components/lessons/lesson-content";
import AdaptiveExercise from "@/components/lessons/adaptive-exercise";
import { buddyChatStream } from "@/ai/flows/buddy-chat";
import { Bot, Loader2, SendHorizontal, MessageSquare, Sparkles } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import LessonPlayer from "@/components/lessons/lesson-player";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import FormattedContent from "@/components/common/FormattedContent";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BrainCircuit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";


function LessonPageSkeleton() {
    return (
        <div className="max-w-4xl mx-auto p-6 md:p-8">
            <div className="space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="w-full h-48" />
                <div className="space-y-4 pt-4">
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            </div>
        </div>
    )
}

interface Message {
    role: 'user' | 'model';
    content: string;
    isError?: boolean;
}

const AIBuddyPopover = ({ user, lesson }: { user: FirebaseUser, lesson: Lesson }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: `Hello! I can help you with "${lesson.title}". Ask me to explain a concept or summarize the lesson!` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    const lessonContent = lesson.sections?.map(s => s.blocks.filter(b => b.type === 'text').map(b => (b as any).content).join('\n\n')).join('\n\n') || "No content available.";

    try {
      const result = await buddyChatStream({ 
          userMessage: input, 
          lessonContext: lessonContent,
          history: messages.map(msg => ({ role: msg.role, content: msg.content })),
          userId: user.uid,
          persona: 'buddy',
          webSearchEnabled: true
      });
      const assistantMessage: Message = { role: 'model', content: result.content, isError: result.type === 'error' };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (e: any) {
      console.error(e);
      const errorMessage: Message = { role: 'model', content: `Sorry, I ran into an error: ${e.message}`, isError: true };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
     <Popover>
        <PopoverTrigger asChild>
            <Button
                size="icon"
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-40"
            >
                <Bot className="h-7 w-7" />
                <span className="sr-only">Open AI Buddy</span>
            </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96 p-0 flex flex-col h-[60vh]">
             <div className="p-3 border-b">
                <h4 className="font-medium text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Study Buddy</h4>
            </div>
            <ScrollArea className="flex-1" ref={scrollAreaRef}>
                 <div className="space-y-4 p-4">
                    {messages.map((message, index) => (
                        <div key={index} className="flex items-start gap-3">
                            {message.role === 'model' && (
                                <Avatar className="w-8 h-8 shrink-0 border"><AvatarFallback><Bot size={20} /></AvatarFallback></Avatar>
                            )}
                            <div className={cn("flex-1 max-w-md p-3 rounded-lg text-sm", message.role === 'user' ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted')}>
                               <FormattedContent content={message.content} />
                            </div>
                        </div>
                    ))}
                     {isLoading && (
                         <div className="flex items-start gap-3">
                            <Avatar className="w-8 h-8 shrink-0 border"><AvatarFallback><Bot size={20} /></AvatarFallback></Avatar>
                            <div className="bg-muted p-3 rounded-lg"><Loader2 className="w-5 h-5 animate-spin" /></div>
                        </div>
                     )}
                </div>
            </ScrollArea>
            <div className="p-3 border-t bg-background">
                <div className="flex items-center gap-2">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question..."
                        className="flex-1 resize-none"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        disabled={isLoading}
                    />
                    <Button onClick={handleSend} disabled={isLoading || !input.trim()} size="icon">
                        <SendHorizontal className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </PopoverContent>
    </Popover>
  );
}


export default function LessonPage() {
  const params = useParams();
  const id = params.id as string;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'lesson' | 'practice'>('lesson');
  
  useEffect(() => {
    let startTime: number;
    if (user) {
        startTime = Date.now();
    }

    return () => {
        if (user && startTime) {
            const endTime = Date.now();
            const elapsedTimeInSeconds = Math.round((endTime - startTime) / 1000);
            if (elapsedTimeInSeconds > 5) { 
                updateUserTimeSpent(user.uid, elapsedTimeInSeconds).catch(console.error);
            }
        }
    };
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsLoading(true);
        try {
          const [lessonData, exercisesData] = await Promise.all([
            getLesson(id),
            getExercises(id),
          ]);
          
          if (!lessonData) {
            notFound();
            return;
          }
          setLesson(lessonData);
          setExercises(exercisesData);
        } catch (error) {
            console.error("Failed to load lesson data", error);
        } finally {
            setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [id]);
  
  
  if (isLoading) {
    return <LessonPageSkeleton />;
  }

  if (!user || !lesson) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-lg font-semibold">Loading Lesson...</p>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 w-full">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-headline">{lesson.title}</h1>
        <p className="text-lg text-muted-foreground">{lesson.subject}</p>
      </div>
      
      {view === 'lesson' && (
        <div className="animate-in fade-in-20">
            <LessonPlayer lesson={lesson} />
            <LessonContent lesson={lesson} />
            <Card className="mt-12 text-center p-8 bg-secondary/30">
                <CardHeader>
                    <CardTitle>Ready to Practice?</CardTitle>
                    <CardDescription>Test your knowledge with adaptive exercises based on this lesson.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button size="lg" onClick={() => setView('practice')}>
                        <BrainCircuit className="mr-2"/>
                        Start Practice
                    </Button>
                </CardContent>
            </Card>
        </div>
      )}

      {view === 'practice' && (
        <div className="animate-in fade-in-20">
           <Button variant="outline" onClick={() => setView('lesson')} className="mb-6">
                Back to Lesson
            </Button>
           <AdaptiveExercise 
              exercises={exercises} 
              userId={user.uid} 
              lessonTitle={lesson.title}
          />
        </div>
      )}

      <AIBuddyPopover user={user} lesson={lesson} />
    </div>
  );
}
