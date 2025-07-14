

'use client'

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, Calculator, Zap } from 'lucide-react';
import { useEditor } from '@tldraw/tldraw';
import { useState } from 'react';
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LiveMathPreview } from "./LiveMathPreview";
import { useLiveMath } from "@/hooks/use-live-math";


// --- Main Component ---
export function CanvasAiMenu() {
    const editor = useEditor();
    const [isLiveMode, setIsLiveMode] = useState(false);
    const { preview, confirmPreview } = useLiveMath(editor, isLiveMode);
    
    return (
        <>
            <div className="absolute top-16 left-3 z-20">
                <Card className="p-1.5 flex items-center gap-1 shadow-xl backdrop-blur-md bg-white/70 dark:bg-black/70">
                    <Button variant="ghost" size="sm" asChild><Link href="/dashboard"><ArrowLeft className="mr-2" />Dashboard</Link></Button>
                    <div className="h-6 w-px bg-border/50 mx-2"></div>
                    <Button variant="ghost" size="sm" onClick={() => setIsLiveMode(!isLiveMode)} className={cn(isLiveMode && "bg-primary/10 text-primary")}>
                        {isLiveMode ? <Zap className="mr-2 animate-pulse" /> : <Calculator className="mr-2" />}Live Math
                    </Button>
                </Card>
            </div>
            
            {preview && <LiveMathPreview preview={preview} onConfirm={confirmPreview} editor={editor} />}
        </>
    );
}
