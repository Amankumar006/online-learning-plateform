
'use client'

import { Tldraw, useEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback } from 'react'
import { canvasMathFlow } from '@/ai/flows/canvas-math-flow'
import { gradeMathSolution, GradeMathSolutionOutput } from '@/ai/flows/grade-math-solution'
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
		<Button onClick={handleSolve}>Solve Math</Button>
	)
}

function GradeMathAction() {
	const editor = useEditor()

	const handleGrade = useCallback(async () => {
		const selectedShapes = editor.getSelectedShapes()
		if (selectedShapes.length !== 2) {
			toast({ variant: 'destructive', title: 'Select two shapes', description: 'Please select the question shape and your solution shape.'})
			return
		}

		const questionShape = selectedShapes.find(s => 'text' in s.props && s.props.text.toLowerCase().includes('question:')) || selectedShapes[0];
    const solutionShape = selectedShapes.find(s => s.id !== questionShape.id);


		if (!('text' in questionShape.props) || !questionShape.props.text || !solutionShape || !('text' in solutionShape.props) || !solutionShape.props.text) {
			toast({ variant: 'destructive', title: 'Text not found', description: 'Please ensure both selected shapes contain text.'})
			return
		}

		const question = questionShape.props.text.replace(/question:/i, '').trim();
		const solution = solutionShape.props.text;

		toast({ title: 'AI is grading...', description: 'Please wait while your solution is evaluated.'})

		try {
			const result = await gradeMathSolution({ question, studentSolutionLatex: solution })

			// Format the feedback into a single string
      const feedbackText = formatFeedback(result)

			editor.createShape({
				type: 'text',
				x: solutionShape.x,
				y: solutionShape.y + solutionShape.props.h + 20,
				props: {
					text: feedbackText,
					size: 'm',
					align: 'start',
          w: 400
				},
			})

			toast({ title: 'Success!', description: 'Your work has been graded.'})

		} catch (e: any) {
			console.error(e)
			toast({ variant: 'destructive', title: 'AI Error', description: e.message || 'Could not grade the solution.'})
		}
	}, [editor])

	return (
		<Button onClick={handleGrade}>Grade My Work</Button>
	)
}

function formatFeedback(result: GradeMathSolutionOutput): string {
    let output = `## AI Feedback (Score: ${result.overallScore}/100)\n\n`;
    output += `**Overall:** ${result.overallFeedback}\n\n`;
    output += '---\n\n';
    output += '### Step-by-Step Analysis\n\n';

    result.stepEvaluations.forEach((step, index) => {
        output += `**Step ${index + 1}: \`${step.step}\`**\n`;
        output += `- ${step.isCorrect ? '✅' : '❌'} ${step.feedback}\n\n`;
    });

    return output;
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
      <GradeMathAction />
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
