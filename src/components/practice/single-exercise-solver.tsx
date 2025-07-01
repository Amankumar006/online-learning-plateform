
"use client";

import React, { useState, useEffect } from "react";
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
import CodeEditor from "@/components/lessons/code-editor";
import MathEditor from "@/components/lessons/math-editor";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface SingleExerciseSolverProps {
    exercise: Exercise;
    userId: string;
    onSolved: () => void;
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
        <FormattedQuestion text={exercise.question} />

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
  if (!isLoading && !result) {
    return null; 
  }

  const hasOutput = result?.stdout && result.stdout.length > 0;
  const hasError = result?.stderr && result.stderr.length > 0;

  return (
    <div className="space-y-2">
       <h4 className="font-semibold text-sm flex items-center gap-2"><Terminal className="h-4 w-4" /> Simulated Console Output</h4>
        <div className="p-4 bg-black rounded-md text-sm text-white font-mono min-h-[100px] whitespace-pre-wrap">
            {isLoading ? (
                 <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-4 w-4" /> Running simulation...
                 </div>
            ) : (
                <>
                    {hasOutput && <pre>{result.stdout}</pre>}
                    {hasError && <pre className="text-red-400">{result.stderr}</pre>}
                    {!hasOutput && !hasError && <p className="text-gray-400">Execution finished with no output.</p>}
                </>
            )}
        </div>
    </div>
  );
};


export default function SingleExerciseSolver({ exercise, userId, onSolved, initialResponse = null }: SingleExerciseSolverProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [longFormAnswer, setLongFormAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [feedback, setFeedback] = useState<GradeLongFormAnswerOutput | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulateCodeExecutionOutput | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setSelectedAnswer(null);
    setLongFormAnswer("");
    setIsAnswered(false);
    setIsCorrect(null);
    setFeedback(null);
    setSimulationResult(null);
    
    if (initialResponse) {
      setIsAnswered(true);
      setIsCorrect(initialResponse.isCorrect);

      if (exercise.type === 'long_form') {
        setLongFormAnswer(initialResponse.submittedAnswer as string);
        if (initialResponse.feedback) {
          setFeedback({
            isCorrect: initialResponse.isCorrect,
            score: initialResponse.score,
            feedback: initialResponse.feedback,
          });
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
        submittedAnswer = longFormAnswer;
        setIsGrading(true);
        try {
            const result = await gradeLongFormAnswer({
                question: exercise.question,
                evaluationCriteria: exercise.evaluationCriteria,
                studentAnswer: longFormAnswer,
            });
            aiFeedback = result;
            setFeedback(result);
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
            exercise.lessonId || 'custom',
            exercise.id,
            submittedAnswer,
            correct,
            score,
            aiFeedback?.feedback
        );
         if (exercise.type !== 'long_form') {
            toast({ title: correct ? "Correct!" : "Not quite" });
        }
    } catch (error) {
        console.error("Failed to save exercise result:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save your progress." });
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
      toast({ title: "Simulation Complete", description: "The AI has simulated the execution of your code." });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Simulation Failed', description: 'The AI could not simulate the code execution.' });
    } finally {
      setIsSimulating(false);
    }
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
                        <CodeEditor value={longFormAnswer} onValueChange={setLongFormAnswer} disabled={isAnswered || isGrading} language={lfExercise.language} />
                        <ConsoleOutput result={simulationResult} isLoading={isSimulating} />
                    </div>
                 );
            }
             if (lfExercise.category === 'math') {
                 return <MathEditor value={longFormAnswer} onValueChange={setLongFormAnswer} disabled={isAnswered || isGrading} />;
            }
            return <Textarea value={longFormAnswer} onChange={(e) => setLongFormAnswer(e.target.value)} rows={10} disabled={isAnswered || isGrading} />;
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
        
        <div className="flex-shrink-0 border-t p-4 flex justify-end gap-2 bg-background">
            {exercise.type === 'long_form' && exercise.category === 'code' && !isAnswered && (
              <Button onClick={handleRunCode} variant="outline" disabled={isSimulating || !longFormAnswer.trim()}>
                {isSimulating ? <Loader2 className="animate-spin" /> : <Play />}
                Run Code
              </Button>
            )}

            {initialResponse ? (
                <Button onClick={onSolved} size="lg">Return to Practice</Button>
            ) : !isAnswered ? (
                <Button onClick={handleAnswerSubmit} disabled={(!selectedAnswer && !longFormAnswer) || isGrading || isSimulating} size="lg">
                    {isGrading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Grading...</> : 'Submit Answer'}
                </Button>
            ) : (
                <Button onClick={onSolved} size="lg">Finish & Return</Button>
            )}
        </div>
    </div>
  );
}
