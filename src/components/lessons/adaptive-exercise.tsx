
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Exercise, McqExercise, TrueFalseExercise, LongFormExercise } from "@/lib/data";
import { saveExerciseResult } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { gradeLongFormAnswer, GradeLongFormAnswerOutput } from "@/ai/flows/grade-long-form-answer";
import { Loader2, Lightbulb, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdaptiveExercise({ exercises, userId }: { exercises: Exercise[], userId:string }) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [longFormAnswer, setLongFormAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [feedback, setFeedback] = useState<GradeLongFormAnswerOutput | null>(null);
  const [difficulty, setDifficulty] = useState(1);
  const [key, setKey] = useState(0);
  const { toast } = useToast();

  const currentExercise = exercises.length > 0 ? exercises[currentExerciseIndex] : undefined;

  useEffect(() => {
    // This effect can be used to load an exercise based on adaptive difficulty in the future
    // For now, we'll just cycle through them.
  }, [difficulty, exercises]);

  const handleAnswerSubmit = async () => {
    if (!currentExercise) return;
    
    let correct = false;
    let score = 0;

    if (currentExercise.type === 'long_form') {
        setIsGrading(true);
        try {
            const result = await gradeLongFormAnswer({
                question: currentExercise.question,
                evaluationCriteria: currentExercise.evaluationCriteria,
                studentAnswer: longFormAnswer,
            });
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
    } else {
        switch (currentExercise.type) {
            case 'mcq':
                if (!selectedAnswer) return;
                correct = selectedAnswer === currentExercise.correctAnswer;
                break;
            case 'true_false':
                if (!selectedAnswer) return;
                correct = (String(currentExercise.correctAnswer).toLowerCase() === selectedAnswer.toLowerCase());
                break;
        }
        score = correct ? 100 : 0;
    }
    
    setIsAnswered(true);
    setIsCorrect(correct);
    
    try {
        await saveExerciseResult(userId, correct, score);
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

    if (correct) {
      setDifficulty(prev => Math.min(prev + 1, 3));
    } else {
      setDifficulty(prev => Math.max(prev - 1, 1));
    }
  };

  const handleNext = () => {
    setIsAnswered(false);
    setIsCorrect(null);
    setSelectedAnswer(null);
    setLongFormAnswer("");
    setFeedback(null);
    setCurrentExerciseIndex(prevIndex => (prevIndex + 1) % exercises.length);
    setKey(prevKey => prevKey + 1);
  };
  
  const renderExercise = () => {
    if (!currentExercise) return <p>Loading exercise...</p>;

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
            return (
                <div>
                    <Textarea
                        value={longFormAnswer}
                        onChange={(e) => setLongFormAnswer(e.target.value)}
                        placeholder="Write your detailed solution here..."
                        rows={8}
                        disabled={isAnswered || isGrading}
                    />
                     <p className="text-xs text-muted-foreground mt-2">{currentExercise.evaluationCriteria}</p>
                </div>
            );
        default:
            return <p>Unsupported exercise type.</p>;
    }
  };

  if (!exercises || exercises.length === 0) {
    return (
      <div className="p-6 text-center">
        <p>No exercises available for this lesson yet.</p>
      </div>
    );
  }

  return (
    <div key={key} className="animate-in fade-in-0 zoom-in-95">
      <div className="mb-4">
        <h3 className="font-headline text-xl font-semibold">Practice Question</h3>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          Difficulty: {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={cn(i < currentExercise.difficulty ? 'text-accent' : 'text-muted-foreground/50')}>⭐</span>
          ))}
        </p>
      </div>
        <>
            <p className="text-lg mb-6">{currentExercise.question}</p>
            {renderExercise()}
            
            <div className="flex items-center gap-4 mt-4">
                {currentExercise.hint && !isAnswered && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm"><Lightbulb className="mr-2 h-4 w-4" />Show Hint</Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{currentExercise.hint}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
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
                                    {isCorrect ? <CheckCircle className="text-primary"/> : <XCircle className="text-destructive" />}
                                    Explanation
                                </CardTitle>
                            </CardHeader>
                             <CardContent>
                                <p className="text-sm text-secondary-foreground">{currentExercise.explanation}</p>
                            </CardContent>
                        </Card>
                    )}

                    {feedback && (
                         <Card className={cn(feedback.isCorrect ? "bg-primary/10 border-primary/50" : "bg-destructive/10 border-destructive/50")}>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {feedback.isCorrect ? <CheckCircle className="text-primary"/> : <XCircle className="text-destructive" />}
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

            <div className="mt-6 flex justify-end">
              {!isAnswered ? (
                <Button onClick={handleAnswerSubmit} disabled={(!selectedAnswer && !longFormAnswer) || isGrading}>
                    {isGrading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Grading...</> : 'Submit'}
                </Button>
              ) : (
                <Button onClick={handleNext}>Next Question</Button>
              )}
            </div>
        </>
    </div>
  );
}
