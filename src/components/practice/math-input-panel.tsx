"use client";

import React, { useState, useRef } from "react";
import { BlockMath } from "react-katex";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Calculator,
    Type,
    ImageIcon,
    Plus,
    Minus,
    X,
    Divide,
    Equal,
    Superscript,
    Subscript,
    SquareRadical,
    Pi,
    Sigma,
    ChevronRight,
    Eraser,
} from "lucide-react";
import ImageUploader from "./image-uploader";
import { cn } from "@/lib/utils";

interface MathInputPanelProps {
    value: string;
    onChange: (value: string) => void;
    imageDataUri: string | null;
    onImageChange: (dataUri: string | null) => void;
    disabled?: boolean;
    placeholder?: string;
}

// Symbol categories for the equation builder
const symbolGroups = [
    {
        name: "Basic",
        symbols: [
            { display: "+", latex: "+" },
            { display: "−", latex: "-" },
            { display: "×", latex: "\\times " },
            { display: "÷", latex: "\\div " },
            { display: "=", latex: "=" },
            { display: "≠", latex: "\\neq " },
            { display: "<", latex: "<" },
            { display: ">", latex: ">" },
            { display: "≤", latex: "\\leq " },
            { display: "≥", latex: "\\geq " },
            { display: "±", latex: "\\pm " },
            { display: "∞", latex: "\\infty " },
        ],
    },
    {
        name: "Powers & Roots",
        symbols: [
            { display: "x²", latex: "^{2}" },
            { display: "xⁿ", latex: "^{}" },
            { display: "√", latex: "\\sqrt{}" },
            { display: "∛", latex: "\\sqrt[3]{}" },
            { display: "ⁿ√", latex: "\\sqrt[n]{}" },
            { display: "xₙ", latex: "_{}" },
        ],
    },
    {
        name: "Fractions",
        symbols: [
            { display: "a/b", latex: "\\frac{}{}" },
            { display: "½", latex: "\\frac{1}{2}" },
            { display: "⅓", latex: "\\frac{1}{3}" },
            { display: "¼", latex: "\\frac{1}{4}" },
        ],
    },
    {
        name: "Greek",
        symbols: [
            { display: "α", latex: "\\alpha " },
            { display: "β", latex: "\\beta " },
            { display: "γ", latex: "\\gamma " },
            { display: "δ", latex: "\\delta " },
            { display: "θ", latex: "\\theta " },
            { display: "λ", latex: "\\lambda " },
            { display: "μ", latex: "\\mu " },
            { display: "π", latex: "\\pi " },
            { display: "σ", latex: "\\sigma " },
            { display: "φ", latex: "\\phi " },
            { display: "ω", latex: "\\omega " },
            { display: "Σ", latex: "\\Sigma " },
            { display: "Δ", latex: "\\Delta " },
            { display: "Ω", latex: "\\Omega " },
        ],
    },
    {
        name: "Functions",
        symbols: [
            { display: "sin", latex: "\\sin(" },
            { display: "cos", latex: "\\cos(" },
            { display: "tan", latex: "\\tan(" },
            { display: "log", latex: "\\log(" },
            { display: "ln", latex: "\\ln(" },
            { display: "lim", latex: "\\lim_{}" },
        ],
    },
    {
        name: "Calculus",
        symbols: [
            { display: "∫", latex: "\\int " },
            { display: "∫ab", latex: "\\int_{a}^{b}" },
            { display: "∂", latex: "\\partial " },
            { display: "∇", latex: "\\nabla " },
            { display: "d/dx", latex: "\\frac{d}{dx}" },
        ],
    },
    {
        name: "Sets",
        symbols: [
            { display: "∈", latex: "\\in " },
            { display: "∉", latex: "\\notin " },
            { display: "⊂", latex: "\\subset " },
            { display: "⊆", latex: "\\subseteq " },
            { display: "∪", latex: "\\cup " },
            { display: "∩", latex: "\\cap " },
            { display: "∅", latex: "\\emptyset " },
            { display: "ℕ", latex: "\\mathbb{N}" },
            { display: "ℤ", latex: "\\mathbb{Z}" },
            { display: "ℝ", latex: "\\mathbb{R}" },
        ],
    },
    {
        name: "Brackets",
        symbols: [
            { display: "()", latex: "()" },
            { display: "[]", latex: "[]" },
            { display: "{}", latex: "\\{\\}" },
            { display: "⟨⟩", latex: "\\langle \\rangle" },
            { display: "|x|", latex: "|x|" },
        ],
    },
];

