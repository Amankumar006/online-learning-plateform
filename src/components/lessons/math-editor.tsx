
"use client";

import React, { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BlockMath, InlineMath } from 'react-katex';
import { Button } from '@/components/ui/button';

interface MathEditorProps {
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

const FormattedMath = ({ text }: { text: string }) => {
    // This regex splits the text by block and inline LaTeX, preserving them
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$.*?\$)/g);
    
    return (
        <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
            {parts.map((part, index) => {
                if (!part) return null;
                try {
                    if (part.startsWith('$$') && part.endsWith('$$')) {
                        // For block math, render it directly. KaTeX handles block display.
                        return <div key={index} className="my-2"><BlockMath math={part.slice(2, -2)} /></div>;
                    }
                    if (part.startsWith('$') && part.endsWith('$')) {
                        // For inline math, render it directly.
                        return <InlineMath key={index} math={part.slice(1, -1)} />;
                    }
                } catch (error) {
                    // If KaTeX fails to parse, render the raw string with an error style
                    return <span key={index} className="text-destructive font-mono bg-destructive/10 p-1 rounded-sm mx-1">{part}</span>;
                }

                // Render plain text segments, preserving line breaks by splitting and rejoining with <br />
                return part.split('\n').map((line, lineIndex, arr) => (
                    <React.Fragment key={`${index}-${lineIndex}`}>
                        {line}
                        {lineIndex < arr.length - 1 && <br />}
                    </React.Fragment>
                ));
            })}
        </div>
    );
};


const mathSymbols = [
    { display: 'π', latex: '\\pi ' },
    { display: 'θ', latex: '\\theta ' },
    { display: '∞', latex: '\\infty ' },
    { display: '≤', latex: '\\le ' },
    { display: '≥', latex: '\\ge ' },
    { display: '≠', latex: '\\neq ' },
    { display: '∫', latex: '\\int ' },
    { display: '∑', latex: '\\sum ' },
    { display: '√x', latex: '\\sqrt{}', offset: -1 },
    { display: 'x²', latex: '^{}', offset: -1 },
    { display: 'xₙ', latex: '_{}', offset: -1 },
    { display: 'a/b', latex: '\\frac{}{}', offset: -3 },
];

const MathEditor: React.FC<MathEditorProps> = ({ value, onValueChange, disabled, placeholder }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const insertSymbol = (latex: string, offset = 0) => {
        if (!textareaRef.current) return;

        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = textareaRef.current.value;

        const newValue = text.substring(0, start) + latex + text.substring(end);
        onValueChange(newValue);

        // Setting timeout to allow React to re-render before we manipulate the DOM
        setTimeout(() => {
            if (textareaRef.current) {
                const newCursorPos = start + latex.length + offset;
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 rounded-lg border bg-background p-3 focus-within:ring-2 focus-within:ring-ring">
                 <div className="flex flex-wrap gap-1 justify-center border-b pb-2">
                    {mathSymbols.map((symbol) => (
                        <Button
                            key={symbol.display}
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="font-mono h-8 px-2 text-base"
                            onClick={() => insertSymbol(symbol.latex, symbol.offset || 0)}
                            disabled={disabled}
                        >
                            {symbol.display}
                        </Button>
                    ))}
                </div>
                <Textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onValueChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="font-mono text-sm min-h-[250px] flex-grow resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-2"
                />
            </div>
            <Card className="h-full">
                 <CardHeader className="py-2 px-4 border-b">
                    <CardTitle className="text-base font-medium">Live Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <ScrollArea className="h-[280px]">
                       {value ? (
                           <FormattedMath text={value} />
                       ) : (
                           <div className="text-muted-foreground text-center flex items-center justify-center h-full">
                               <p>Your rendered equations will appear here.</p>
                           </div>
                       )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};

export default MathEditor;
