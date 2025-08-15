"use client";

import { useRef, useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bot, Copy, RefreshCw, ThumbsUp, ThumbsDown, Volume2, Square, AlertTriangle, Image as ImageIcon, Play, Pause, Download, Maximize2, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import FormattedContent from '@/components/common/FormattedContent';
import { type Conversation } from '@/app/dashboard/buddy-ai/page';
import { Personas } from './BuddySidebar';
import { User as FirebaseUser } from 'firebase/auth';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

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

interface MediaContentDisplay {
    id: string;
    type: 'image' | 'audio' | 'video';
    url: string;
    dataUri?: string;
    description?: string;
    metadata?: {
        duration?: number;
        dimensions?: { width: number; height: number };
    };
}

const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
};

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
};

// Enhanced component to display media content
const MediaContentRenderer = ({ media }: { media: MediaContentDisplay }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement>(null);

    const handlePlayPause = () => {
        const element = mediaRef.current;
        if (!element) return;

        if (isPlaying) {
            element.pause();
        } else {
            element.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    switch (media.type) {
        case 'image':
            return (
                <div className="mt-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="relative cursor-pointer group">
                                <img 
                                    src={media.dataUri || media.url} 
                                    alt={media.description || "Generated image"}
                                    className="max-w-sm rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center">
                                    <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh]">
                            <img 
                                src={media.dataUri || media.url} 
                                alt={media.description || "Generated image"}
                                className="w-full h-auto rounded-lg"
                            />
                            {media.description && (
                                <p className="text-sm text-muted-foreground mt-2">{media.description}</p>
                            )}
                        </DialogContent>
                    </Dialog>
                    {media.description && (
                        <p className="text-xs text-muted-foreground mt-1">{media.description}</p>
                    )}
                </div>
            );

        case 'audio':
            return (
                <div className="mt-2 p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handlePlayPause}
                            className="h-8 w-8"
                        >
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        
                        <div className="flex-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                            <div className="w-full bg-background rounded-full h-1">
                                <div 
                                    className="bg-primary h-1 rounded-full transition-all"
                                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                                const a = document.createElement('a');
                                a.href = media.dataUri || media.url;
                                a.download = 'audio.mp3';
                                a.click();
                            }}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>

                    <audio
                        ref={mediaRef as React.RefObject<HTMLAudioElement>}
                        src={media.dataUri || media.url}
                        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                    />
                </div>
            );

        case 'video':
            return (
                <div className="mt-2">
                    <video
                        ref={mediaRef as React.RefObject<HTMLVideoElement>}
                        src={media.dataUri || media.url}
                        controls
                        className="max-w-sm rounded-lg border shadow-sm"
                        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                    />
                    {media.description && (
                        <p className="text-xs text-muted-foreground mt-1">{media.description}</p>
                    )}
                </div>
            );

        default:
            return null;
    }
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

    // Auto scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current;
            // Use requestAnimationFrame to ensure the DOM has updated
            requestAnimationFrame(() => {
                scrollContainer.scrollTo({
                    top: scrollContainer.scrollHeight,
                    behavior: 'smooth'
                });
            });
        }
    }, [conversation.messages.length, isLoading]);

    const activePersona = Personas.find(p => p.id === conversation.persona);

    // Mock function to extract media content from message
    // In a real implementation, this would parse the message content for media references
    const extractMediaContent = (content: string): MediaContentDisplay[] => {
        const mediaContent: MediaContentDisplay[] = [];
        
        // Look for image markdown patterns
        const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        let imageMatch;
        while ((imageMatch = imageRegex.exec(content)) !== null) {
            mediaContent.push({
                id: `img_${Date.now()}_${Math.random()}`,
                type: 'image',
                url: imageMatch[2],
                dataUri: imageMatch[2],
                description: imageMatch[1],
            });
        }

        return mediaContent;
    };

    return (
        <div 
            className="absolute inset-0 overflow-y-auto overflow-x-hidden" 
            ref={scrollAreaRef}
            style={{ 
                scrollbarGutter: 'stable',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
            }}
        >
            <div className="py-8 px-4 pb-32 space-y-8 max-w-4xl mx-auto">
                {conversation.messages.map((message, index) => {
                    const mediaContent = extractMediaContent(message.content);
                    
                    return (
                        <div key={index} className="flex flex-col items-start gap-4">
                            <div className="group flex items-start gap-4 w-full">
                                <Avatar className="w-8 h-8 border shadow-sm shrink-0">
                                    <AvatarImage src={message.role === 'user' ? user?.photoURL || '' : ''} />
                                    <AvatarFallback>
                                        {message.role === 'user' ? getInitials(user?.displayName) : (message.isError ? <AlertTriangle className="text-destructive" size={20} /> : <Bot size={20} />)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={cn("flex-1 pt-1 space-y-1 min-w-0 word-wrap break-words", message.isError && "text-destructive")}>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm">
                                            {message.role === 'user' ? user?.displayName || 'You' : activePersona?.name || 'Buddy AI'}
                                        </p>
                                        {message.role === 'model' && activePersona && (
                                            <Badge variant="secondary" className="text-xs">
                                                {activePersona.name}
                                            </Badge>
                                        )}
                                        {message.role === 'model' && message.content.includes('🌐 **Live Web Search Results**') && (
                                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                                                <Globe className="w-3 h-3 mr-1" />
                                                Web Search
                                            </Badge>
                                        )}
                                    </div>
                                    
                                    <div className="overflow-hidden">
                                        <FormattedContent content={message.content} />
                                    </div>
                                    
                                    {/* Render media content */}
                                    {mediaContent.map((media) => (
                                        <MediaContentRenderer key={media.id} media={media} />
                                    ))}
                                    
                                    {message.role === 'model' && !isLoading && index === conversation.messages.length - 1 && (
                                        <div className="flex items-center gap-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!message.isError && (
                                                <>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPlayAudio(message.content, index)}>
                                                        {isGeneratingAudio === index ? <Loader2 className="h-4 w-4 animate-spin"/> : (playingMessageIndex === index ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />)}
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { copyToClipboard(message.content); toast({title: "Copied to clipboard!"})}}>
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast({title: "Feedback received!", description: "Thank you for helping improve our AI!"})}>
                                                        <ThumbsUp className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast({title: "Feedback received!", description: "We'll use this to improve future responses."})}>
                                                        <ThumbsDown className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRegenerate} title="Regenerate response">
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                    {message.isError && (
                                        <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                                            <p className="text-xs text-destructive/80 mb-2">Something went wrong. You can:</p>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={onRegenerate}>
                                                    <RefreshCw className="h-3 w-3 mr-1" />
                                                    Try Again
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => onSendSuggestion("Can you help me with something else?")}>
                                                    Ask Something Else
                                                </Button>
                                            </div>
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
                    );
                })}
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
