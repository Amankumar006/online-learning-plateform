
'use client'

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, BrainCircuit, Type, Lightbulb, ArrowLeft, Loader2, Calculator, Zap } from 'lucide-react';
import { useEditor, type Box, type TLShapeId } from '@tldraw/tldraw';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { evaluate, simplify, derivative, rationalize, parse } from 'mathjs';
import { cn } from "@/lib/utils";

// Enhanced calculation engine with caching and optimizations
class PremiumCalculateEngine {
  private cache = new Map<string, any>();
  
  constructor() {
    // Pre-warm mathjs parser for better performance
    try {
      evaluate('1+1');
    } catch {}
  }

  private getCacheKey(expression: string, operation: string): string {
    return `${operation}:${expression.toLowerCase().trim()}`;
  }

  async evaluateExpression(expression: string, operation: string): Promise<string | null> {
    const cacheKey = this.getCacheKey(expression, operation);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      let result: any;
      
      switch (operation) {
        case '=':
          result = evaluate(expression);
          break;
        case 'simplify':
          result = simplify(expression).toString();
          break;
        case 'factor':
          result = rationalize(expression).toString();
          break;
        case 'derive':
          result = derivative(expression, 'x').toString();
          break;
        default:
          return null;
      }

      const formattedResult = this.formatResult(result);
      
      this.cache.set(cacheKey, formattedResult);
      
      if (this.cache.size > 100) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      
      return formattedResult;
      
    } catch (error) {
      this.cache.set(cacheKey, null);
      return null;
    }
  }

  private formatResult(result: any): string {
    if (typeof result === 'number') {
      if (Number.isInteger(result)) {
        return result.toString();
      }
      if (Math.abs(result) < 0.0001 || Math.abs(result) > 1000000) {
        return result.toExponential(3);
      }
      const precision = result < 1 ? 6 : 4;
      return parseFloat(result.toFixed(precision)).toString();
    }
    
    return String(result);
  }

  clearCache(): void {
    this.cache.clear();
  }
}

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
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load the SVG into an image element for conversion.'));
        };

        img.src = url;
    });
}

function formatSolveResult(result: SolveVisualProblemOutput): string {
    let text = "";
    if (result.identifiedType) {
        text += `**Type:** ${result.identifiedType}\n\n`;
    }
    
    text += `### Explanation\n${result.explanation}\n\n`;

    if (result.tags && result.tags.length > 0) {
        text += `**Tags:** ${result.tags.join(', ')}`;
    }
    return text;
}

function formatExplainResult(result: ExplainVisualConceptOutput): string {
    let text = `### ${result.title}\n\n`;
    text += `**Summary:** ${result.summary}\n\n---\n\n`;
    text += `${result.explanation}\n\n`;
    
    if (result.keyConcepts && result.keyConcepts.length > 0) {
        text += `### Key Concepts\n${result.keyConcepts.map((concept) => `- **${concept.name}:** ${concept.description}`).join('\n')}\n\n`;
    }
    if (result.analogy) {
        text += `**Analogy:** *${result.analogy}*`;
    }
    return text;
}

