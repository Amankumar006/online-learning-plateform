
'use client'

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, BrainCircuit, Type, Lightbulb, ArrowLeft, Loader2, Calculator, Check, Zap } from 'lucide-react';
import { useEditor, type Box, type TLShapeId, type TLEditor, getSvgAsImage } from '@tldraw/tldraw';
import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUser, User } from "@/lib/data";

// --- Helper Functions ---

/**
 * Converts an SVG element to a PNG data URI.
 */
async function svgToPngDataUri(svg: SVGElement): Promise<string> {
    const png = await getSvgAsImage(svg, {
        type: 'png',
        quality: 1,
        size: { w: svg.width.baseVal.value * 2, h: svg.height.baseVal.value * 2 },
    });
    return png || '';
}

/**
 * Captures the selected shapes on the canvas as a PNG data URI.
 */
async function getSelectionAsImageDataUri(editor: TLEditor): Promise<string | null> {
    const selectedShapeIds = editor.getSelectedShapeIds();
    if (selectedShapeIds.length === 0) return null;

    const svg = await editor.getSvg(selectedShapeIds);
    if (!svg) throw new Error("Could not generate an SVG from the selection.");
    
    const pngUri = await svgToPngDataUri(svg);
    if (!pngUri) throw new Error("Could not convert SVG to image.");
    
    return pngUri;
}

/**
 * Formats the result from the solveVisualProblem flow into a readable string.
 */
function formatSolveResult(result: SolveVisualProblemOutput): string {
    let text = result.identifiedType ? `**Type:** ${result.identifiedType}\n\n` : "";
    text += `### Explanation\n${result.explanation}\n\n`;
    if (result.tags && result.tags.length > 0) {
        text += `**Tags:** ${result.tags.join(', ')}`;
    }
    return text;
}

/**
 * Formats the result from the explainVisualConcept flow into a readable string.
 */
function formatExplainResult(result: ExplainVisualConceptOutput): string {
    let text = `### ${result.title}\n\n**Summary:** ${result.summary}\n\n---\n\n${result.explanation}\n\n`;
    if (result.keyConcepts && result.keyConcepts.length > 0) {
        text += `### Key Concepts\n${result.keyConcepts.map(c => `- **${c.name}:** ${c.description}`).join('\n')}\n\n`;
    }
    if (result.analogy) {
        text += `**Analogy:** *${result.analogy}*`;
    }
    return text;
}

/**
 * Calculates the bounding box of a set of shapes to center them on the canvas.
 */
function getShapesBoundingBox(shapes: { x: number, y: number, props: { w?: number, h?: number } }[]): Box | null {
    if (!shapes || shapes.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    shapes.forEach(shape => {
        minX = Math.min(minX, shape.x);
        minY = Math.min(minY, shape.y);
        maxX = Math.max(maxX, shape.x + (shape.props.w || 0));
        maxY = Math.max(maxY, shape.y + (shape.props.h || 0));
    });
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY, minX, minY, maxX, maxY };
}


// --- Custom Hook for Live Math ---

const LIVE_MATH_KEYWORDS = [
  { keyword: '=', pattern: /=\s*$/ },
  { keyword: 'simplify', pattern: /\b(simplify|expand|factor)\s*$/i },
  { keyword: 'derive', pattern: /\b(derive|differentiate|d\/dx)\s*$/i },
  { keyword: 'solve', pattern: /\b(solve|find\s+\w+)\s*$/i },
  { keyword: 'evaluate', pattern: /\b(evaluate|calc|calculate)\s*$/i },
];

