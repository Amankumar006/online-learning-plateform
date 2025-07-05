"use client";

import React from 'react';
import Editor, { OnChange, type Monaco } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
    value: string;
    onValueChange: (code: string) => void;
    disabled?: boolean;
    placeholder?: string;
    language?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onValueChange, disabled, placeholder, language = 'javascript' }) => {
    const { resolvedTheme } = useTheme();

    const handleEditorChange: OnChange = (value) => {
        onValueChange(value || '');
    };
    
    const handleBeforeMount = (monaco: Monaco) => {
        // Configure TypeScript/JavaScript language services to enhance IntelliSense
        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.CommonJS,
            noEmit: true,
            // Add type definitions for common browser APIs and modern JS features
            lib: ['es2020', 'dom'], 
        });

        // Ensure diagnostic checks are enabled for errors and suggestions
         monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
        });
    };

    return (
        <div className={cn(
            "relative w-full rounded-md border h-[400px]",
            "bg-white dark:bg-[#1e1e1e]",
            "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            disabled && "cursor-not-allowed opacity-50"
        )}>
            <Editor
                height="100%"
                language={language}
                value={value}
                theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                onChange={handleEditorChange}
                beforeMount={handleBeforeMount}
                loading={<Loader2 className="animate-spin" />}
                options={{
                    readOnly: disabled,
                    minimap: { enabled: true }, // Enable minimap for a professional feel
                    fontSize: 14,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    padding: {
                        top: 16,
                        bottom: 16
                    },
                    automaticLayout: true, // Ensures editor resizes correctly
                }}
            />
             {placeholder && !value && !disabled && (
                <div className="absolute top-4 left-[52px] text-muted-foreground pointer-events-none">
                    {placeholder}
                </div>
            )}
        </div>
    );
};

export default CodeEditor;
