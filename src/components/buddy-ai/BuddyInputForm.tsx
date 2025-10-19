"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, Send, Globe, Search, Paperclip, Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface BuddyInputFormProps {
    input: string;
    onInputChange: (value: string) => void;
    onSend: (message: string) => void;
    isLoading: boolean;
    isListening: boolean;
    onMicClick: () => void;
    webSearchEnabled?: boolean;
    onWebSearchToggle?: () => void;
}

export function BuddyInputForm({
    input,
    onInputChange,
    onSend,
    isLoading,
    isListening,
    onMicClick,
    webSearchEnabled = false,
    onWebSearchToggle
}: BuddyInputFormProps) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !isLoading && input.trim()) {
            e.preventDefault();
            onSend(input);
        }
    };

    return (
        <div className="shrink-0 p-4 bg-background border-t">
            <div className="relative mx-auto max-w-4xl">
                {/* Web Search Status */}
                {webSearchEnabled && (
                    <div className="flex items-center justify-center mb-2">
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                            <Globe className="w-3 h-3" />
                            <span>Web</span>
                        </div>
                    </div>
                )}

                {/* Input Container */}
                <div className="relative flex items-center gap-2 p-2 bg-muted/30 rounded-2xl border border-border/50 focus-within:border-primary/50 transition-colors">
                    {/* Attachment Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                        disabled={isLoading}
                    >
                        <Paperclip className="w-4 h-4" />
                    </Button>

                    {/* Main Input */}
                    <Input
                        value={input}
                        onChange={(e) => onInputChange(e.target.value)}
                        placeholder={
                            isListening 
                                ? 'Listening...' 
                                : webSearchEnabled 
                                    ? 'Ask me anything - I can search the web!'
                                    : 'Type your message...'
                        }
                        className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/70"
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                    />

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                        {/* Web Search Toggle */}
                        {onWebSearchToggle && (
                            <Button
                                onClick={onWebSearchToggle}
                                size="icon"
                                variant="ghost"
                                className={cn(
                                    "h-8 w-8 rounded-full transition-all",
                                    webSearchEnabled 
                                        ? "bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50" 
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                                title={webSearchEnabled ? "Disable web search" : "Enable web search"}
                            >
                                {webSearchEnabled ? (
                                    <Globe className="w-4 h-4" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                            </Button>
                        )}
                        
                        {/* Voice Input */}
                        <Button
                            onClick={onMicClick}
                            size="icon"
                            variant="ghost"
                            className={cn(
                                "h-8 w-8 rounded-full transition-all",
                                isListening 
                                    ? "bg-red-100 text-red-600 animate-pulse dark:bg-red-900/30 dark:text-red-400" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                            title={isListening ? "Stop listening" : "Voice input"}
                        >
                            <Mic className="w-4 h-4" />
                        </Button>
                        
                        {/* Send Button */}
                        <Button
                            onClick={() => onSend(input)}
                            disabled={isLoading || !input.trim()}
                            size="icon"
                            className={cn(
                                "h-8 w-8 rounded-full transition-all",
                                input.trim() && !isLoading
                                    ? "bg-blue-500 hover:bg-blue-600 text-white shadow-md"
                                    : "bg-muted text-muted-foreground"
                            )}
                            title="Send message"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
