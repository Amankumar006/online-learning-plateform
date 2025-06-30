"use client";

import { useState, useEffect } from "react";
import { exercises } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Exercise = typeof exercises[0];

export default function AdaptiveExercise({ lessonId }: { lessonId: string }) {
  const [currentExercise, setCurrentExercise] = useState<Exercise | undefined>(undefined);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [difficulty, setDifficulty] = useState(1);
  const [key, setKey] = useState(0);

  const lessonExercises = exercises.filter(e => e.lessonId === lessonId);

  useEffect(() => {
    loadNextExercise();
  }, [difficulty, lessonId]);

  const loadNextExercise = () => {
    // Simple logic: find an exercise with the current difficulty level
    let nextExercise = lessonExercises.find(e => e.difficulty === difficulty);
    
    if (!nextExercise) {
        let tempDifficulty = difficulty;
        while(tempDifficulty > 0 && !nextExercise) {
            nextExercise = lessonExercises.find(e => e.difficulty === tempDifficulty);
            if (!nextExercise) tempDifficulty--;
        }
    }
    
    if(!nextExercise) {
        nextExercise = lessonExercises[0];
    }
    
    setCurrentExercise(nextExercise);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setKey(prevKey => prevKey + 1);
  };

  const handleSubmit = () => {
    if (!selectedAnswer || !currentExercise) return;
    const correct = selectedAnswer === currentExercise.correctAnswer;
    setIsCorrect(correct);
    
    if (correct) {
      setDifficulty(prev => Math.min(prev + 1, 3)); // Max difficulty 3
    } else {
      setDifficulty(prev => Math.max(prev - 1, 1)); // Min difficulty 1
    }
  };

  const handleNext = () => {
    loadNextExercise();
  };
  
  if (!lessonExercises || lessonExercises.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>No exercises available for this lesson yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card key={key} className="animate-in fade-in-0 zoom-in-95">
      <CardHeader>
        <CardTitle className="font-headline">Practice Question</CardTitle>
        <CardDescription className="flex items-center gap-1">
          Difficulty: {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={cn(i < difficulty ? 'text-accent' : 'text-muted-foreground/50')}>⭐</span>
          ))}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-lg mb-6">{currentExercise?.question}</p>
        <RadioGroup
          value={selectedAnswer ?? ''}
          onValueChange={setSelectedAnswer}
          disabled={isCorrect !== null}
        >
          {currentExercise?.options.map((option, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center space-x-2 p-3 rounded-md border transition-colors",
                isCorrect !== null && option === currentExercise.correctAnswer && "border-primary bg-primary/20",
                isCorrect !== null && selectedAnswer === option && option !== currentExercise.correctAnswer && "border-destructive bg-destructive/20",
                isCorrect === null && "hover:bg-accent/20"
              )}
            >
              <RadioGroupItem value={option} id={`option-${index}`} />
              <Label htmlFor={`option-${index}`} className="w-full cursor-pointer">{option}</Label>
            </div>
          ))}
        </RadioGroup>
        <div className="mt-6 flex justify-end">
          {isCorrect === null ? (
            <Button onClick={handleSubmit} disabled={!selectedAnswer}>Submit</Button>
          ) : (
            <Button onClick={handleNext}>Next Question</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
