'use client'

import { Tldraw, useEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback } from 'react'
import { canvasMathFlow } from '@/ai/flows/canvas-math-flow'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'

function SolveMathAction() {
	const editor = useEditor()

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
				y: shape.y + bounds.h + 20,
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

	return (
		<Button onClick={handleSolve}>Solve Math</Button>
	)
}

// Add the custom component to the editor's `TopZone`.
const components = {
	TopZone: () => (
        <div className="p-2">
            <SolveMathAction />
        </div>
    )
}

export default function CanvasPage() {
	return (
		<div className="w-full h-full">
			<Tldraw persistenceKey="tldraw-canvas-math" components={components} />
		</div>
	)
}
