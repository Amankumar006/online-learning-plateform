"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface BuddyInputFormProps {
    input: string;
    onInputChange: (value: string) => void;
    onSend: (message: string) => void;
    isLoading: boolean;
    isListening: boolean;
    onMicClick: () => void;
}

export function BuddyInputForm({
    input,
    onInputChange,
    onSend,
    isLoading,
    isListening,
    onMicClick
}: BuddyInputFormProps) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !isLoading && input.trim()) {
            e.preventDefault();
            onSend(input);
        }
    };

    return (
        <div className="shrink-0 p-4 bg-background/95 backdrop-blur-sm border-t">
            <div className="relative mx-auto max-w-3xl">
                <Input
                    value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    placeholder={isListening ? 'Listening...' : 'What\'s on your mind?...'}
                    className="rounded-full py-6 pl-6 pr-24 shadow-lg border-2 focus-visible:ring-primary/50"
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Button
                        onClick={onMicClick}
                        size="icon"
                        variant="ghost"
                        className={cn("rounded-full h-10 w-10", isListening && "bg-destructive/20 text-destructive animate-pulse")}
                        aria-label={isListening ? "Stop listening" : "Start listening"}
                    >
                        <Mic className="w-4 h-4" />
                    </Button>
                    <Button
                        onClick={() => onSend(input)}
                        disabled={isLoading || !input.trim()}
                        size="icon"
                        className="rounded-full w-10 h-10"
                        aria-label="Send message"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
