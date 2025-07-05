
'use client'

import dynamic from 'next/dynamic'

// Dynamically import the tldraw component to prevent SSR issues
const Tldraw = dynamic(async () => (await import('@tldraw/tldraw')).Tldraw, {
  ssr: false,
})

export default function CanvasPage() {
	return (
		<div className="w-full h-full">
            {/* The tldraw component is the core of the canvas experience. */}
            <Tldraw persistenceKey="adapted-canvas-v1" />
		</div>
	)
}
