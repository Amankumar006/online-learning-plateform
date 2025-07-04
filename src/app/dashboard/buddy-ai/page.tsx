
"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buddyChat } from '@/ai/flows/buddy-chat';
import { Bot, User, Loader2, Send, Sparkles, BrainCircuit, HelpCircle, Plus, MessageSquare, Search, Copy, RefreshCw, Trash2, Settings, Ellipsis } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from 'next/link';

interface Message {
    role: 'user' | 'model';
    content: string;
}

interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
}

const initialMessage: Message = { role: 'model', content: "Hello! I'm your AI study partner. How can I help you learn today? You can ask me to create an exercise, suggest a topic, or explain a concept." };

const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
};

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
};

export default function BuddyAIPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Load conversations from localStorage or initialize
        const savedConvos = localStorage.getItem(`conversations_${currentUser.uid}`);
        if (savedConvos) {
            const parsedConvos: Conversation[] = JSON.parse(savedConvos);
            if (parsedConvos.length > 0) {
                setConversations(parsedConvos);
                setActiveConversationId(parsedConvos[0].id);
                return;
            }
        }
        // If no saved conversations, start a new one
        handleNewChat();
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
  }, [conversations, activeConversationId]);

  useEffect(() => {
    if (user && conversations.length > 0) {
        localStorage.setItem(`conversations_${user.uid}`, JSON.stringify(conversations));
    }
  }, [conversations, user]);

  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  const handleNewChat = () => {
    const newId = Date.now().toString();
    const newConversation: Conversation = {
        id: newId,
        title: "New Chat",
        messages: [initialMessage],
        createdAt: Date.now(),
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newId);
    setInput('');
  }

  const handleDeleteConversation = (convoId: string) => {
    const newConversations = conversations.filter(c => c.id !== convoId);
    setConversations(newConversations);
    if (activeConversationId === convoId) {
        if (newConversations.length > 0) {
            setActiveConversationId(newConversations[0].id);
        } else {
            handleNewChat();
        }
    }
  }

  const handleClearAll = () => {
    setConversations([]);
    handleNewChat();
  }

  const handleSend = async (prompt?: string) => {
    const messageToSend = prompt || input;
    if (!messageToSend.trim() || !user || !activeConversation) return;

    const userMessage: Message = { role: 'user', content: messageToSend };
    
    // Update conversation with new message
    const updatedConversations = conversations.map(c => {
        if (c.id === activeConversationId) {
            const isNewChat = c.messages.length <= 1;
            const newTitle = isNewChat ? messageToSend.substring(0, 40) + (messageToSend.length > 40 ? '...' : '') : c.title;
            return { ...c, title: newTitle, messages: [...c.messages, userMessage] };
        }
        return c;
    });
    setConversations(updatedConversations);

    setInput('');
    setIsLoading(true);

    const historyForAI = activeConversation.messages.map(msg => ({
        role: msg.role as 'user' | 'model',
        content: msg.content,
    }));

    try {
      const result = await buddyChat({
          userId: user.uid,
          userMessage: messageToSend,
          history: historyForAI,
      });
      const assistantMessage: Message = { role: 'model', content: result.response };
      
      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return { ...c, messages: [...c.messages, assistantMessage] };
        }
        return c;
      }));

    } catch (e: any) {
      console.error(e);
      const errorMessage: Message = { role: 'model', content: `Sorry, I ran into an error. Please try again.\n\n> ${e.message || 'An unknown error occurred.'}` };
      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
            return { ...c, messages: [...c.messages, errorMessage] };
        }
        return c;
      }));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegenerate = async () => {
    if (!user || !activeConversation) return;

    const lastUserMessage = activeConversation.messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
        toast({ title: "Cannot regenerate", description: "No user message found to regenerate a response for." });
        return;
    }

    // Remove the last model response if it exists
    const historyWithoutLastResponse = [...activeConversation.messages];
    if (historyWithoutLastResponse[historyWithoutLastResponse.length - 1].role === 'model') {
        historyWithoutLastResponse.pop();
    }
    
    setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages: historyWithoutLastResponse } : c));

    setIsLoading(true);

    const historyForAI = historyWithoutLastResponse.map(msg => ({
        role: msg.role as 'user' | 'model',
        content: msg.content,
    }));
    
    try {
        const result = await buddyChat({
            userId: user.uid,
            userMessage: lastUserMessage.content,
            history: historyForAI,
        });
        const assistantMessage: Message = { role: 'model', content: result.response };
        
        setConversations(prev => prev.map(c => {
            if (c.id === activeConversationId) {
            return { ...c, messages: [...historyWithoutLastResponse, assistantMessage] };
            }
            return c;
        }));

    } catch(e: any) {
        console.error(e);
        const errorMessage: Message = { role: 'model', content: `Sorry, I ran into an error. Please try again.\n\n> ${e.message || 'An unknown error occurred.'}` };
        setConversations(prev => prev.map(c => {
            if (c.id === activeConversationId) {
                return { ...c, messages: [...historyWithoutLastResponse, errorMessage] };
            }
            return c;
        }));
    } finally {
        setIsLoading(false);
    }
  };
  
  const groupConversationsByDate = (convos: Conversation[]) => {
    const groups: { [key: string]: Conversation[] } = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
  
    convos.forEach(convo => {
      const convoDate = new Date(convo.createdAt);
      let key;
      if (convoDate.toDateString() === today.toDateString()) {
        key = 'Today';
      } else if (convoDate.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday';
      } else {
        key = convoDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
      }
  
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(convo);
    });
    return groups;
  };
  
  const groupedConversations = groupConversationsByDate(conversations);

  return (
    <div className="grid grid-cols-[280px_1fr] h-[calc(100vh-8rem)] bg-background rounded-2xl border overflow-hidden shadow-sm">
        {/* --- Sidebar --- */}
        <div className="flex flex-col bg-muted/20 p-4 border-r">
            <h1 className="text-xl font-bold font-headline px-2">Buddy A.I+</h1>
            
            <div className="flex gap-2 mt-6">
                <Button onClick={handleNewChat} className="w-full justify-start rounded-full text-base py-5"><Plus className="mr-2 h-4 w-4"/> New Chat</Button>
                <Button variant="outline" size="icon" className="rounded-full"><Search /></Button>
            </div>

            <div className="flex justify-between items-center mt-6">
                <h2 className="text-sm font-semibold text-muted-foreground px-2">Your conversations</h2>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="link" className="text-xs text-muted-foreground px-2 h-auto py-0">Clear All</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete all your conversations. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearAll}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            <ScrollArea className="flex-1 -mx-4 mt-2">
                <div className="px-2 space-y-4">
                     {Object.entries(groupedConversations).map(([groupTitle, convos]) => (
                        <div key={groupTitle}>
                             <h3 className="text-xs font-semibold text-muted-foreground px-2 mb-2">{groupTitle}</h3>
                             <div className="space-y-1">
                                {convos.map(c => (
                                    <div key={c.id} className="relative group">
                                        <Button
                                            variant={c.id === activeConversationId ? 'secondary' : 'ghost'}
                                            className="w-full justify-start truncate rounded-full pr-10"
                                            onClick={() => setActiveConversationId(c.id)}
                                        >
                                            <MessageSquare className="mr-2 h-4 w-4 shrink-0" />
                                            <span className="truncate">{c.title}</span>
                                        </Button>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                                                        <Ellipsis className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4"/> Delete
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                                                                <AlertDialogDescription>This will permanently delete "{c.title}".</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteConversation(c.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                             </DropdownMenu>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            
            <div className="border-t -mx-4 mt-auto">
                 <Button variant="ghost" className="w-full justify-start rounded-none py-6 text-base" asChild>
                    <Link href="/dashboard/profile"><Settings className="mr-3 h-5 w-5"/> Settings</Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start rounded-none py-6 text-base" asChild>
                     <Link href="/dashboard/profile">
                        <Avatar className="w-8 h-8 mr-3">
                            <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
                            <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                        </Avatar>
                        {user?.displayName || 'User Profile'}
                    </Link>
                </Button>
            </div>
        </div>

        {/* --- Main Chat Area --- */}
        <div className="relative flex flex-col h-full">
            <ScrollArea className="flex-1" ref={scrollAreaRef}>
                <div className="p-8 space-y-8 max-w-4xl mx-auto">
                    {activeConversation?.messages.map((message, index) => (
                        <div key={index} className="flex items-start gap-4">
                            <Avatar className="w-8 h-8 border shadow-sm">
                                <AvatarImage src={message.role === 'user' ? user?.photoURL || '' : ''} />
                                <AvatarFallback>
                                    {message.role === 'user' ? getInitials(user?.displayName) : <Bot size={20} />}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 pt-1">
                                <p className="font-semibold text-sm">
                                    {message.role === 'user' ? user?.displayName || 'You' : 'Buddy AI'}
                                </p>
                                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                                   {message.content}
                                </div>
                                {message.role === 'model' && index === activeConversation.messages.length - 1 && (
                                    <div className="mt-4 flex items-center gap-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(message.content)}><Copy className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRegenerate} disabled={isLoading}><RefreshCw className="h-4 w-4" /></Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-4">
                            <Avatar className="w-8 h-8 border shadow-sm"><AvatarFallback><Bot size={20} /></AvatarFallback></Avatar>
                            <div className="flex-1 pt-1"><Loader2 className="w-5 h-5 animate-spin" /></div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="w-full p-4 bg-background/50">
                <div className="relative mx-auto max-w-3xl">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="What's in your mind?..."
                        className="rounded-full py-6 pl-6 pr-16 shadow-lg border-2 focus-visible:ring-primary/50"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        disabled={isLoading}
                    />
                    <Button
                        onClick={() => handleSend()}
                        disabled={isLoading || !input.trim()}
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full w-10 h-10"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span className="sr-only">Send</span>
                    </Button>
                </div>
            </div>
        </div>
    </div>
  );
}


    