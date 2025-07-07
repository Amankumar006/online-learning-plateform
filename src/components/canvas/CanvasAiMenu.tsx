
'use client'

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, BrainCircuit, Type, Lightbulb, ArrowLeft, Loader2, Calculator } from 'lucide-react';
import { useEditor } from '@tldraw/tldraw';
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { solveVisualProblem, SolveVisualProblemOutput } from "@/ai/flows/solve-visual-problem";
import { explainVisualConcept, ExplainVisualConceptOutput } from "@/ai/flows/visual-explainer-flow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { evaluate } from 'mathjs';
import { cn } from "@/lib/utils";


// Helper function to convert an SVG element to a PNG data URI
async function svgToPngDataUri(svg: SVGElement): Promise<string> {
    return new Promise((resolve, reject) => {
        const svgString = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const img = new window.Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const margin = 20;
            canvas.width = img.width + margin * 2;
            canvas.height = img.height + margin * 2;
            const ctx = canvas.getContext('2d');

            if (ctx) {
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

function formatExplanation(result: ExplainVisualConceptOutput): string {
    let text = `# ${result.title}\n\n`;
    text += `**Summary:** ${result.summary}\n\n`;
    text += "### Explanation\n";
    text += `${result.explanation}\n\n`;
    if (result.keyConcepts && result.keyConcepts.length > 0) {
        text += "### Key Concepts\n";
        text += result.keyConcepts.map(c => `- ${c}`).join('\n');
        text += "\n\n";
    }
    if (result.analogy) {
        text += `**Analogy:** ${result.analogy}`;
    }
    return text;
}


export function CanvasAiMenu() {
    const editor = useEditor();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [isSolveDialogOpen, setIsSolveDialogOpen] = useState(false);
    const [solveContext, setSolveContext] = useState("");
    const [isExplainDialogOpen, setIsExplainDialogOpen] = useState(false);
    const [explainPrompt, setExplainPrompt] = useState("");
    const [isLiveMode, setIsLiveMode] = useState(false);

    useEffect(() => {
        if (!isLiveMode) return;

        const unsubscribe = editor.store.listen(
            (entry) => {
                if (entry.source !== 'user' || !entry.changes.updated) {
                    return;
                }

                for (const [from, to] of Object.values(entry.changes.updated)) {
                    if (
                        to.typeName === 'shape' &&
                        to.type === 'text' &&
                        from.type === 'text' &&
                        from.props.text !== to.props.text
                    ) {
                        const newText = to.props.text.trim();
                        
                        // Condition: ends with '=' and doesn't already have an answer
                        if (newText.endsWith('=') && !/=\s\S/.test(newText)) {
                            const expression = newText.slice(0, -1).trim();
                            if (!expression) continue;

                            try {
                                const result = evaluate(expression);
                                const resultString = String(Number.isInteger(result) ? result : result.toFixed(3));
                                
                                editor.updateShape({
                                    id: to.id,
                                    type: 'text',
                                    props: {
                                        text: `${newText} ${resultString}`,
                                    },
                                });
                            } catch (e) {
                                // Silently fail on evaluation error
                                console.error("Auto-solve error:", e);
                            }
                        }
                    }
                }
            },
            { source: 'user', scope: 'document' }
        );

        return () => {
            unsubscribe();
        };
    }, [editor, isLiveMode]);

    const handleGenerateDiagram = () => {
        toast({ title: "Coming Soon!", description: "AI Diagram Generation is under development." });
    }

    const handleSolveSelection = async () => {
        const selectedShapeIds = editor.getSelectedShapeIds();
        if (selectedShapeIds.length === 0) {
            toast({ variant: "destructive", title: "Nothing Selected", description: "Please select an object or text on the canvas to solve." });
            return;
        }

        const selectionBounds = editor.getSelectionPageBounds();
        
        setLoadingAction('solve');
        setIsLoading(true);
        setIsSolveDialogOpen(false);

        try {
            const svg = await editor.getSvg(selectedShapeIds);
            if (!svg) throw new Error("Could not generate an SVG from the selection. Please try selecting the items again.");
            
            const imageDataUris = [await svgToPngDataUri(svg)];
            if (!imageDataUris[0]) throw new Error("Could not generate an image from the selection.");
            
            const result = await solveVisualProblem({ imageDataUris, context: solveContext });

            let solutionText = "";
            if (result.identifiedType) {
                solutionText += `**Type:** ${result.identifiedType}\n\n`;
            }
            solutionText += result.explanation;
            if (result.steps && result.steps.length > 0) {
                solutionText += `\n\n**Steps:**\n${result.steps.map(step => `- ${step}`).join('\n')}`;
            }
            if (result.finalAnswer) {
                solutionText += `\n\n**Final Answer:**\n${result.finalAnswer}`;
            }
            if (result.tags && result.tags.length > 0) {
                solutionText += `\n\n**Tags:** ${result.tags.join(', ')}`;
            }

            if (selectionBounds) {
                 editor.createShape({
                    type: 'text',
                    x: selectionBounds.maxX + 40,
                    y: selectionBounds.y,
                    props: {
                        text: solutionText,
                        size: 'm',
                        font: 'draw',
                        textAlign: 'start',
                    }
                });
            } else {
                toast({
                    title: "AI Solution",
                    description: solutionText.substring(0, 100) + "...",
                    duration: 10000,
                });
            }

        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "AI Error", description: error.message || "Failed to generate solution." });
        } finally {
            setLoadingAction(null);
            setIsLoading(false);
            setSolveContext("");
        }
    }
    
    const handleExplainSelection = async () => {
        const selectedShapeIds = editor.getSelectedShapeIds();
        if (selectedShapeIds.length === 0) {
            toast({ variant: "destructive", title: "Nothing Selected", description: "Please select an object on the canvas before explaining." });
            return;
        }

        const selectionBounds = editor.getSelectionPageBounds();
        
        setLoadingAction('explain');
        setIsLoading(true);
        setIsExplainDialogOpen(false); 

        try {
            const svg = await editor.getSvg(selectedShapeIds);
            if (!svg) throw new Error("Could not generate an SVG from the selection. Please try selecting the items again.");
            
            const imageDataUri = await svgToPngDataUri(svg);
            if (!imageDataUri) throw new Error("Could not generate an image from the selection.");
            
            const result = await explainVisualConcept({ imageDataUri, prompt: explainPrompt });
            
            const formattedResult = formatExplanation(result);
            
            if (selectionBounds) {
                editor.createShape({
                    type: 'text',
                    x: selectionBounds.x,
                    y: selectionBounds.maxY + 40,
                    props: {
                        text: formattedResult,
                        size: 'm',
                        font: 'draw',
                        textAlign: 'start',
                    }
                });
            } else {
                 toast({
                    title: "AI Explanation",
                    description: formattedResult,
                    duration: 10000,
                });
            }
        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "AI Error", description: error.message || "Failed to generate explanation." });
        } finally {
            setLoadingAction(null);
            setIsLoading(false);
            setExplainPrompt(""); 
        }
    }
    
    const handleConvertToText = () => {
        toast({ title: "Coming Soon!", description: "AI text conversion is under development." });
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
                
                 <Dialog open={isSolveDialogOpen} onOpenChange={setIsSolveDialogOpen}>
                    <DialogTrigger asChild>
                         <Button variant="ghost" size="sm" disabled={isLoading}>
                            {loadingAction === 'solve' ? <Loader2 className="mr-2 animate-spin" /> : <BrainCircuit className="mr-2" />}
                            Solve
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                        <DialogTitle>Solve Selection</DialogTitle>
                        <DialogDescription>
                            Optionally provide context to help the AI understand what you want to solve.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <Label htmlFor="solve-context" className="text-left">
                                Context (Optional)
                            </Label>
                            <Textarea
                                id="solve-context"
                                value={solveContext}
                                onChange={(e) => setSolveContext(e.target.value)}
                                placeholder="e.g., 'Find the area', 'What does this flowchart do?', 'Identify the parts of the cell'"
                            />
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSolveSelection} disabled={isLoading}>
                                {isLoading && loadingAction === 'solve' ? <Loader2 className="mr-2 animate-spin" /> : null}
                                Solve with AI
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                 <Dialog open={isExplainDialogOpen} onOpenChange={setIsExplainDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={isLoading}>
                            <Lightbulb className="mr-2" />
                            Explain
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                        <DialogTitle>Explain Selection</DialogTitle>
                        <DialogDescription>
                            Provide additional context for the AI, or leave blank for a general explanation.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <Label htmlFor="explain-prompt" className="text-left">
                                Prompt (Optional)
                            </Label>
                            <Textarea
                            id="explain-prompt"
                            value={explainPrompt}
                            onChange={(e) => setExplainPrompt(e.target.value)}
                            placeholder="e.g., 'Explain this for a 5th grader'"
                            />
                        </div>
                        <DialogFooter>
                        <Button onClick={handleExplainSelection} disabled={isLoading}>
                            {isLoading && loadingAction === 'explain' ? <Loader2 className="mr-2 animate-spin" /> : null}
                            Generate Explanation
                        </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Button variant="ghost" size="sm" onClick={handleConvertToText} disabled={isLoading}>
                    <Type className="mr-2" />
                    To Text
                </Button>
                 <div className="h-6 w-px bg-border/50 mx-2"></div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsLiveMode(!isLiveMode)} 
                    className={cn(isLiveMode && "bg-primary/20 text-primary-foreground hover:bg-primary/30")}
                >
                    <Calculator className="mr-2" />
                    Auto Solve
                </Button>
            </Card>
        </div>
    )
}
