
"use client";

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { BlockMath, InlineMath } from 'react-katex';

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


const MathEditor: React.FC<MathEditorProps> = ({ value, onValueChange, disabled, placeholder }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Textarea
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                placeholder={placeholder}
                rows={10}
                disabled={disabled}
                className="font-mono text-sm min-h-[240px]"
            />
            <Card>
                <CardContent className="p-4">
                    <ScrollArea className="h-[220px]">
                       {value ? (
                           <FormattedMath text={value} />
                       ) : (
                           <div className="text-muted-foreground text-center pt-20">
                               Live preview of your equations will appear here.
                           </div>
                       )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};

export default MathEditor;
