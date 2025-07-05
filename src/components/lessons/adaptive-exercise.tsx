
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Exercise, McqExercise, TrueFalseExercise, LongFormExercise, UserExerciseResponse, FillInTheBlanksExercise } from "@/lib/data";
import { saveExerciseAttempt, getUserProgress, updateUserExerciseIndex, getUserResponsesForLesson } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { gradeLongFormAnswer, GradeLongFormAnswerOutput } from "@/ai/flows/grade-long-form-answer";
import { Loader2, Lightbulb, CheckCircle, XCircle, Code, FunctionSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CodeEditor from "./code-editor";
import MathSolutionGrader from "../practice/math-solution-grader";
import { Input } from "../ui/input";
import { GradeMathSolutionOutput } from "@/ai/flows/grade-math-solution";

export default function AdaptiveExercise({ exercises, userId, lessonTitle }: { exercises: Exercise[], userId:string, lessonTitle: string }) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [longFormAnswer, setLongFormAnswer] = useState("");
  const [fibAnswers, setFibAnswers] = useState<string[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [fibCorrectness, setFibCorrectness] = useState<boolean[]>([]);
  const [isGrading, setIsGrading] = useState(false);
  const [feedback, setFeedback] = useState<GradeLongFormAnswerOutput | GradeMathSolutionOutput | null>(null);
  const [userResponses, setUserResponses] = useState<Map<string, UserExerciseResponse>>(new Map());
  const { toast } = useToast();

  const lessonId = exercises.length > 0 ? exercises[0].lessonId : null;
  const totalExercises = exercises.length;
  const currentExercise = exercises[currentExerciseIndex];

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

    // Reset component state for the current question
    setSelectedAnswer(null);
    setLongFormAnswer("");
    setIsAnswered(false);
    setIsCorrect(null);
    setFeedback(null);
    
    // Initialize state specific to exercise type
    if (currentExercise.type === 'fill_in_the_blanks') {
        const blankCount = currentExercise.correctAnswers.length;
        setFibAnswers(Array(blankCount).fill(""));
        setFibCorrectness(Array(blankCount).fill(false));
    }

    // Check for a previous response and set state accordingly
    const previousResponse = userResponses.get(currentExercise.id);
    if (previousResponse) {
        setIsAnswered(true);
        setIsCorrect(previousResponse.isCorrect);

        if (currentExercise.type === 'long_form') {
            setLongFormAnswer(previousResponse.submittedAnswer as string);
            if (previousResponse.feedback) {
              if (typeof previousResponse.feedback === 'object' && previousResponse.feedback !== null && 'overallScore' in previousResponse.feedback) {
                  setFeedback(previousResponse.feedback as GradeMathSolutionOutput);
              } else if (typeof previousResponse.feedback === 'string') {
                  setFeedback({ isCorrect: previousResponse.isCorrect, score: previousResponse.score, feedback: previousResponse.feedback } as GradeLongFormAnswerOutput);
              }
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
  }, [currentExerciseIndex, isLoading, userResponses, currentExercise]);

  const handleFibAnswerChange = (index: number, value: string) => {
    const newAnswers = [...fibAnswers];
    newAnswers[index] = value;
    setFibAnswers(newAnswers);
  };

  const handleMathGraded = async (result: GradeMathSolutionOutput, studentSolution: string) => {
    setFeedback(result);
    setIsAnswered(true);
    setIsCorrect(result.isSolutionCorrect);

    try {
        await saveExerciseAttempt(
            userId,
            lessonTitle,
            currentExercise,
            studentSolution,
            result.isSolutionCorrect,
            result.overallScore,
            result,
            null
        );
    } catch (error) {
        console.error("Failed to save math exercise result:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save your progress." });
    }
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
                    question: currentExercise.question,
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
        const newResponse: UserExerciseResponse = {
            id: `${userId}_${currentExercise.id}`,
            userId,
            lessonId: lessonId!,
            exerciseId: currentExercise.id,
            question: currentExercise.type === 'fill_in_the_blanks' ? currentExercise.questionParts.join('___') : currentExercise.question,
            lessonTitle: lessonTitle,
            submittedAnswer,
            isCorrect: correct,
            score,
            feedback: aiFeedback?.feedback,
            submittedAt: Date.now()
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
                    <div>
                        <CodeEditor
                            value={longFormAnswer}
                            onValueChange={setLongFormAnswer}
                            disabled={isAnswered || isGrading}
                            placeholder="Write your code here..."
                            language={lfExercise.language}
                        />
                        <p className="text-xs text-muted-foreground mt-2">{currentExercise.evaluationCriteria}</p>
                    </div>
                );
            }
             if (lfExercise.category === 'math') {
                 return (
                    <MathSolutionGrader 
                        exercise={lfExercise} 
                        onGraded={handleMathGraded} 
                        isAnswered={isAnswered}
                        initialFeedback={feedback as GradeMathSolutionOutput | undefined}
                        initialSolution={longFormAnswer}
                    />
                );
            }
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
            <p className="text-muted-foreground mt-2 mb-4">You've answered all the questions for this lesson.</p>
            <Button onClick={handlePracticeAgain}>
                Practice Again
            </Button>
        </div>
    )
  }

  return (
    <div className="animate-in fade-in-0 zoom-in-95">
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
            <p className="text-lg mb-6">{currentExercise.type !== 'fill_in_the_blanks' && currentExercise.question}</p>
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

                    {feedback && 'feedback' in feedback && (
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
                <Button onClick={handleAnswerSubmit} disabled={isGrading || (currentExercise.type !== 'long_form' && !selectedAnswer) || (currentExercise.type === 'long_form' && currentExercise.category !== 'math' && !longFormAnswer)}>
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
