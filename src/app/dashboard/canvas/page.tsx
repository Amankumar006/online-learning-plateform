
'use client'

import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import '@tldraw/tldraw/tldraw.css'

// Dynamically import the tldraw component to prevent SSR issues
const Tldraw = dynamic(async () => (await import('@tldraw/tldraw')).Tldraw, {
  ssr: false,
})

export default function CanvasPage() {
    const { resolvedTheme } = useTheme();

	return (
		<div className="w-full h-full">
            {/* The tldraw component is the core of the canvas experience. */}
            <Tldraw 
                persistenceKey="adapted-canvas-v1" 
                theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
            />
		</div>
	)
}
