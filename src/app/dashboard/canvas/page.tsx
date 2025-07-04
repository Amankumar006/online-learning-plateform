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

// 2. Add the component to the editor's components.
const components = {
	InFrontOfTheCanvas: () => (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      zIndex: 999,
      display: 'flex',
      gap: '10px'
    }}>
      <SolveMathAction />
    </div>
  )
}

export default function CanvasPage() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw persistenceKey="tldraw-canvas-math" components={components} />
		</div>
	)
}
