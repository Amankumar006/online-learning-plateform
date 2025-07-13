
"use client";

import { Sparkles, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { type Persona } from "@/ai/schemas/buddy-schemas";
import { Personas } from "./BuddySidebar";

interface WelcomeScreenProps {
    persona: Persona;
    onSendSuggestion: (suggestion: string) => void;
}

export function WelcomeScreen({ persona, onSendSuggestion }: WelcomeScreenProps) {
    const activePersona = Personas.find(p => p.id === persona);

    return (
        <div className="flex h-full flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl mx-auto text-center">
                <div className="p-4 bg-background rounded-full inline-block mb-4 border shadow-sm">
                    {activePersona?.icon}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
                    Chat with {activePersona?.name}
                </h1>
                <h2 className="text-lg md:text-xl text-muted-foreground mb-12">How can I help you today?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
                    <Card className="p-4 flex flex-col items-start gap-2 cursor-pointer hover:bg-muted transition-colors" onClick={() => onSendSuggestion("Suggest a new topic for me to study")}>
                        <Sparkles className="h-5 w-5 text-primary"/>
                        <h4 className="font-semibold">Suggest topics</h4>
                        <p className="text-xs text-muted-foreground">based on my progress</p>
                    </Card>
                    <Card className="p-4 flex flex-col items-start gap-2 cursor-pointer hover:bg-muted transition-colors" onClick={() => onSendSuggestion("Explain the concept of recursion in Python like I'm 15")}>
                        <HelpCircle className="h-5 w-5 text-primary"/>
                        <h4 className="font-semibold">Explain a concept</h4>
                        <p className="text-xs text-muted-foreground">like recursion in Python</p>
                    </Card>
                </div>
            </div>
        </div>
    );
}
