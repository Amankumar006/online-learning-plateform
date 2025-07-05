
'use client'

import React, { useState, useEffect } from 'react'
import { useEditor, useValue, createShapeId, getSvgAsImage } from '@tldraw/tldraw'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Wand2, Sparkles, FileText, Bot, HelpCircle, PencilRuler, BrainCircuit } from 'lucide-react'
import { textManipulationFlow, TextManipulationActionSchema } from '@/ai/flows/text-manipulation-flow'
import { generateCustomExercise } from '@/ai/flows/generate-custom-exercise'
import { visualExplainerFlow } from '@/ai/flows/visual-explainer-flow'
import { canvasMathFlow } from '@/ai/flows/canvas-math-flow'

export function CanvasAiMenu() {
    const editor = useEditor()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)
    const [selectedShapeText, setSelectedShapeText] = useState<string>('')
    const [selectedShapeId, setSelectedShapeId] = useState<any>(null)

    const selectedShapes = useValue('selected shapes', () => editor.getSelectedShapes(), [editor])

    useEffect(() => {
        if (selectedShapes.length === 1) {
            const shape = selectedShapes[0]
            if ('text' in shape.props && shape.props.text) {
                const bounds = editor.getShapePageBounds(shape)
                if (bounds) {
                    setMenuPosition({ x: bounds.maxX + 10, y: bounds.y })
                    setSelectedShapeText(shape.props.text)
                    setSelectedShapeId(shape.id)
                }
            } else {
                 setMenuPosition(null)
            }
        } else {
            setMenuPosition(null)
        }
    }, [selectedShapes, editor])
    
    const handleAiAction = async (action: 'improve' | 'summarize' | 'explain' | 'fix_grammar') => {
        setIsLoading(action);
        try {
            const { result } = await textManipulationFlow({ text: selectedShapeText, action });
            const bounds = editor.getShapePageBounds(selectedShapeId);
            if (bounds) {
                editor.createShape({
                    type: 'text',
                    x: bounds.x,
                    y: bounds.y + bounds.h + 20,
                    props: { text: result, size: 'm', font: 'sans' },
                });
            }
        } catch(e: any) {
            toast({ variant: 'destructive', title: `AI Error`, description: e.message });
        } finally {
            setIsLoading(null);
        }
    };

    const handleCreateQuiz = async () => {
        setIsLoading('quiz');
        try {
            const result = await generateCustomExercise({ prompt: `Create a quiz question based on this text: ${selectedShapeText}` });
            const question = result.type === 'fill_in_the_blanks' ? result.questionParts.join(' ___ ') : (result as any).question
            const bounds = editor.getShapePageBounds(selectedShapeId);
             if (bounds) {
                editor.createShape({
                    type: 'text',
                    x: bounds.x,
                    y: bounds.y + bounds.h + 20,
                    props: { text: `Quiz: ${question}`, size: 'm', font: 'sans' },
                });
            }
        } catch(e: any) {
             toast({ variant: 'destructive', title: `AI Error`, description: e.message });
        } finally {
            setIsLoading(null);
        }
    }

    const handleCreateDiagram = async () => {
        setIsLoading('diagram');
        try {
            const result = await visualExplainerFlow({ concept: selectedShapeText });
            const bounds = editor.getShapePageBounds(selectedShapeId);
            if (bounds) {
                const offsetX = bounds.x;
                const offsetY = bounds.y + bounds.h + 60;
                
                const shapesToCreate: any[] = [];
                const aiIdToTldrawId = new Map<string, string>();

                result.nodes.forEach(node => {
                    const newId = createShapeId();
                    aiIdToTldrawId.set(node.id, newId);
                    shapesToCreate.push({ id: newId, type: 'text', x: node.x + offsetX, y: node.y + offsetY, props: { text: node.text, size: 'm' }});
                });

                result.edges.forEach(edge => {
                    shapesToCreate.push({
                        type: 'arrow',
                        props: {
                            start: { type: 'binding', boundShapeId: aiIdToTldrawId.get(edge.fromId)!, isExact: false, normalizedAnchor: { x: 0.5, y: 1 } },
                            end: { type: 'binding', boundShapeId: aiIdToTldrawId.get(edge.toId)!, isExact: false, normalizedAnchor: { x: 0.5, y: 0 } },
                            arrowheadEnd: 'arrow',
                        }
                    });
                });
                
                if (shapesToCreate.length > 0) {
                    editor.createShapes(shapesToCreate);
                }
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'AI Error', description: e.message });
        } finally {
            setIsLoading(null);
        }
    }

    const handleSolveMath = async () => {
        setIsLoading('math');
        try {
			const { latex } = await canvasMathFlow({ query: selectedShapeText })
            const bounds = editor.getShapePageBounds(selectedShapeId);
			if (bounds) {
                editor.createShape({
                    type: 'text',
                    x: bounds.x,
                    y: bounds.y + bounds.h + 20,
                    props: { text: `$${latex}$`, size: 'xl' },
                });
            }
		} catch (e: any) {
			toast({ variant: 'destructive', title: 'AI Error', description: e.message })
		} finally {
            setIsLoading(null);
        }
    }

    const menuActions = [
        { id: 'improve', label: 'Improve Writing', icon: Wand2, action: () => handleAiAction('improve') },
        { id: 'summarize', label: 'Summarize', icon: FileText, action: () => handleAiAction('summarize') },
        { id: 'explain', label: 'Explain This', icon: HelpCircle, action: () => handleAiAction('explain') },
        { id: 'quiz', label: 'Create a Quiz', icon: BrainCircuit, action: handleCreateQuiz },
        { id: 'diagram', label: 'Create a Diagram', icon: PencilRuler, action: handleCreateDiagram },
        { id: 'math', label: 'Solve Math', icon: Bot, action: handleSolveMath },
    ]

    if (!menuPosition || selectedShapes.length !== 1) return null

    return (
        <div style={{ position: 'absolute', top: menuPosition.y, left: menuPosition.x, zIndex: 1000 }}>
           <Card className="p-2 shadow-xl animate-in fade-in zoom-in-95">
                <div className="flex flex-col gap-1">
                    {menuActions.map(item => (
                        <Button
                            key={item.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={item.action}
                            disabled={!!isLoading}
                        >
                            {isLoading === item.id ? <Loader2 className="animate-spin" /> : <item.icon/>}
                            {item.label}
                        </Button>
                    ))}
                </div>
           </Card>
        </div>
    )
}
