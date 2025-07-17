
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { evaluate } from 'mathjs';
import { Eraser, History, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const calculatorButtons = [
    { label: 'C', type: 'clear', className: 'bg-destructive/80 hover:bg-destructive text-destructive-foreground' },
    { label: '(', type: 'operator' },
    { label: ')', type: 'operator' },
    { label: '/', type: 'operator', display: '÷' },
    { label: '7', type: 'number' },
    { label: '8', type: 'number' },
    { label: '9', type: 'number' },
    { label: '*', type: 'operator', display: '×' },
    { label: '4', type: 'number' },
    { label: '5', type: 'number' },
    { label: '6', type: 'number' },
    { label: '-', type: 'operator' },
    { label: '1', type: 'number' },
    { label: '2', type: 'number' },
    { label: '3', type: 'number' },
    { label: '+', type: 'operator' },
    { label: '0', type: 'number', className: 'col-span-2' },
    { label: '.', type: 'number' },
    { label: '=', type: 'equal', className: 'bg-primary/90 hover:bg-primary text-primary-foreground' },
];

const scientificButtons = [
    { label: 'sin(', display: 'sin' },
    { label: 'cos(', display: 'cos' },
    { label: 'tan(', display: 'tan' },
    { label: 'log(', display: 'log' },
    { label: 'sqrt(', display: '√' },
    { label: '^', display: 'x^y' },
];

export default function AdvancedCalculatorPanel() {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    const [isError, setIsError] = useState(false);

    const handleButtonClick = (value: string, type: string) => {
        if (isError) {
            setInput('');
            setIsError(false);
        }
        if (type === 'clear') {
            setInput('');
        } else if (type === 'equal') {
            calculateResult();
        } else {
            setInput(prev => prev + value);
        }
    };

    const calculateResult = () => {
        if (!input) return;
        try {
            const result = evaluate(input);
            const calculation = `${input} = ${result}`;
            setHistory(prev => [calculation, ...prev.slice(0, 19)]);
            setInput(String(result));
            setIsError(false);
        } catch (error) {
            setInput('Error');
            setIsError(true);
        }
    };

    const handleBackspace = () => {
        if (isError) {
            setInput('');
            setIsError(false);
        } else {
            setInput(prev => prev.slice(0, -1));
        }
    };
    
    return (
        <div className="flex flex-col h-full bg-background text-foreground">
            <div className="p-4 space-y-2 border-b">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="0"
                    className={cn(
                        "h-16 text-4xl text-right font-mono border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                        isError ? 'text-destructive' : 'text-foreground'
                    )}
                />
            </div>
            
             <div className="p-4 grid grid-cols-4 gap-2">
                 {scientificButtons.map(btn => (
                    <Button key={btn.label} variant="outline" onClick={() => handleButtonClick(btn.label, 'function')} className="h-12 text-base">
                        {btn.display}
                    </Button>
                ))}
                 <Button variant="outline" onClick={handleBackspace} className="h-12 col-span-2">
                    <Eraser className="h-5 w-5"/>
                </Button>
            </div>

            <div className="p-4 pt-0 grid grid-cols-4 gap-2 flex-grow">
                {calculatorButtons.map(btn => (
                    <Button
                        key={btn.label}
                        variant={btn.type === 'operator' || btn.type === 'clear' || btn.type === 'equal' ? 'secondary' : 'outline'}
                        onClick={() => handleButtonClick(btn.label, btn.type)}
                        className={cn("h-full text-2xl", btn.className)}
                    >
                        {btn.display || btn.label}
                    </Button>
                ))}
            </div>

            <div className="p-4 border-t h-40">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><History className="h-4 w-4"/> History</h4>
                <ScrollArea className="h-full">
                    <div className="space-y-1 text-right">
                        {history.map((item, index) => (
                             <button key={index} className="w-full text-left p-1 rounded hover:bg-muted" onClick={() => setInput(item.split('=')[0].trim())}>
                                <p className="text-sm text-muted-foreground">{item.split('=')[0]}=</p>
                                <p className="font-semibold text-lg">{item.split('=')[1]}</p>
                             </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
