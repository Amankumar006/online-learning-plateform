
'use client'

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, BrainCircuit, Type, Lightbulb, ArrowLeft, Loader2, Calculator, Check, Zap, Eye, EyeOff } from 'lucide-react';
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
import { evaluate, simplify, derivative, rationalize } from 'mathjs';
import { debounce } from 'lodash';
import { cn } from "@/lib/utils";

// Ultra-optimized calculation engine
class UltraFastCalculateEngine {
  private cache = new Map<string, string | null>();
  private pendingCalculations = new Map<string, Promise<string | null>>();
  private isWarmedUp = false;
  
  constructor() {
    this.preWarmMath();
  }

  private preWarmMath() {
    if (this.isWarmedUp) return;
    
    // Pre-warm mathjs for better performance
    try {
      evaluate('1+1');
      simplify('x+x');
      derivative('x^2', 'x');
      this.isWarmedUp = true;
    } catch {}
  }

  // Smart expression detection with confidence scoring
  detectMathExpression(text: string): { expression: string; operation: string; confidence: number } | null {
    const triggers = [
      { pattern: /^(.+?)\s*=\s*$/m, operation: '=', confidence: 90 },
      { pattern: /^(.+?)\s*\?\s*$/m, operation: '=', confidence: 80 },
      { pattern: /^simplify\s*\(\s*(.+?)\s*\)$/im, operation: 'simplify', confidence: 95 },
      { pattern: /^derive\s*\(\s*(.+?)\s*\)$/im, operation: 'derive', confidence: 95 },
      { pattern: /^factor\s*\(\s*(.+?)\s*\)$/im, operation: 'factor', confidence: 95 },
      { pattern: /^expand\s*\(\s*(.+?)\s*\)$/im, operation: 'expand', confidence: 95 },
      { pattern: /^(.+?)\s*→\s*$/m, operation: '=', confidence: 85 },
    ];

    for (const trigger of triggers) {
      const match = text.trim().match(trigger.pattern);
      if (match) {
        const expression = match[1].trim();
        const mathConfidence = this.calculateMathConfidence(expression);
        
        return {
          expression,
          operation: trigger.operation,
          confidence: Math.min(trigger.confidence, mathConfidence)
        };
      }
    }
    
    return null;
  }

  private calculateMathConfidence(expr: string): number {
    // Heuristic scoring for math expressions
    const mathOperators = /[+\-*/^()=<>√∫∂]/g;
    const numbers = /\d/g;
    const variables = /[a-zA-Z]/g;
    const functions = /\b(sin|cos|tan|log|ln|sqrt|abs|exp)\b/g;
    
    const operatorScore = (expr.match(mathOperators) || []).length * 20;
    const numberScore = (expr.match(numbers) || []).length * 10;
    const variableScore = (expr.match(variables) || []).length * 5;
    const functionScore = (expr.match(functions) || []).length * 30;
    
    return Math.min(100, operatorScore + numberScore + variableScore + functionScore);
  }

  async evaluateExpression(expression: string, operation: string): Promise<string | null> {
    const cacheKey = `${operation}:${expression.toLowerCase().trim()}`;
    
    // Return cached result immediately
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Prevent duplicate calculations
    if (this.pendingCalculations.has(cacheKey)) {
      return this.pendingCalculations.get(cacheKey);
    }

    const calculationPromise = this.performCalculation(expression, operation);
    this.pendingCalculations.set(cacheKey, calculationPromise);

    try {
      const result = await calculationPromise;
      this.cache.set(cacheKey, result);
      
      // Manage cache size
      if (this.cache.size > 150) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      
      return result;
    } finally {
      this.pendingCalculations.delete(cacheKey);
    }
  }

  private async performCalculation(expression: string, operation: string): Promise<string | null> {
    try {
      let result: any;
      
      switch (operation) {
        case '=':
          result = evaluate(expression);
          break;
        case 'simplify':
          result = simplify(expression);
          break;
        case 'factor':
          result = rationalize(expression);
          break;
        case 'expand':
          result = simplify(expression, [], { expand: true });
          break;
        case 'derive':
          result = derivative(expression, 'x');
          break;
        default:
          return null;
      }

      return this.formatResult(result);
    } catch (error) {
      return null;
    }
  }

