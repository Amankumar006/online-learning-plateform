
'use client'

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, BrainCircuit, Type, MessageCircleQuestion, ArrowLeft, Loader2 } from 'lucide-react';
import { useEditor } from '@tldraw/tldraw';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { explainVisualSelection } from "@/ai/flows/visual-explainer-flow";

/**
 * A menu for AI-powered actions within the tldraw canvas.
 * It sits at the top of the screen and provides placeholder buttons for future features.
 */
export function CanvasAiMenu() {
    const editor = useEditor();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    // Placeholder functions for future AI implementations
    const handleGenerateDiagram = () => {
        toast({ title: "Coming Soon!", description: "AI Diagram Generation is under development." });
    }

    const handleExplainSelection = async () => {
        const selectedShapes = editor.getSelectedShapes();
        if (selectedShapes.length === 0) {
            toast({ variant: "destructive", title: "Nothing Selected", description: "Please select an object or text on the canvas to explain." });
            return;
        }

        setLoadingAction('explain');
        setIsLoading(true);

        try {
            // The getSnapshot method returns a data URL string directly when format is 'png'.
            const imageDataUri = await editor.getSnapshot(selectedShapes, {
                format: 'png',
                quality: 1,
                scale: 2,
            });

             if (!imageDataUri || typeof imageDataUri !== 'string') {
                throw new Error("Could not generate an image from the selection.");
            }
            
            const result = await explainVisualSelection({ imageDataUri });
            
            const selectionBounds = editor.getSelectionPageBounds();
            if (selectionBounds) {
                 editor.createShape({
                    type: 'text',
                    x: selectionBounds.maxX + 40,
                    y: selectionBounds.y,
                    props: {
                        text: result.explanation,
                        size: 'm',
                        w: 350,
                        align: 'start',
                        font: 'sans'
                    }
                });
            } else {
                 toast({
                    title: "AI Explanation",
                    description: result.explanation,
                    duration: 10000,
                 });
            }
        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "AI Error", description: error.message || "Failed to generate explanation." });
        } finally {
            setLoadingAction(null);
            setIsLoading(false);
        }
    }
    
    const handleConvertToText = () => {
        toast({ title: "Coming Soon!", description: "AI text conversion is under development." });
    }
    
     const handleAskQuestion = () => {
        toast({ title: "Coming Soon!", description: "AI Q&A is under development." });
    }

    return (
        <div className="absolute top-16 left-3 z-20">
            <Card className="p-1.5 flex items-center gap-1 shadow-xl backdrop-blur-md bg-white/70 dark:bg-black/70">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2" />
                        Dashboard
                    </Link>
                </Button>
                
                <div className="h-6 w-px bg-border/50 mx-2"></div>

                <Button variant="ghost" size="sm" onClick={handleGenerateDiagram} disabled={isLoading}>
                    <Sparkles className="mr-2" />
                    Generate
                </Button>
                 <Button variant="ghost" size="sm" onClick={handleExplainSelection} disabled={isLoading}>
                    {loadingAction === 'explain' ? <Loader2 className="mr-2 animate-spin" /> : <BrainCircuit className="mr-2" />}
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
