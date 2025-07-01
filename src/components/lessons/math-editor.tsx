
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
        <div className="prose prose-sm dark:prose-invert max-w-none">
            {parts.filter(Boolean).map((part, index) => {
                try {
                    if (part.startsWith('$$') && part.endsWith('$$')) {
                        return <BlockMath key={index} math={part.slice(2, -2)} />;
                    }
                    if (part.startsWith('$') && part.endsWith('$')) {
                        return <InlineMath key={index} math={part.slice(1, -1)} />;
                    }
                } catch (error) {
                    // If KaTeX fails to parse, just render the raw string
                    return <p key={index} className="text-destructive">{part}</p>;
                }
                // Render plain text segments inside a paragraph to maintain structure
                return <p key={index}>{part}</p>;
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
             <div className="flex flex-col gap-2">
                 <div className="p-2 border rounded-md flex flex-wrap gap-1 justify-center bg-muted/50">
                    {mathSymbols.map((symbol) => (
                        <Button
                            key={symbol.display}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="font-mono h-8 px-2"
                            onClick={() => insertSymbol(symbol.latex, symbol.offset)}
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
                    rows={10}
                    disabled={disabled}
                    className="font-mono text-sm min-h-[200px] flex-grow"
                />
            </div>
            <Card>
                 <CardHeader className="py-2 px-4 border-b">
                    <CardTitle className="text-base font-medium">Live Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <ScrollArea className="h-[244px]">
                       {value ? (
                           <FormattedMath text={value} />
                       ) : (
                           <div className="text-muted-foreground text-center flex items-center justify-center h-[244px]">
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
