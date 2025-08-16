"use client";

import { Sparkles, HelpCircle, Code, Calculator, Briefcase, BookOpen, Brain, History } from "lucide-react";
import { Card } from "@/components/ui/card";
import { type Persona } from "@/ai/schemas/buddy-schemas";
import { Personas } from "./BuddySidebar";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { generatePersonalizedPrompts } from "@/lib/data";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

interface WelcomeScreenProps {
    persona: Persona;
    onSendSuggestion: (suggestion: string) => void;
}

export function WelcomeScreen({ persona, onSendSuggestion }: WelcomeScreenProps) {
    const [user] = useAuthState(auth);
    const [personalizedPrompts, setPersonalizedPrompts] = useState<string[]>([]);
    const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
    const activePersona = Personas.find(p => p.id === persona);

    // Load personalized prompts when component mounts
    useEffect(() => {
        const loadPersonalizedPrompts = async () => {
            if (!user?.uid) return;
            
            setIsLoadingPrompts(true);
            try {
                const prompts = await generatePersonalizedPrompts(user.uid);
                setPersonalizedPrompts(prompts);
            } catch (error) {
                console.error("Error loading personalized prompts:", error);
            } finally {
                setIsLoadingPrompts(false);
            }
        };

        loadPersonalizedPrompts();
    }, [user?.uid]);

    // Persona-specific suggestions
    const getPersonaSuggestions = () => {
        if (persona === 'mentor') {
            return [
                { icon: <Code className="h-5 w-5 text-primary"/>, title: "Code Review", description: "Review and optimize my code", action: "Can you review this code and suggest improvements?" },
                { icon: <Calculator className="h-5 w-5 text-primary"/>, title: "Algorithm Help", description: "Explain algorithms and complexity", action: "Explain how this algorithm works and analyze its complexity" },
                { icon: <Briefcase className="h-5 w-5 text-primary"/>, title: "Best Practices", description: "Learn coding best practices", action: "What are the best practices for writing clean, maintainable code?" },
                { icon: <HelpCircle className="h-5 w-5 text-primary"/>, title: "Debug Issue", description: "Help debug a programming issue", action: "I'm having trouble with this code, can you help me debug it?" }
            ];
        } else {
            return [
                { icon: <Sparkles className="h-5 w-5 text-primary"/>, title: "Suggest topics", description: "based on my progress", action: "Suggest a new topic for me to study" },
                { icon: <HelpCircle className="h-5 w-5 text-primary"/>, title: "Explain concept", description: "like recursion in Python", action: "Explain the concept of recursion in Python like I'm 15" },
                { icon: <BookOpen className="h-5 w-5 text-primary"/>, title: "Create exercise", description: "practice what I've learned", action: "Create a practice exercise to test my understanding" },
                { icon: <Calculator className="h-5 w-5 text-primary"/>, title: "Study plan", description: "help me organize my learning", action: "Help me create a personalized study plan" }
            ];
        }
    };

    return (
        <div className="flex h-full flex-col items-center justify-center p-3 md:p-4">
            <div className="w-full max-w-2xl mx-auto text-center">
                <div className={cn("p-3 md:p-4 bg-background rounded-full inline-block mb-3 md:mb-4 border shadow-sm", activePersona?.color)}>
                    {activePersona?.icon}
                </div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-3 md:mb-4">
                    Chat with {activePersona?.name}
                </h1>
                <h2 className="text-base md:text-lg lg:text-xl text-muted-foreground mb-4">{activePersona?.description}</h2>
                
                {/* Show specialties */}
                <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 mb-6 md:mb-8">
                    {activePersona?.specialties.map((specialty, index) => (
                        <span key={index} className="px-2 md:px-3 py-1 bg-muted rounded-full text-xs font-medium">
                            {specialty}
                        </span>
                    ))}
                </div>

                {/* Personalized prompts section */}
                {personalizedPrompts.length > 0 && (
                    <div className="mb-4 md:mb-6">
                        <div className="flex items-center justify-center gap-2 mb-3 md:mb-4">
                            <Brain className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                            <h3 className="text-base md:text-lg font-semibold">Personalized for You</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 mb-4 md:mb-6">
                            {personalizedPrompts.slice(0, 4).map((prompt, index) => (
                                <Card 
                                    key={index} 
                                    className="p-2.5 md:p-3 cursor-pointer hover:bg-muted/50 transition-colors border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5"
                                    onClick={() => onSendSuggestion(prompt)}
                                >
                                    <div className="flex items-start gap-2">
                                        <History className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary shrink-0 mt-0.5 md:mt-1" />
                                        <p className="text-xs md:text-sm text-left leading-tight">{prompt}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                <h3 className="text-base md:text-lg font-semibold mb-4 md:mb-6">
                    {personalizedPrompts.length > 0 ? "Or start fresh:" : "How can I help you today?"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8 text-left">
                    {getPersonaSuggestions().map((suggestion, index) => (
                        <Card key={index} className="p-3 md:p-4 flex flex-col items-start gap-2 cursor-pointer hover:bg-muted transition-colors" onClick={() => onSendSuggestion(suggestion.action)}>
                            {suggestion.icon}
                            <h4 className="font-semibold text-sm md:text-base">{suggestion.title}</h4>
                            <p className="text-xs text-muted-foreground leading-tight">{suggestion.description}</p>
                        </Card>
                    ))}
                </div>

                {isLoadingPrompts && (
                    <div className="text-sm text-muted-foreground">
                        Loading your personalized suggestions...
                    </div>
                )}
            </div>
        </div>
    );
}
