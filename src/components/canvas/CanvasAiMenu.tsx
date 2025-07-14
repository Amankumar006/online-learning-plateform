

'use client'

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowLeft, Loader2, Calculator, Zap } from 'lucide-react';
import { useEditor, type Box, type TLShape, type TLShapeId, type Editor } from '@tldraw/tldraw';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { generateDiagram, GenerateDiagramInput, GenerateDiagramOutput } from "@/ai/flows/generate-diagram";
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
import { LiveMathPreview } from "./LiveMathPreview";
import { useLiveMath } from "@/hooks/use-live-math";

// --- Type Guards ---
function isShape(item: any): item is Extract<GenerateDiagramOutput['shapes'][number], { props: any }> {
  return item && typeof item === 'object' && item.type !== 'arrow' && 'props' in item;
}
function isArrow(item: any): item is Extract<GenerateDiagramOutput['arrows'][number], { type: 'arrow' }> {
  return item && typeof item === 'object' && item.type === 'arrow';
}

// --- Helper Functions ---
function getShapesBoundingBox(items: (TLShape)[], allShapes: TLShape[]): Box | null {
    if (!items || items.length === 0) return null;

    const shapesMap = new Map(allShapes.map(s => [s.id, s]));
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    items.forEach(item => {
        if (isShape(item)) {
            minX = Math.min(minX, item.x);
            minY = Math.min(minY, item.y);
            maxX = Math.max(maxX, item.x + (item.props.w || 0));
            maxY = Math.max(maxY, item.y + (item.props.h || 0));
        } else if (isArrow(item)) {
            const startShape = shapesMap.get(item.start.id);
            const endShape = shapesMap.get(item.end.id);
            if (startShape && isShape(startShape)) {
                minX = Math.min(minX, startShape.x);
                minY = Math.min(minY, startShape.y);
                maxX = Math.max(maxX, startShape.x + (startShape.props.w || 0));
                maxY = Math.max(maxY, startShape.y + (startShape.props.h || 0));
            }
             if (endShape && isShape(endShape)) {
                minX = Math.min(minX, endShape.x);
                minY = Math.min(minY, endShape.y);
                maxX = Math.max(maxX, endShape.x + (endShape.props.w || 0));
                maxY = Math.max(maxY, endShape.y + (endShape.props.h || 0));
            }
        }
    });

    if (!isFinite(minX)) return null;

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
                const allGeneratedItems = [...shapes, ...arrows];
                const diagramBounds = getShapesBoundingBox(allGeneratedItems, allGeneratedItems);
                
                if (diagramBounds && viewport) {
                    const offsetX = viewport.midX - (diagramBounds.x + diagramBounds.w / 2);
                    const offsetY = viewport.midY - (diagramBounds.y + diagramBounds.h / 2);
                    allGeneratedItems.forEach(item => {
                        if('x' in item) item.x += offsetX;
                        if('y' in item) item.y += offsetY;
                    });
                }

                // Create both shapes and arrows using createShapes
                editor.createShapes(allGeneratedItems as any);

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
                <div className="grid gap-4 py-4"><Label htmlFor="diagram-prompt">Prompt</Label><Textarea id="diagram-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., A simple ER diagram for customers, products, and orders..." rows={4}/></div>
                <div className="grid gap-4 py-4"><Label htmlFor="diagram-type">Type</Label><Select value={type} onValueChange={setType}><SelectTrigger id="diagram-type"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Flowchart">Flowchart</SelectItem><SelectItem value="ER Diagram">ER Diagram</SelectItem><SelectItem value="System Architecture">System Architecture</SelectItem></SelectContent></Select></div>
                <DialogFooter><Button onClick={handleSubmit} disabled={isLoading || !prompt.trim()}>{isLoading && <Loader2 className="mr-2 animate-spin" />}Generate</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

