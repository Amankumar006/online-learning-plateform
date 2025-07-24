"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, Send, Lightbulb, BookOpen, Calculator, Code, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface BuddyInputFormProps {
    input: string;
    onInputChange: (value: string) => void;
    onSend: (message: string) => void;
    isLoading: boolean;
    isListening: boolean;
    onMicClick: () => void;
}

// Smart contextual suggestions like ChatGPT/Gemini Pro
const getContextualSuggestions = (input: string, conversationLength: number) => {
    const lowercaseInput = input.toLowerCase();
    
    // Dynamic suggestions based on input content
    if (lowercaseInput.includes('explain') || lowercaseInput.includes('what is') || lowercaseInput.includes('how does')) {
        return [
            { icon: Lightbulb, text: "Give me an example", action: "Can you give me a concrete example of this?" },
            { icon: BookOpen, text: "Simplify this", action: "Can you explain this in simpler terms?" },
            { icon: Calculator, text: "Create a practice", action: "Create a practice exercise on this topic" },
            { icon: Zap, text: "Visual diagram", action: "Can you create a visual diagram to explain this?" }
        ];
    }
    
    if (lowercaseInput.includes('code') || lowercaseInput.includes('program') || lowercaseInput.includes('function')) {
        return [
            { icon: Code, text: "Show example", action: "Show me a code example" },
            { icon: Calculator, text: "Analyze complexity", action: "What's the time complexity of this?" },
            { icon: Zap, text: "Best practices", action: "What are the best practices for this?" },
            { icon: BookOpen, text: "Debug help", action: "Help me debug this code" }
        ];
    }
    
    if (lowercaseInput.includes('math') || lowercaseInput.includes('calculate') || lowercaseInput.includes('solve')) {
        return [
            { icon: Calculator, text: "Step by step", action: "Show me the step-by-step solution" },
            { icon: Lightbulb, text: "Practice problem", action: "Give me a practice problem on this topic" },
            { icon: BookOpen, text: "Related concepts", action: "What are related mathematical concepts?" },
            { icon: Zap, text: "Visual approach", action: "Can you show this visually or with a diagram?" }
        ];
    }

    if (lowercaseInput.includes('study') || lowercaseInput.includes('learn') || lowercaseInput.includes('topic')) {
        return [
            { icon: BookOpen, text: "Suggest topics", action: "Suggest a new topic for me to study" },
            { icon: Calculator, text: "Create quiz", action: "Create a quiz to test my knowledge" },
            { icon: Lightbulb, text: "Study plan", action: "Help me create a study plan" },
            { icon: Zap, text: "Quick summary", action: "Give me a quick summary of the key points" }
        ];
    }
    
    // Default smart suggestions when input is empty or general
    if (!input.trim() || conversationLength === 0) {
        return [
            { icon: BookOpen, text: "Help me study", action: "Help me understand a concept I'm learning" },
            { icon: Calculator, text: "Create exercise", action: "Create a practice exercise for me" },
            { icon: Code, text: "Code review", action: "Review and explain some code for me" },
            { icon: Lightbulb, text: "Study guidance", action: "What should I learn next based on my progress?" }
        ];
    }
    
    // General follow-up suggestions
    return [
        { icon: Lightbulb, text: "Tell me more", action: "Can you elaborate on that?" },
        { icon: BookOpen, text: "Give example", action: "Can you give me an example?" },
        { icon: Calculator, text: "Practice this", action: "Give me a practice exercise on this" },
        { icon: Zap, text: "Next steps", action: "What should I learn next?" }
    ];
};

export function BuddyInputForm({
    input,
    onInputChange,
    onSend,
    isLoading,
    isListening,
    onMicClick
}: BuddyInputFormProps) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);

    // Update suggestions based on input
    useEffect(() => {
        const newSuggestions = getContextualSuggestions(input, 0); // You can pass conversation length here
        setSuggestions(newSuggestions);
    }, [input]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !isLoading && input.trim()) {
            e.preventDefault();
            onSend(input);
            setShowSuggestions(false);
        }
        if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (action: string) => {
        onInputChange(action);
        setShowSuggestions(false);
    };

    const handleInputFocus = () => {
        setShowSuggestions(true);
    };

    const handleInputBlur = () => {
        // Delay hiding to allow clicking on suggestions
        setTimeout(() => setShowSuggestions(false), 150);
    };

    return (
        <div className="shrink-0 p-4 bg-background border-t">
            <div className="relative mx-auto max-w-3xl">
                {/* Smart suggestions panel */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute bottom-full mb-2 left-0 right-0 bg-background border border-border rounded-lg shadow-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-muted-foreground">Quick actions</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {suggestions.map((suggestion, index) => (
                                <Button
                                    key={index}
                                    variant="ghost"
                                    className="justify-start h-auto p-3 text-left hover:bg-muted/50"
                                    onClick={() => handleSuggestionClick(suggestion.action)}
                                >
                                    <suggestion.icon className="w-4 h-4 mr-2 text-primary shrink-0" />
                                    <span className="text-sm">{suggestion.text}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                <Input
                    value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    placeholder={isListening ? 'Listening...' : 'What\'s on your mind?...'}
                    className="rounded-full py-6 pl-6 pr-24 shadow-lg border-2 focus-visible:ring-primary/50"
                    onKeyDown={handleKeyDown}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
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
