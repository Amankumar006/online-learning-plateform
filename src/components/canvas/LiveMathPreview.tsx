
'use client'

import { Button } from "@/components/ui/button";
import { Check } from 'lucide-react';
import { type Editor } from '@tldraw/tldraw';

interface LiveMathPreviewProps {
    preview: {
        box: { x: number; y: number };
        result: string;
    };
    onConfirm: () => void;
    editor: Editor;
}

export function LiveMathPreview({ preview, onConfirm, editor }: LiveMathPreviewProps) {
    const { x, y } = editor.pageToScreen(preview.box);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onConfirm();
    };

    return (
        <div 
            className="absolute z-50 p-2 bg-background border rounded-lg shadow-xl flex items-center gap-2" 
            style={{ 
                top: `${y}px`, 
                left: `${x}px`,
                transform: 'translateY(-50%)',
            }}
        >
            <span className="font-mono text-lg px-2">{preview.result}</span>
            <Button size="icon" className="h-7 w-7" onClick={handleClick}>
                <Check className="h-4 w-4" />
                <span className="sr-only">Confirm Math Result</span>
            </Button>
        </div>
    );
}