const useLiveMath = (editor: TLEditor, isEnabled: boolean) => {
    const [preview, setPreview] = useState<{ shapeId: TLShapeId; result: string; keyword: string; bounds: Box } | null>(null);
    const mathEngine = useMemo(() => {
        const engine = {
            evaluate: (expression: string, operation: string) => {
                try {
                    switch (operation) {
                        case '=': return evaluate(expression).toString();
                        case 'simplify': return simplify(expression).toString();
                        case 'factor': return rationalize(expression).toString();
                        case 'derive': return derivative(expression, 'x').toString();
                        default: return null;
                    }
                } catch { return null; }
            }
        };
        return engine;
    }, []);

    const confirmPreview = useCallback(() => {
        if (!preview) return;
        const shape = editor.getShape(preview.shapeId);
        if (shape?.type === 'text') {
            const originalText = shape.props.text.trim();
            const keyword = LIVE_MATH_KEYWORDS.find(k => k.pattern.test(originalText));
            if (!keyword) return;
            const expression = originalText.replace(keyword.pattern, '').trim();
            const newText = preview.keyword === '=' ? `${originalText} ${preview.result}` : `${expression} → ${preview.result}`;
            editor.updateShape({ id: preview.shapeId, type: 'text', props: { text: newText } });
            setPreview(null);
        }
    }, [editor, preview]);

    useEffect(() => {
        if (!isEnabled) {
            setPreview(null);
            return;
        }

        const handleExpression = (shapeId: TLShapeId, text: string) => {
            const bounds = editor.getShapePageBounds(shapeId);
            const keyword = LIVE_MATH_KEYWORDS.find(k => k.pattern.test(text));
            if (!bounds || !keyword) {
                setPreview(null);
                return;
            }
            const expression = text.replace(keyword.pattern, '').trim();
            if (!expression) {
                setPreview(null);
                return;
            }
            const result = mathEngine.evaluate(expression, keyword.keyword);
            if (result !== null) {
                setPreview({ shapeId, result, keyword: keyword.keyword, bounds });
            } else {
                setPreview(null);
            }
        };

        const dispose = editor.store.listen(entry => {
            if (entry.source !== 'user' || !entry.changes.updated) return;
            const selectedShape = editor.getOnlySelectedShape();
            if (!selectedShape || selectedShape.type !== 'text') {
                setPreview(null);
                return;
            }
            for (const [, to] of Object.values(entry.changes.updated)) {
                if (to.id === selectedShape.id && to.type === 'text' && to.props?.text) {
                    handleExpression(to.id, to.props.text);
                }
            }
        });

        return () => {
            dispose();
        };
    }, [editor, isEnabled, mathEngine]);
    
    // Global keyboard listener for Enter/Escape
    useEffect(() => {
        if (!preview) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') confirmPreview();
            if (e.key === 'Escape') setPreview(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [preview, confirmPreview]);


    return { preview, confirmPreview };
};


// --- Sub-Components for UI ---

const LiveMathPreview = ({ preview, onConfirm, editor }: { preview: NonNullable<ReturnType<typeof useLiveMath>['preview']>, onConfirm: () => void, editor: TLEditor }) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const { bounds } = preview;
        const pagePoint = { x: bounds.maxX, y: bounds.y + bounds.h / 2 };
        const screenPoint = editor.pageToScreen(pagePoint);

        if (!screenPoint) return;
        
        const previewWidth = 200; 
        let x = screenPoint.x + 12;

        if (x + previewWidth > window.innerWidth) {
            const leftPagePoint = { x: bounds.minX, y: bounds.y + bounds.h / 2 };
            const leftScreenPoint = editor.pageToScreen(leftPagePoint);
            if(leftScreenPoint) x = leftScreenPoint.x - previewWidth - 24;
        }
        setPosition({ x, y: screenPoint.y });
    }, [preview, editor]);

    return (
        <div className="fixed z-50 transition-opacity duration-200 ease-out" style={{ top: `${position.y}px`, left: `${position.x}px`, transform: 'translateY(-50%)' }}>
            <div className="group relative cursor-pointer rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-3 shadow-2xl backdrop-blur-sm" onClick={onConfirm}>
                <div className="relative flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-primary">{preview.keyword === '=' ? `= ${preview.result}` : `→ ${preview.result}`}</span>
                    <div className="h-4 w-px bg-border/50" />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><Check className="h-3 w-3" /><span>Enter</span></div>
                </div>
            </div>
        </div>
    );
};


