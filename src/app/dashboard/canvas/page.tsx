
'use client'

import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import '@tldraw/tldraw/tldraw.css'
import { Loader2 } from 'lucide-react'

// A simple skeleton component to show while the heavy canvas is loading.
function CanvasLoading() {
    return (
        <div className="w-full h-full flex items-center justify-center bg-muted">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading Canvas...</p>
            </div>
        </div>
    )
}

// Dynamically import the tldraw component to prevent SSR issues and improve load performance.
const Tldraw = dynamic(async () => (await import('@tldraw/tldraw')).Tldraw, {
  ssr: false,
  loading: () => <CanvasLoading />,
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
