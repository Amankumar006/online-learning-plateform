
"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Exercise, McqExercise, TrueFalseExercise, LongFormExercise, UserExerciseResponse } from "@/lib/data";
import { saveExerciseAttempt } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { gradeLongFormAnswer, GradeLongFormAnswerOutput } from "@/ai/flows/grade-long-form-answer";
import { simulateCodeExecution, SimulateCodeExecutionOutput } from "@/ai/flows/simulate-code-execution";
import { Loader2, CheckCircle, XCircle, Lightbulb, Code, BarChartHorizontal, Tags, FunctionSquare, Terminal, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import ImageUploader from "./image-uploader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GradeMathSolutionOutput } from "@/ai/flows/grade-math-solution";
import { Skeleton } from "../ui/skeleton";

const CodeEditor = dynamic(() => import('@/components/lessons/code-editor'), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[400px] rounded-md" />,
});

const MathSolutionGrader = dynamic(() => import("../lessons/math-solution-grader"), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[550px] rounded-md" />,
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
        <FormattedQuestion text={exercise.type !== 'fill_in_the_blanks' ? exercise.question : exercise.questionParts.join(' ___ ')} />

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

const ConsoleOutput = ({ result, isLoading }: { result: SimulateCodeExecutionOutput | null, isLoading: boolean }) => {
  const hasOutput = result?.stdout && result.stdout.length > 0;
  const hasError = result?.stderr && result.stderr.length > 0;

  return (
    <div className="p-4 bg-muted/50 font-mono text-sm min-h-[200px] whitespace-pre-wrap text-foreground">
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="animate-spin h-4 w-4" /> Running simulation...
        </div>
      ) : result ? (
        <>
          {hasOutput && <pre>{result.stdout}</pre>}
          {hasError && <pre className="text-red-500">{result.stderr}</pre>}
          {!hasOutput && !hasError && (
            <p className="text-muted-foreground">Execution finished with no output.</p>
          )}
        </>
      ) : (
        <div className="text-muted-foreground">Click "Run & Analyze" to see the output here.</div>
      )}
    </div>
  );
};

