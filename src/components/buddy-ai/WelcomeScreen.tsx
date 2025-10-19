"use client";

import { Sparkles, Code, Calculator, BookOpen, Brain, History, MessageSquare, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    onNewChat?: (persona: Persona) => void;
}

export function WelcomeScreen({ persona, onSendSuggestion, onNewChat }: WelcomeScreenProps) {
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

    // Enhanced persona cards with theme-aware visual elements
    const getPersonaCards = () => [
        {
            id: 'buddy' as Persona,
            name: 'Study Buddy',
            description: 'Your go-to for study tips, motivation, and collaborative learning.',
            category: 'Academic',
            illustration: (
                <div className="relative w-full h-32 flex items-center justify-center">
                    {/* Theme-aware background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-100/80 to-pink-100/80 dark:from-orange-900/30 dark:to-pink-900/30 rounded-lg transition-colors duration-300"></div>
                    {/* Main icon with theme colors */}
                    <BookOpen className="w-12 h-12 text-orange-600 dark:text-orange-400 relative z-10 transition-colors duration-300" />
                    {/* Decorative elements with theme awareness */}
                    <div className="absolute top-2 right-2 w-6 h-6 bg-yellow-400 dark:bg-yellow-500 rounded-full opacity-60 transition-colors duration-300"></div>
                    <div className="absolute bottom-3 left-3 w-4 h-4 bg-pink-400 dark:bg-pink-500 rounded-full opacity-40 transition-colors duration-300"></div>
                </div>
            ),
            suggestions: [
                "Explain the Pythagorean theorem",
                "Summarize the plot of Hamlet",
                "What is cellular respiration?"
            ]
        },
        {
            id: 'mentor' as Persona,
            name: 'Code Mentor',
            description: 'Your expert guide for coding assistance, debugging, and project advice.',
            category: 'Technical',
            illustration: (
                <div className="relative w-full h-32 flex items-center justify-center">
                    {/* Theme-aware background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-green-100/80 to-emerald-100/80 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg transition-colors duration-300"></div>
                    {/* Code block with theme colors */}
                    <div className="relative z-10 bg-gray-800 dark:bg-gray-700 border border-gray-600 dark:border-gray-500 rounded p-2 text-xs font-mono text-green-400 dark:text-green-300 transition-colors duration-300">
                        <div>def hello():</div>
                        <div className="ml-4">print("Hi!")</div>
                    </div>
                    {/* Animated indicator with theme colors */}
                    <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 dark:bg-green-500 rounded-full animate-pulse transition-colors duration-300"></div>
                </div>
            ),
            suggestions: [
                "Help debug my Python function",
                "Explain async/await in JavaScript",
                "Review my code structure"
            ]
        }
    ];

    // Quick action suggestions based on persona
    const getQuickActions = () => {
        if (persona === 'mentor') {
            return [
                { icon: <Code className="h-4 w-4" />, text: "Debug my code", action: "I'm having trouble with this code, can you help me debug it?" },
                { icon: <Zap className="h-4 w-4" />, text: "Optimize performance", action: "How can I optimize the performance of my code?" },
                { icon: <BookOpen className="h-4 w-4" />, text: "Best practices", action: "What are the best practices for writing clean, maintainable code?" },
            ];
        } else {
            return [
                { icon: <Brain className="h-4 w-4" />, text: "Explain concept", action: "Explain a complex concept in simple terms" },
                { icon: <Calculator className="h-4 w-4" />, text: "Solve problem", action: "Help me solve this step by step" },
                { icon: <Sparkles className="h-4 w-4" />, text: "Study tips", action: "Give me effective study strategies for this topic" },
            ];
        }
    };

    // Show persona selection if no active persona or if explicitly requested
    const showPersonaSelection = !persona || persona === 'buddy';

    if (showPersonaSelection && onNewChat) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-6 bg-gradient-to-br from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10 transition-colors duration-300">
                <div className="w-full max-w-4xl mx-auto text-center">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4 transition-colors duration-300">
                            Welcome to AdaptEd AI
                        </h1>
                        <p className="text-lg text-muted-foreground transition-colors duration-300">
                            Select a persona to start your conversation.
                        </p>
                    </div>

                    {/* Persona Selection */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold mb-6 text-foreground transition-colors duration-300">Choose a Persona</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                            {getPersonaCards().map((personaCard) => (
                                <Card
                                    key={personaCard.id}
                                    className={cn(
                                        "relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl",
                                        "border-2 border-border hover:border-primary/50",
                                        "bg-card hover:bg-card/80",
                                        "shadow-sm hover:shadow-lg",
                                        // Theme-aware background based on persona
                                        personaCard.id === 'buddy'
                                            ? "bg-gradient-to-br from-orange-50/50 to-pink-50/50 dark:from-orange-950/20 dark:to-pink-950/20"
                                            : "bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20"
                                    )}
                                    onClick={() => onNewChat(personaCard.id)}
                                >
                                    <div className="p-6">
                                        {/* Illustration */}
                                        <div className="mb-4">
                                            {personaCard.illustration}
                                        </div>

                                        {/* Content */}
                                        <div className="text-center">
                                            <div className="flex items-center justify-center gap-2 mb-2">
                                                <h3 className="text-xl font-bold text-foreground transition-colors duration-300">{personaCard.name}</h3>
                                                <span className={cn(
                                                    "px-2 py-1 rounded-full text-xs font-medium transition-colors duration-300",
                                                    personaCard.id === 'buddy'
                                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                                        : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                                )}>
                                                    {personaCard.category}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-4 leading-relaxed transition-colors duration-300">
                                                {personaCard.description}
                                            </p>

                                            {/* Sample suggestions with theme awareness */}
                                            <div className="space-y-2">
                                                {personaCard.suggestions.map((suggestion, idx) => (
                                                    <div key={idx} className="text-xs bg-background/60 dark:bg-muted/30 border border-border/30 rounded-full px-3 py-1 text-muted-foreground transition-colors duration-300">
                                                        "{suggestion}"
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-foreground transition-colors duration-300">Quick Actions</h3>
                        <div className="flex flex-wrap justify-center gap-3">
                            <Button
                                onClick={() => onNewChat('buddy')}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-300"
                            >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Start a new chat
                            </Button>

                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Regular welcome screen for active persona
    return (
        <div className="flex h-full flex-col items-center justify-center p-6">
            <div className="w-full max-w-3xl mx-auto text-center">
                {/* Persona Header */}
                <div className="mb-8">
                    <div className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300",
                        activePersona?.id === 'buddy'
                            ? "bg-gradient-to-br from-primary to-primary/80"
                            : "bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500"
                    )}>
                        <span className="text-2xl font-bold text-white">
                            {activePersona?.id === 'buddy' ? 'SB' : 'CM'}
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-2 transition-colors duration-300">
                        Hello! I'm your {activePersona?.name}
                    </h1>
                    <p className="text-lg text-muted-foreground transition-colors duration-300">
                        {activePersona?.id === 'buddy'
                            ? "I can help you with a variety of subjects. What are we learning about today?"
                            : "Get help with coding, debugging, and more"
                        }
                    </p>
                </div>

                {/* Language/Subject Tags for Code Mentor */}
                {activePersona?.id === 'mentor' && (
                    <div className="flex flex-wrap justify-center gap-2 mb-8">
                        {['Python', 'JavaScript', 'Java', 'C++', 'React'].map((lang) => (
                            <span key={lang} className="px-3 py-1 bg-muted hover:bg-muted/80 rounded-full text-sm font-medium transition-colors duration-300">
                                {lang}
                            </span>
                        ))}
                    </div>
                )}

                {/* Personalized Suggestions */}
                {personalizedPrompts.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold mb-4 flex items-center justify-center gap-2 transition-colors duration-300">
                            <Brain className="h-5 w-5 text-primary transition-colors duration-300" />
                            Here are a few suggestions to get us started:
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {personalizedPrompts.slice(0, 3).map((prompt, index) => (
                                <Button
                                    key={index}
                                    variant="outline"
                                    className="h-auto p-4 text-left justify-start hover:bg-primary/5 hover:border-primary/30 transition-all duration-300"
                                    onClick={() => onSendSuggestion(prompt)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0 transition-colors duration-300"></div>
                                        <span className="text-sm leading-relaxed">{prompt}</span>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {getQuickActions().map((action, index) => (
                            <Button
                                key={index}
                                variant="ghost"
                                className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-primary/5 transition-all duration-300"
                                onClick={() => onSendSuggestion(action.action)}
                            >
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center transition-colors duration-300">
                                    {action.icon}
                                </div>
                                <span className="text-sm font-medium">{action.text}</span>
                            </Button>
                        ))}
                    </div>
                </div>

                {isLoadingPrompts && (
                    <div className="mt-6 text-sm text-muted-foreground flex items-center justify-center gap-2 transition-colors duration-300">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin transition-colors duration-300"></div>
                        Loading your personalized suggestions...
                    </div>
                )}
            </div>
        </div>
    );
}
