
'use client'

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, BrainCircuit, Type, Lightbulb, ArrowLeft, Loader2, Calculator, Check, Zap } from 'lucide-react';
import { useEditor, type Box, type TLShapeId, type TLEditor, getSvgAsImage } from '@tldraw/tldraw';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { solveVisualProblem, SolveVisualProblemOutput } from "@/ai/flows/solve-visual-problem";
import { explainVisualConcept, ExplainVisualConceptOutput } from "@/ai/flows/visual-explainer-flow";
import { generateDiagram } from "@/ai/flows/generate-diagram";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { evaluate, simplify, derivative, rationalize } from 'mathjs';
import { cn } from "@/lib/utils";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUser, User } from "@/lib/data";


// Enhanced calculation engine with caching and optimizations
class PremiumCalculateEngine {
  private cache = new Map<string, any>();
  private lastEvaluationTime = 0;
  
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
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const startTime = performance.now();
    
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

      // Format result intelligently
      const formattedResult = this.formatResult(result);
      
      // Cache the result
      this.cache.set(cacheKey, formattedResult);
      
      // Limit cache size to prevent memory issues
      if (this.cache.size > 100) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      
      this.lastEvaluationTime = performance.now() - startTime;
      return formattedResult;
      
    } catch (error) {
      // Cache failed attempts to avoid repeated failures
      this.cache.set(cacheKey, null);
      return null;
    }
  }

  private formatResult(result: any): string {
    if (typeof result === 'number') {
      // Handle integers
      if (Number.isInteger(result)) {
        return result.toString();
      }
      // Handle very small or very large numbers
      if (Math.abs(result) < 0.0001 || Math.abs(result) > 1000000) {
        return result.toExponential(3);
      }
      // Handle decimals with smart precision
      const precision = result < 1 ? 6 : 4;
      return parseFloat(result.toFixed(precision)).toString();
    }
    
    return String(result);
  }

  getLastEvaluationTime(): number {
    return this.lastEvaluationTime;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Enhanced preview component with better animations and positioning
interface PreviewProps {
  shapeId: TLShapeId;
  result: string;
  keyword: string;
  bounds: Box;
  onConfirm: () => void;
  evaluationTime?: number;
  editor: TLEditor;
}

function EnhancedPreview({ shapeId, result, keyword, bounds, onConfirm, evaluationTime, editor }: PreviewProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!bounds) return;

    const updatePosition = () => {
        const pagePoint = { x: bounds.maxX, y: bounds.y + bounds.h / 2 };
        const screenPoint = editor.pageToScreen(pagePoint);

        if (!screenPoint) return;
        
        const viewportWidth = window.innerWidth;
        const previewWidth = 200; // estimated width
        
        let x = screenPoint.x + 12;
        let y = screenPoint.y;

        // Adjust if preview would go off-screen
        if (x + previewWidth > viewportWidth) {
            const leftPagePoint = { x: bounds.minX, y: bounds.y + bounds.h / 2 };
            const leftScreenPoint = editor.pageToScreen(leftPagePoint);
            x = leftScreenPoint.x - previewWidth - 24;
        }

        setPosition({ x, y });
    };

    updatePosition();
    
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, [bounds, editor]);

  return (
    <div
      className={cn(
        "fixed z-50 transition-all duration-200 ease-out",
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        transform: 'translateY(-50%) translateZ(0)', // Hardware acceleration
      }}
    >
      <div
        className="group relative cursor-pointer rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-3 shadow-2xl backdrop-blur-sm transition-all duration-150 hover:shadow-3xl hover:scale-105"
        onClick={onConfirm}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        
        <div className="relative flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary animate-pulse" />
            <span className="font-mono text-sm font-semibold text-primary">
              {keyword === '=' ? `= ${result}` : `→ ${result}`}
            </span>
          </div>
          
          <div className="h-4 w-px bg-border/50" />
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="h-3 w-3" />
            <span>Enter</span>
          </div>
        </div>
        
        {/* Performance indicator */}
        {evaluationTime !== undefined && evaluationTime < 10 && (
          <div className="absolute -top-2 -right-2 rounded-full bg-green-500 px-2 py-1 text-xs font-bold text-white">
            {evaluationTime.toFixed(1)}ms
          </div>
        )}
      </div>
    </div>
  );
}

