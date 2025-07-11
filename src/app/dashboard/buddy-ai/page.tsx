
"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buddyChatStream } from '@/ai/flows/buddy-chat';
import { Persona } from '@/ai/schemas/buddy-schemas';
import { Bot, User, Loader2, Send, Sparkles, HelpCircle, Trash2, Ellipsis, BookOpen, Briefcase, Menu, Copy, RefreshCw, ThumbsUp, ThumbsDown, Mic, Lightbulb, Volume2, Square, AlertTriangle } from 'lucide-react';
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
import { getUser, ProactiveSuggestion, clearProactiveSuggestion } from '@/lib/data';
import { Card } from '@/components/ui/card';
import FormattedContent from '@/components/common/FormattedContent';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { generateAudioFromText } from '@/ai/flows/generate-audio-from-text';

interface Message {
    role: 'user' | 'model';
    content: string;
    suggestions?: string[];
    isError?: boolean;
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

const ThoughtBubble = ({ content }: { content: string }) => {
  return (
    <div className="flex items-start gap-4">
        <Avatar className="w-8 h-8 border shadow-sm shrink-0">
            <AvatarFallback><Bot size={20} /></AvatarFallback>
        </Avatar>
        <div className="flex-1 pt-1 flex items-center gap-2 text-muted-foreground animate-in fade-in-50">
            <Lightbulb className="w-5 h-5 animate-pulse text-yellow-400" />
            <span className="text-sm italic">{content}</span>
        </div>
    </div>
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
                                    <AlertDialog>
                                        <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                                                <Ellipsis className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4"/> Delete
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                        </DropdownMenuContent>
                                        </DropdownMenu>
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
  const [thought, setThought] = useState<string | null>(null);
  
  const [playingMessageIndex, setPlayingMessageIndex] = useState<number | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);


  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

   const {
    isListening,
    transcript,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onSpeechEnd: () => {
        // Automatically send when the user stops talking
        if (transcript) {
            handleSend(transcript);
        }
    }
  });
  
  useEffect(() => {
    if (transcript) {
        setInput(transcript);
    }
  }, [transcript]);
  
  const handleMicClick = () => {
      if (isListening) {
          stopListening();
      } else {
          startListening();
      }
  };
  