const ENHANCED_KEYWORDS = [
  { keyword: '=', pattern: /=\s*$/ },
  { keyword: 'simplify', pattern: /\b(simplify|expand|factor)\s*$/i },
  { keyword: 'derive', pattern: /\b(derive|differentiate|d\/dx)\s*$/i },
  { keyword: 'solve', pattern: /\b(solve|find\s+\w+)\s*$/i },
  { keyword: 'evaluate', pattern: /\b(evaluate|calc|calculate)\s*$/i },
];

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

    const calculationEngine = useMemo(() => new PremiumCalculateEngine(), []);
    
    useEffect(() => {
        if (!isLiveMode) {
            return;
        }

        const handleExpression = async (shapeId: TLShapeId, text: string) => {
            const trimmedText = text.trim();

            const detectedKeyword = ENHANCED_KEYWORDS.find(k => k.pattern.test(trimmedText));
            if (!detectedKeyword) {
                return;
            }

            const expression = trimmedText.replace(detectedKeyword.pattern, '').trim();
            if (!expression) {
                return;
            }

            const result = await calculationEngine.evaluateExpression(expression, detectedKeyword.keyword);
            
            if (result !== null) {
                const shape = editor.getShape(shapeId);
                if (shape?.type === 'text') {
                    let newText: string;

                    if (detectedKeyword.keyword === '=') {
                        newText = `${trimmedText} ${result}`;
                    } else {
                         newText = `${expression} → ${result}`;
                    }

                    if (shape.props.text === newText) {
                        return;
                    }

                    editor.updateShape({
                        id: shapeId,
                        type: 'text',
                        props: { text: newText },
                    });
                }
            }
        };

        const unsubscribe = editor.store.listen(
            (entry) => {
                if (entry.source !== 'user' || !entry.changes.updated) return;

                const selectedShape = editor.getOnlySelectedShape();
                if (!selectedShape || selectedShape.type !== 'text') {
                    return;
                }

                for (const [, to] of Object.values(entry.changes.updated)) {
                    if (to.id === selectedShape.id && to.type === 'text') {
                        handleExpression(to.id, to.props.text);
                    }
                }
            }, 
            { source: 'user', scope: 'document' }
        );

        return () => {
            unsubscribe();
        };
    }, [editor, isLiveMode, calculationEngine]);

    const toggleLiveMode = useCallback(() => {
        const newMode = !isLiveMode;
        setIsLiveMode(newMode);
        
        if (newMode) {
            calculationEngine.clearCache();
            toast({
                title: "🚀 Live Math Mode: ON",
                description: "Type expressions ending with =, simplify, derive, etc.",
                duration: 3000,
            });
        } else {
            toast({
                title: "Live Math Mode: OFF",
                duration: 2000,
            });
        }
    }, [isLiveMode, calculationEngine, toast]);

    const handleGenerateDiagram = () => toast({ title: "Coming Soon!", description: "AI Diagram Generation is under development." });

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
            if (!svg) throw new Error("Could not generate an SVG from the selection.");
            const imageDataUris = [await svgToPngDataUri(svg)];
            if (!imageDataUris[0]) throw new Error("Could not generate an image from the selection.");
            
            const result = await solveVisualProblem({ imageDataUris, context: solveContext });
            const solutionText = formatSolveResult(result);

            if (selectionBounds) {
                 editor.createShape({
                    type: 'text',
                    x: selectionBounds.maxX + 40,
                    y: selectionBounds.y,
                    props: { text: solutionText, size: 'm', font: 'draw', textAlign: 'start' }
                });
            } else {
                toast({ title: "AI Solution", description: solutionText.substring(0, 100) + "..." });
            }
        } catch (error: any) {
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
            if (!svg) throw new Error("Could not generate an SVG from the selection.");
            const imageDataUri = await svgToPngDataUri(svg);
            if (!imageDataUri) throw new Error("Could not generate an image from the selection.");
            
            const result = await explainVisualConcept({ imageDataUri, prompt: explainPrompt });
            const explanationText = formatExplainResult(result);
            
            if (selectionBounds) {
                editor.createShape({
                    type: 'text',
                    x: selectionBounds.x,
                    y: selectionBounds.maxY + 40,
                    props: { text: explanationText, size: 'm', font: 'draw', textAlign: 'start' }
                });
            } else {
                 toast({ title: "AI Explanation", description: explanationText, duration: 10000 });
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "AI Error", description: error.message || "Failed to generate explanation." });
        } finally {
            setLoadingAction(null);
            setIsLoading(false);
            setExplainPrompt(""); 
        }
    }
    
    const handleConvertToText = () => toast({ title: "Coming Soon!", description: "AI text conversion is under development." });

    return (
        <>
            <div className="absolute top-16 left-3 z-20">
                <Card className="p-1.5 flex items-center gap-1 shadow-xl backdrop-blur-md bg-white/70 dark:bg-black/70">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/dashboard"><ArrowLeft className="mr-2" />Dashboard</Link>
                    </Button>
                    <div className="h-6 w-px bg-border/50 mx-2"></div>
                    <Button variant="ghost" size="sm" onClick={handleGenerateDiagram} disabled={isLoading}>
                        <Sparkles className="mr-2" />Generate
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
                                <DialogDescription>Optionally provide context to help the AI understand what you want to solve.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <Label htmlFor="solve-context" className="text-left">Context (Optional)</Label>
                                <Textarea 
                                    id="solve-context" 
                                    value={solveContext} 
                                    onChange={(e) => setSolveContext(e.target.value)} 
                                    placeholder="e.g., 'Find the area', 'What does this flowchart do?'"
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
                                <Lightbulb className="mr-2" />Explain
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Explain Selection</DialogTitle>
                                <DialogDescription>Provide additional context for the AI, or leave blank for a general explanation.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <Label htmlFor="explain-prompt" className="text-left">Prompt (Optional)</Label>
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
                        <Type className="mr-2" />To Text
                    </Button>
                    <div className="h-6 w-px bg-border/50 mx-2"></div>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={toggleLiveMode}
                        className={cn(
                            "transition-all duration-200",
                            isLiveMode && "bg-gradient-to-r from-primary/20 to-primary/10 text-primary hover:from-primary/30 hover:to-primary/20 font-semibold shadow-lg"
                        )}
                    >
                        {isLiveMode ? <Zap className="mr-2 animate-pulse" /> : <Calculator className="mr-2" />}
                        {isLiveMode ? 'Live Math' : 'Auto Solve'}
                    </Button>
                </Card>
            </div>
        </>
    );
}
