
"use client";

import { useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, Bot, Copy, RefreshCw, ThumbsUp, ThumbsDown, Volume2, Square, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import FormattedContent from '@/components/common/FormattedContent';
import { type Conversation } from '@/app/dashboard/buddy-ai/page';
import { Personas } from './BuddySidebar';
import { User as FirebaseUser } from 'firebase/auth';

interface MessageListProps {
    user: FirebaseUser | null;
    conversation: Conversation;
    isLoading: boolean;
    playingMessageIndex: number | null;
    isGeneratingAudio: number | null;
    onPlayAudio: (text: string, index: number) => void;
    onRegenerate: () => void;
    onSendSuggestion: (suggestion: string) => void;
}

const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
};

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
};

export function MessageList({
    user,
    conversation,
    isLoading,
    playingMessageIndex,
    isGeneratingAudio,
    onPlayAudio,
    onRegenerate,
    onSendSuggestion
}: MessageListProps) {
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'auto' });
        }
    }, [conversation.messages.length, isLoading]);

    const activePersona = Personas.find(p => p.id === conversation.persona);

    return (
        <div className="flex-1 overflow-y-auto" ref={scrollAreaRef}>
            <div className="py-8 px-4 space-y-8 max-w-4xl mx-auto">
                {conversation.messages.map((message, index) => (
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
                                    {message.role === 'user' ? user?.displayName || 'You' : activePersona?.name || 'Buddy AI'}
                                </p>
                                <FormattedContent content={message.content} />
                                {message.role === 'model' && !isLoading && index === conversation.messages.length - 1 && (
                                    <div className="flex items-center gap-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!message.isError && (
                                            <>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPlayAudio(message.content, index)}>
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
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRegenerate}>
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
                                            onClick={() => onSendSuggestion(suggestion)}
                                        >
                                            {suggestion}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-4">
                        <Avatar className="w-8 h-8 border shadow-sm shrink-0"><AvatarFallback><Bot size={20} /></AvatarFallback></Avatar>
                        <div className="flex-1 pt-1"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    </div>
                )}
            </div>
        </div>
    );
}
