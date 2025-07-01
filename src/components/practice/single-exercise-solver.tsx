
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Exercise, McqExercise, TrueFalseExercise, LongFormExercise } from "@/lib/data";
import { saveExerciseAttempt } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { gradeLongFormAnswer, GradeLongFormAnswerOutput } from "@/ai/flows/grade-long-form-answer";
import { Loader2, CheckCircle, XCircle, Code, FunctionSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CodeEditor from "@/components/lessons/code-editor";
import MathEditor from "@/components/lessons/math-editor";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface SingleExerciseSolverProps {
    exercise: Exercise;
    userId: string;
    onSolved: () => void;
}

export default function SingleExerciseSolver({ exercise, userId, onSolved }: SingleExerciseSolverProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [longFormAnswer, setLongFormAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [feedback, setFeedback] = useState<GradeLongFormAnswerOutput | null>(null);
  const { toast } = useToast();

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
                submittedAnswer = selectedAnswer === 'True';
                correct = (exercise.correctAnswer === submittedAnswer);
                break;
        }
        score = correct ? 100 : 0;
    }
    
    setIsAnswered(true);
    setIsCorrect(correct);
    
    try {
        await saveExerciseAttempt(
            userId, 
            exercise.lessonId || 'custom', // Use a placeholder for custom exercises
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

  const renderExercise = () => {
    switch (exercise.type) {
        case 'mcq':
            const mcq = exercise as McqExercise;
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
            const tf = exercise as TrueFalseExercise;
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
            const lfExercise = exercise as LongFormExercise;
            if (lfExercise.category === 'code') {
                 return <CodeEditor value={longFormAnswer} onValueChange={setLongFormAnswer} disabled={isAnswered || isGrading} language={lfExercise.language} />;
            }
             if (lfExercise.category === 'math') {
                 return <MathEditor value={longFormAnswer} onValueChange={setLongFormAnswer} disabled={isAnswered || isGrading} />;
            }
            return <Textarea value={longFormAnswer} onChange={(e) => setLongFormAnswer(e.target.value)} rows={8} disabled={isAnswered || isGrading} />;
        default:
            return <p>Unsupported exercise type.</p>;
    }
  };

  return (
    <div className="animate-in fade-in-0 zoom-in-95 p-1">
        <div className="mb-4">
            <h3 className="font-headline text-lg font-semibold">{exercise.question}</h3>
            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="capitalize">{exercise.category}</Badge>
                <Badge variant="outline">Difficulty: {exercise.difficulty}/3</Badge>
            </div>
        </div>
        <div className="space-y-4">
            {renderExercise()}

            {isAnswered && (
                 <div className="mt-4 space-y-4">
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
        <div className="mt-6 flex justify-end">
            {!isAnswered ? (
            <Button onClick={handleAnswerSubmit} disabled={(!selectedAnswer && !longFormAnswer) || isGrading}>
                {isGrading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Grading...</> : 'Submit Answer'}
            </Button>
            ) : (
            <Button onClick={onSolved}>Close</Button>
            )}
        </div>
    </div>
  );
}
