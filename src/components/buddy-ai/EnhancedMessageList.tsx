"use client";

import { useRef, useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bot, Copy, RefreshCw, ThumbsUp, ThumbsDown, Volume2, Square, AlertTriangle, Globe, Code2, BookOpen, FileText, File } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import FormattedContent from '@/components/common/FormattedContent';
import { type Conversation } from '@/app/dashboard/buddy-ai/page';
import { Personas } from './BuddySidebar';
import { User as FirebaseUser } from 'firebase/auth';

interface EnhancedMessageListProps {
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

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function EnhancedMessageList({
    user,
    conversation,
    isLoading,
    playingMessageIndex,
    isGeneratingAudio,
    onPlayAudio,
    onRegenerate,
    onSendSuggestion
}: EnhancedMessageListProps) {
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // Auto scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current;
            requestAnimationFrame(() => {
                scrollContainer.scrollTo({
                    top: scrollContainer.scrollHeight,
                    behavior: 'smooth'
                });
            });
        }
    }, [conversation.messages.length, isLoading]);

    const activePersona = Personas.find(p => p.id === conversation.persona);

    return (
        <div 
            className="absolute inset-0 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-background to-muted/20" 
            ref={scrollAreaRef}
            style={{ 
                scrollbarGutter: 'stable',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
            }}
        >
            {/* Header with conversation title */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b px-4 py-3">
                <div className="max-w-4xl mx-auto flex items-center gap-3">
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300",
                        activePersona?.id === 'buddy' 
                            ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" 
                            : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                    )}>
                        {activePersona?.id === 'mentor' ? <Code2 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                    </div>
                    <div>
                        <h1 className="font-semibold text-lg">{conversation.title}</h1>
                        <p className="text-sm text-muted-foreground">{activePersona?.description}</p>
                    </div>
                </div>
            </div>

            <div className="py-6 px-4 space-y-6 max-w-4xl mx-auto pb-32">
                {conversation.messages.map((message, index) => {
                    const isUser = message.role === 'user';
                    const isLastMessage = index === conversation.messages.length - 1;
                    
                    return (
                        <div key={index} className={cn(
                            "flex gap-3",
                            isUser ? "flex-row-reverse" : "flex-row"
                        )}>
                            {/* Avatar */}
                            <Avatar className="w-8 h-8 shrink-0">
                                <AvatarImage src={isUser ? user?.photoURL || '' : ''} />
                                <AvatarFallback className={cn(
                                    "text-xs font-medium transition-colors duration-300",
                                    isUser 
                                        ? "bg-primary text-primary-foreground" 
                                        : message.isError 
                                            ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                            : activePersona?.id === 'mentor'
                                                ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                                : "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                                )}>
                                    {isUser 
                                        ? getInitials(user?.displayName)
                                        : message.isError 
                                            ? <AlertTriangle size={14} />
                                            : activePersona?.id === 'mentor' ? 'CM' : 'SB'
                                    }
                                </AvatarFallback>
                            </Avatar>

                            {/* Message Content */}
                            <div className={cn(
                                "flex-1 max-w-[80%] space-y-2",
                                isUser && "flex flex-col items-end"
                            )}>
                                {/* Message Bubble */}
                                <div className={cn(
                                    "relative group transition-colors duration-300",
                                    isUser 
                                        ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 shadow-md"
                                        : message.isError
                                            ? "bg-red-50 border border-red-200 rounded-2xl rounded-bl-md px-4 py-3 dark:bg-red-900/20 dark:border-red-800"
                                            : "bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3 border"
                                )}>
                                    {/* Message Header for AI */}
                                    {!isUser && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-semibold text-sm">
                                                {activePersona?.name || 'Buddy AI'}
                                            </span>
                                            {message.content.includes('🌐 **Live Web Search Results**') && (
                                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 transition-colors duration-300">
                                                    <Globe className="w-3 h-3 mr-1" />
                                                    Web
                                                </Badge>
                                            )}
                                        </div>
                                    )}

                                    {/* Uploaded Files Display */}
                                    {isUser && message.files && message.files.length > 0 && (
                                        <div className="mb-2 space-y-2">
                                            {message.files.map((file) => (
                                                <div key={file.id} className="flex items-center gap-2 bg-white/10 rounded p-2">
                                                    {file.type === 'image' && file.preview ? (
                                                        <img 
                                                            src={file.preview} 
                                                            alt={file.file.name}
                                                            className="w-8 h-8 object-cover rounded"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                                                            {file.type === 'pdf' ? (
                                                                <FileText className="w-4 h-4" />
                                                            ) : file.type === 'document' ? (
                                                                <FileText className="w-4 h-4" />
                                                            ) : (
                                                                <File className="w-4 h-4" />
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-white truncate">{file.file.name}</p>
                                                        <p className="text-xs text-white/70">{formatFileSize(file.file.size)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Message Content */}
                                    <div className={cn(
                                        "text-sm leading-relaxed",
                                        isUser ? "text-white" : "text-foreground"
                                    )}>
                                        {isUser ? (
                                            <p className="m-0">{message.content}</p>
                                        ) : (
                                            <div className={cn(
                                                "prose prose-sm max-w-none",
                                                message.isError ? "prose-red dark:prose-red" : "dark:prose-invert"
                                            )}>
                                                <FormattedContent content={message.content} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons for AI Messages */}
                                    {!isUser && !isLoading && isLastMessage && (
                                        <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!message.isError && (
                                                <>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-7 px-2 text-xs"
                                                        onClick={() => onPlayAudio(message.content, index)}
                                                    >
                                                        {isGeneratingAudio === index ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : playingMessageIndex === index ? (
                                                            <Square className="h-3 w-3" />
                                                        ) : (
                                                            <Volume2 className="h-3 w-3" />
                                                        )}
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-7 px-2 text-xs"
                                                        onClick={() => { 
                                                            copyToClipboard(message.content); 
                                                            toast({title: "Copied!"});
                                                        }}
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-7 px-2 text-xs"
                                                        onClick={() => toast({title: "Thanks for the feedback!"})}
                                                    >
                                                        <ThumbsUp className="h-3 w-3" />
                                                    </Button>
                                                </>
                                            )}
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-7 px-2 text-xs"
                                                onClick={onRegenerate}
                                            >
                                                <RefreshCw className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Error Actions */}
                                    {message.isError && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={onRegenerate}
                                                className="text-xs h-7"
                                            >
                                                <RefreshCw className="h-3 w-3 mr-1" />
                                                Try Again
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => onSendSuggestion("Can you help me with something else?")}
                                                className="text-xs h-7"
                                            >
                                                Ask Something Else
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Suggestions */}
                                {!isUser && message.suggestions && message.suggestions.length > 0 && !isLoading && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {message.suggestions.map((suggestion, i) => (
                                            <Button
                                                key={i}
                                                variant="outline"
                                                size="sm"
                                                className="h-auto py-1.5 px-3 text-xs rounded-full hover:bg-primary/10 hover:border-primary/30"
                                                onClick={() => onSendSuggestion(suggestion)}
                                            >
                                                {suggestion}
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Loading Indicator */}
                {isLoading && (
                    <div className="flex gap-3">
                        <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className={cn(
                                "text-xs font-medium transition-colors duration-300",
                                activePersona?.id === 'mentor'
                                    ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                            )}>
                                {activePersona?.id === 'mentor' ? 'CM' : 'SB'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3 border">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                <span className="text-sm text-muted-foreground">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}