// --- Main Component ---

export function CanvasAiMenu() {
    const editor = useEditor();
    const { toast } = useToast();
    const [userProfile, setUserProfile] = useState<User | null>(null);
    const [status, setStatus] = useState<'idle' | 'loading:diagram' | 'loading:solve' | 'loading:explain'>('idle');
    const isLoading = status !== 'idle';

    const [diagramPrompt, setDiagramPrompt] = useState("");
    const [diagramType, setDiagramType] = useState("Flowchart");
    const [solveContext, setSolveContext] = useState("");
    const [explainPrompt, setExplainPrompt] = useState("");
    
    const [isLiveMode, setIsLiveMode] = useState(false);
    const { preview, confirmPreview } = useLiveMath(editor, isLiveMode);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) setUserProfile(await getUser(currentUser.uid));
        });
        return () => unsubscribe();
    }, []);

    const handleAction = async <T,>(action: () => Promise<T>, statusKey: typeof status, successCallback: (result: T) => void, errorTitle: string) => {
        setStatus(statusKey);
        try {
            const result = await action();
            successCallback(result);
        } catch (error: any) {
            toast({ variant: "destructive", title: errorTitle, description: error.message || "An unknown error occurred." });
        } finally {
            setStatus('idle');
        }
    };
    
    const placeResultOnCanvas = (text: string) => {
        const selectionBounds = editor.getSelectionPageBounds();
        const position = selectionBounds 
            ? { x: selectionBounds.maxX + 40, y: selectionBounds.y }
            : { x: editor.getViewportPageBounds().midX, y: editor.getViewportPageBounds().midY };
        
        editor.createShape({ type: 'text', x: position.x, y: position.y, props: { text, size: 'm', font: 'draw', align: 'start' } });
    };

    const handleGenerateDiagram = () => handleAction(
        () => generateDiagram({ prompt: diagramPrompt, diagramType }),
        'loading:diagram',
        ({ shapes, arrows }) => {
            if (!shapes || shapes.length === 0) {
                toast({ variant: 'destructive', title: 'AI Error', description: 'The AI did not generate any valid shapes. Please try a different prompt.' });
                return;
            }
            const viewport = editor.getViewportPageBounds();
            const diagramBounds = getShapesBoundingBox(shapes as any);
            if (diagramBounds && viewport) {
                const offsetX = viewport.midX - (diagramBounds.x + diagramBounds.w / 2);
                const offsetY = viewport.midY - (diagramBounds.y + diagramBounds.h / 2);
                shapes.forEach(shape => { shape.x += offsetX; shape.y += offsetY; });
            }
            editor.createShapes(shapes as any);
            if (arrows && arrows.length > 0) editor.createArrows(arrows as any);
            toast({ title: 'Diagram Generated!', description: 'Your diagram has been added to the canvas.' });
        },
        'Diagram Generation Failed'
    );

    const handleSolveSelection = () => handleAction(
        async () => {
            const imageDataUri = await getSelectionAsImageDataUri(editor);
            if (!imageDataUri) throw new Error("Please select an object or text on the canvas to solve.");
            return solveVisualProblem({ imageDataUris: [imageDataUri], context: solveContext });
        },
        'loading:solve',
        (result) => placeResultOnCanvas(formatSolveResult(result)),
        'AI Solve Failed'
    );

    const handleExplainSelection = () => handleAction(
        async () => {
            const imageDataUri = await getSelectionAsImageDataUri(editor);
            if (!imageDataUri) throw new Error("Please select an object on the canvas to explain.");
            return explainVisualConcept({ imageDataUri, prompt: explainPrompt, learningStyle: userProfile?.learningStyle || 'unspecified' });
        },
        'loading:explain',
        (result) => placeResultOnCanvas(formatExplainResult(result)),
        'AI Explain Failed'
    );

    return (
        <>
            <div className="absolute top-16 left-3 z-20">
                <Card className="p-1.5 flex items-center gap-1 shadow-xl backdrop-blur-md bg-white/70 dark:bg-black/70">
                    <Button variant="ghost" size="sm" asChild><Link href="/dashboard"><ArrowLeft className="mr-2" />Dashboard</Link></Button>
                    <div className="h-6 w-px bg-border/50 mx-2"></div>
                    
                    <Dialog>
                        <DialogTrigger asChild><Button variant="ghost" size="sm" disabled={isLoading}><Sparkles className="mr-2" />Generate Diagram</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Generate Diagram with AI</DialogTitle><DialogDescription>Describe the diagram you want to create.</DialogDescription></DialogHeader>
                            <div className="grid gap-4 py-4"><Label htmlFor="diagram-prompt">Prompt</Label><Textarea id="diagram-prompt" value={diagramPrompt} onChange={(e) => setDiagramPrompt(e.target.value)} placeholder="e.g., A simple ER diagram..." rows={4}/></div>
                            <div className="grid gap-4 py-4"><Label htmlFor="diagram-type">Type</Label><Select value={diagramType} onValueChange={setDiagramType}><SelectTrigger id="diagram-type"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Flowchart">Flowchart</SelectItem><SelectItem value="ER Diagram">ER Diagram</SelectItem><SelectItem value="System Architecture">System Architecture</SelectItem></SelectContent></Select></div>
                            <DialogFooter><Button onClick={handleGenerateDiagram} disabled={isLoading}>{status === 'loading:diagram' && <Loader2 className="mr-2 animate-spin" />}Generate</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                    
                    <Dialog>
                        <DialogTrigger asChild><Button variant="ghost" size="sm" disabled={isLoading}><BrainCircuit className="mr-2" />Solve</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Solve Selection</DialogTitle><DialogDescription>Provide context to help the AI solve.</DialogDescription></DialogHeader>
                            <div className="grid gap-4 py-4"><Label htmlFor="solve-context">Context</Label><Textarea id="solve-context" value={solveContext} onChange={(e) => setSolveContext(e.target.value)} placeholder="e.g., 'Find the area'"/></div>
                            <DialogFooter><Button onClick={handleSolveSelection} disabled={isLoading}>{status === 'loading:solve' && <Loader2 className="mr-2 animate-spin" />}Solve</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                    
                    <Dialog>
                        <DialogTrigger asChild><Button variant="ghost" size="sm" disabled={isLoading}><Lightbulb className="mr-2" />Explain</Button></DialogTrigger>
                        <DialogContent>
                             <DialogHeader><DialogTitle>Explain Selection</DialogTitle><DialogDescription>Provide a prompt for the AI.</DialogDescription></DialogHeader>
                             <div className="grid gap-4 py-4"><Label htmlFor="explain-prompt">Prompt</Label><Textarea id="explain-prompt" value={explainPrompt} onChange={(e) => setExplainPrompt(e.target.value)} placeholder="e.g., 'Explain this for a 5th grader'"/></div>
                             <DialogFooter><Button onClick={handleExplainSelection} disabled={isLoading}>{status === 'loading:explain' && <Loader2 className="mr-2 animate-spin" />}Explain</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button variant="ghost" size="sm" disabled={true}><Type className="mr-2" />To Text (Soon)</Button>
                    <div className="h-6 w-px bg-border/50 mx-2"></div>
                    
                    <Button variant="ghost" size="sm" onClick={() => setIsLiveMode(!isLiveMode)} className={cn(isLiveMode && "bg-primary/10 text-primary")}>
                        {isLiveMode ? <Zap className="mr-2 animate-pulse" /> : <Calculator className="mr-2" />}Live Math
                    </Button>
                </Card>
            </div>
            
            {preview && <LiveMathPreview preview={preview} onConfirm={confirmPreview} editor={editor} />}
        </>
    );
}
