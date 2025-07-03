
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

const symbolGroups = [
    {
        name: "Operators",
        symbols: [
            { display: '+', latex: '+' },
            { display: '-', latex: '-' },
            { display: '×', latex: '\\times ' },
            { display: '÷', latex: '\\div ' },
            { display: '±', latex: '\\pm ' },
        ]
    },
    {
        name: "Relations",
        symbols: [
             { display: '=', latex: '=' },
            { display: '≠', latex: '\\neq ' },
            { display: '≈', latex: '\\approx ' },
            { display: '≤', latex: '\\le ' },
            { display: '≥', latex: '\\ge ' },
        ]
    },
     {
        name: "Greek",
        symbols: [
            { display: 'α', latex: '\\alpha ' },
            { display: 'β', latex: '\\beta ' },
            { display: 'π', latex: '\\pi ' },
            { display: 'θ', latex: '\\theta ' },
            { display: 'Δ', latex: '\\Delta ' },
        ]
    },
    {
        name: "Calculus",
        symbols: [
            { display: '∫', latex: '\\int ' },
            { display: '∑', latex: '\\sum ' },
            { display: '∂', latex: '\\partial ' },
            { display: '∞', latex: '\\infty ' },
        ]
    },
    {
        name: "Functions",
        symbols: [
            { display: 'sin', latex: '\\sin()', offset: -1 },
            { display: 'cos', latex: '\\cos()', offset: -1 },
            { display: 'tan', latex: '\\tan()', offset: -1 },
            { display: 'log', latex: '\\log()', offset: -1 },
            { display: 'ln', latex: '\\ln()', offset: -1 },
        ]
    },
    {
        name: "Structures",
        symbols: [
            { display: '√x', latex: '\\sqrt{}', offset: -1 },
            { display: 'x²', latex: '^{}', offset: -1 },
            { display: 'xₙ', latex: '_{}', offset: -1 },
            { display: 'a/b', latex: '\\frac{}{}', offset: -3 },
            { display: '()', latex: '()', offset: -1 },
        ]
    }
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
            <Card className="flex flex-col">
                 <CardHeader className="p-3 border-b">
                    <CardTitle className="text-base font-medium">Equation Editor</CardTitle>
                </CardHeader>
                <CardContent className="p-2 flex flex-col flex-grow">
                    <div className="border-b pb-2 mb-2">
                        {symbolGroups.map(group => (
                            <div key={group.name} className="mb-1 last:mb-0">
                                <span className="text-xs font-semibold text-muted-foreground mr-2">{group.name}:</span>
                                {group.symbols.map((symbol) => (
                                    <Button
                                        key={symbol.display}
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="font-mono h-7 px-2 text-base"
                                        onClick={() => insertSymbol(symbol.latex, symbol.offset || 0)}
                                        disabled={disabled}
                                    >
                                        {symbol.display}
                                    </Button>
                                ))}
                            </div>
                        ))}
                    </div>
                    <Textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onValueChange(e.target.value)}
                        placeholder={placeholder}
                        disabled={disabled}
                        className="font-mono text-sm min-h-[200px] flex-grow resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-2 bg-transparent"
                    />
                </CardContent>
            </Card>
            <Card className="h-full">
                 <CardHeader className="py-3 px-4 border-b">
                    <CardTitle className="text-base font-medium">Live Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <ScrollArea className="h-[320px]">
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
