
'use client'

import { Tldraw, useEditor, Editor, getSvgAsImage } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback } from 'react'
import { canvasMathFlow } from '@/ai/flows/canvas-math-flow'
import { toast } from '@/hooks/use-toast'

// 1. Create a component that will be rendered in the UI.
function SolveMathAction() {
	const editor = useEditor()

	const handleSolve = useCallback(async () => {
		const selectedShapes = editor.getSelectedShapes()
		if (selectedShapes.length !== 1) {
			toast({ variant: 'destructive', title: 'Select one shape', description: 'Please select exactly one shape containing the math problem.'})
			return
		}
		const shape = selectedShapes[0]
		if (
			!('text' in shape.props) ||
			!shape.props.text
		) {
			toast({ variant: 'destructive', title: 'No text found', description: 'Please select a shape that contains text.'})
			return
		}

		const problem = shape.props.text;
		
		toast({ title: 'AI is solving...', description: 'Please wait while the AI generates the equation.'})

		try {
			const { latex } = await canvasMathFlow({ query: problem })

			editor.createShape({
				type: 'text',
				x: shape.x,
				y: shape.y + shape.props.h + 20,
				props: {
					text: `$${latex}$`,
					size: 'xl',
					align: 'middle',
				},
			})

			toast({ title: 'Success!', description: 'The equation has been added to the canvas.'})

		} catch (e: any) {
			console.error(e)
			toast({ variant: 'destructive', title: 'AI Error', description: e.message || 'Could not solve the math problem.'})
		}


	}, [editor])

	return (
		<button
			className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
			onClick={handleSolve}
			style={{
				cursor: 'pointer',
				zIndex: 999,
				position: 'absolute',
				top: '10px',
				right: '10px',
			}}
		>
			Solve Math
		</button>
	)
}

// 2. Add the component to the editor's components.
const components = {
	InFrontOfTheCanvas: SolveMathAction,
}

export default function CanvasPage() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw persistenceKey="tldraw-canvas-math" components={components} />
		</div>
	)
}
