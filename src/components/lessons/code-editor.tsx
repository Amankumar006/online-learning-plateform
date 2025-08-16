
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
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleEditorChange: OnChange = (value) => {
        onValueChange(value || '');
    };

    // Fetches the DOM library type definitions and adds them to the editor
    // to enable full IntelliSense for browser APIs.
    const handleBeforeMount = async (monaco: Monaco) => {
        try {
            const domLib = await fetch('https://cdn.jsdelivr.net/npm/typescript@5.3.3/lib/lib.dom.d.ts').then(res => res.text());
            monaco.languages.typescript.javascriptDefaults.addExtraLib(domLib, 'lib.dom.d.ts');
        } catch (error) {
            console.error("Failed to load Monaco's DOM library:", error);
        }

        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ESNext,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.CommonJS,
            noEmit: true,
            allowJs: true,
            checkJs: true,
        });

        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
        });
    };

    return (
        <div className={cn(
            "relative w-full rounded-md border h-[300px] md:h-[400px] lg:h-[450px]",
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
                    minimap: { enabled: !isMobile }, // Disable minimap on mobile
                    fontSize: isMobile ? 12 : 14, // Smaller font on mobile
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    padding: {
                        top: isMobile ? 12 : 16,
                        bottom: isMobile ? 12 : 16
                    },
                    automaticLayout: true,
                    matchBrackets: 'always',
                    autoClosingBrackets: 'languageDefined',
                    autoClosingQuotes: 'languageDefined',
                    autoSurround: 'languageDefined',
                    // Mobile-specific optimizations
                    quickSuggestions: !isMobile,
                    suggestOnTriggerCharacters: !isMobile,
                    acceptSuggestionOnEnter: isMobile ? 'off' : 'on',
                    // Better mobile experience
                    contextmenu: !isMobile,
                    folding: !isMobile,
                    lineNumbers: isMobile ? 'off' : 'on',
                    glyphMargin: !isMobile,
                    lineDecorationsWidth: isMobile ? 0 : 10,
                    lineNumbersMinChars: isMobile ? 0 : 3,
                }}
            />
            {placeholder && !value && !disabled && (
                <div className="absolute top-3 md:top-4 left-[52px] text-muted-foreground pointer-events-none text-sm md:text-base">
                    {placeholder}
                </div>
            )}
        </div>
    );
};

export default CodeEditor;
