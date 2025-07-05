'use client'

import dynamic from 'next/dynamic'
import { CanvasAiMenu } from '@/components/canvas/CanvasAiMenu'

// Dynamically import the tldraw component to prevent SSR issues
const Tldraw = dynamic(async () => (await import('@tldraw/tldraw')).Tldraw, {
  ssr: false,
})

export default function CanvasPage() {
	return (
		<div className="w-full h-full">
            {/* The tldraw component is the core of the canvas experience.
                We pass our custom AI menu as a child to overlay it on the canvas UI. */}
            <Tldraw persistenceKey="adapted-canvas-v1">
                <CanvasAiMenu />
            </Tldraw>
		</div>
	)
}
