
"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { buddyChat } from '@/ai/flows/buddy-chat';
import { Bot, User, Loader2, SendHorizontal, Sparkles, BrainCircuit, HelpCircle, Plus, MessageSquare } from 'lucide-react';
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

interface Conversation {
    id: string;
    title: string;
    messages: Message[];
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

const initialMessage: Message = { role: 'assistant', content: "Hello! How can I help you today? Ask me to create an exercise or suggest a topic." };

export default function BuddyAIPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Initialize with a single new chat on load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // For now, history is session-based. A full implementation would load from Firestore.
        if (conversations.length === 0) {
            const newId = Date.now().toString();
            setConversations([{ id: newId, title: 'New Chat', messages: [initialMessage] }]);
            setActiveConversationId(newId);
        }
      }
    });
    return () => unsubscribe();
  }, []); // Run only once

  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }
  }, [activeConversation?.messages]);

  const handleNewChat = () => {
    const newId = Date.now().toString();
    const newConversation: Conversation = {
        id: newId,
        title: "New Chat",
        messages: [initialMessage]
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newId);
    setInput('');
    setError(null);
  }

  const handleSend = async (prompt?: string) => {
    const messageToSend = prompt || input;
    if (!messageToSend.trim() || !user || !activeConversation) return;

    const userMessage: Message = { role: 'user', content: messageToSend };
    
    // Update conversation state
    let updatedConversations = conversations.map(c => {
        if (c.id === activeConversationId) {
            // If it's the first user message, set the title
            const newTitle = c.messages.length === 1 ? messageToSend.substring(0, 30) + '...' : c.title;
            return { ...c, title: newTitle, messages: [...c.messages, userMessage] };
        }
        return c;
    });
    setConversations(updatedConversations);

    setInput('');
    setIsLoading(true);
    setError(null);

    const historyForAI = activeConversation.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        content: msg.content,
    }));

    try {
      const result = await buddyChat({
          userId: user.uid,
          userMessage: messageToSend,
          history: historyForAI,
      });
      const assistantMessage: Message = { role: 'assistant', content: result.response };
      
      // Add assistant response to the active conversation
       updatedConversations = updatedConversations.map(c => {
            if (c.id === activeConversationId) {
                return { ...c, messages: [...c.messages, assistantMessage] };
            }
            return c;
        });
       setConversations(updatedConversations);

    } catch (e: any) {
      console.error(e);
      const errorMessage: Message = { role: 'assistant', content: "Sorry, I ran into an error. Please try again." };
       updatedConversations = updatedConversations.map(c => {
            if (c.id === activeConversationId) {
                return { ...c, messages: [...c.messages, errorMessage] };
            }
            return c;
        });
       setConversations(updatedConversations);
      setError(e.message || 'An error occurred while communicating with the AI.');

    } finally {
      setIsLoading(false);
    }
  };

  const breadcrumbItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/buddy-ai", label: "Buddy AI" },
  ];
  
  const hasStarted = activeConversation && activeConversation.messages.length > 1;

  return (
    <div className="flex flex-col h-full">
        <Breadcrumb items={breadcrumbItems} />
        <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold font-headline flex items-center gap-3">
                <Bot className="h-8 w-8 text-primary"/> Buddy AI
            </h1>
            <p className="text-lg text-muted-foreground">Your personal AI-powered learning companion.</p>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 h-[calc(100vh-22rem)]">
            {/* Sidebar */}
            <Card className="hidden lg:flex flex-col">
                <div className="p-3 border-b">
                    <Button onClick={handleNewChat} className="w-full justify-start"><Plus className="mr-2 h-4 w-4"/> New Chat</Button>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {conversations.map(c => (
                            <Button
                                key={c.id}
                                variant={c.id === activeConversationId ? 'secondary' : 'ghost'}
                                className="w-full justify-start truncate"
                                onClick={() => setActiveConversationId(c.id)}
                            >
                                <MessageSquare className="mr-2 h-4 w-4 shrink-0" />
                                <span className="truncate">{c.title}</span>
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </Card>

            {/* Chat Area */}
            <Card className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                    {!hasStarted && !input ? (
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
                                    onClick={() => { setInput("Can you explain the concept of recursion in simple terms?"); }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {activeConversation?.messages.map((message, index) => (
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
                            onFocus={() => { if (!activeConversation) handleNewChat(); }}
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
    </div>
  );
}