export default function MathInputPanel({
    value,
    onChange,
    imageDataUri,
    onImageChange,
    disabled = false,
    placeholder = "Type your math solution here...",
}: MathInputPanelProps) {
    const [activeTab, setActiveTab] = useState<string>("visual");
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<string>("Basic");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Insert LaTeX at cursor position
    const insertLatex = (latex: string) => {
        if (disabled) return;

        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newValue =
                value.substring(0, start) + latex + value.substring(end);
            onChange(newValue);

            // Move cursor after the inserted text (or inside brackets if applicable)
            setTimeout(() => {
                const cursorPos = latex.includes("{}")
                    ? start + latex.indexOf("{}") + 1
                    : start + latex.length;
                textarea.setSelectionRange(cursorPos, cursorPos);
                textarea.focus();
            }, 0);
        } else {
            onChange(value + latex);
        }
    };

    // Clear the input
    const handleClear = () => {
        onChange("");
        setPreviewError(null);
    };

    // Render safe preview
    const renderPreview = () => {
        if (!value.trim()) {
            return (
                <div className="text-muted-foreground text-sm italic">
                    Your math will appear here as you type...
                </div>
            );
        }

        try {
            return (
                <div className="text-lg">
                    <BlockMath math={value} />
                </div>
            );
        } catch (error) {
            return (
                <div className="text-destructive text-sm">
                    Preview error: Check your LaTeX syntax
                </div>
            );
        }
    };

    return (
        <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="visual" className="gap-2">
                        <Calculator className="h-4 w-4" />
                        <span className="hidden sm:inline">Equation Builder</span>
                        <span className="sm:hidden">Build</span>
                    </TabsTrigger>
                    <TabsTrigger value="latex" className="gap-2">
                        <Type className="h-4 w-4" />
                        <span className="hidden sm:inline">LaTeX Input</span>
                        <span className="sm:hidden">Type</span>
                    </TabsTrigger>
                    <TabsTrigger value="image" className="gap-2">
                        <ImageIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Upload Image</span>
                        <span className="sm:hidden">Upload</span>
                    </TabsTrigger>
                </TabsList>

                {/* Visual Equation Builder */}
                <TabsContent value="visual" className="space-y-4">
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            {/* Symbol Group Selector */}
                            <ScrollArea className="w-full whitespace-nowrap">
                                <div className="flex gap-2 pb-2">
                                    {symbolGroups.map((group) => (
                                        <Badge
                                            key={group.name}
                                            variant={selectedGroup === group.name ? "default" : "outline"}
                                            className="cursor-pointer shrink-0"
                                            onClick={() => setSelectedGroup(group.name)}
                                        >
                                            {group.name}
                                        </Badge>
                                    ))}
                                </div>
                            </ScrollArea>

                            {/* Symbol Buttons */}
                            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                                {symbolGroups
                                    .find((g) => g.name === selectedGroup)
                                    ?.symbols.map((symbol, idx) => (
                                        <Button
                                            key={idx}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => insertLatex(symbol.latex)}
                                            disabled={disabled}
                                            className="h-10 text-lg font-mono hover:bg-primary/10"
                                        >
                                            {symbol.display}
                                        </Button>
                                    ))}
                            </div>

                            <Separator />

                            {/* Input Area */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">Your Expression</label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClear}
                                        disabled={disabled || !value}
                                        className="h-7 text-xs"
                                    >
                                        <Eraser className="h-3 w-3 mr-1" />
                                        Clear
                                    </Button>
                                </div>
                                <Textarea
                                    ref={textareaRef}
                                    value={value}
                                    onChange={(e) => onChange(e.target.value)}
                                    disabled={disabled}
                                    placeholder="Click symbols above or type LaTeX directly..."
                                    className="font-mono text-sm min-h-[80px]"
                                />
                            </div>

                            {/* Live Preview */}
                            <div className="p-4 bg-muted/50 rounded-lg border">
                                <div className="text-xs text-muted-foreground mb-2">Live Preview</div>
                                {renderPreview()}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* LaTeX Text Input */}
                <TabsContent value="latex" className="space-y-4">
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">LaTeX Expression</label>
                                    <div className="text-xs text-muted-foreground">
                                        Use standard LaTeX syntax
                                    </div>
                                </div>
                                <Textarea
                                    ref={textareaRef}
                                    value={value}
                                    onChange={(e) => onChange(e.target.value)}
                                    disabled={disabled}
                                    placeholder={placeholder}
                                    className="font-mono text-sm min-h-[120px]"
                                />
                            </div>

                            {/* Quick Examples */}
                            <div className="space-y-2">
                                <div className="text-xs text-muted-foreground">Quick examples (click to insert):</div>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: "x²", latex: "x^{2}" },
                                        { label: "√x", latex: "\\sqrt{x}" },
                                        { label: "a/b", latex: "\\frac{a}{b}" },
                                        { label: "∑", latex: "\\sum_{i=1}^{n}" },
                                        { label: "∫", latex: "\\int_{a}^{b}" },
                                    ].map((ex, idx) => (
                                        <Button
                                            key={idx}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => insertLatex(ex.latex)}
                                            disabled={disabled}
                                            className="text-xs h-7"
                                        >
                                            {ex.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Live Preview */}
                            <div className="p-4 bg-muted/50 rounded-lg border min-h-[80px]">
                                <div className="text-xs text-muted-foreground mb-2">Live Preview</div>
                                {renderPreview()}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Image Upload */}
                <TabsContent value="image" className="space-y-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="space-y-4">
                                <div className="text-sm text-muted-foreground">
                                    Upload a photo of your handwritten solution. Make sure the writing is clear and legible.
                                </div>
                                <ImageUploader
                                    onImageChange={onImageChange}
                                    disabled={disabled}
                                    initialImageUrl={imageDataUri}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Submission Summary */}
            {(value.trim() || imageDataUri) && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 text-sm">
                            <ChevronRight className="h-4 w-4 text-primary" />
                            <span className="text-muted-foreground">Your answer includes:</span>
                            {value.trim() && (
                                <Badge variant="secondary" className="text-xs">
                                    LaTeX Expression
                                </Badge>
                            )}
                            {imageDataUri && (
                                <Badge variant="secondary" className="text-xs">
                                    Uploaded Image
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
