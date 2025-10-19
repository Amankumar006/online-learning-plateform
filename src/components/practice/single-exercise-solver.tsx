"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Exercise, McqExercise, TrueFalseExercise, LongFormExercise, UserExerciseResponse, FillInTheBlanksExercise } from "@/lib/data";
import { saveExerciseAttempt } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { gradeLongFormAnswer, GradeLongFormAnswerOutput } from "@/ai/flows/grade-long-form-answer";
import { codeExecutionClient } from "@/lib/sandbox/client";
import { ExecutionResult, ExecutionStatus } from "@/lib/sandbox/types";

import { Loader2, CheckCircle, XCircle, Lightbulb, Code, BarChartHorizontal, Tags, FunctionSquare, Play, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import ImageUploader from "./image-uploader";

import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";

const CodeEditor = dynamic(() => import('@/components/lessons/code-editor'), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[400px] rounded-md" />,
});

const ExecutionPanel = dynamic(() => import('@/components/sandbox/ExecutionPanel'), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[200px] rounded-md" />,
});

interface SingleExerciseSolverProps {
    exercise: Exercise;
    userId: string;
    onSolved: () => void;
    lessonTitle: string;
    initialResponse?: UserExerciseResponse | null;
}

const FormattedQuestion = ({ text }: { text: string }) => {
    const parts = text.split(/(`.*?`)/g);
    return <p className="text-lg mb-2 leading-relaxed">{parts.filter(Boolean).map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={index} className="bg-muted px-1.5 py-1 rounded text-sm font-mono text-primary">{part.slice(1, -1)}</code>;
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
    })}</p>;
};

const difficultyToText = (level: number) => {
    switch (level) {
        case 1: return "Beginner";
        case 2: return "Intermediate";
        case 3: return "Advanced";
        default: return "N/A";
    }
};

