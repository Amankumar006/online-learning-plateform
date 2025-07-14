

'use client'

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Type, ArrowLeft, Loader2, Calculator, Check, Zap } from 'lucide-react';
import { useEditor, type Box, type TLShapeId, type Editor } from '@tldraw/tldraw';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { generateDiagram, GenerateDiagramInput } from "@/ai/flows/generate-diagram";
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


// --- Helper Functions ---
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


// --- Custom Hooks ---
const useCanvasAI = (editor: Editor) => {
    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const { toast } = useToast();

    const diagram = useMemo(() => ({
        generate: async (input: GenerateDiagramInput) => {
            setStatus('loading');
            try {
                const { shapes, arrows } = await generateDiagram(input);
                if (!shapes || shapes.length === 0) {
                    toast({ variant: 'destructive', title: 'Diagram Generation Failed', description: 'The AI did not generate any valid shapes. Please try a more specific prompt.' });
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
                if (arrows && arrows.length > 0) editor.createArrows(arrows as any, {});
                toast({ title: 'Diagram Generated!', description: 'Your diagram has been added to the canvas.' });
            } catch (error: any) {
                console.error('Diagram Generation Failed:', error);
                toast({ variant: "destructive", title: 'Diagram Generation Failed', description: error.message || "An unknown error occurred." });
            } finally {
                setStatus('idle');
            }
        }
    }), [editor, toast]);

    return { status, diagram };
};


const useLiveMath = (editor: Editor, isEnabled: boolean) => {
    const [preview, setPreview] = useState<{ shapeId: TLShapeId; result: string; keyword: string; bounds: Box } | null>(null);
    const mathEngine = useMemo(() => ({
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
    }), []);

    const confirmPreview = useCallback(() => {
        if (!preview) return;
        const shape = editor.getShape(preview.shapeId);
        if (shape?.type === 'text') {
            const originalText = shape.props.text.trim();
            const keywordPattern = LIVE_MATH_KEYWORDS.find(k => k.keyword === preview.keyword)?.pattern;
            if (!keywordPattern) return;

            const expression = originalText.replace(keywordPattern, '').trim();
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
            setPreview(null);
        };
    }, [editor, isEnabled, mathEngine]);

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

const LIVE_MATH_KEYWORDS = [
  { keyword: '=', pattern: /=\s*$/ },
  { keyword: 'simplify', pattern: / (simplify|expand|factor)\s*$/i },
  { keyword: 'derive', pattern: / (derive|differentiate|d\/dx)\s*$/i },
  { keyword: 'solve', pattern: / (solve|find\s+\w+)\s*$/i },
  { keyword: 'evaluate', pattern: / (evaluate|calc|calculate)\s*$/i },
];

// --- Main Component ---
export function CanvasAiMenu() {
    const editor = useEditor();
    const { status, diagram } = useCanvasAI(editor);
    const [isLiveMode, setIsLiveMode] = useState(false);
    const { preview, confirmPreview } = useLiveMath(editor, isLiveMode);
    
    return (
        <>
            <div className="absolute top-16 left-3 z-20">
                <Card className="p-1.5 flex items-center gap-1 shadow-xl backdrop-blur-md bg-white/70 dark:bg-black/70">
                    <Button variant="ghost" size="sm" asChild><Link href="/dashboard"><ArrowLeft className="mr-2" />Dashboard</Link></Button>
                    <div className="h-6 w-px bg-border/50 mx-2"></div>
                    <DiagramDialog onGenerate={diagram.generate} isLoading={status === 'loading'} />
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

// --- Sub-Components for UI ---

function DiagramDialog({ onGenerate, isLoading }: { onGenerate: (input: GenerateDiagramInput) => void, isLoading: boolean }) {
    const [prompt, setPrompt] = useState("");
    const [type, setType] = useState("Flowchart");
    const [isOpen, setIsOpen] = useState(false);

    const handleSubmit = () => {
        onGenerate({ prompt, diagramType: type });
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button variant="ghost" size="sm" disabled={isLoading}><Sparkles className="mr-2" />Generate Diagram</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Generate Diagram with AI</DialogTitle><DialogDescription>Describe the diagram you want to create.</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4"><Label htmlFor="diagram-prompt">Prompt</Label><Textarea id="diagram-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., A simple ER diagram..." rows={4}/></div>
                <div className="grid gap-4 py-4"><Label htmlFor="diagram-type">Type</Label><Select value={type} onValueChange={setType}><SelectTrigger id="diagram-type"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Flowchart">Flowchart</SelectItem><SelectItem value="ER Diagram">ER Diagram</SelectItem><SelectItem value="System Architecture">System Architecture</SelectItem></SelectContent></Select></div>
                <DialogFooter><Button onClick={handleSubmit} disabled={isLoading || !prompt.trim()}>{isLoading && <Loader2 className="mr-2 animate-spin" />}Generate</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


const LiveMathPreview = ({ preview, onConfirm, editor }: { preview: NonNullable<ReturnType<typeof useLiveMath>['preview']>, onConfirm: () => void, editor: Editor }) => {
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