  const handlePlayAudio = async (text: string, index: number) => {
    if (playingMessageIndex === index) {
        audioRef.current?.pause();
        audioRef.current!.currentTime = 0;
        setPlayingMessageIndex(null);
        return;
    }

    setIsGeneratingAudio(index);
    setPlayingMessageIndex(index);
    try {
        const result = await generateAudioFromText({ sectionTitle: '', sectionContent: text });
        if (audioRef.current) {
            audioRef.current.src = result.audioDataUri;
            audioRef.current.play();
        }
    } catch (e: any) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Audio Error', description: e.message });
        setPlayingMessageIndex(null);
    } finally {
        setIsGeneratingAudio(null);
    }
  };
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => setPlayingMessageIndex(null);
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, []);
  
  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  const activePersona = useMemo(() => {
    return activeConversation?.persona || 'buddy';
  }, [activeConversation]);

  const handleProactiveSuggestion = (suggestion: ProactiveSuggestion, newConversations: Conversation[]) => {
        const newId = `convo_${Date.now()}_${Math.random()}`;
        const proactiveConversation: Conversation = {
            id: newId,
            title: `Help with ${suggestion.topic}`,
            messages: [{ role: 'model', content: suggestion.message }],
            createdAt: Date.now(),
            persona: 'buddy' // Proactive suggestions always come from the friendly buddy
        };
        const updatedConversations = [proactiveConversation, ...newConversations];
        setConversations(updatedConversations);
        setActiveConversationId(newId);
    };

  // Effect to load user data and conversations from localStorage
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const [userProfile, savedConvos] = await Promise.all([
            getUser(currentUser.uid),
            localStorage.getItem(`conversations_${currentUser.uid}`)
        ]);

        let parsedConvos: Conversation[] = [];
        if (savedConvos) {
            try {
                parsedConvos = JSON.parse(savedConvos)
                  .map((convo: any) => ({ ...convo, messages: convo.messages || [] }));
            } catch (e) {
                console.error("Failed to parse conversations from localStorage", e);
                localStorage.removeItem(`conversations_${currentUser.uid}`); // Clear corrupted data
            }
        }
        
        if (userProfile?.proactiveSuggestion) {
            handleProactiveSuggestion(userProfile.proactiveSuggestion, parsedConvos);
            clearProactiveSuggestion(currentUser.uid).catch(console.error); // Fire-and-forget
        } else {
            setConversations(parsedConvos);
            if (parsedConvos.length > 0) {
                 setActiveConversationId(parsedConvos[0].id);
            } else {
                handleNewChat('buddy');
            }
        }
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to scroll to the bottom of the chat on new messages
  useEffect(() => {
     if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'auto' });
    }
  }, [activeConversation?.messages?.length, isLoading, thought]);
  
  // Effect to save conversations to localStorage when they change
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
    const newId = `convo_${Date.now()}_${Math.random()}`;
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
    // Also remove from localStorage
    if (user) {
        localStorage.setItem(`conversations_${user.uid}`, JSON.stringify(newConversations));
    }
  }

  const handleSend = async (prompt?: string) => {
    const messageToSend = prompt || input;
    if (!messageToSend.trim() || !user || !activeConversation) return;

    const userMessage: Message = { role: 'user', content: messageToSend };
    
    const updatedConversations = conversations.map(c => {
        if (c.id === activeConversationId) {
            const newMessages = c.messages.map(m => ({ ...m, suggestions: undefined }));
            const isNewChat = c.messages.length === 0;
            const newTitle = isNewChat ? messageToSend.substring(0, 40) + (messageToSend.length > 40 ? '...' : '') : c.title;
            return { ...c, title: newTitle, messages: [...newMessages, userMessage], createdAt: Date.now() };
        }
        return c;
    }).sort((a,b) => b.createdAt - a.createdAt);
    setConversations(updatedConversations);

    setInput('');
    setIsLoading(true);
    setThought(null);

    try {
        const stream = buddyChatStream({
            userMessage: messageToSend,
            history: activeConversation.messages.map(msg => ({ role: msg.role, content: msg.content })),
            userId: user.uid,
            persona: activeConversation.persona
        });
        
        for await (const chunk of stream) {
            if (chunk.type === 'thought') {
                setThought(chunk.content);
            } else {
                setThought(null);
                const isError = chunk.type === 'error';
                const assistantMessage: Message = { role: 'model', content: chunk.content, suggestions: chunk.suggestions, isError };
                 setConversations(prev => {
                    return prev.map(c => {
                        if (c.id === activeConversationId) {
                            return { ...c, messages: [...c.messages, assistantMessage] };
                        }
                        return c;
                    });
                });
            }
        }
    } catch (e: any) {
        console.error(e);
        const errorMessageContent = `Sorry, a critical error occurred and I could not complete your request. Please try again.\n\n> ${e.message || 'An unknown error occurred.'}`;
        const errorMessage: Message = { role: 'model', content: errorMessageContent, isError: true };
        setConversations(prev => prev.map(c => {
            if (c.id === activeConversationId) {
                return { ...c, messages: [...c.messages, errorMessage] };
            }
            return c;
        }));
    } finally {
        setIsLoading(false);
        setThought(null);
    }
  };

  const handleRegenerate = async () => {
    if (!activeConversation || !user) return;

    const lastModelIndex = activeConversation.messages.findLastIndex(m => m.role === 'model');
    if (lastModelIndex === -1) return;

    const historyForRegen = activeConversation.messages.slice(0, lastModelIndex);
    const lastUserMessage = historyForRegen.at(-1);

    if (!lastUserMessage || lastUserMessage.role !== 'user') {
        toast({ variant: "destructive", title: "Cannot Regenerate", description: "Could not find the original prompt." });
        return;
    }
    
    // Remove the old model response to regenerate
    setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages: historyForRegen } : c));
    
    // Directly call handleSend with the last user message
    handleSend(lastUserMessage.content);
  };


  return (
    <div className="flex h-full w-full bg-background">
      <audio ref={audioRef} />
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
                      {activeConversation.messages.map((message, index) => {
                          return (
                          <div key={index} className="flex flex-col items-start gap-4">
                            <div className="group flex items-start gap-4 w-full">
                                <Avatar className="w-8 h-8 border shadow-sm shrink-0">
                                    <AvatarImage src={message.role === 'user' ? user?.photoURL || '' : ''} />
                                    <AvatarFallback>
                                        {message.role === 'user' ? getInitials(user?.displayName) : (message.isError ? <AlertTriangle className="text-destructive" size={20} /> : <Bot size={20} />)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={cn("flex-1 pt-1 space-y-1", message.isError && "text-destructive")}>
                                    <p className="font-semibold text-sm">
                                        {message.role === 'user' ? user?.displayName || 'You' : personas.find(p => p.id === activePersona)?.name || 'Buddy AI'}
                                    </p>
                                    <FormattedContent content={message.content} />
                                    {message.role === 'model' && !isLoading && index === activeConversation.messages.length - 1 && (
                                        <div className="flex items-center gap-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!message.isError && (
                                                <>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePlayAudio(message.content, index)}>
                                                        {isGeneratingAudio === index ? <Loader2 className="h-4 w-4 animate-spin"/> : (playingMessageIndex === index ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />)}
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { copyToClipboard(message.content); toast({title: "Copied!"})}}>
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast({title: "Feedback received, thank you!"})}>
                                                        <ThumbsUp className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast({title: "Feedback received, thank you!"})}>
                                                        <ThumbsDown className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRegenerate}>
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {message.role === 'model' && message.suggestions && message.suggestions.length > 0 && !isLoading && (
                                <div className="pl-12 w-full">
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {message.suggestions.map((suggestion, i) => (
                                            <Button
                                                key={i}
                                                variant="outline"
                                                size="sm"
                                                className="h-auto py-1.5 px-3 text-xs"
                                                onClick={() => handleSend(suggestion)}
                                            >
                                                {suggestion}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                          </div>
                          )
                      })}
                      {isLoading && thought && (
                         <ThoughtBubble content={thought} />
                      )}
                      {isLoading && !thought && (
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
                      placeholder={isListening ? 'Listening...' : 'What\'s on your mind?...'}
                      className="rounded-full py-6 pl-6 pr-24 shadow-lg border-2 focus-visible:ring-primary/50"
                      onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSend();
                          }
                      }}
                      disabled={isLoading}
                  />
                   <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <Button
                            onClick={handleMicClick}
                            size="icon"
                            variant="ghost"
                            className={cn("rounded-full h-10 w-10", isListening && "bg-destructive/20 text-destructive animate-pulse")}
                        >
                            <Mic className="w-4 h-4" />
                        </Button>
                        <Button
                            onClick={() => handleSend()}
                            disabled={isLoading || !input.trim()}
                            size="icon"
                            className="rounded-full w-10 h-10"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            <span className="sr-only">Send</span>
                        </Button>
                   </div>
              </div>
          </div>
      </div>
    </div>
  );
}

    