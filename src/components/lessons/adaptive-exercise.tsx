
"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Exercise, McqExercise, TrueFalseExercise, LongFormExercise, UserExerciseResponse, FillInTheBlanksExercise, CodeExercise } from "@/lib/data";
import { saveExerciseAttempt, getUserProgress, updateUserExerciseIndex, getUserResponsesForLesson } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { gradeLongFormAnswer, GradeLongFormAnswerOutput } from "@/ai/flows/grade-long-form-answer";
import { executeCode } from "@/lib/sandbox/client";
import { ExecutionResult } from "@/lib/sandbox/types";

import { Loader2, Lightbulb, CheckCircle, XCircle, Code, FunctionSquare, RefreshCw, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const CodeEditor = dynamic(() => import('@/components/lessons/code-editor'), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[300px] md:h-[400px] lg:h-[450px] rounded-md" />,
});

const ExecutionPanel = dynamic(() => import('@/components/sandbox/ExecutionPanel'), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[200px] rounded-md" />,
});

const CodeExerciseComponent = dynamic(() => import('@/components/exercises/CodeExerciseComponent'), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[400px] rounded-md" />,
});





export default function AdaptiveExercise({ exercises, userId, lessonTitle }: { exercises: Exercise[], userId: string, lessonTitle: string }) {
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [longFormAnswer, setLongFormAnswer] = useState("");
    const [fibAnswers, setFibAnswers] = useState<string[]>([]);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [fibCorrectness, setFibCorrectness] = useState<boolean[]>([]);
    const [isGrading, setIsGrading] = useState(false);
    const [feedback, setFeedback] = useState<GradeLongFormAnswerOutput | null>(null);
    const [userResponses, setUserResponses] = useState<Map<string, UserExerciseResponse>>(new Map());
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
    const [isHintVisible, setIsHintVisible] = useState(false);
    const { toast } = useToast();

    const lessonId = exercises.length > 0 ? exercises[0].lessonId : null;
    const totalExercises = exercises.length;
    const currentExercise = exercises[currentExerciseIndex];

    const resetForNewQuestion = () => {
        setSelectedAnswer(null);
        setLongFormAnswer("");
        setIsAnswered(false);
        setIsCorrect(null);
        setFeedback(null);
        setIsHintVisible(false);
        setExecutionResult(null);

        if (currentExercise?.type === 'fill_in_the_blanks') {
            const blankCount = currentExercise.correctAnswers.length;
            setFibAnswers(Array(blankCount).fill(""));
            setFibCorrectness(Array(blankCount).fill(false));
        }
    };

    const handleRunCode = async () => {
        if (!longFormAnswer.trim()) return;

        setIsExecuting(true);
        setExecutionResult(null);

        try {
            const result = await executeCode({
                code: longFormAnswer,
                language: (currentExercise as any).language || undefined, // Let auto-detection work if no language specified
                autoDetect: true, // Enable auto-detection
                userId: userId
            });

            setExecutionResult(result);
            toast({
                title: "Code Executed",
                description: result.status === 'success' ? "Code ran successfully!" : "Check the output for details."
            });
        } catch (error) {
            console.error('Code execution failed:', error);
            toast({
                variant: 'destructive',
                title: 'Execution Failed',
                description: 'Unable to execute code. Please try again.'
            });
        } finally {
            setIsExecuting(false);
        }
    };

    useEffect(() => {
        if (!userId || !lessonId) {
            setIsLoading(false);
            return;
        };
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [progress, responses] = await Promise.all([
                    getUserProgress(userId),
                    getUserResponsesForLesson(userId, lessonId)
                ]);

                if (progress.exerciseProgress && progress.exerciseProgress[lessonId]) {
                    const savedIndex = progress.exerciseProgress[lessonId].currentExerciseIndex;
                    setCurrentExerciseIndex(savedIndex < totalExercises ? savedIndex : 0);
                }
                setUserResponses(new Map(responses.map(r => [r.exerciseId, r])));

            } catch (error) {
                console.error("Failed to load user progress:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [userId, lessonId, totalExercises]);

    useEffect(() => {
        if (isLoading || !currentExercise) return;

        resetForNewQuestion();

        const previousResponse = userResponses.get(currentExercise.id);
        if (previousResponse) {
            setIsAnswered(true);
            setIsCorrect(previousResponse.isCorrect);

            if (currentExercise.type === 'long_form') {
                setLongFormAnswer(previousResponse.submittedAnswer as string);
                if (typeof previousResponse.feedback === 'string') {
                    setFeedback({ isCorrect: previousResponse.isCorrect, score: previousResponse.score, feedback: previousResponse.feedback } as GradeLongFormAnswerOutput);
                }
            } else if (currentExercise.type === 'true_false') {
                setSelectedAnswer(previousResponse.submittedAnswer ? 'True' : 'False');
            } else if (currentExercise.type === 'fill_in_the_blanks') {
                const submitted = previousResponse.submittedAnswer as string[];
                setFibAnswers(submitted);
                const correctness = submitted.map((ans, i) => ans.trim().toLowerCase() === currentExercise.correctAnswers[i].trim().toLowerCase());
                setFibCorrectness(correctness);
            } else { // MCQ
                setSelectedAnswer(previousResponse.submittedAnswer as string);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentExerciseIndex, isLoading, userResponses, currentExercise]);

    const handleFibAnswerChange = (index: number, value: string) => {
        const newAnswers = [...fibAnswers];
        newAnswers[index] = value;
        setFibAnswers(newAnswers);
    };





    const handleAnswerSubmit = async () => {
        if (!currentExercise) return;

        let correct = false;
        let score = 0;
        let submittedAnswer: string | boolean | string[] = selectedAnswer!;
        let aiFeedback: GradeLongFormAnswerOutput | null = null;

        switch (currentExercise.type) {
            case 'mcq':
                if (!selectedAnswer) return;
                correct = selectedAnswer === currentExercise.correctAnswer;
                score = correct ? 100 : 0;
                break;
            case 'true_false':
                if (!selectedAnswer) return;
                submittedAnswer = selectedAnswer === 'True';
                correct = (currentExercise.correctAnswer === submittedAnswer);
                score = correct ? 100 : 0;
                break;
            case 'long_form':
                submittedAnswer = longFormAnswer;
                setIsGrading(true);
                try {
                    const result = await gradeLongFormAnswer({
                        question: (currentExercise as any).question,
                        evaluationCriteria: currentExercise.evaluationCriteria,
                        studentAnswer: longFormAnswer,
                    });
                    aiFeedback = result;
                    setFeedback(result);
                    correct = result.isCorrect;
                    score = result.score;
                    toast({
                        title: "Answer Graded!",
                        description: "Your detailed feedback is available below.",
                    });
                } catch (error) {
                    console.error("Failed to grade answer:", error);
                    toast({ variant: "destructive", title: "AI Error", description: "Could not get feedback from the AI." });
                    setIsGrading(false);
                    return;
                } finally {
                    setIsGrading(false);
                }
                break;
            case 'fill_in_the_blanks':
                submittedAnswer = fibAnswers;
                const correctnessArray = fibAnswers.map((ans, i) => ans.trim().toLowerCase() === currentExercise.correctAnswers[i].trim().toLowerCase());
                setFibCorrectness(correctnessArray);
                correct = correctnessArray.every(c => c);
                score = correct ? 100 : 0;
                break;
        }

        setIsAnswered(true);
        setIsCorrect(correct);

        try {
            await saveExerciseAttempt(
                userId,
                lessonTitle,
                currentExercise,
                submittedAnswer,
                correct,
                score,
                aiFeedback?.feedback
            );

            // Optimistically update local state
            const prevResponse = userResponses.get(currentExercise.id);
            const newResponse: UserExerciseResponse = {
                id: `${userId}_${currentExercise.id}`,
                userId,
                lessonId: lessonId!,
                exerciseId: currentExercise.id,
                question: currentExercise.type === 'fill_in_the_blanks' ? currentExercise.questionParts.join('___') : (currentExercise as any).question,
                lessonTitle: lessonTitle,
                submittedAnswer,
                isCorrect: correct,
                score,
                feedback: aiFeedback?.feedback,
                submittedAt: Date.now(),
                attempts: (prevResponse?.attempts || 0) + 1,
            };
            setUserResponses(prev => new Map(prev).set(currentExercise.id, newResponse));

            if (currentExercise.type !== 'long_form') {
                toast({
                    title: correct ? "Correct!" : "Not quite",
                    description: correct ? "Great job! Your progress has been updated." : "Don't worry, keep practicing!",
                });
            }
        } catch (error) {
            console.error("Failed to save exercise result:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not save your progress. Please try again.",
            });
        }
    };

    const handleNext = async () => {
        if (!lessonId) return;

        const nextIndex = currentExerciseIndex + 1;

        try {
            await updateUserExerciseIndex(userId, lessonId, nextIndex);
        } catch (error) {
            console.error("Failed to save progress:", error);
            toast({ variant: "destructive", title: "Save Error", description: "Your progress could not be saved." });
            return;
        }

        setCurrentExerciseIndex(nextIndex);

        if (nextIndex >= totalExercises) {
            toast({ title: "Lesson Practice Complete!", description: "You've finished all the exercises for this lesson. Great job!" });
        }
    };

    const handleTryAgain = () => {
        resetForNewQuestion();
    };


    const handlePracticeAgain = async () => {
        if (!lessonId) return;
        try {
            await updateUserExerciseIndex(userId, lessonId, 0);
            setCurrentExerciseIndex(0);
            // Reset responses for a fresh start
            setUserResponses(new Map());
        } catch (error) {
            console.error("Failed to reset progress:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not reset progress." });
        }
    };

    const showHint = () => {
        setIsHintVisible(prev => !prev);
    }

    const renderExercise = () => {
        if (!currentExercise) return null;

        switch (currentExercise.type) {
            case 'mcq':
                const mcq = currentExercise as McqExercise;
                return (
                    <RadioGroup value={selectedAnswer ?? ''} onValueChange={setSelectedAnswer} disabled={isAnswered}>
                        {mcq.options.map((option, index) => (
                            <div key={index} className={cn("flex items-center space-x-2 p-3 rounded-md border transition-colors", isAnswered && option === mcq.correctAnswer && "border-primary bg-primary/20", isAnswered && selectedAnswer === option && option !== mcq.correctAnswer && "border-destructive bg-destructive/20", !isAnswered && "hover:bg-accent/20")}>
                                <RadioGroupItem value={option} id={`option-${index}`} />
                                <Label htmlFor={`option-${index}`} className="w-full cursor-pointer">{option}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                );
            case 'true_false':
                const tf = currentExercise as TrueFalseExercise;
                return (
                    <RadioGroup value={selectedAnswer ?? ''} onValueChange={setSelectedAnswer} disabled={isAnswered}>
                        {['True', 'False'].map((option, index) => (
                            <div key={index} className={cn("flex items-center space-x-2 p-3 rounded-md border transition-colors", isAnswered && String(tf.correctAnswer).toLowerCase() === option.toLowerCase() && "border-primary bg-primary/20", isAnswered && selectedAnswer === option && String(tf.correctAnswer).toLowerCase() !== option.toLowerCase() && "border-destructive bg-destructive/20", !isAnswered && "hover:bg-accent/20")}>
                                <RadioGroupItem value={option} id={`option-${index}`} />
                                <Label htmlFor={`option-${index}`} className="w-full cursor-pointer">{option}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                );
            case 'long_form':
                const lfExercise = currentExercise as LongFormExercise;
                if (lfExercise.category === 'code') {
                    return (
                        <div className="space-y-4">
                            <div id="exercise-instructions" className="sr-only">
                                Exercise: {lfExercise.question}. Write your {lfExercise.language} code solution below.
                                Use Ctrl+Enter to trigger code execution shortcuts.
                            </div>
                            <CodeEditor
                                value={longFormAnswer}
                                onValueChange={setLongFormAnswer}
                                disabled={isAnswered || isGrading}
                                placeholder="Write your code here..."
                                language={lfExercise.language}
                                aria-label={`Code editor for ${lfExercise.language} exercise: ${lfExercise.question}`}
                                aria-describedby="exercise-instructions"
                                onRunCode={handleRunCode}
                                isExecuting={isExecuting}
                                showRunButton={true}
                            />

                            {/* Execution Panel */}
                            <div className="mt-4">
                                <ExecutionPanel
                                    result={executionResult}
                                    isLoading={isExecuting}
                                    language={lfExercise.language}
                                    code={longFormAnswer}
                                />
                            </div>

                            {/* Run Button - Always Visible */}
                            {!isAnswered && (
                                <div className="mt-4 flex gap-2 justify-center md:justify-start">
                                    <Button
                                        onClick={handleRunCode}
                                        variant="secondary"
                                        size="sm"
                                        disabled={isExecuting || !longFormAnswer.trim()}
                                    >
                                        {isExecuting ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Play className="mr-2 h-4 w-4" />
                                        )}
                                        Run Code
                                    </Button>
                                </div>
                            )}

                        </div>
                    );
                }
                // Check if this is a code exercise based on multiple indicators
                const isCodeExercise = lfExercise.language || 
                    (lfExercise as any).category === 'code' ||
                    lfExercise.evaluationCriteria?.toLowerCase().includes('code') ||
                    lfExercise.evaluationCriteria?.toLowerCase().includes('function') ||
                    lfExercise.evaluationCriteria?.toLowerCase().includes('program') ||
                    lfExercise.evaluationCriteria?.toLowerCase().includes('python') ||
                    lfExercise.evaluationCriteria?.toLowerCase().includes('javascript') ||
                    lfExercise.evaluationCriteria?.toLowerCase().includes('java') ||
                    (lfExercise as any).question?.toLowerCase().includes('function') ||
                    (lfExercise as any).question?.toLowerCase().includes('code') ||
                    (lfExercise as any).question?.toLowerCase().includes('program') ||
                    (lfExercise as any).question?.toLowerCase().includes('write a') ||
                    (lfExercise as any).question?.toLowerCase().includes('def ') ||
                    (lfExercise as any).question?.toLowerCase().includes('print');

                if (isCodeExercise) {
                    return (
                        <div className="space-y-4">
                            <CodeEditor
                                value={longFormAnswer}
                                onValueChange={setLongFormAnswer}
                                disabled={isAnswered || isGrading}
                                placeholder="Write your code here..."
                                language={lfExercise.language || 'python'}
                                aria-label={`Code editor for ${lfExercise.language || 'code'} exercise: ${lfExercise.question}`}
                                onRunCode={handleRunCode}
                                isExecuting={isExecuting}
                                showRunButton={true}
                            />

                            {/* Execution Panel */}
                            <div className="mt-4">
                                <ExecutionPanel
                                    result={executionResult}
                                    isLoading={isExecuting}
                                    language={lfExercise.language || 'python'}
                                    code={longFormAnswer}
                                />
                            </div>

                            {/* Run Button */}
                            {!isAnswered && (
                                <div className="mt-4 flex gap-2 justify-center md:justify-start">
                                    <Button
                                        onClick={handleRunCode}
                                        variant="secondary"
                                        size="sm"
                                        disabled={isExecuting || !longFormAnswer.trim()}
                                    >
                                        {isExecuting ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Play className="mr-2 h-4 w-4" />
                                        )}
                                        Run Code
                                    </Button>
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground mt-2">{currentExercise.evaluationCriteria}</p>
                        </div>
                    );
                }

                return (
                    <div className="space-y-4">
                        <Textarea
                            value={longFormAnswer}
                            onChange={(e) => setLongFormAnswer(e.target.value)}
                            placeholder="Write your detailed solution here..."
                            rows={8}
                            disabled={isAnswered || isGrading}
                        />
                        
                        {/* Always show run button for long form exercises */}
                        {!isAnswered && (
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleRunCode}
                                    variant="secondary"
                                    size="sm"
                                    disabled={isExecuting || !longFormAnswer.trim()}
                                >
                                    {isExecuting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Play className="mr-2 h-4 w-4" />
                                    )}
                                    Run Code
                                </Button>
                            </div>
                        )}

                        {/* Execution Panel */}
                        {executionResult && (
                            <div className="mt-4">
                                <ExecutionPanel
                                    result={executionResult}
                                    isLoading={isExecuting}
                                    language="python" // Default to Python for auto-detection
                                    code={longFormAnswer}
                                />
                            </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground mt-2">{currentExercise.evaluationCriteria}</p>
                    </div>
                );
            case 'fill_in_the_blanks':
                const fib = currentExercise as FillInTheBlanksExercise;
                return (
                    <div className="flex flex-wrap items-center gap-2 text-lg">
                        {fib.questionParts.map((part, index) => (
                            <React.Fragment key={index}>
                                <span>{part}</span>
                                {index < fib.correctAnswers.length && (
                                    <Input
                                        type="text"
                                        value={fibAnswers[index] || ''}
                                        onChange={(e) => handleFibAnswerChange(index, e.target.value)}
                                        disabled={isAnswered}
                                        className={cn("w-32 inline-block", isAnswered && (fibCorrectness[index] ? "border-primary ring-2 ring-primary" : "border-destructive ring-2 ring-destructive"))}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                );
            case 'code':
                const codeExercise = currentExercise as CodeExercise;
                return (
                    <CodeExerciseComponent
                        exercise={codeExercise}
                        userId={userId}
                        onComplete={(result) => {
                            setIsAnswered(true);
                            setIsCorrect(result.isCorrect);
                            // Save the result
                            saveExerciseAttempt(
                                userId,
                                lessonTitle,
                                currentExercise,
                                result.score.toString(),
                                result.isCorrect,
                                result.score,
                                result.feedback
                            ).catch(console.error);
                        }}
                        disabled={isAnswered}
                    />
                );
            default:
                return <p>Unsupported exercise type.</p>;
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 flex justify-center items-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!exercises || totalExercises === 0) {
        return (
            <div className="p-6 text-center">
                <p>No exercises available for this lesson yet.</p>
            </div>
        );
    }

    if (currentExerciseIndex >= totalExercises) {
        return (
            <div className="p-6 text-center min-h-[300px] flex flex-col justify-center items-center">
                <CheckCircle className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold">Practice Complete!</h3>
                <p className="text-muted-foreground mt-2 mb-4">You've answered all the questions for this lesson. Great job!</p>
                <Button onClick={handlePracticeAgain}>
                    Practice Again
                </Button>
            </div>
        )
    }

    return (
        <div className="animate-in fade-in-0 zoom-in-95 h-full flex flex-col">
            <div className="mb-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-headline text-xl font-semibold">Practice Question {currentExerciseIndex + 1} / {totalExercises}</h3>
                    {currentExercise.category && (
                        <Badge variant="secondary" className="capitalize">
                            {currentExercise.category === 'code' && <Code className="mr-1.5 h-3 w-3" />}
                            {currentExercise.category === 'math' && <FunctionSquare className="mr-1.5 h-3 w-3" />}
                            {currentExercise.category}
                        </Badge>
                    )}
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Difficulty: {Array.from({ length: 3 }).map((_, i) => (
                        <span key={i} className={cn(i < currentExercise.difficulty ? 'text-accent' : 'text-muted-foreground/50')}>⭐</span>
                    ))}
                </p>
            </div>
            <>
                <p className="text-lg mb-6">{currentExercise.type !== 'fill_in_the_blanks' && (currentExercise as any).question}</p>
                {renderExercise()}

                <div className="mt-4 space-y-2">
                    {currentExercise.hint && !isAnswered && (
                        <Button variant="outline" size="sm" onClick={showHint}>
                            <Lightbulb className="mr-2 h-4 w-4" />
                            Show Hint
                        </Button>
                    )}
                    {isHintVisible && currentExercise.hint && (
                        <Alert className="animate-in fade-in-50">
                            <Lightbulb className="h-4 w-4" />
                            <AlertTitle>Hint</AlertTitle>
                            <AlertDescription>{currentExercise.hint}</AlertDescription>
                        </Alert>
                    )}
                    {isGrading && (
                        <div className="flex items-center text-secondary-foreground text-sm">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Grading your answer...
                        </div>
                    )}
                </div>


                {isAnswered && (
                    <div className="mt-4 space-y-4">
                        {currentExercise.type !== 'long_form' && currentExercise.explanation && (
                            <Card className={cn(isCorrect ? "bg-primary/10 border-primary/50" : "bg-destructive/10 border-destructive/50")}>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        {isCorrect ? <CheckCircle className="text-primary" /> : <XCircle className="text-destructive" />}
                                        Explanation
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-secondary-foreground">{currentExercise.explanation}</p>
                                </CardContent>
                            </Card>
                        )}

                        {feedback && 'feedback' in feedback && (
                            <Card className={cn(feedback.isCorrect ? "bg-primary/10 border-primary/50" : "bg-destructive/10 border-destructive/50")}>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {feedback.isCorrect ? <CheckCircle className="text-primary" /> : <XCircle className="text-destructive" />}
                                            AI Feedback
                                        </div>
                                        <Badge variant={feedback.isCorrect ? "default" : "destructive"}>Score: {feedback.score}/100</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-secondary-foreground whitespace-pre-wrap">{feedback.feedback}</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-2">
                    {!isAnswered ? (
                        <Button onClick={handleAnswerSubmit} disabled={isGrading || (currentExercise.type !== 'long_form' && !selectedAnswer) || (currentExercise.type === 'long_form' && !longFormAnswer)}>
                            {isGrading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Grading...</> : 'Submit'}
                        </Button>
                    ) : isCorrect ? (
                        <Button onClick={handleNext}>Next Question</Button>
                    ) : (
                        <Button onClick={handleTryAgain} variant="secondary">
                            <RefreshCw className="mr-2 h-4 w-4" /> Try Again
                        </Button>
                    )}
                </div>
            </>
        </div>
    );
}