async function svgToPngDataUri(svg: SVGElement): Promise<string> {
    const png = await getSvgAsImage(svg, {
        type: 'png',
        quality: 1,
        size: { w: svg.width.baseVal.value * 2, h: svg.height.baseVal.value * 2 },
    })
    return png || ''
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

function formatExplainResult(result: any): string {
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

// Enhanced keywords with better detection patterns
const ENHANCED_KEYWORDS = [
  { keyword: '=', pattern: /=\s*$/ },
  { keyword: 'simplify', pattern: /\b(simplify|expand|factor)\s*$/i },
  { keyword: 'derive', pattern: /\b(derive|differentiate|d\/dx)\s*$/i },
  { keyword: 'solve', pattern: /\b(solve|find\s+\w+)\s*$/i },
  { keyword: 'evaluate', pattern: /\b(evaluate|calc|calculate)\s*$/i },
];

function getShapesBoundingBox(shapes: { x: number, y: number, props: { w: number, h: number } }[]): Box | null {
    if (shapes.length === 0) {
        return null;
    }
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    for (const shape of shapes) {
        minX = Math.min(minX, shape.x);
        minY = Math.min(minY, shape.y);
        maxX = Math.max(maxX, shape.x + shape.props.w);
        maxY = Math.max(maxY, shape.y + shape.props.h);
    }
    
    return {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
        minX,
        minY,
        maxX,
        maxY,
    };
}


export function CanvasAiMenu() {
    const editor = useEditor();
    const { toast } = useToast();
    const [userProfile, setUserProfile] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [isSolveDialogOpen, setIsSolveDialogOpen] = useState(false);
    const [solveContext, setSolveContext] = useState("");
    const [isExplainDialogOpen, setIsExplainDialogOpen] = useState(false);
    const [explainPrompt, setExplainPrompt] = useState("");
    const [isLiveMode, setIsLiveMode] = useState(false);
    const [preview, setPreview] = useState<{ 
        shapeId: TLShapeId; 
        result: string; 
        keyword: string; 
        bounds: Box;
        evaluationTime?: number;
    } | null>(null);
    const [isDiagramDialogOpen, setIsDiagramDialogOpen] = useState(false);
    const [diagramPrompt, setDiagramPrompt] = useState("");
    const [diagramType, setDiagramType] = useState("Flowchart");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const profile = await getUser(currentUser.uid);
                setUserProfile(profile);
            }
        });
        return () => unsubscribe();
    }, []);

    // Enhanced calculation engine
    const calculationEngine = useMemo(() => new PremiumCalculateEngine(), []);
    
    // Performance monitoring
    const lastProcessTime = useRef<number>(0);
    const processCount = useRef<number>(0);

    const confirmResult = useCallback(() => {
        if (!preview) return;
        
        const shape = editor.getShape(preview.shapeId);
        if (shape?.type === 'text') {
            const originalText = shape.props.text.trim();
            
            // Find the actual keyword match in the text
            const detectedKeyword = ENHANCED_KEYWORDS.find(k => 
                k.pattern.test(originalText)
            );
            
            if (!detectedKeyword) return;
            
            // Extract expression more intelligently
            const expression = originalText.replace(detectedKeyword.pattern, '').trim();
            
            let newText: string;
            if (preview.keyword === '=') {
                newText = `${originalText} ${preview.result}`;
            } else {
                newText = `${expression} → ${preview.result}`;
            }

            editor.updateShape({
                id: preview.shapeId,
                type: 'text',
                props: { text: newText },
            });
            
            // Show success toast with performance info
            toast({
                title: "Calculation Applied",
                description: `Processed in ${preview.evaluationTime?.toFixed(1)}ms`,
                duration: 2000,
            });
            
            setPreview(null);
        }
    }, [editor, preview, toast]);
    
    // Enhanced keydown listener with additional shortcuts
    useEffect(() => {
        if (!preview) return;
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                confirmResult();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setPreview(null);
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [preview, confirmResult]);

    // Enhanced live mode with better performance and detection
    useEffect(() => {
        if (!isLiveMode) {
            setPreview(null);
            return;
        }

        // Optimized expression handler with immediate feedback
        const handleExpression = async (shapeId: TLShapeId, text: string, bounds: Box | null) => {
            const startTime = performance.now();
            processCount.current++;
            
            if (!bounds) {
                setPreview(null);
                return;
            }

            const trimmedText = text.trim();
            if (trimmedText.length < 2) {
                setPreview(null);
                return;
            }

            // Enhanced keyword detection
            const detectedKeyword = ENHANCED_KEYWORDS.find(k => k.pattern.test(trimmedText));
            if (!detectedKeyword) {
                setPreview(null);
                return;
            }

            // Extract expression
            const expression = trimmedText.replace(detectedKeyword.pattern, '').trim();
            if (!expression) {
                setPreview(null);
                return;
            }

            // Use enhanced calculation engine
            const result = await calculationEngine.evaluateExpression(expression, detectedKeyword.keyword);
            
            if (result !== null) {
                const processingTime = performance.now() - startTime;
                lastProcessTime.current = processingTime;
                
                setPreview({ 
                    shapeId, 
                    result, 
                    keyword: detectedKeyword.keyword, 
                    bounds,
                    evaluationTime: processingTime
                });
            } else {
                setPreview(null);
            }
        };

        // Immediate processing for ultra-responsive feel
        const unsubscribe = editor.store.listen(
            (entry) => {
                if (entry.source !== 'user' || !entry.changes.updated) return;

                const selectedShape = editor.getOnlySelectedShape();
                if (!selectedShape || selectedShape.type !== 'text') {
                    setPreview(null);
                    return;
                }

                for (const [, to] of Object.values(entry.changes.updated)) {
                    if (to.id === selectedShape.id && to.type === 'text') {
                        const bounds = editor.getShapePageBounds(to.id);
                        // Process immediately for premium feel
                        handleExpression(to.id, to.props.text, bounds);
                    }
                }
            }, 
            { source: 'user', scope: 'document' }
        );

        return () => {
            unsubscribe();
        };
    }, [editor, isLiveMode, calculationEngine]);

    // Enhanced live mode toggle with performance feedback
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
            setPreview(null);
            const avgTime = lastProcessTime.current;
            const count = processCount.current;
            
            toast({
                title: "Live Math Mode: OFF",
                description: count > 0 ? `Processed ${count} expressions (avg: ${avgTime.toFixed(1)}ms)` : "Ready for next session",
                duration: 2000,
            });
            
            // Reset performance counters
            processCount.current = 0;
            lastProcessTime.current = 0;
        }
    }, [isLiveMode, calculationEngine, toast]);

    const handleGenerateDiagram = async () => {
        if (!diagramPrompt.trim()) {
            toast({ variant: 'destructive', title: 'Prompt Required', description: 'Please describe the diagram you want to create.' });
            return;
        }
        setLoadingAction('diagram');
        setIsLoading(true);
        setIsDiagramDialogOpen(false);
    
        try {
            const { shapes, arrows } = await generateDiagram({
                prompt: diagramPrompt,
                diagramType,
            });
    
            if (!shapes || shapes.length === 0) {
                toast({ variant: 'destructive', title: 'AI Error', description: 'The AI could not generate any shapes for this diagram.' });
                return;
            }
            
            // Center the diagram in the current viewport
            const viewport = editor.getViewportPageBounds();
            const diagramBounds = getShapesBoundingBox(shapes as any);
            
            if (diagramBounds) {
                const offsetX = viewport.midX - (diagramBounds.x + diagramBounds.w / 2);
                const offsetY = viewport.midY - (diagramBounds.y + diagramBounds.h / 2);

                shapes.forEach(shape => {
                    shape.x += offsetX;
                    shape.y += offsetY;
                });
            }

            editor.createShapes(shapes as any);
            editor.createArrows(arrows as any);
    
            toast({ title: 'Diagram Generated!', description: 'Your diagram has been added to the canvas.' });
    
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'AI Error', description: error.message || 'Failed to generate diagram.' });
        } finally {
            setLoadingAction(null);
            setIsLoading(false);
            setDiagramPrompt('');
        }
    };

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
                    props: { text: solutionText, size: 'm', font: 'draw', align: 'start' }
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
            
            const result = await explainVisualConcept({ 
                imageDataUri, 
                prompt: explainPrompt,
                learningStyle: userProfile?.learningStyle || 'unspecified',
            });
            const explanationText = formatExplainResult(result);
            
            if (selectionBounds) {
                editor.createShape({
                    type: 'text',
                    x: selectionBounds.x,
                    y: selectionBounds.maxY + 40,
                    props: { text: explanationText, size: 'm', font: 'draw', align: 'start' }
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
                    
                    <Dialog open={isDiagramDialogOpen} onOpenChange={setIsDiagramDialogOpen}>
                        <DialogTrigger asChild>
                             <Button variant="ghost" size="sm" disabled={isLoading}>
                                {loadingAction === 'diagram' ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                                Generate Diagram
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                             <DialogHeader>
                                <DialogTitle>Generate Diagram with AI</DialogTitle>
                                <DialogDescription>Describe the diagram you want to create. The AI will generate it as editable shapes.</DialogDescription>
                            </DialogHeader>
                             <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="diagram-prompt">Prompt</Label>
                                    <Textarea 
                                        id="diagram-prompt" 
                                        value={diagramPrompt} 
                                        onChange={(e) => setDiagramPrompt(e.target.value)} 
                                        placeholder="e.g., A simple ER diagram for a blog with users and posts."
                                        rows={4}
                                    />
                                </div>
                                 <div className="space-y-2">
                                     <Label htmlFor="diagram-type">Diagram Type</Label>
                                     <Select value={diagramType} onValueChange={setDiagramType}>
                                         <SelectTrigger id="diagram-type">
                                             <SelectValue placeholder="Select a type" />
                                         </SelectTrigger>
                                         <SelectContent>
                                            <SelectItem value="Flowchart">Flowchart</SelectItem>
                                            <SelectItem value="ER Diagram">ER Diagram</SelectItem>
                                            <SelectItem value="UML Class Diagram">UML Class Diagram</SelectItem>
                                            <SelectItem value="Sequence Diagram">Sequence Diagram</SelectItem>
                                            <SelectItem value="System Architecture">System Architecture</SelectItem>
                                         </SelectContent>
                                     </Select>
                                 </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleGenerateDiagram} disabled={isLoading}>
                                    {isLoading && loadingAction === 'diagram' ? <Loader2 className="mr-2 animate-spin" /> : null}
                                    Generate
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    
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
                    
                    {/* Enhanced Live Mode Toggle */}
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
            
            {preview && (
                <EnhancedPreview
                    shapeId={preview.shapeId}
                    result={preview.result}
                    keyword={preview.keyword}
                    bounds={preview.bounds}
                    onConfirm={confirmResult}
                    evaluationTime={preview.evaluationTime}
                    editor={editor}
                />
            )}
        </>
    );
}
