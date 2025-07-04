
"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buddyChat, BuddyChatInput, Persona } from '@/ai/flows/buddy-chat';
import { Bot, User, Loader2, Send, Sparkles, BrainCircuit, HelpCircle, MessageSquare, Trash2, Settings, Ellipsis, BookOpen, Plus, Code, Copy, RefreshCw, Briefcase, Menu } from 'lucide-react';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Card } from '@/components/ui/card';

interface Message {
    role: 'user' | 'model';
    content: string;
}

interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
    persona: Persona;
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
           if (line.match(/^\s*-\s/)) {
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

const personas: { id: Persona; name: string; description: string; icon: React.ReactNode }[] = [
    { id: 'buddy', name: 'Study Buddy', description: 'Friendly and encouraging learning companion.', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'mentor', name: 'Code Mentor', description: 'Expert guidance for technical questions.', icon: <Briefcase className="w-5 h-5" /> },
];

const SidebarContent = ({ conversations, activeConversationId, onSelectConversation, onDeleteConversation, onNewChat }: { conversations: Conversation[], activeConversationId: string | null, onSelectConversation: (id: string) => void, onDeleteConversation: (id: string) => void, onNewChat: (persona: Persona) => void }) => {
  
  const groupConversationsByDate = (convos: Conversation[]) => {
    const groups: { [key: string]: Conversation[] } = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
  
    convos.forEach(convo => {
      const convoDate = new Date(convo.createdAt);
      let key;
      if (convoDate.toDateString() === today.toDateString()) key = 'Today';
      else if (convoDate.toDateString() === yesterday.toDateString()) key = 'Yesterday';
      else key = convoDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  
      if (!groups[key]) groups[key] = [];
      groups[key].push(convo);
    });
    return groups;
  };
  
  const groupedConversations = groupConversationsByDate(conversations);

  return (
    <>
      <div className="p-4 border-b space-y-2">
        <h3 className="font-semibold text-sm px-2 text-muted-foreground">Start a New Chat</h3>
        {personas.map(p => (
            <button
                key={p.id}
                className="flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                onClick={() => onNewChat(p.id)}
            >
                <div className="shrink-0 rounded-md border bg-background p-2 shadow-sm">
                    {p.icon}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                </div>
            </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
            {Object.entries(groupedConversations).map(([groupTitle, convos]) => (
              <div key={groupTitle}>
                    <h3 className="text-xs font-semibold text-muted-foreground px-2 my-2">{groupTitle}</h3>
                    <div className="space-y-1">
                      {convos.map(c => (
                          <div key={c.id} className="relative group">
                              <button
                                  onClick={() => onSelectConversation(c.id)}
                                  className={cn(
                                    "w-full justify-start truncate rounded-md pr-10 text-left p-2 flex items-center gap-2 text-sm transition-colors",
                                    c.id === activeConversationId ? 'bg-secondary text-secondary-foreground font-semibold' : 'hover:bg-black/5 dark:hover:bg-white/5'
                                  )}
                              >
                                  {c.persona === 'mentor' ? <Briefcase className="mr-2 h-4 w-4 shrink-0" /> : <BookOpen className="mr-2 h-4 w-4 shrink-0" />}
                                  <span className="truncate">{c.title}</span>
                              </button>
                                <div className="absolute right-2 top-1/2 z-20 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
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
                                                      <AlertDialogAction onClick={() => onDeleteConversation(c.id)}>Delete</AlertDialogAction>
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
      </div>
    </>
  );
};


export default function BuddyAIPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  const activePersona = useMemo(() => {
    return activeConversation?.persona || 'buddy';
  }, [activeConversation]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const savedConvos = localStorage.getItem(`conversations_${currentUser.uid}`);
        if (savedConvos) {
            const parsedConvos: Conversation[] = JSON.parse(savedConvos);
            if (parsedConvos.length > 0) {
                setConversations(parsedConvos);
                setActiveConversationId(parsedConvos[0].id);
                return;
            }
        }
        handleNewChat('buddy');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
     if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'auto' });
    }
  }, [activeConversation?.messages.length, isLoading]);

  useEffect(() => {
    if (user && conversations.length > 0) {
        localStorage.setItem(`conversations_${user.uid}`, JSON.stringify(conversations));
    }
  }, [conversations, user]);
  
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setIsSheetOpen(false);
  }

  const handleNewChat = (persona: Persona) => {
    const newId = Date.now().toString();
    const newConversation: Conversation = {
        id: newId,
        title: "New Chat",
        messages: [],
        createdAt: Date.now(),
        persona: persona
    };
    setConversations(prev => [newConversation, ...prev.sort((a, b) => b.createdAt - a.createdAt)]);
    setActiveConversationId(newId);
    setInput('');
    setIsSheetOpen(false);
  }
  
  const handleDeleteConversation = (convoId: string) => {
    const newConversations = conversations.filter(c => c.id !== convoId);
    setConversations(newConversations);
    if (activeConversationId === convoId) {
        if (newConversations.length > 0) {
            setActiveConversationId(newConversations[0].id);
        } else {
            handleNewChat('buddy');
        }
    }
  }

  const handleSend = async (prompt?: string) => {
    const messageToSend = prompt || input;
    if (!messageToSend.trim() || !user || !activeConversation) return;

    const userMessage: Message = { role: 'user', content: messageToSend };
    
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
          userId: user.uid,
          persona: activeConversation.persona
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


  return (
    <div className="flex h-full w-full bg-background">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-[280px] bg-muted/50 border-r shrink-0">
          <SidebarContent 
            conversations={conversations} 
            activeConversationId={activeConversationId} 
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
            onNewChat={handleNewChat}
          />
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm shrink-0">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Open conversations</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 flex flex-col w-full max-w-[300px]">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Conversations and Personas</SheetTitle>
                        <SheetDescription>
                            A list of your past conversations and options to start a new chat with a different AI persona.
                        </SheetDescription>
                    </SheetHeader>
                    <SidebarContent 
                      conversations={conversations} 
                      activeConversationId={activeConversationId} 
                      onSelectConversation={handleSelectConversation}
                      onDeleteConversation={handleDeleteConversation}
                      onNewChat={handleNewChat}
                    />
                </SheetContent>
            </Sheet>
            <div className="font-semibold">{personas.find(p => p.id === activePersona)?.name || 'Buddy AI'}</div>
             <Avatar className="w-8 h-8">
                <AvatarImage src={user?.photoURL || ''} />
                <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
            </Avatar>
        </header>
        
        {/* Message List */}
        <div className="flex-1 overflow-y-auto" ref={scrollAreaRef}>
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
                                      {message.role === 'user' ? user?.displayName || 'You' : personas.find(p => p.id === activePersona)?.name || 'Buddy AI'}
                                  </p>
                                  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                                      <FormattedMessageContent content={message.content} />
                                  </div>
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
                            <div className="p-4 bg-background rounded-full inline-block mb-4 border shadow-sm">
                              {personas.find(p => p.id === activePersona)?.icon || <BookOpen />}
                            </div>
                          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
                              Chat with {personas.find(p => p.id === activePersona)?.name}
                          </h1>
                          <h2 className="text-lg md:text-xl text-muted-foreground mb-12">How can I help you today?</h2>
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
                          </div>
                      </div>
                  </div>
              )}
          </div>
          {/* Input Box */}
          <div className="shrink-0 p-4 bg-background border-t">
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
