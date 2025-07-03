
"use client";

import React, { useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BlockMath, InlineMath } from 'react-katex';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff } from 'lucide-react';
import { convertSpeechToLatex } from '@/ai/flows/convert-speech-to-latex';


interface FormattedMathProps {
    text: string;
    fullTextValue: string;
    onTextChange: (newText: string) => void;
}

const FormattedMath: React.FC<FormattedMathProps> = ({ text, fullTextValue, onTextChange }) => {
    // This regex splits the text by block and inline LaTeX, preserving them
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$.*?\$)/g);
    
    return (
        <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
            {parts.map((part, index) => {
                if (!part) return null;
                try {
                    if (part.startsWith('$$') && part.endsWith('$$')) {
                        return <div key={index} className="my-2"><BlockMath math={part.slice(2, -2)} /></div>;
                    }
                    if (part.startsWith('$') && part.endsWith('$')) {
                        return <InlineMath key={index} math={part.slice(1, -1)} />;
                    }
                } catch (error: any) {
                    const handleFixMissingBrace = (badPart: string) => {
                        const fixedPart = badPart + '}';
                        // Use a function with replace to only replace the first instance
                        // This is a safeguard in case the same malformed string appears multiple times.
                        let replaced = false;
                        const newFullText = fullTextValue.replace(badPart, (match) => {
                            if (!replaced) {
                                replaced = true;
                                return fixedPart;
                            }
                            return match;
                        });
                        onTextChange(newFullText);
                    };

                    const isMissingBraceError = typeof error.message === 'string' && error.message.includes("Expected '}'");

                    return (
                        <TooltipProvider key={index}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-destructive font-mono bg-destructive/10 p-1 rounded-sm mx-1 cursor-help">{part}</span>
                                </TooltipTrigger>
                                <TooltipContent className="flex flex-col gap-2 p-2">
                                    <p className="text-xs max-w-xs">{error.message}</p>
                                    {isMissingBraceError && (
                                        <Button size="sm" variant="secondary" className="h-auto py-1" onClick={() => handleFixMissingBrace(part)}>
                                            Add missing '}' and fix
                                        </Button>
                                    )}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                }

                // Render plain text segments by splitting them into lines and rejoining with <br /> to preserve line breaks
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

const LATEX_COMMAND_MAP = new Map<string, { snippet: string, offset: number }>([
  ['sqrt', { snippet: '\\sqrt{}', offset: -1 }],
  ['frac', { snippet: '\\frac{}{}', offset: -3 }],
  ['sum', { snippet: '\\sum_{i=1}^{n}', offset: 0 }],
  ['int', { snippet: '\\int_{a}^{b}', offset: 0 }],
  ['alpha', { snippet: '\\alpha ', offset: 0 }],
  ['beta', { snippet: '\\beta ', offset: 0 }],
  ['gamma', { snippet: '\\gamma ', offset: 0 }],
  ['delta', { snippet: '\\Delta ', offset: 0 }],
  ['pi', { snippet: '\\pi ', offset: 0 }],
  ['theta', { snippet: '\\theta ', offset: 0 }],
  ['sin', { snippet: '\\sin()', offset: -1 }],
  ['cos', { snippet: '\\cos()', offset: -1 }],
  ['tan', { snippet: '\\tan()', offset: -1 }],
  ['log', { snippet: '\\log()', offset: -1 }],
  ['ln', { snippet: '\\ln()', offset: -1 }],
  ['infty', { snippet: '\\infty ', offset: 0 }],
  ['partial', { snippet: '\\partial ', offset: 0 }],
  ['neq', { snippet: '\\neq ', offset: 0 }],
  ['approx', { snippet: '\\approx ', offset: 0 }],
  ['le', { snippet: '\\le ', offset: 0 }],
  ['ge', { snippet: '\\ge ', offset: 0 }],
  ['pm', { snippet: '\\pm ', offset: 0 }],
  ['times', { snippet: '\\times ', offset: 0 }],
  ['div', { snippet: '\\div ', offset: 0 }],
]);
const LATEX_COMMANDS = Array.from(LATEX_COMMAND_MAP.keys());


interface MathEditorProps {
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
}


const MathEditor: React.FC<MathEditorProps> = ({ value, onValueChange, disabled, placeholder }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [currentCommand, setCurrentCommand] = useState<{word: string, start: number} | null>(null);
    const [isListening, setIsListening] = useState(false);
    const speechRecognitionRef = useRef<any>(null);
    const { toast } = useToast();

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

    const handleValueChange = (newValue: string, cursorPosition: number) => {
        onValueChange(newValue);
        const textBeforeCursor = newValue.slice(0, cursorPosition);
        const commandMatch = textBeforeCursor.match(/\\([a-zA-Z]*)$/);

        if (commandMatch) {
            const command = commandMatch[1] || '';
            const filtered = LATEX_COMMANDS.filter(c => c.startsWith(command)).slice(0, 5);
            setSuggestions(filtered);
            setCurrentCommand({ word: `\\${command}`, start: commandMatch.index! });
        } else {
            setSuggestions([]);
            setCurrentCommand(null);
        }
    };

    const handleSuggestionClick = (commandName: string) => {
        if (!currentCommand || !textareaRef.current) return;
        const commandInfo = LATEX_COMMAND_MAP.get(commandName);
        if (!commandInfo) return;

        const { snippet, offset } = commandInfo;
        const { start } = currentCommand;
        const end = start + currentCommand.word.length;
        const newValue = value.slice(0, start) + snippet + value.slice(end);
        onValueChange(newValue);

        setSuggestions([]);
        setCurrentCommand(null);

        setTimeout(() => {
            if (textareaRef.current) {
                const newCursorPos = start + snippet.length + offset;
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };
    
    const handleListenClick = () => {
        if (isListening) {
            speechRecognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            toast({
                variant: 'destructive',
                title: 'Browser Not Supported',
                description: 'Speech recognition is not supported in your browser.',
            });
            return;
        }

        const recognition = new SpeechRecognitionAPI();
        speechRecognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            toast({ title: 'Listening...', description: 'Start speaking your equation.' });
        };

        recognition.onresult = async (event: any) => {
            const speechResult = event.results[0][0].transcript;
            toast({ title: 'Processing your speech...', description: `Recognized: "${speechResult}"` });
            
            try {
                const { latex } = await convertSpeechToLatex({ query: speechResult });
                insertSymbol(` ${latex} `);
            } catch (e: any) {
                console.error(e);
                toast({ variant: 'destructive', title: 'AI Error', description: e.message || 'Could not convert speech to math.' });
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            let errorMessage = 'An unknown error occurred during speech recognition.';
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                errorMessage = 'Microphone access was denied. Please allow microphone access in your browser settings.';
            } else if (event.error === 'no-speech') {
                errorMessage = 'No speech was detected. Please try again.';
            }
            toast({ variant: 'destructive', title: 'Speech Recognition Error', description: errorMessage });
        };

        recognition.onend = () => {
            setIsListening(false);
            speechRecognitionRef.current = null;
        };

        recognition.start();
    };


    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="flex flex-col">
                 <CardHeader className="p-3 border-b flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-medium">Equation Editor</CardTitle>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant={isListening ? 'destructive' : 'outline'}
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={handleListenClick}
                                    disabled={disabled}
                                >
                                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                    <span className="sr-only">{isListening ? 'Stop listening' : 'Start listening'}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Voice-to-Math Input</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
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
                    <div className="relative flex-grow">
                        <Textarea
                            ref={textareaRef}
                            value={value}
                            onChange={(e) => handleValueChange(e.target.value, e.target.selectionStart)}
                            placeholder={placeholder}
                            disabled={disabled}
                            className="font-mono text-sm min-h-[200px] flex-grow resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-2 bg-transparent w-full h-full"
                        />
                         {suggestions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 p-1 rounded-md border bg-popover shadow-lg">
                                <p className="text-xs px-2 py-1 text-muted-foreground">Suggestions</p>
                                {suggestions.map(suggestion => (
                                    <Button
                                        key={suggestion}
                                        type="button"
                                        variant="ghost"
                                        className="w-full justify-start font-mono text-sm"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                    >
                                        {suggestion}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            <Card className="h-full">
                 <CardHeader className="py-3 px-4 border-b">
                    <CardTitle className="text-base font-medium">Live Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <ScrollArea className="h-[320px]">
                       {value ? (
                           <FormattedMath text={value} fullTextValue={value} onTextChange={onValueChange} />
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
