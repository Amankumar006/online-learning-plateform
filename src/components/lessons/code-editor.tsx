
"use client";

import React from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
// Import languages
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-java';

// Using a dark theme for the editor
import 'prismjs/themes/prism-okaidia.css';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
    value: string;
    onValueChange: (code: string) => void;
    disabled?: boolean;
    placeholder?: string;
    language?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onValueChange, disabled, placeholder, language = 'clike' }) => {
    
    const highlighter = (code: string) => {
        const lang = language?.toLowerCase() || 'clike';
        const grammar = languages[lang] || languages.clike;
        return highlight(code, grammar, lang);
    };

    return (
        <div className={cn(
            "relative w-full rounded-md border text-sm font-mono",
            "bg-[#272822] text-[#F8F8F2]", // Okaidia theme background/foreground
            "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            disabled && "cursor-not-allowed opacity-50"
        )}>
            <Editor
                value={value}
                onValueChange={onValueChange}
                highlight={highlighter}
                padding={16}
                disabled={disabled}
                placeholder={placeholder}
                textareaClassName="!outline-none"
                className="min-h-[200px]"
                style={{
                    fontFamily: '"Fira code", "Fira Mono", monospace',
                    fontSize: 14,
                    backgroundColor: 'transparent',
                }}
            />
        </div>
    );
};

export default CodeEditor;