  private formatResult(result: any): string {
    if (typeof result === 'number') {
      if (Number.isInteger(result)) return result.toString();
      if (Math.abs(result) < 0.0001) return '≈ 0';
      if (Math.abs(result) > 1000000) return result.toExponential(2);
      return parseFloat(result.toFixed(6)).toString();
    }
    
    if (result && typeof result.toString === 'function') {
      return result.toString();
    }
    
    return String(result);
  }

  clearCache(): void {
    this.cache.clear();
    this.pendingCalculations.clear();
  }
}

// Optimized Live Mode implementation for your CanvasAiMenu
export function useOptimizedLiveMode(editor: any, isLiveMode: boolean, showPreview: boolean, calculationEngine: UltraFastCalculateEngine) {
  const [previewResults, setPreviewResults] = useState<Map<string, { result: string; bounds: Box }>>(new Map());
  const processedShapes = useRef<Set<string>>(new Set());
  
  // Ultra-fast preview calculation (50ms debounce)
  const calculatePreview = useMemo(
    () => debounce(async (shapeId: string, text: string) => {
      if (!showPreview) {
        setPreviewResults(new Map());
        return;
      }
      
      const detected = calculationEngine.detectMathExpression(text);
      const shape = editor.getShape(shapeId);
      const bounds = shape ? editor.getShapePageBounds(shapeId) : null;

      if (!detected || !bounds || detected.confidence < 40) {
        setPreviewResults(prev => {
          const newMap = new Map(prev);
          newMap.delete(shapeId);
          return newMap;
        });
        return;
      }

      const result = await calculationEngine.evaluateExpression(detected.expression, detected.operation);
      if (result) {
        setPreviewResults(prev => {
          const newMap = new Map(prev);
          newMap.set(shapeId, { result, bounds });
          return newMap;
        });
      }
    }, 50),
    [calculationEngine, editor, showPreview]
  );

  // Slower inline replacement (300ms debounce for stability)
  const processInlineUpdate = useMemo(
    () => debounce(async (shapeId: string, text: string) => {
      if (!isLiveMode) return;
      
      const detected = calculationEngine.detectMathExpression(text);
      if (!detected || detected.confidence < 60) return;

      const result = await calculationEngine.evaluateExpression(detected.expression, detected.operation);
      if (!result) return;

      if (processedShapes.current.has(shapeId)) return;
      processedShapes.current.add(shapeId);

      const shape = editor.getShape(shapeId);
      if (!shape || shape.type !== 'text') return;

      let newText: string;
      if (detected.operation === '=') {
        newText = `${detected.expression} = ${result}`;
      } else {
        newText = `${text} → ${result}`;
      }

      if (shape.props.text !== newText) {
        editor.updateShape({
          id: shapeId,
          type: 'text',
          props: { text: newText },
        });
      }

      setTimeout(() => {
        processedShapes.current.delete(shapeId);
      }, 500);
    }, 300),
    [editor, isLiveMode, calculationEngine]
  );

  useEffect(() => {
    const handleShapeUpdate = (entry: any) => {
      if (entry.source !== 'user' || !entry.changes.updated) return;
      
      const selectedShape = editor.getOnlySelectedShape();
      if (!selectedShape || selectedShape.type !== 'text') {
        setPreviewResults(new Map());
        return;
      }

      for (const [, to] of Object.values(entry.changes.updated)) {
        if (to.id === selectedShape.id && to.type === 'text') {
          calculatePreview(to.id, to.props.text);
          if(isLiveMode) processInlineUpdate(to.id, to.props.text);
        }
      }
    };

    const unsubscribe = editor.store.listen(handleShapeUpdate, { source: 'user', scope: 'document' });

    return () => {
      unsubscribe();
      calculatePreview.cancel();
      processInlineUpdate.cancel();
    };
  }, [editor, isLiveMode, calculatePreview, processInlineUpdate]);

  return { previewResults, setPreviewResults };
}