const AiAnalysisOutput = ({ result, isLoading, onApplySuggestion }: { result: SimulateCodeExecutionOutput | null, isLoading: boolean, onApplySuggestion: (code: string) => void }) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 text-muted-foreground min-h-[200px]">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <p>Analyzing your code...</p>
            </div>
        )
    }
    
    if (result) {
         return (
            <div className="space-y-4 p-4 bg-muted/50 min-h-[200px]">
                <Card className="bg-background/50 border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Complexity Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-8">
                        <div>
                            <p className="text-sm text-muted-foreground">Time</p>
                            <p className="font-mono text-lg font-bold">{result.complexity.time}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Space</p>
                            <p className="font-mono text-lg font-bold">{result.complexity.space}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-background/50 border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Code Analysis Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{result.analysis.summary}</p>
                    </CardContent>
                </Card>

                {result.analysis.suggestions && result.analysis.suggestions.length > 0 && (
                     <Card className="bg-background/50 border-border/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Suggestions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {result.analysis.suggestions.map((suggestion, index) => (
                                <div key={index} className="border-t pt-4 first:border-t-0 first:pt-0">
                                    <p className="text-sm font-semibold">{suggestion.suggestion} (Line {suggestion.lineNumber})</p>
                                    <div className="my-2 not-prose">
                                        <div className="flex justify-between items-center bg-muted rounded-t-lg px-4 py-1">
                                            <span className="text-xs font-semibold">Suggested Code</span>
                                            <Button variant="ghost" size="sm" className="h-7" onClick={() => onApplySuggestion(suggestion.code)}>
                                                Apply
                                            </Button>
                                        </div>
                                        <div className="bg-background border rounded-b-lg p-2 overflow-x-auto font-mono text-xs">
                                            <pre><code>{suggestion.code}</code></pre>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        )
    }

    return (
        <div className="text-center text-muted-foreground p-8 min-h-[200px] flex items-center justify-center">
            <p>Click "Run & Analyze" to get AI feedback on your code.</p>
        </div>
    )
}


export default function SingleExerciseSolver({ exercise, userId, onSolved, lessonTitle, initialResponse = null }: SingleExerciseSolverProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [longFormAnswer, setLongFormAnswer] = useState("");
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [feedback, setFeedback] = useState<GradeLongFormAnswerOutput | GradeMathSolutionOutput | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulateCodeExecutionOutput | null>(null);
  const [activeOutputTab, setActiveOutputTab] = useState("console");
  const { toast } = useToast();

  useEffect(() => {
    setSelectedAnswer(null);
    setLongFormAnswer("");
    setImageDataUri(null);
    setIsAnswered(false);
    setIsCorrect(null);
    setFeedback(null);
    setSimulationResult(null);
    setActiveOutputTab("console");
    
    if (initialResponse) {
      setIsAnswered(true);
      setIsCorrect(initialResponse.isCorrect);

      if (exercise.type === 'long_form') {
        setLongFormAnswer(initialResponse.submittedAnswer as string);
        setImageDataUri(initialResponse.imageDataUri || null);
        if (initialResponse.feedback) {
            if (typeof initialResponse.feedback === 'object' && initialResponse.feedback !== null && 'overallScore' in initialResponse.feedback) {
                setFeedback(initialResponse.feedback as GradeMathSolutionOutput);
            } else if (typeof initialResponse.feedback === 'string') {
                 setFeedback({
                    isCorrect: initialResponse.isCorrect,
                    score: initialResponse.score,
                    feedback: initialResponse.feedback,
                } as GradeLongFormAnswerOutput);
            }
        }
      } else if (exercise.type === 'true_false') {
        setSelectedAnswer(initialResponse.submittedAnswer ? 'True' : 'False');
      } else { 
        setSelectedAnswer(initialResponse.submittedAnswer as string);
      }
    }
  }, [exercise, initialResponse]);


  const handleAnswerSubmit = async () => {
    let correct = false;
    let score = 0;
    let submittedAnswer: string | boolean = selectedAnswer!;
    let aiFeedback: GradeLongFormAnswerOutput | null = null;
    
    if (exercise.type === 'long_form') {
        if (!longFormAnswer && !imageDataUri) {
            toast({
                variant: "destructive",
                title: "No Answer",
                description: "Please provide a typed answer or upload an image of your work.",
            });
            return;
        }
        submittedAnswer = longFormAnswer;
        setIsGrading(true);
        try {
            const result = await gradeLongFormAnswer({
                question: exercise.question,
                evaluationCriteria: exercise.evaluationCriteria,
                studentAnswer: longFormAnswer,
                imageDataUri: imageDataUri || undefined,
            });
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
    } else {
        if (!selectedAnswer) return;
        switch (exercise.type) {
            case 'mcq':
                correct = selectedAnswer === exercise.correctAnswer;
                break;
            case 'true_false':
                correct = (exercise.correctAnswer as unknown as string === String(selectedAnswer === 'True').toLowerCase());
                break;
        }
        score = correct ? 100 : 0;
    }
    
    setIsAnswered(true);
    setIsCorrect(correct);
    
    try {
        await saveExerciseAttempt(
            userId, 
            lessonTitle,
            exercise,
            submittedAnswer,
            correct,
            score,
            aiFeedback?.feedback,
            imageDataUri
        );
         if (exercise.type !== 'long_form') {
            toast({ title: correct ? "Correct!" : "Not quite" });
        }
    } catch (error) {
        console.error("Failed to save exercise result:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save your progress." });
    }
  };

  const handleMathGraded = async (result: GradeMathSolutionOutput, studentSolution: string) => {
    setFeedback(result);
    setIsAnswered(true);
    setIsCorrect(result.isSolutionCorrect);

    try {
        await saveExerciseAttempt(
            userId,
            lessonTitle,
            exercise,
            studentSolution,
            result.isSolutionCorrect,
            result.overallScore,
            result, // Save the entire feedback object
            null // No image for math grader
        );
    } catch (error) {
        console.error("Failed to save math exercise result:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not save your progress.",
        });
    }
  };

  const handleRunCode = async () => {
    const codeExercise = exercise as LongFormExercise;
    if (exercise.type !== 'long_form' || !codeExercise.language) return;

    setIsSimulating(true);
    setSimulationResult(null);
    try {
      const result = await simulateCodeExecution({
        code: longFormAnswer,
        language: codeExercise.language,
      });
      setSimulationResult(result);
      toast({ title: "Analysis Complete", description: "The AI has simulated and analyzed your code." });
      setActiveOutputTab("analysis"); // Switch to analysis tab after running
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Simulation Failed', description: 'The AI could not simulate the code execution.' });
      setActiveOutputTab("console");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleApplySuggestion = (code: string) => {
      setLongFormAnswer(code);
      toast({
          title: "Suggestion Applied!",
          description: "The code in the editor has been updated.",
      });
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
                        <CodeEditor
                            value={longFormAnswer}
                            onValueChange={setLongFormAnswer}
                            disabled={isAnswered || isGrading}
                            language={lfExercise.language}
                            placeholder="Write your code here..."
                        />
                        <div className="rounded-lg border bg-background overflow-hidden">
                            <Tabs value={activeOutputTab} onValueChange={setActiveOutputTab}>
                                <div className="flex items-center justify-between p-2 px-4 bg-muted border-b">
                                    <TabsList className="grid grid-cols-2 bg-transparent p-0 h-auto">
                                        <TabsTrigger value="console" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs h-8">Console</TabsTrigger>
                                        <TabsTrigger value="analysis" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs h-8">AI Analysis</TabsTrigger>
                                    </TabsList>
                                    {!isAnswered && (
                                        <Button onClick={handleRunCode} variant="secondary" size="sm" disabled={isSimulating || !longFormAnswer.trim()}>
                                            {isSimulating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                            Run & Analyze
                                        </Button>
                                    )}
                                </div>
                                <TabsContent value="console" className="mt-0"><ConsoleOutput result={simulationResult} isLoading={isSimulating} /></TabsContent>
                                <TabsContent value="analysis" className="mt-0"><AiAnalysisOutput result={simulationResult} isLoading={isSimulating} onApplySuggestion={handleApplySuggestion} /></TabsContent>
                            </Tabs>
                        </div>
                    </div>
                 );
            }
             
            if (lfExercise.category === 'math') {
                return (
                    <MathSolutionGrader 
                        exercise={lfExercise} 
                        onGraded={handleMathGraded} 
                        isAnswered={isAnswered}
                        initialFeedback={feedback as GradeMathSolutionOutput || undefined}
                        initialSolution={longFormAnswer}
                    />
                );
            }
            
            // For General long form questions
            return (
                <div className="space-y-6">
                    <Textarea value={longFormAnswer} onChange={(e) => setLongFormAnswer(e.target.value)} rows={8} disabled={isAnswered || isGrading} />
                    <Separator />
                    <ImageUploader 
                        onImageChange={setImageDataUri} 
                        disabled={isAnswered || isGrading} 
                        initialImageUrl={imageDataUri}
                    />
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
                        {feedback && 'feedback' in feedback && (
                             <Card className={cn(feedback.isCorrect ? "bg-primary/10 border-primary/50" : "bg-destructive/10 border-destructive/50")}>
                                <CardHeader><CardTitle className="text-base flex items-center justify-between gap-2"><span>{feedback.isCorrect ? <CheckCircle className="text-primary"/> : <XCircle className="text-destructive" />} AI Feedback</span><Badge variant={feedback.isCorrect ? "default" : "destructive"}>Score: {feedback.score}/100</Badge></CardTitle></CardHeader>
                                <CardContent><p className="text-sm whitespace-pre-wrap">{feedback.feedback}</p></CardContent>
                             </Card>
                        )}
                         {feedback && 'overallFeedback' in feedback && (
                            <Card className={cn(feedback.isSolutionCorrect ? "bg-primary/10 border-primary/50" : "bg-destructive/10 border-destructive/50")}>
                                <CardHeader>
                                     <CardTitle className="text-base flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-2">
                                            {feedback.isSolutionCorrect ? <CheckCircle className="text-primary"/> : <XCircle className="text-destructive" />}
                                            AI Feedback
                                        </span>
                                        <Badge variant={feedback.isSolutionCorrect ? "default" : "destructive"}>Overall Score: {feedback.overallScore}/100</Badge>
                                    </CardTitle>
                                </CardHeader>
                              <CardContent className="space-y-4">
                                 <p className="text-sm font-semibold">Overall Summary:</p>
                                 <p className="text-sm">{feedback.overallFeedback}</p>
                                 <p className="text-sm font-semibold pt-4 border-t">Step-by-Step Analysis:</p>
                                 <div className="space-y-2">
                                    {feedback.stepEvaluations.map((step, index) => (
                                        <div key={index} className="flex items-start gap-3 text-sm p-2 rounded-md bg-background/50">
                                            {step.isCorrect ? <CheckCircle className="h-4 w-4 text-primary mt-1 shrink-0" /> : <XCircle className="h-4 w-4 text-destructive mt-1 shrink-0" />}
                                            <div>
                                                <p className="font-mono text-xs">{`Step ${index + 1}: ${step.step}`}</p>
                                                <p className="text-muted-foreground">{step.feedback}</p>
                                            </div>
                                        </div>
                                    ))}
                                 </div>
                              </CardContent>
                            </Card>
                         )}
                     </div>
                )}
            </div>
        </ScrollArea>
        
        <div className="flex-shrink-0 border-t p-4 flex justify-end gap-2 bg-background">
            {initialResponse ? (
                <Button onClick={onSolved} size="lg">Return to Practice</Button>
            ) : !isAnswered ? (
                <Button onClick={handleAnswerSubmit} disabled={exercise.category === 'math' || (!selectedAnswer && !longFormAnswer && !imageDataUri) || isGrading || isSimulating} size="lg">
                    {isGrading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Grading...</> : 'Submit Answer'}
                </Button>
            ) : (
                <Button onClick={onSolved} size="lg">Finish & Return</Button>
            )}
        </div>
    </div>
  );
}
