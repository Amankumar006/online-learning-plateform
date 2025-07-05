
'use client'

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, BrainCircuit, Type, MessageCircleQuestion } from 'lucide-react';
import { useEditor } from '@tldraw/tldraw';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";

/**
 * A menu for AI-powered actions within the tldraw canvas.
 * It sits at the top of the screen and provides placeholder buttons for future features.
 */
export function CanvasAiMenu() {
    const editor = useEditor();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Placeholder functions for future AI implementations
    const handleGenerateDiagram = () => {
        toast({ title: "Coming Soon!", description: "AI Diagram Generation is under development." });
    }

    const handleExplainSelection = () => {
        const selectedShapes = editor.getSelectedShapes();
        if (selectedShapes.length === 0) {
            toast({ variant: "destructive", title: "Nothing Selected", description: "Please select an object or text on the canvas to explain." });
            return;
        }
        toast({ title: "Coming Soon!", description: "AI Explanation for selected items is under development." });
    }
    
    const handleConvertToText = () => {
        toast({ title: "Coming Soon!", description: "AI text conversion is under development." });
    }
    
     const handleAskQuestion = () => {
        toast({ title: "Coming Soon!", description: "AI Q&A is under development." });
    }

    return (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
            <Card className="p-1.5 flex items-center gap-1 shadow-xl backdrop-blur-md bg-white/70 dark:bg-black/70">
                <Button variant="ghost" size="sm" onClick={handleGenerateDiagram} disabled={isLoading}>
                    <Sparkles className="mr-2" />
                    Generate
                </Button>
                 <Button variant="ghost" size="sm" onClick={handleExplainSelection} disabled={isLoading}>
                    <BrainCircuit className="mr-2" />
                    Explain
                </Button>
                <Button variant="ghost" size="sm" onClick={handleConvertToText} disabled={isLoading}>
                    <Type className="mr-2" />
                    To Text
                </Button>
                 <Button variant="ghost" size="sm" onClick={handleAskQuestion} disabled={isLoading}>
                    <MessageCircleQuestion className="mr-2" />
                    Ask
                </Button>
            </Card>
        </div>
    )
}