// Enhanced Live Mode toggle with better UX
export function EnhancedLiveModeToggle({ 
  isLiveMode, 
  onToggle, 
  calculationEngine, 
  toast 
}: {
  isLiveMode: boolean;
  onToggle: () => void;
  calculationEngine: UltraFastCalculateEngine;
  toast: any;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleToggle = useCallback(async () => {
    setIsProcessing(true);
    
    if (!isLiveMode) {
      calculationEngine.clearCache();
      toast({
        title: "🚀 Live Math Mode: ON",
        description: "Real-time expression replacement is active.",
        duration: 2000,
      });
    } else {
      toast({
        title: "Live Math Mode: OFF",
        description: "Inline replacement is paused.",
        duration: 2000,
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    onToggle();
    setIsProcessing(false);
  }, [isLiveMode, calculationEngine, toast, onToggle]);

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleToggle}
      disabled={isProcessing}
      className={cn(
        "transition-all duration-300 relative overflow-hidden",
        isLiveMode && "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 hover:from-green-500/30 hover:to-emerald-500/30 font-semibold shadow-lg border-green-200"
      )}
    >
      {isProcessing ? <Loader2 className="mr-2 animate-spin" /> : isLiveMode ? <Zap className="mr-2 animate-pulse" /> : <Calculator className="mr-2" />}
      {isLiveMode ? 'Live Mode' : 'Auto Solve'}
      {isLiveMode && <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-emerald-400/10 animate-pulse"></div>}
    </Button>
  );
}

// Preview Bubble Component for Canvas
function PreviewBubble({ result, bounds }: { result: string; bounds: Box }) {
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const x = bounds.maxX + 15;
        const y = bounds.y + bounds.h / 2;
        setPosition({ x, y });
    }, [bounds]);

    return (
        <div 
            className="absolute z-[100] px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm rounded-lg shadow-xl transform transition-all duration-200 animate-in fade-in-0 slide-in-from-left-2 pointer-events-none"
            style={{ left: position.x, top: position.y, transform: 'translateY(-50%)' }}
        >
            <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 flex-shrink-0" />
                <span className="font-mono truncate">{result}</span>
            </div>
        </div>
    );
}

async function svgToPngDataUri(svg: SVGElement): Promise<string> {
    const svgString = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    return new Promise((resolve, reject) => {
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
            reject(new Error('Failed to load SVG into an image element.'));
        };
        img.src = url;
    });
}

function formatResult(result: any): string {
  let text = `### ${result.title}\n\n`;
  text += `**Summary:** ${result.summary}\n\n---\n\n`;
  text += `${result.explanation}\n\n`;
  
  if (result.keyConcepts && result.keyConcepts.length > 0) {
      text += `### Key Concepts\n${result.keyConcepts.map((concept: any) => `- **${concept.name}:** ${concept.description}`).join('\n')}\n\n`;
  }
  if (result.analogy) {
      text += `**Analogy:** *${result.analogy}*`;
  }
  return text;
}

