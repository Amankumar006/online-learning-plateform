'use client'

import { Tldraw, useEditor, createShapeId } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback, useEffect, useState } from 'react'
import { canvasMathFlow } from '@/ai/flows/canvas-math-flow'
import { visualExplainerFlow } from '@/ai/flows/visual-explainer-flow'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Wand2 } from 'lucide-react'
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * A component that renders our custom UI
 */
function CustomUi() {
	const editor = useEditor()
    const [user, setUser] = useState<FirebaseUser | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);


	const handleSolve = useCallback(async () => {
		const selectedShapes = editor.getSelectedShapes()
		if (selectedShapes.length !== 1) {
			toast({ variant: 'destructive', title: 'Select one shape', description: 'Please select exactly one shape containing the math problem.'})
			return
		}
		const shape = selectedShapes[0]
		if (!('text' in shape.props) || !shape.props.text) {
			toast({ variant: 'destructive', title: 'No text found', description: 'Please select a shape that contains text.'})
			return
		}

        const bounds = editor.getShapePageBounds(shape);
        if (!bounds) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not determine shape dimensions.' });
            return;
        }

		const problem = shape.props.text;
		
		toast({ title: 'AI is solving...', description: 'Please wait while the AI generates the equation.'})

		try {
			const { latex } = await canvasMathFlow({ query: problem })

			editor.createShape({
				type: 'text',
				x: shape.x,
				y: bounds.y + bounds.h + 20,
				props: {
					text: `$${latex}$`,
					size: 'xl',
				},
			})

			toast({ title: 'Success!', description: 'The equation has been added to the canvas.'})

		} catch (e: any) {
			console.error(e)
			toast({ variant: 'destructive', title: 'AI Error', description: e.message || 'Could not solve the math problem.'})
		}
	}, [editor])

    const handleExplain = useCallback(async () => {
		const selectedShapes = editor.getSelectedShapes()
		if (selectedShapes.length !== 1) {
			toast({ variant: 'destructive', title: 'Select one shape', description: 'Please select exactly one shape containing the concept you want to explain.'})
			return
		}
		const shape = selectedShapes[0]
		if (!('text' in shape.props) || !shape.props.text) {
			toast({ variant: 'destructive', title: 'No text found', description: 'Please select a shape that contains text.'})
			return
		}

        if (!user) {
            toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to use this feature.'})
            return
        }

        const bounds = editor.getShapePageBounds(shape);
        if (!bounds) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not determine the position of the selected shape.' });
            return;
        }

		const concept = shape.props.text;
		
		toast({ title: 'AI is thinking...', description: 'Generating a visual explanation for you.'})

		try {
			const result = await visualExplainerFlow({ concept: concept })

            const offsetX = bounds.maxX + 100;
            const offsetY = bounds.y;

            if (result.nodes.length === 0) {
                toast({ title: 'No Diagram Generated', description: 'The AI could not create a diagram for this concept. Try rephrasing it.' });
                return;
            }

            const shapesToCreate: any[] = [];
            const aiIdToTldrawId = new Map<string, string>();

            result.nodes.forEach(node => {
                const newId = createShapeId();
                aiIdToTldrawId.set(node.id, newId);
                shapesToCreate.push({
                    id: newId,
                    type: 'text',
                    x: node.x + offsetX,
                    y: node.y + offsetY,
                    props: {
                        text: node.text,
                        size: 'm',
                    }
                });
            });

            result.edges.forEach(edge => {
                const fromId = aiIdToTldrawId.get(edge.fromId);
                const toId = aiIdToTldrawId.get(edge.toId);

                if (fromId && toId) {
                    shapesToCreate.push({
                        type: 'arrow',
                        props: {
                            start: { type: 'binding', boundShapeId: fromId, isExact: false, normalizedAnchor: { x: 0.5, y: 1 } },
                            end: { type: 'binding', boundShapeId: toId, isExact: false, normalizedAnchor: { x: 0.5, y: 0 } },
                            arrowheadStart: 'none',
                            arrowheadEnd: 'arrow',
                        }
                    });
                }
            });
            
            if (shapesToCreate.length > 0) {
			    editor.createShapes(shapesToCreate);
                const createdNodeIds = result.nodes.map(n => aiIdToTldrawId.get(n.id)).filter(Boolean) as string[];
                editor.zoomToFit(createdNodeIds, { duration: 500 });
            }

			toast({ title: 'Success!', description: 'Your visual explanation has been added to the canvas.'})

		} catch (e: any) {
			console.error(e)
			toast({ variant: 'destructive', title: 'AI Error', description: e.message || 'Could not generate explanation.'})
		}
	}, [editor, user]);

	return (
		<div
			style={{
				position: 'absolute',
				top: '60px',
				left: '10px',
				zIndex: 999,
				pointerEvents: 'all',
                display: 'flex',
                gap: '8px'
			}}
		>
			<Button onClick={handleSolve}>Solve Math</Button>
            <Button onClick={handleExplain} variant="outline" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" /> Visually Explain
            </Button>
		</div>
	)
}


export default function CanvasPage() {
	return (
		<div className="w-full h-full">
			<Tldraw
				persistenceKey="tldraw-canvas-visuals"
				components={{
					InFrontOfTheCanvas: CustomUi,
				}}
			/>
		</div>
	)
}
