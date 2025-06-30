
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

export default function AdaptiveExercise({ exercises, userId }: { exercises: Exercise[], userId:string }) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [longFormAnswer, setLongFormAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
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
    switch (currentExercise.type) {
        case 'mcq':
            if (!selectedAnswer) return;
            correct = selectedAnswer === currentExercise.correctAnswer;
            break;
        case 'true_false':
            if (!selectedAnswer) return;
            correct = (String(currentExercise.correctAnswer).toLowerCase() === selectedAnswer.toLowerCase());
            break;
        case 'long_form':
            // For now, we can't auto-grade. We'll mark as correct for progress and show explanation.
            // The actual AI evaluation would happen in a separate flow.
            correct = true; 
            toast({
                title: "Response Submitted",
                description: "AI feedback for open-ended questions is coming soon!",
            });
            break;
    }
    
    setIsCorrect(correct);
    
    try {
      if (currentExercise.type !== 'long_form') {
        await saveExerciseResult(userId, correct);
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
    setIsCorrect(null);
    setSelectedAnswer(null);
    setLongFormAnswer("");
    setCurrentExerciseIndex(prevIndex => (prevIndex + 1) % exercises.length);
    setKey(prevKey => prevKey + 1);
  };
  
  const renderExercise = () => {
    if (!currentExercise) return <p>Loading exercise...</p>;

    switch (currentExercise.type) {
        case 'mcq':
            const mcq = currentExercise as McqExercise;
            return (
                <RadioGroup value={selectedAnswer ?? ''} onValueChange={setSelectedAnswer} disabled={isCorrect !== null}>
                    {mcq.options.map((option, index) => (
                        <div key={index} className={cn("flex items-center space-x-2 p-3 rounded-md border transition-colors", isCorrect !== null && option === mcq.correctAnswer && "border-primary bg-primary/20", isCorrect !== null && selectedAnswer === option && option !== mcq.correctAnswer && "border-destructive bg-destructive/20", isCorrect === null && "hover:bg-accent/20")}>
                            <RadioGroupItem value={option} id={`option-${index}`} />
                            <Label htmlFor={`option-${index}`} className="w-full cursor-pointer">{option}</Label>
                        </div>
                    ))}
                </RadioGroup>
            );
        case 'true_false':
            const tf = currentExercise as TrueFalseExercise;
             return (
                <RadioGroup value={selectedAnswer ?? ''} onValueChange={setSelectedAnswer} disabled={isCorrect !== null}>
                    {['True', 'False'].map((option, index) => (
                        <div key={index} className={cn("flex items-center space-x-2 p-3 rounded-md border transition-colors", isCorrect !== null && String(tf.correctAnswer).toLowerCase() === option.toLowerCase() && "border-primary bg-primary/20", isCorrect !== null && selectedAnswer === option && String(tf.correctAnswer).toLowerCase() !== option.toLowerCase() && "border-destructive bg-destructive/20", isCorrect === null && "hover:bg-accent/20")}>
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
                        disabled={isCorrect !== null}
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
            
            {currentExercise.hint && (
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" className="mt-4">Show Hint</Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{currentExercise.hint}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {isCorrect !== null && currentExercise.explanation && (
                <div className="mt-4 p-4 bg-secondary rounded-md border animate-in fade-in-0">
                    <h4 className="font-semibold mb-2">Explanation</h4>
                    <p className="text-sm text-secondary-foreground">{currentExercise.explanation}</p>
                </div>
            )}

            <div className="mt-6 flex justify-end">
              {isCorrect === null ? (
                <Button onClick={handleAnswerSubmit} disabled={!selectedAnswer && !longFormAnswer}>Submit</Button>
              ) : (
                <Button onClick={handleNext}>Next Question</Button>
              )}
            </div>
        </>
    </div>
  );
}