const ExerciseDetails = ({ exercise }: { exercise: Exercise }) => (
    <div className="space-y-6">
        <FormattedQuestion text={
            exercise.type === 'fill_in_the_blanks' 
                ? (exercise as FillInTheBlanksExercise).questionParts.join(' ___ ')
                : exercise.type === 'code'
                    ? (exercise as any).description || (exercise as any).title
                    : (exercise as any).question
        } />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Category</CardTitle>
                    {exercise.category === 'code' && <Code className="h-4 w-4 text-muted-foreground" />}
                    {exercise.category === 'math' && <FunctionSquare className="h-4 w-4 text-muted-foreground" />}
                </CardHeader>
                <CardContent>
                    <div className="text-lg font-bold capitalize">
                        {exercise.category === 'code' && (exercise as LongFormExercise).language 
                            ? `${exercise.category} (${(exercise as LongFormExercise).language})`
                            : exercise.category
                        }
                    </div>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Difficulty</CardTitle>
                    <BarChartHorizontal className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-lg font-bold">{difficultyToText(exercise.difficulty)}</div>
                </CardContent>
            </Card>
        </div>

        {exercise.tags && exercise.tags.length > 0 && (
             <div className="space-y-3">
                 <h4 className="font-semibold text-sm flex items-center gap-2"><Tags className="h-4 w-4" /> Concept Tags</h4>
                 <div className="flex flex-wrap gap-2">
                     {exercise.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                 </div>
             </div>
        )}

        {exercise.hint && (
            <div className="space-y-3">
                 <h4 className="font-semibold text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Hint</h4>
                <div className="text-sm p-4 border rounded-md bg-secondary/50">
                    <FormattedQuestion text={exercise.hint} />
                </div>
            </div>
        )}
    </div>
);






export default function SingleExerciseSolver({ exercise, userId, onSolved, lessonTitle, initialResponse = null }: SingleExerciseSolverProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [longFormAnswer, setLongFormAnswer] = useState("");
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [fibAnswers, setFibAnswers] = useState<string[]>([]);
  const [fibCorrectness, setFibCorrectness] = useState<boolean[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [feedback, setFeedback] = useState<GradeLongFormAnswerOutput | null>(null);
  
  // Code execution states
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  const [programInput, setProgramInput] = useState<string>("");
  const [showInputField, setShowInputField] = useState(false);

  const { toast } = useToast();

  // Smart input detection - check if code needs input
  const needsInput = (code: string, language: string) => {
    const inputPatterns = {
      c: /scanf|gets|getchar|fgets/i,
      cpp: /cin\s*>>|scanf|gets|getchar/i,
      java: /Scanner|BufferedReader|System\.in/i,
      python: /input\(|raw_input\(/i,
      javascript: /prompt\(|readline/i
    };
    
    const pattern = inputPatterns[language.toLowerCase() as keyof typeof inputPatterns];
    return pattern ? pattern.test(code) : false;
  };

  const handleRunCode = async () => {
    if (!longFormAnswer.trim()) {
      toast({ 
        variant: "destructive", 
        title: "No Code to Run", 
        description: "Please write some code before running." 
      });
      return;
    }

    const lfExercise = exercise as LongFormExercise;
    
    // Check if code needs input and show input field if needed
    if (needsInput(longFormAnswer, lfExercise.language || 'javascript') && !showInputField) {
      setShowInputField(true);
      toast({ 
        title: "Input Required", 
        description: "Your program needs input. Please provide it below and run again." 
      });
      return;
    }
    setIsExecuting(true);
    setShowExecutionPanel(true);
    setExecutionResult(null); // Clear previous results
    
    // Show immediate feedback
    toast({ 
      title: "Running Code...", 
      description: `Executing your ${lfExercise.language} code in a secure sandbox.` 
    });
    
    try {
      const result = await codeExecutionClient.executeCode({
        code: longFormAnswer,
        language: lfExercise.language,
        input: programInput || undefined, // Provide input if available
        userId: userId
      });
      
      setExecutionResult(result);
      
      // Enhanced feedback based on execution result
      if (result.status === ExecutionStatus.SUCCESS) {
        toast({ 
          title: "✅ Code Executed Successfully", 
          description: result.stdout ? "Your code ran without errors!" : "Code completed (no output)",
          variant: "default"
        });
      } else if (result.status === ExecutionStatus.COMPILATION_ERROR) {
        toast({ 
          variant: "destructive",
          title: "❌ Compilation Error", 
          description: "There are syntax errors in your code. Check the error panel for details." 
        });
      } else if (result.status === ExecutionStatus.RUNTIME_ERROR) {
        toast({ 
          variant: "destructive",
          title: "⚠️ Runtime Error", 
          description: "Your code encountered an error while running." 
        });
      } else if (result.status === ExecutionStatus.TIME_LIMIT_EXCEEDED) {
        toast({ 
          variant: "destructive",
          title: "⏱️ Time Limit Exceeded", 
          description: "Your code took too long to execute. Try optimizing your algorithm." 
        });
      }
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "🚫 Execution Failed", 
        description: error instanceof Error ? error.message : "Network or server error occurred" 
      });
      setExecutionResult({
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error occurred',
        exitCode: 1,
        executionTime: 0,
        memoryUsed: 0,
        status: ExecutionStatus.INTERNAL_ERROR,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  useEffect(() => {
    setSelectedAnswer(null);
    setLongFormAnswer("");
    setImageDataUri(null);
    setIsAnswered(false);
    setIsCorrect(null);
    setFeedback(null);


    if (exercise.type === 'fill_in_the_blanks') {
        setFibAnswers(Array(exercise.correctAnswers.length).fill(''));
    }
    
    if (initialResponse) {
      setIsAnswered(true);
      setIsCorrect(initialResponse.isCorrect);

      if (exercise.type === 'long_form') {
        setLongFormAnswer(initialResponse.submittedAnswer as string);
        setImageDataUri(initialResponse.imageDataUri || null);
        if (typeof initialResponse.feedback === 'string') {
             setFeedback({
                isCorrect: initialResponse.isCorrect,
                score: initialResponse.score,
                feedback: initialResponse.feedback,
            } as GradeLongFormAnswerOutput);
        }
      } else if (exercise.type === 'true_false') {
        setSelectedAnswer(initialResponse.submittedAnswer ? 'True' : 'False');
      } else if (exercise.type === 'fill_in_the_blanks') {
        const submitted = initialResponse.submittedAnswer as string[];
        setFibAnswers(submitted);
        const correctness = submitted.map((ans, i) => ans.trim().toLowerCase() === exercise.correctAnswers[i].trim().toLowerCase());
        setFibCorrectness(correctness);
      } else { 
        setSelectedAnswer(initialResponse.submittedAnswer as string);
      }
    }
  }, [exercise, initialResponse]);


  const handleAnswerSubmit = async () => {
    let correct = false;
    let score = 0;
    let submittedAnswer: string | boolean | string[] = selectedAnswer!;
    let aiFeedback: GradeLongFormAnswerOutput | null = null;
    
    if (exercise.type === 'long_form') {
        if (!longFormAnswer && !imageDataUri) {
            toast({ variant: "destructive", title: "No Answer", description: "Please provide a typed answer or upload an image of your work." });
            return;
        }
        submittedAnswer = longFormAnswer;
        setIsGrading(true);
        try {
            const result = await gradeLongFormAnswer({ question: exercise.question, evaluationCriteria: exercise.evaluationCriteria, studentAnswer: longFormAnswer, imageDataUri: imageDataUri || undefined });
            aiFeedback = result;
            setFeedback(aiFeedback);
            correct = result.isCorrect;
            score = result.score;
            toast({ title: "Answer Graded!", description: "Your detailed feedback is available below." });
        } catch (error) {
            console.error("Failed to grade answer:", error);
            toast({ variant: "destructive", title: "AI Error", description: "Could not get feedback from the AI." });
            setIsGrading(false);
            return;
        } finally {
            setIsGrading(false);
        }
    } else if (exercise.type === 'fill_in_the_blanks') {
        submittedAnswer = fibAnswers;
        const correctnessArray = fibAnswers.map((ans, i) => ans.trim().toLowerCase() === exercise.correctAnswers[i].trim().toLowerCase());
        setFibCorrectness(correctnessArray);
        correct = correctnessArray.every(c => c);
        score = correct ? 100 : 0;
    } else {
        if (!selectedAnswer) return;
        switch (exercise.type) {
            case 'mcq':
                correct = selectedAnswer === exercise.correctAnswer;
                break;
            case 'true_false':
                correct = ((exercise as TrueFalseExercise).correctAnswer).toString() === (selectedAnswer === 'True').toString();
                break;
        }
        score = correct ? 100 : 0;
    }
    
    setIsAnswered(true);
    setIsCorrect(correct);
    
    try {
        // Fix: Call saveExerciseAttempt with correct parameter names and order
        await saveExerciseAttempt(userId, lessonTitle, exercise, submittedAnswer, correct, score, aiFeedback, imageDataUri);
        if (exercise.type !== 'long_form') {
            toast({ title: correct ? "Correct!" : "Not quite" });
        }
    } catch (error) {
        console.error("Failed to save exercise result:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save your progress." });
    }
  };




  
  const handleFibAnswerChange = (index: number, value: string) => {
    const newAnswers = [...fibAnswers];
    newAnswers[index] = value;
    setFibAnswers(newAnswers);
  };


  const renderAnswerArea = () => {
    switch (exercise.type) {
        case 'mcq':
            const mcq = exercise as McqExercise;
            return (
                <RadioGroup value={selectedAnswer ?? ''} onValueChange={setSelectedAnswer} disabled={isAnswered} className="space-y-3">
                    {mcq.options.map((option, index) => (
                        <div key={index} className={cn("flex items-center space-x-3 p-4 rounded-lg border transition-all", isAnswered && option === mcq.correctAnswer && "border-primary bg-primary/10 ring-2 ring-primary", isAnswered && selectedAnswer === option && option !== mcq.correctAnswer && "border-destructive bg-destructive/10 ring-2 ring-destructive", !isAnswered && "hover:bg-accent/50 cursor-pointer")}>
                            <RadioGroupItem value={option} id={`option-${index}`} />
                            <Label htmlFor={`option-${index}`} className="w-full text-base font-normal cursor-pointer">{option}</Label>
                        </div>
                    ))}
                </RadioGroup>
            );
        case 'true_false':
            const tf = exercise as TrueFalseExercise;
             return (
                <RadioGroup value={selectedAnswer ?? ''} onValueChange={setSelectedAnswer} disabled={isAnswered} className="space-y-3">
                    {['True', 'False'].map((option, index) => (
                        <div key={index} className={cn("flex items-center space-x-3 p-4 rounded-lg border transition-all", String(tf.correctAnswer).toLowerCase() === option.toLowerCase() && isAnswered && "border-primary bg-primary/10 ring-2 ring-primary", selectedAnswer === option && String(tf.correctAnswer).toLowerCase() !== option.toLowerCase() && isAnswered && "border-destructive bg-destructive/10 ring-2 ring-destructive", !isAnswered && "hover:bg-accent/50 cursor-pointer")}>
                            <RadioGroupItem value={option} id={`option-${index}`} />
                            <Label htmlFor={`option-${index}`} className="w-full text-base font-normal cursor-pointer">{option}</Label>
                        </div>
                    ))}
                </RadioGroup>
            );
        case 'long_form':
            const lfExercise = exercise as LongFormExercise;
            if (lfExercise.category === 'code') {
                return (
                    <div className="space-y-4">
                        <div id="single-exercise-instructions" className="sr-only">
                            Exercise: {lfExercise.question}. Write your {lfExercise.language} code solution below.
                        </div>
                        
                        {/* Enhanced code editor header */}
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-t-lg border border-b-0">
                            <div className="flex items-center gap-2">
                                <Code className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium capitalize">{lfExercise.language} Solution</span>
                                <Badge variant="outline" className="text-xs">
                                    {isAnswered ? 'Submitted' : 'Draft'}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Press Ctrl+Enter to run</span>
                            </div>
                        </div>
                        
                        <div className="border border-t-0 rounded-b-lg overflow-hidden">
                            <CodeEditor 
                                value={longFormAnswer} 
                                onValueChange={setLongFormAnswer} 
                                disabled={isAnswered || isGrading} 
                                language={lfExercise.language} 
                                placeholder={`// Write your ${lfExercise.language} solution here...\n// Use the Run button or Ctrl+Enter to test your code`} 
                                aria-label={`Code editor for ${lfExercise.language} exercise`}
                                aria-describedby="single-exercise-instructions"
                                showRunButton={true}
                                onRunCode={handleRunCode}
                                isExecuting={isExecuting}
                            />
                        </div>

                        {/* Program Input Field */}
                        {showInputField && (
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Program Input</h4>
                                    <Badge variant="secondary" className="text-xs">
                                        {(lfExercise.language || 'javascript') === 'c' ? 'stdin' : 'input()'}
                                    </Badge>
                                </div>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    Your program expects input. Provide the values your program should read:
                                </p>
                                <Textarea
                                    value={programInput}
                                    onChange={(e) => setProgramInput(e.target.value)}
                                    placeholder={
                                        (lfExercise.language || 'javascript') === 'c' || (lfExercise.language || 'javascript') === 'cpp' 
                                            ? "Enter input values (e.g., for your C program: 42)"
                                            : (lfExercise.language || 'javascript') === 'python'
                                            ? "Enter input values (one per line if multiple inputs)"
                                            : "Enter input values your program expects"
                                    }
                                    rows={3}
                                    className="font-mono text-sm bg-white dark:bg-blue-950/30"
                                />
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-blue-600 dark:text-blue-400">
                                        💡 For your C code, enter: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">42</code> (or any integer)
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => {
                                            setShowInputField(false);
                                            setProgramInput("");
                                        }}
                                        className="text-xs"
                                    >
                                        Hide Input
                                    </Button>
                                </div>
                            </div>
                        )}
                        
                        {/* Quick Actions Bar */}
                        {!isAnswered && !isGrading && longFormAnswer.trim() && (
                            <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                                        Ready to test your solution
                                        {needsInput(longFormAnswer, lfExercise.language || 'javascript') && (
                                            <Badge variant="outline" className="text-xs ml-2">
                                                Needs Input
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {needsInput(longFormAnswer, lfExercise.language || 'javascript') && !showInputField && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => setShowInputField(true)}
                                            className="text-xs"
                                        >
                                            Add Input
                                        </Button>
                                    )}
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={handleRunCode}
                                        disabled={isExecuting}
                                        className="text-xs"
                                    >
                                        {isExecuting ? (
                                            <>
                                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                                Running...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="h-3 w-3 mr-1" />
                                                {needsInput(longFormAnswer, lfExercise.language || 'javascript') && programInput ? 'Run with Input' : 'Test Code'}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {showExecutionPanel && (
                            <div className="mt-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Play className="h-4 w-4" />
                                        Execution Results
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={handleRunCode}
                                            disabled={isExecuting || !longFormAnswer.trim()}
                                            className="text-xs h-6 px-2"
                                        >
                                            <RefreshCw className="h-3 w-3 mr-1" />
                                            Re-run
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setShowExecutionPanel(false)}
                                            className="text-xs h-6 px-2"
                                        >
                                            Hide
                                        </Button>
                                    </div>
                                </div>
                                <ExecutionPanel 
                                    result={executionResult}
                                    isLoading={isExecuting}
                                    language={lfExercise.language}
                                    code={longFormAnswer}
                                    className="border-l-4 border-l-primary/30 shadow-sm"
                                />
                            </div>
                        )}

                    </div>
                 );
            }
            return (
                <div className="space-y-6">
                    <Textarea value={longFormAnswer} onChange={(e) => setLongFormAnswer(e.target.value)} rows={8} disabled={isAnswered || isGrading} />
                    <Separator />
                    <ImageUploader onImageChange={setImageDataUri} disabled={isAnswered || isGrading} initialImageUrl={imageDataUri} />
                </div>
            );
        case 'fill_in_the_blanks':
            const fib = exercise as FillInTheBlanksExercise;
            return (
                <div className="flex flex-wrap items-center gap-2 text-lg">
                    {fib.questionParts.map((part, index) => (
                        <React.Fragment key={index}>
                            <span>{part}</span>
                            {index < fib.correctAnswers.length && (
                                <Input type="text" value={fibAnswers[index] || ''} onChange={(e) => handleFibAnswerChange(index, e.target.value)} disabled={isAnswered} className={cn("w-32 inline-block", isAnswered && (fibCorrectness[index] ? "border-primary ring-2 ring-primary" : "border-destructive ring-2 ring-destructive"))} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            );
        default:
            return <p>Unsupported exercise type.</p>;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
        <ScrollArea className="flex-grow">
            <div className="p-6">
                <ExerciseDetails exercise={exercise} />
            </div>
            <Separator className="my-6" />
            <div className="p-6 pt-0 space-y-6">
                <h3 className="text-xl font-bold font-headline">Your Answer</h3>
                {renderAnswerArea()}
                {isAnswered && (
                     <div className="mt-6 space-y-4 animate-in fade-in-20">
                        {(exercise.type !== 'long_form' && exercise.explanation) && (
                            <Card className={cn(isCorrect ? "bg-primary/10 border-primary/50" : "bg-destructive/10 border-destructive/50")}>
                                <CardHeader><CardTitle className="text-base flex items-center gap-2">{isCorrect ? <CheckCircle className="text-primary"/> : <XCircle className="text-destructive" />}Explanation</CardTitle></CardHeader>
                                <CardContent><p className="text-sm">{exercise.explanation}</p></CardContent>
                            </Card>
                        )}
                        {feedback && (
                             <Card className={cn(feedback.isCorrect ? "bg-primary/10 border-primary/50" : "bg-destructive/10 border-destructive/50")}>
                                <CardHeader><CardTitle className="text-base flex items-center justify-between gap-2"><span>{feedback.isCorrect ? <CheckCircle className="text-primary"/> : <XCircle className="text-destructive" />} AI Feedback</span><Badge variant={feedback.isCorrect ? "default" : "destructive"}>Score: {feedback.score}/100</Badge></CardTitle></CardHeader>
                                <CardContent><p className="text-sm whitespace-pre-wrap">{feedback.feedback}</p></CardContent>
                             </Card>
                        )}
                     </div>
                )}
            </div>
        </ScrollArea>
        
        <div className="flex-shrink-0 border-t bg-gradient-to-r from-background to-muted/20 p-4">
            <div className="flex items-center justify-between">
                {/* Progress indicator for code exercises */}
                {exercise.type === 'long_form' && (exercise as LongFormExercise).category === 'code' && !isAnswered && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "h-2 w-2 rounded-full transition-colors",
                                longFormAnswer.trim() ? "bg-blue-500" : "bg-muted"
                            )}></div>
                            <span>Code written</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "h-2 w-2 rounded-full transition-colors",
                                executionResult ? "bg-green-500" : "bg-muted"
                            )}></div>
                            <span>Code tested</span>
                        </div>
                    </div>
                )}
                
                <div className="flex items-center gap-2 ml-auto">
                    {initialResponse ? (
                        <Button onClick={onSolved} size="lg" className="min-w-[140px]">
                            Return to Practice
                        </Button>
                    ) : !isAnswered ? (
                        <Button 
                            onClick={handleAnswerSubmit} 
                            disabled={isGrading || (exercise.type !== 'long_form' && !selectedAnswer && !longFormAnswer && !imageDataUri)} 
                            size="lg"
                            className="min-w-[140px] bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                        >
                            {isGrading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                                    Grading...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Submit Answer
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button onClick={onSolved} size="lg" className="min-w-[140px]">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Finish & Return
                        </Button>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}
