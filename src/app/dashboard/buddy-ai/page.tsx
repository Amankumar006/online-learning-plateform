
"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buddyChat } from '@/ai/flows/buddy-chat';
import { Bot, User, Loader2, Send, Sparkles, BrainCircuit, HelpCircle, MessageSquare, Trash2, Settings, Ellipsis, BookOpen, Plus } from 'lucide-react';
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
import { Card } from '@/components/ui/card';
import { Copy, RefreshCw } from 'lucide-react';


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

const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
};

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
};


const CodeBlock = ({ language, code }: { language: string; code: string }) => {
  const { toast } = useToast();
  return (
    <div className="my-4 rounded-md bg-muted text-sm">
        <div className="flex items-center justify-between rounded-t-md bg-secondary px-4 py-2 text-muted-foreground">
            <span>{language}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { copyToClipboard(code); toast({title: "Copied to clipboard!"})}}>
                <Copy className="h-4 w-4" />
            </Button>
        </div>
      <pre className="overflow-x-auto p-4">
        <code>{code}</code>
      </pre>
    </div>
  );
};


const FormattedMessageContent = ({ content }: { content: string }) => {
  // Split by major block elements like code blocks and horizontal rules
  const blocks = content.split(/(```[\s\S]*?```|---)/g).filter(Boolean);

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
    return parts.filter(Boolean).map((part, k) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={k}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('*') && part.endsWith('*')) return <em key={k}>{part.slice(1, -1)}</em>;
      if (part.startsWith('`') && part.endsWith('`')) return <code key={k} className="bg-muted px-1.5 py-1 rounded text-sm font-mono text-primary">{part.slice(1, -1)}</code>;
      return <React.Fragment key={k}>{part}</React.Fragment>;
    });
  };

  return (
    <>
      {blocks.map((block, i) => {
        if (block.trim() === '---') {
          return <hr key={i} className="my-6 border-border/50" />;
        }
        if (block.startsWith('```')) {
          const codeBlockContent = block.slice(3, -3).trim();
          const lang = codeBlockContent.split('\n')[0]?.trim() || '';
          const code = codeBlockContent.substring(codeBlockContent.indexOf('\n') + 1);
          return <CodeBlock key={i} language={lang} code={code} />;
        }

        const lines = block.trim().split('\n');
        return lines.map((line, j) => {
          if (line.startsWith('### ')) {
            return <h3 key={`${i}-${j}`} className="font-headline font-semibold text-xl mt-6 mb-2">{renderInline(line.substring(4))}</h3>;
          }
          if (line.startsWith('> ')) {
            return <blockquote key={`${i}-${j}`} className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">{renderInline(line.substring(2))}</blockquote>;
          }
           if (line.match(/^\s*-\s/)) { // Bulleted list
            const itemContent = line.replace(/^\s*-\s/, '');
            return <div key={`${i}-${j}`} className="flex items-start gap-3 my-2"><span className="text-primary mt-1.5">●</span><div className="flex-1">{renderInline(itemContent)}</div></div>;
          }
          if (line.trim()) {
            return <p key={`${i}-${j}`}>{renderInline(line)}</p>;
          }
          return null;
        });
      })}
    </>
  );
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
        messages: [],
        createdAt: Date.now(),
    };
    setConversations(prev => [newConversation, ...prev.sort((a, b) => b.createdAt - a.createdAt)]);
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
            const isNewChat = c.messages.length === 0;
            const newTitle = isNewChat ? messageToSend.substring(0, 40) + (messageToSend.length > 40 ? '...' : '') : c.title;
            return { ...c, title: newTitle, messages: [...c.messages, userMessage], createdAt: Date.now() };
        }
        return c;
    }).sort((a,b) => b.createdAt - a.createdAt);
    setConversations(updatedConversations);

    setInput('');
    setIsLoading(true);

    const historyForAI = activeConversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
    }));

    try {
      const result = await buddyChat({
          userMessage: messageToSend,
          history: historyForAI,
          userId: user.uid
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
        role: msg.role,
        content: msg.content,
    }));
    
    try {
        const result = await buddyChat({
            userMessage: lastUserMessage.content,
            history: historyForAI,
            userId: user.uid
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
    <div className="flex flex-row h-full">
        {/* --- Sidebar --- */}
        <div className="hidden md:flex flex-col w-[280px] p-4 bg-background/80 backdrop-blur-sm border-r border-border shrink-0">
            <h1 className="text-xl font-bold font-headline px-2">Buddy A.I+</h1>
            
            <div className="flex gap-2 mt-6">
                <Button onClick={handleNewChat} className="w-full justify-start rounded-full text-base py-5"><Plus className="mr-2 h-4 w-4"/> New Chat</Button>
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

            <ScrollArea className="flex-1 -mx-2 mt-2">
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
        </div>

        {/* --- Main Chat Area --- */}
        <div className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="flex-1" ref={scrollAreaRef}>
                {activeConversation && activeConversation.messages.length > 0 ? (
                    <div className="py-8 px-4 space-y-8 max-w-4xl mx-auto">
                        {activeConversation.messages.map((message, index) => (
                            <div key={index} className="flex items-start gap-4">
                                <Avatar className="w-8 h-8 border shadow-sm shrink-0">
                                    <AvatarImage src={message.role === 'user' ? user?.photoURL || '' : ''} />
                                    <AvatarFallback>
                                        {message.role === 'user' ? getInitials(user?.displayName) : <Bot size={20} />}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 pt-1 space-y-2">
                                    <p className="font-semibold text-sm">
                                        {message.role === 'user' ? user?.displayName || 'You' : 'Buddy AI'}
                                    </p>
                                    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                                        <FormattedMessageContent content={message.content} />
                                    </div>
                                    {message.role === 'model' && index === activeConversation.messages.length - 1 && !isLoading && (
                                        <div className="mt-4 flex items-center gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {copyToClipboard(message.content); toast({title: "Copied to clipboard!"})}}><Copy className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRegenerate} disabled={isLoading}><RefreshCw className="h-4 w-4" /></Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-start gap-4">
                                <Avatar className="w-8 h-8 border shadow-sm shrink-0"><AvatarFallback><Bot size={20} /></AvatarFallback></Avatar>
                                <div className="flex-1 pt-1"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center p-4">
                        <div className="w-full max-w-2xl mx-auto text-center">
                            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
                                Hello, {user?.displayName?.split(' ')[0]}
                            </h1>
                            <h2 className="text-xl md:text-2xl text-muted-foreground mb-12">How can I help you today?</h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
                                <Card className="p-4 flex flex-col items-start gap-2 cursor-pointer hover:bg-muted transition-colors" onClick={() => handleSend("Suggest a new topic for me to study")}>
                                    <Sparkles className="h-5 w-5 text-primary"/>
                                    <h4 className="font-semibold">Suggest topics</h4>
                                    <p className="text-xs text-muted-foreground">based on my progress</p>
                                </Card>
                                <Card className="p-4 flex flex-col items-start gap-2 cursor-pointer hover:bg-muted transition-colors" onClick={() => handleSend("Explain the concept of recursion in Python like I'm 15")}>
                                    <HelpCircle className="h-5 w-5 text-primary"/>
                                    <h4 className="font-semibold">Explain a concept</h4>
                                    <p className="text-xs text-muted-foreground">like recursion in Python</p>
                                </Card>
                                <Card className="p-4 flex flex-col items-start gap-2 cursor-pointer hover:bg-muted transition-colors" onClick={() => handleSend("Create a medium-difficulty C++ practice problem about pointers")}>
                                    <BrainCircuit className="h-5 w-5 text-primary"/>
                                    <h4 className="font-semibold">Create an exercise</h4>
                                    <p className="text-xs text-muted-foreground">on a specific topic</p>
                                </Card>
                                 <Card className="p-4 flex flex-col items-start gap-2 cursor-pointer hover:bg-muted transition-colors" onClick={() => handleSend("What are the key points from my last completed lesson?")}>
                                    <BookOpen className="h-5 w-5 text-primary"/>
                                    <h4 className="font-semibold">Summarize a lesson</h4>
                                    <p className="text-xs text-muted-foreground">that I recently finished</p>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}
            </ScrollArea>
            <div className="shrink-0 p-4 bg-background/80 backdrop-blur-sm border-t">
                <div className="relative mx-auto max-w-3xl">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="What's on your mind?..."
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
