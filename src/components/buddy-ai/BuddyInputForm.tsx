"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, Send, Globe, Search } from "lucide-react";
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
        <div className="shrink-0 p-3 md:p-4 bg-background/95 backdrop-blur-sm border-t">
            <div className="relative mx-auto max-w-3xl">
                <Input
                    value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    placeholder={isListening ? 'Listening...' : webSearchEnabled ? 'Ask me anything - I can search the web!' : 'What\'s on your mind?...'}
                    className={cn(
                        "rounded-full py-4 md:py-6 pl-4 md:pl-6 shadow-lg border-2 focus-visible:ring-primary/50 text-sm md:text-base",
                        onWebSearchToggle ? "pr-28 md:pr-36" : "pr-20 md:pr-24"
                    )}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                />
                <div className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 md:gap-1">
                    {/* Web Search Toggle Icon */}
                    {onWebSearchToggle && (
                        <Button
                            onClick={onWebSearchToggle}
                            size="icon"
                            variant="ghost"
                            className={cn(
                                "rounded-full h-8 w-8 md:h-10 md:w-10 transition-all",
                                webSearchEnabled 
                                    ? "bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            aria-label={webSearchEnabled ? "Disable web search" : "Enable web search"}
                            title={webSearchEnabled ? "Web search enabled - Click to disable" : "Web search disabled - Click to enable"}
                        >
                            {webSearchEnabled ? (
                                <Globe className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            ) : (
                                <Search className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            )}
                        </Button>
                    )}
                    
                    <Button
                        onClick={onMicClick}
                        size="icon"
                        variant="ghost"
                        className={cn("rounded-full h-8 w-8 md:h-10 md:w-10", isListening && "bg-destructive/20 text-destructive animate-pulse")}
                        aria-label={isListening ? "Stop listening" : "Start listening"}
                    >
                        <Mic className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </Button>
                    <Button
                        onClick={() => onSend(input)}
                        disabled={isLoading || !input.trim()}
                        size="icon"
                        className="rounded-full w-8 h-8 md:w-10 md:h-10"
                        aria-label="Send message"
                    >
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" /> : <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                    </Button>
                </div>
            </div>
            
            {/* Optional status indicator below input */}
            {onWebSearchToggle && webSearchEnabled && (
                <div className="flex items-center justify-center mt-2">
                    <span className="text-xs text-green-600 font-medium flex items-center">
                        <Globe className="w-3 h-3 mr-1" />
                        <span className="hidden sm:inline">Web search enabled</span>
                        <span className="sm:hidden">Web search on</span>
                    </span>
                </div>
            )}
        </div>
    );
}
