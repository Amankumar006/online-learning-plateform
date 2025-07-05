
'use client'
import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { CanvasAiMenu } from '@/components/canvas/CanvasAiMenu'

export default function CanvasPage() {
	return (
		<div className="w-full h-full">
			<Tldraw
				persistenceKey="adapted-canvas-mode-2"
				components={{
					InFrontOfTheCanvas: CanvasAiMenu,
				}}
			/>
		</div>
	)
}
