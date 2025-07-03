
"use client";

import React, { useRef, useEffect, useId } from 'react';
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
    const linesRef = useRef<HTMLDivElement>(null);
    const editorId = `code-editor-${useId()}`; // Unique ID for each editor instance

    // Effect to synchronize scrolling
    useEffect(() => {
        const editorTextarea = document.getElementById(editorId) as HTMLTextAreaElement;
        const linesDiv = linesRef.current;

        if (!editorTextarea || !linesDiv) return;

        const syncScroll = () => {
            linesDiv.scrollTop = editorTextarea.scrollTop;
        };

        editorTextarea.addEventListener('scroll', syncScroll);

        // Also sync on value change as content height might change
        syncScroll();

        return () => {
            editorTextarea.removeEventListener('scroll', syncScroll);
        };
    }, [value, editorId]); // Rerun if value changes (for content height) or if ID changes

    const highlighter = (code: string) => {
        const lang = language?.toLowerCase() || 'clike';
        const grammar = languages[lang] || languages.clike;
        return highlight(code, grammar, lang);
    };
    
    const lines = value.split('\n');
    
    const editorStyle: React.CSSProperties = {
        fontFamily: '"Fira code", "Fira Mono", monospace',
        fontSize: 14,
        lineHeight: "21px", // explicit line height for alignment
    };

    return (
        <div className={cn(
            "relative w-full rounded-md border",
            "bg-[#272822] text-[#F8F8F2]", // Okaidia theme background/foreground
            "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            disabled && "cursor-not-allowed opacity-50"
        )}>
            <div className="flex w-full">
                <div 
                  ref={linesRef}
                  className="flex-shrink-0 text-right select-none p-4 pr-3 text-gray-500 overflow-y-hidden bg-[#272822] border-r border-gray-700"
                  style={editorStyle}
                  aria-hidden="true" 
                >
                  {lines.map((_, index) => (
                      <div key={index}>{index + 1}</div>
                  ))}
                </div>
                
                <Editor
                    value={value}
                    onValueChange={onValueChange}
                    highlight={highlighter}
                    padding={16}
                    disabled={disabled}
                    placeholder={placeholder}
                    textareaId={editorId}
                    className="flex-grow font-mono min-h-[200px]"
                    style={{
                        ...editorStyle,
                        backgroundColor: 'transparent',
                    }}
                />
            </div>
        </div>
    );
};

export default CodeEditor;
