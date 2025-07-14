
'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import Link from "next/link";
import { useEditor, createShapeId } from '@tldraw/tldraw';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generateStickyNotes } from "@/ai/flows/generate-sticky-notes";


// --- Main Component ---
export function CanvasAiMenu() {
    const editor = useEditor();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [prompt, setPrompt] = useState('');

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            const { notes } = await generateStickyNotes({ topic: prompt });

            if (!notes || notes.length === 0) {
                toast({ variant: 'destructive', title: 'No ideas generated', description: 'The AI did not return any ideas. Please try a different topic.' });
                return;
            }

            // Get the center of the current viewport
            const viewport = editor.getViewportScreenBounds();
            const centerX = viewport.w / 2;
            const centerY = viewport.h / 2;

            const shapesToCreate = notes.map((note, index) => {
                const angle = (index / notes.length) * 2 * Math.PI;
                const radius = 250 + (notes.length > 5 ? (index * 15) : 0); // Spread them out
                const x = centerX + radius * Math.cos(angle) - 125; // center the note
                const y = centerY + radius * Math.sin(angle) - 60;

                return {
                    id: createShapeId(),
                    type: 'note',
                    x,
                    y,
                    props: {
                        text: note,
                        align: 'middle',
                        size: 'm',
                    },
                };
            });

            editor.createShapes(shapesToCreate);
            editor.zoomToFit();

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Generation Failed', description: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsGenerating(false);
            setIsDialogOpen(false);
            setPrompt('');
        }
    };


    return (
        <>
            <div className="absolute top-16 left-3 z-20">
                <Card className="p-1.5 flex items-center gap-1 shadow-xl backdrop-blur-md bg-white/70 dark:bg-black/70">
                    <Button variant="ghost" size="sm" asChild><Link href="/dashboard"><ArrowLeft className="mr-2" />Dashboard</Link></Button>
                    <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
                        <Sparkles className="mr-2" /> Brainstorm Ideas
                    </Button>
                </Card>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Brainstorm Ideas</DialogTitle>
                        <DialogDescription>
                            Enter a topic, and the AI will generate a cluster of related ideas on sticky notes.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="topic">Topic</Label>
                            <Input
                                id="topic"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., 'How to improve customer retention'"
                                disabled={isGenerating}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary" disabled={isGenerating}>Cancel</Button>
                        </DialogClose>
                        <Button type="button" onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
                            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Generate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
