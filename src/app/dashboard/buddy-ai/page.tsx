
"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { buddyChat } from '@/ai/flows/buddy-chat';
import { Bot, User, Loader2, SendHorizontal, Sparkles, BrainCircuit, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Card } from '@/components/ui/card';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const StarterPrompt = ({ icon, text, onClick }: { icon: React.ReactNode, text: string, onClick: () => void }) => (
    <button
        onClick={onClick}
        className="p-4 border rounded-lg hover:bg-muted text-left transition-colors w-full flex items-start gap-3"
    >
        <div className="text-primary mt-1">{icon}</div>
        <div>
            <p className="font-semibold">{text}</p>
            <p className="text-sm text-muted-foreground">Let Buddy AI help you out.</p>
        </div>
    </button>
);

export default function BuddyAIPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }
  }, [messages]);

  const handleSend = async (prompt?: string) => {
    const messageToSend = prompt || input;
    if (!messageToSend.trim() || !user) return;

    if (!hasStarted) {
        setMessages([]);
        setHasStarted(true);
    }
    
    const historyForAI = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        content: msg.content,
    }));

    const userMessage: Message = { role: 'user', content: messageToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const result = await buddyChat({ 
          userId: user.uid, 
          userMessage: messageToSend,
          history: historyForAI,
      });
      const assistantMessage: Message = { role: 'assistant', content: result.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (e: any) {
      console.error(e);
      const errorMessage: Message = { role: 'assistant', content: "Sorry, I ran into an error. Please try again." };
      setMessages(prev => [...prev, errorMessage]);
      setError(e.message || 'An error occurred while communicating with the AI.');

    } finally {
      setIsLoading(false);
    }
  };

  const breadcrumbItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/buddy-ai", label: "Buddy AI" },
  ];
  
  return (
    <div className="flex flex-col h-full">
        <Breadcrumb items={breadcrumbItems} />
        <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold font-headline flex items-center gap-3">
                <Bot className="h-8 w-8 text-primary"/> Buddy AI
            </h1>
            <p className="text-lg text-muted-foreground">Your personal AI-powered learning companion.</p>
        </div>

        <Card className="flex-1 flex flex-col h-[calc(100vh-22rem)]">
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                {!hasStarted ? (
                    <div className="p-4">
                        <h2 className="text-lg font-semibold mb-4">How can I help you today?</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <StarterPrompt 
                                icon={<Sparkles className="h-5 w-5"/>}
                                text="Suggest a new topic for me to study"
                                onClick={() => handleSend("Suggest a new topic for me to study based on my progress.")}
                            />
                            <StarterPrompt 
                                icon={<BrainCircuit className="h-5 w-5"/>}
                                text="Create a practice question"
                                onClick={() => handleSend("Create a hard practice question about Python dictionaries.")}
                            />
                            <StarterPrompt 
                                icon={<HelpCircle className="h-5 w-5"/>}
                                text="Explain a concept"
                                onClick={() => { setInput("Can you explain the concept of recursion in simple terms?"); setHasStarted(true); }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {messages.map((message, index) => (
                            <div key={index} className={cn("flex items-start gap-4", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                                {message.role === 'assistant' && (
                                    <Avatar className="w-8 h-8 border">
                                        <AvatarFallback><Bot size={20} /></AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={cn("max-w-xl p-3 rounded-lg shadow-sm", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                   <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                </div>
                                 {message.role === 'user' && (
                                    <Avatar className="w-8 h-8 border">
                                        <AvatarFallback><User size={20} /></AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))}
                         {isLoading && (
                             <div className="flex items-start gap-4 justify-start">
                                <Avatar className="w-8 h-8 border">
                                    <AvatarFallback><Bot size={20} /></AvatarFallback>
                                </Avatar>
                                <div className="bg-muted p-3 rounded-lg shadow-sm">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                </div>
                            </div>
                         )}
                    </div>
                )}
            </ScrollArea>
            
            <div className="border-t p-4 bg-background/80 backdrop-blur-sm">
                 {error && (
                    <Alert variant="destructive" className="mb-2">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <div className="relative">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question, request a practice problem, or ask for study advice..."
                        className="flex-1 resize-none pr-20"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        disabled={isLoading}
                        onFocus={() => { if (!hasStarted) setHasStarted(true); }}
                    />
                    <Button 
                        onClick={() => handleSend()} 
                        disabled={isLoading || !input.trim()} 
                        size="lg" 
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-9"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
                        <span className="sr-only">Send</span>
                    </Button>
                </div>
            </div>
        </Card>
    </div>
  );
}
