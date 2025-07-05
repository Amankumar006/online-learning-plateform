'use client'

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, BrainCircuit, Type, MessageCircleQuestion, ArrowLeft, Loader2 } from 'lucide-react';
import { useEditor } from '@tldraw/tldraw';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { explainVisualSelection } from "@/ai/flows/visual-explainer-flow";
import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

// Helper function to convert an SVG element to a PNG data URI
async function svgToPngDataUri(svg: SVGElement): Promise<string> {
    return new Promise((resolve, reject) => {
        const svgString = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // Add a small margin for better rendering and to avoid clipping
            const margin = 20;
            canvas.width = img.width + margin * 2;
            canvas.height = img.height + margin * 2;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                // Set a white background, as the default is transparent which can be problematic
                ctx.fillStyle = 'white'; 
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, margin, margin);
                const pngDataUri = canvas.toDataURL('image/png');
                URL.revokeObjectURL(url);
                resolve(pngDataUri);
            } else {
                URL.revokeObjectURL(url);
                reject(new Error('Could not get canvas 2D context.'));
            }
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load the SVG into an image element for conversion.'));
        };

        img.src = url;
    });
}


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
        const selectedShapeIds = editor.getSelectedShapeIds();
        if (selectedShapeIds.length === 0) {
            toast({ variant: "destructive", title: "Nothing Selected", description: "Please select an object or text on the canvas to explain." });
            return;
        }

        setLoadingAction('explain');
        setIsLoading(true);

        try {
            const svg = await editor.getSvg(selectedShapeIds);

            if (!svg) {
                throw new Error("Could not generate an SVG from the selection. Please try selecting the items again.");
            }
            
            const imageDataUri = await svgToPngDataUri(svg);
            
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
                        textAlign: 'start',
                        font: 'draw'
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
