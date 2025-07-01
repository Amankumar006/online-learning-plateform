
"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { chatWithAIBuddy } from '@/ai/flows/chat-with-ai-buddy';
import { Bot, User, Loader2, SendHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function AIBuddy({ lessonContent }: { lessonContent: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm your AI study buddy. Ask me anything about this lesson, or ask me to summarize it for you!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const result = await chatWithAIBuddy({ lessonContent, userMessage: input });
      const assistantMessage: Message = { role: 'assistant', content: result.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (e) {
      console.error(e);
      const errorMessage: Message = { role: 'assistant', content: "Sorry, I ran into an error. Please check the console and try again." };
      setMessages(prev => [...prev, errorMessage]);
      setError('An error occurred while communicating with the AI.');

    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col h-[60vh]">
        <div className="mb-4">
            <h3 className="font-headline text-xl font-semibold flex items-center gap-2">
                <Bot /> AI Study Buddy
            </h3>
            <p className="text-sm text-muted-foreground">
                Chat with an AI to deepen your understanding of the lesson.
            </p>
        </div>
        
        <ScrollArea className="flex-1 mb-4 p-4 border rounded-md" ref={scrollAreaRef}>
            <div className="space-y-6">
                {messages.map((message, index) => (
                    <div key={index} className={cn("flex items-start gap-4", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                        {message.role === 'assistant' && (
                            <Avatar className="w-8 h-8">
                                <AvatarFallback><Bot size={20} /></AvatarFallback>
                            </Avatar>
                        )}
                        <div className={cn("max-w-md p-3 rounded-lg", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                           <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                         {message.role === 'user' && (
                            <Avatar className="w-8 h-8">
                                <AvatarFallback><User size={20} /></AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))}
                 {isLoading && (
                     <div className="flex items-start gap-4 justify-start">
                        <Avatar className="w-8 h-8">
                            <AvatarFallback><Bot size={20} /></AvatarFallback>
                        </Avatar>
                        <div className="bg-muted p-3 rounded-lg">
                            <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                    </div>
                 )}
            </div>
        </ScrollArea>
        
        {error && (
            <Alert variant="destructive" className="my-2">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        <div className="flex items-center gap-2">
            <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about the lesson..."
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
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
                <span className="sr-only">Send</span>
            </Button>
        </div>
    </div>
  );
}
