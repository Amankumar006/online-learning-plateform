
"use client";

import React from 'react';
import Editor, { OnChange, type Monaco } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { getEditorTheme } from '@/lib/themes';
import { Loader2, AlertCircle, Code, Smartphone, Monitor, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface CodeEditorProps {
    value: string;
    onValueChange: (code: string) => void;
    disabled?: boolean;
    placeholder?: string;
    language?: string;
    'aria-label'?: string;
    'aria-describedby'?: string;
    // Execution props
    onRunCode?: () => void;
    isExecuting?: boolean;
    showRunButton?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ 
    value, 
    onValueChange, 
    disabled, 
    placeholder, 
    language = 'javascript',
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    onRunCode,
    isExecuting = false,
    showRunButton = false
}) => {
    const { resolvedTheme } = useTheme();
    const [isMobile, setIsMobile] = React.useState(false);
    const [loadingState, setLoadingState] = React.useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = React.useState<string>('');
    const [loadingProgress, setLoadingProgress] = React.useState(0);
    const [showMobileOptimization, setShowMobileOptimization] = React.useState(false);
    const [placeholderPosition, setPlaceholderPosition] = React.useState({ left: '68px', top: '16px' });
    const editorRef = React.useRef<any>(null);
    const announcementRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // Show mobile optimization notification on first mobile detection
            if (mobile && !showMobileOptimization) {
                setShowMobileOptimization(true);
                setTimeout(() => setShowMobileOptimization(false), 3000);
            }
            
            // Recalculate placeholder position on resize
            if (editorRef.current) {
                setTimeout(() => {
                    const layoutInfo = editorRef.current?.getLayoutInfo();
                    if (layoutInfo) {
                        setPlaceholderPosition({
                            left: `${layoutInfo.contentLeft}px`,
                            top: mobile ? '12px' : '16px'
                        });
                    }
                }, 100);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [showMobileOptimization]);

    // Enhanced loading progress simulation
    React.useEffect(() => {
        if (loadingState === 'loading') {
            const interval = setInterval(() => {
                setLoadingProgress(prev => {
                    if (prev >= 90) return prev;
                    return prev + Math.random() * 15;
                });
            }, 200);
            return () => clearInterval(interval);
        } else {
            setLoadingProgress(100);
        }
    }, [loadingState]);



    const handleEditorChange: OnChange = (value) => {
        onValueChange(value || '');
    };

    const handleEditorDidMount = (editor: any, monaco: Monaco) => {
        editorRef.current = editor;
        setLoadingState('ready');
        
        // Fix layout and cursor positioning issues
        setTimeout(() => {
            editor.layout();
            
            // Force proper gutter and text alignment
            const editorElement = editor.getDomNode();
            if (editorElement) {
                // Trigger a layout recalculation
                editorElement.style.width = '100%';
                editorElement.style.height = '100%';
                
                // Force Monaco to recalculate its layout dimensions
                const viewZones = editorElement.querySelector('.view-zones');
                const viewLines = editorElement.querySelector('.view-lines');
                if (viewLines) {
                    // Ensure proper text container positioning
                    viewLines.style.position = 'relative';
                    viewLines.style.left = '0px';
                }
            }
            
            editor.focus();
            // Force a re-render to fix cursor positioning
            const model = editor.getModel();
            if (model) {
                const position = editor.getPosition();
                editor.setPosition(position || { lineNumber: 1, column: 1 });
            }
            
            // Additional layout fix with forced refresh
            editor.layout();
            
            // Force Monaco to refresh its internal layout calculations
            setTimeout(() => {
                editor.layout();
                const layoutInfo = editor.getLayoutInfo();
                console.log('Monaco layout info:', layoutInfo); // Debug info
                
                // Calculate proper placeholder position based on Monaco's actual layout
                if (layoutInfo) {
                    setPlaceholderPosition({
                        left: `${layoutInfo.contentLeft}px`,
                        top: isMobile ? '12px' : '16px'
                    });
                }
            }, 50);
        }, 100);
        
        // Add run code keyboard shortcut
        if (onRunCode) {
            editor.addAction({
                id: 'run-code',
                label: 'Run Code (Ctrl+Enter)',
                keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
                contextMenuGroupId: 'navigation',
                contextMenuOrder: 1.5,
                run: () => {
                    if (!isExecuting && !disabled) {
                        onRunCode();
                        // Announce to screen readers
                        if (announcementRef.current) {
                            announcementRef.current.textContent = 'Code execution started via keyboard shortcut.';
                        }
                    }
                }
            });
        }

        // Add mobile-specific touch gestures
        if (isMobile) {
            let touchStartY = 0;
            let touchStartX = 0;
            
            editor.getDomNode()?.addEventListener('touchstart', (e: TouchEvent) => {
                touchStartY = e.touches[0].clientY;
                touchStartX = e.touches[0].clientX;
            });
            
            editor.getDomNode()?.addEventListener('touchend', (e: TouchEvent) => {
                const touchEndY = e.changedTouches[0].clientY;
                const touchEndX = e.changedTouches[0].clientX;
                const deltaY = touchStartY - touchEndY;
                const deltaX = touchStartX - touchEndX;
                

            });
        }


    };

    // Fetches the DOM library type definitions and adds them to the editor
    // to enable full IntelliSense for browser APIs.
    const handleBeforeMount = async (monaco: Monaco) => {
        try {
            setLoadingState('loading');
            
            // Load DOM library with timeout and error handling
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            try {
                const response = await fetch('https://cdn.jsdelivr.net/npm/typescript@5.3.3/lib/lib.dom.d.ts', {
                    signal: controller.signal
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const domLib = await response.text();
                monaco.languages.typescript.javascriptDefaults.addExtraLib(domLib, 'lib.dom.d.ts');
                clearTimeout(timeoutId);
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                    console.warn("DOM library loading timed out, continuing without enhanced IntelliSense");
                } else {
                    console.warn("Failed to load DOM library, continuing with basic IntelliSense:", fetchError);
                }
                // Continue without DOM lib - editor will still work
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
            
        } catch (error) {
            console.error("Failed to initialize Monaco editor:", error);
            setLoadingState('error');
            setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
        }
    };

    const handleRetry = () => {
        setLoadingState('loading');
        setErrorMessage('');
        // Force re-mount of editor
        window.location.reload();
    };

    // Enhanced loading component with progress
    const LoadingComponent = () => (
        <div className="flex items-center justify-center h-full bg-background">
            <div className="text-center space-y-4 max-w-xs">
                <div className="flex items-center justify-center">
                    <Code className="h-8 w-8 text-primary animate-pulse mr-2" />
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-medium">Loading Code Editor</p>
                    <p className="text-xs text-muted-foreground">
                        {loadingProgress < 30 && "Initializing Monaco Editor..."}
                        {loadingProgress >= 30 && loadingProgress < 60 && "Loading language support..."}
                        {loadingProgress >= 60 && loadingProgress < 90 && "Setting up IntelliSense..."}
                        {loadingProgress >= 90 && "Almost ready..."}
                    </p>
                    <div className="w-full bg-muted rounded-full h-1.5">
                        <div 
                            className="bg-primary h-1.5 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${loadingProgress}%` }}
                        />
                    </div>
                </div>
                {isMobile && (
                    <div className="flex items-center justify-center text-xs text-muted-foreground">
                        <Smartphone className="h-3 w-3 mr-1" />
                        Mobile optimized
                    </div>
                )}
            </div>
        </div>
    );

    // Error state component
    if (loadingState === 'error') {
        return (
            <div className={cn(
                "relative w-full rounded-md border h-[300px] md:h-[400px] lg:h-[450px]",
                "bg-background flex items-center justify-center p-6"
            )}>
                <Alert className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="space-y-3">
                        <div>
                            <p className="font-medium">Failed to load code editor</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {errorMessage || 'The code editor could not be initialized. Please check your internet connection and try again.'}
                            </p>
                        </div>
                        <Button onClick={handleRetry} size="sm" className="w-full">
                            Try Again
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div 
            className={cn(
                "relative w-full rounded-md border h-[300px] md:h-[400px] lg:h-[450px]",
                "bg-white dark:bg-[#1e1e1e]",
                "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                "overflow-hidden", // Ensure proper clipping
                disabled && "cursor-not-allowed opacity-50"
            )}
            role="application"
            aria-label={ariaLabel || `${language} code editor`}
            aria-describedby={ariaDescribedBy}
            style={{ 
                // Ensure proper dimensions for Monaco
                minHeight: '300px',
                contain: 'layout style paint',
                // Ensure Monaco doesn't interfere with overlays
                isolation: 'isolate'
            }}
        >
            {/* Screen reader instructions */}
            <div className="sr-only" id="editor-instructions">
                Code editor for {language}. Use Tab to navigate. 
                {disabled ? 'Editor is read-only.' : 'Type to edit code.'}
            </div>
            
            <Editor
                height="100%"
                language={language}
                value={value}
                theme={getEditorTheme(resolvedTheme || 'light')}
                onChange={handleEditorChange}
                beforeMount={handleBeforeMount}
                onMount={handleEditorDidMount}
                loading={<LoadingComponent />}
                options={{
                    readOnly: disabled,
                    minimap: { enabled: !isMobile },
                    fontSize: isMobile ? 12 : 14,
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
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
                    // Fix cursor positioning issues
                    cursorBlinking: 'blink',
                    cursorSmoothCaretAnimation: 'on',
                    cursorWidth: 2,
                    cursorStyle: 'line',
                    // Fix text rendering
                    fontLigatures: false,
                    renderWhitespace: 'none',
                    renderControlCharacters: false,
                    guides: {
                        indentation: true
                    },
                    // Layout fixes
                    fixedOverflowWidgets: false, // Allow widgets to overflow properly
                    overviewRulerBorder: false,
                    hideCursorInOverviewRuler: true,
                    // Accessibility improvements
                    accessibilitySupport: 'on',
                    ariaLabel: ariaLabel || `${language} code editor`,
                    // Mobile-specific optimizations
                    quickSuggestions: !isMobile,
                    suggestOnTriggerCharacters: !isMobile,
                    acceptSuggestionOnEnter: isMobile ? 'off' : 'on',
                    // Better mobile experience
                    contextmenu: !isMobile,
                    folding: !isMobile,
                    foldingStrategy: 'auto',
                    showFoldingControls: 'mouseover',
                    lineNumbers: isMobile ? 'off' : 'on',
                    glyphMargin: !isMobile,
                    lineDecorationsWidth: isMobile ? 0 : 10,
                    lineNumbersMinChars: isMobile ? 0 : 4, // Increased for better spacing
                    // Ensure proper layout
                    scrollbar: {
                        vertical: 'auto',
                        horizontal: 'auto',
                        verticalScrollbarSize: 10,
                        horizontalScrollbarSize: 10,
                        alwaysConsumeMouseWheel: false
                    }
                }}
            />
            
            {/* Improved placeholder positioning */}
            {placeholder && !value && !disabled && loadingState === 'ready' && (
                <div 
                    className="absolute pointer-events-none text-muted-foreground text-sm md:text-base"
                    aria-hidden="true"
                    style={{
                        // Use dynamically calculated position from Monaco's layout
                        left: isMobile ? '12px' : placeholderPosition.left,
                        top: placeholderPosition.top,
                        // Ensure it aligns with Monaco's text positioning
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                        fontSize: isMobile ? '12px' : '14px',
                        lineHeight: '1.4',
                        // Ensure proper z-index so it appears behind text
                        zIndex: 1
                    }}
                >
                    {placeholder}
                </div>
            )}
            
            {/* Mobile optimization notification */}
            {showMobileOptimization && (
                <div className="absolute top-2 right-2 z-40 bg-primary text-primary-foreground px-2 py-1 rounded text-xs flex items-center gap-1 animate-in fade-in-0 slide-in-from-top-2">
                    <Smartphone className="h-3 w-3" />
                    Mobile optimized
                </div>
            )}



            {/* Desktop run button */}
            {!isMobile && showRunButton && onRunCode && loadingState === 'ready' && (
                <div className="absolute top-2 right-2 z-50">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={onRunCode}
                        disabled={isExecuting || disabled}
                        className="shadow-md relative z-50"
                    >
                        {isExecuting ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Play className="h-4 w-4 mr-2" />
                        )}
                        Run Code
                    </Button>
                </div>
            )}

            {/* Enhanced mobile toolbar */}
            {isMobile && loadingState === 'ready' && (
                <div className="absolute bottom-2 left-2 right-2 z-50 flex items-center justify-between bg-background/90 backdrop-blur-sm border rounded px-2 py-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Monitor className="h-3 w-3" />
                        <span>{language}</span>
                    </div>
                    {showRunButton && onRunCode && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onRunCode}
                            disabled={isExecuting || disabled}
                            className="h-6 px-2 text-xs relative z-50"
                        >
                            {isExecuting ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <>
                                    <Play className="h-3 w-3 mr-1" />
                                    Run
                                </>
                            )}
                        </Button>
                    )}

                </div>
            )}

            {/* Live region for announcements */}
            <div 
                ref={announcementRef}
                className="sr-only" 
                aria-live="polite" 
                aria-atomic="true"
                id={`editor-announcements-${React.useId()}`}
            />
        </div>
    );
};

export default CodeEditor;