// Complete optimized CanvasAiMenu replacement
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
    const [showPreview, setShowPreview] = useState(true);

    const calculationEngine = useMemo(() => new UltraFastCalculateEngine(), []);
    const { previewResults } = useOptimizedLiveMode(editor, isLiveMode, showPreview, calculationEngine);

    const toggleLiveMode = useCallback(() => setIsLiveMode(prev => !prev), []);
    const togglePreview = useCallback(() => setShowPreview(prev => !prev), []);

    const handleSolveSelection = async () => {
        const selectedShapeIds = editor.getSelectedShapeIds();
        if (selectedShapeIds.length === 0) {
            toast({ variant: "destructive", title: "Nothing Selected", description: "Please select an object to solve." });
            return;
        }

        const selectionBounds = editor.getSelectionPageBounds();
        setLoadingAction('solve');
        setIsLoading(true);
        setIsSolveDialogOpen(false);

        try {
            const svg = await editor.getSvg(selectedShapeIds);
            if (!svg) throw new Error("Could not generate SVG.");
            const imageDataUris = [await svgToPngDataUri(svg)];
            const result = await solveVisualProblem({ imageDataUris, context: solveContext });
            if (selectionBounds) {
                 editor.createShape({ type: 'text', x: selectionBounds.maxX + 40, y: selectionBounds.y, props: { text: formatResult(result), size: 'm', font: 'draw', textAlign: 'start' } });
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
            toast({ variant: "destructive", title: "Nothing Selected", description: "Please select an object to explain." });
            return;
        }

        const selectionBounds = editor.getSelectionPageBounds();
        setLoadingAction('explain');
        setIsLoading(true);
        setIsExplainDialogOpen(false); 

        try {
            const svg = await editor.getSvg(selectedShapeIds);
            if (!svg) throw new Error("Could not generate SVG.");
            const imageDataUri = await svgToPngDataUri(svg);
            const result = await explainVisualConcept({ imageDataUri, prompt: explainPrompt });
            if (selectionBounds) {
                editor.createShape({ type: 'text', x: selectionBounds.x, y: selectionBounds.maxY + 40, props: { text: formatResult(result), size: 'm', font: 'draw', textAlign: 'start' } });
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "AI Error", description: error.message || "Failed to generate explanation." });
        } finally {
            setLoadingAction(null);
            setIsLoading(false);
            setExplainPrompt(""); 
        }
    }
    
    return (
        <>
            <div className="absolute top-16 left-3 z-20">
                <Card className="p-1.5 flex items-center gap-1 shadow-xl backdrop-blur-md bg-white/70 dark:bg-black/70">
                    <Button variant="ghost" size="sm" asChild><Link href="/dashboard"><ArrowLeft className="mr-2" />Dashboard</Link></Button>
                    <div className="h-6 w-px bg-border/50 mx-2"></div>
                    <Button variant="ghost" size="sm" disabled={isLoading} onClick={() => toast({ title: "Coming Soon!" })}><Sparkles className="mr-2" />Generate</Button>
                    <Dialog open={isSolveDialogOpen} onOpenChange={setIsSolveDialogOpen}>
                        <DialogTrigger asChild><Button variant="ghost" size="sm" disabled={isLoading}>{loadingAction === 'solve' ? <Loader2 className="mr-2 animate-spin" /> : <BrainCircuit className="mr-2" />}Solve</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Solve Selection</DialogTitle><DialogDescription>Provide context to help the AI.</DialogDescription></DialogHeader>
                            <Textarea value={solveContext} onChange={(e) => setSolveContext(e.target.value)} placeholder="e.g., 'Find the area'" />
                            <DialogFooter><Button onClick={handleSolveSelection} disabled={isLoading}>{isLoading && loadingAction === 'solve' && <Loader2 className="mr-2 animate-spin" />}Solve with AI</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isExplainDialogOpen} onOpenChange={setIsExplainDialogOpen}>
                        <DialogTrigger asChild><Button variant="ghost" size="sm" disabled={isLoading}>{loadingAction === 'explain' ? <Loader2 className="mr-2 animate-spin" /> : <Lightbulb className="mr-2" />}Explain</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Explain Selection</DialogTitle><DialogDescription>Provide context for the AI.</DialogDescription></DialogHeader>
                            <Textarea value={explainPrompt} onChange={(e) => setExplainPrompt(e.target.value)} placeholder="e.g., 'Explain this for a 5th grader'" />
                            <DialogFooter><Button onClick={handleExplainSelection} disabled={isLoading}>{isLoading && loadingAction === 'explain' && <Loader2 className="mr-2 animate-spin" />}Generate Explanation</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="sm" disabled={isLoading} onClick={() => toast({ title: "Coming Soon!" })}><Type className="mr-2" />To Text</Button>
                    <div className="h-6 w-px bg-border/50 mx-2"></div>
                    <EnhancedLiveModeToggle isLiveMode={isLiveMode} onToggle={toggleLiveMode} calculationEngine={calculationEngine} toast={toast} />
                    <Button variant="ghost" size="sm" onClick={togglePreview} className={cn(showPreview && "bg-blue-500/20 text-blue-700 hover:bg-blue-500/30")}>
                        {showPreview ? <Eye className="mr-2" /> : <EyeOff className="mr-2" />}Preview
                    </Button>
                </Card>
            </div>
            {Array.from(previewResults.entries()).map(([shapeId, { result, bounds }]) => (
                <PreviewBubble key={shapeId} result={result} bounds={bounds} editor={editor} />
            ))}
        </>
    );
}
