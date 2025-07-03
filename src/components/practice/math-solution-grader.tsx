
"use client";

import { useState } from 'react';
import MathEditor from '@/components/lessons/math-editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { gradeMathSolution, GradeMathSolutionOutput } from '@/ai/flows/grade-math-solution';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LongFormExercise } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

interface MathSolutionGraderProps {
  exercise: LongFormExercise;
  onGraded: (result: GradeMathSolutionOutput, studentSolution: string) => void;
  isAnswered: boolean;
  initialFeedback?: GradeMathSolutionOutput;
  initialSolution?: string;
}

export default function MathSolutionGrader({ exercise, onGraded, isAnswered, initialFeedback, initialSolution }: MathSolutionGraderProps) {
  const [solution, setSolution] = useState(initialSolution || '');
  const [isGrading, setIsGrading] = useState(false);
  const [feedback, setFeedback] = useState<GradeMathSolutionOutput | null>(initialFeedback || null);
  const { toast } = useToast();

  const handleGrade = async () => {
    if (!solution.trim()) {
      toast({
        variant: 'destructive',
        title: 'Input Required',
        description: 'Please enter your solution before submitting.',
      });
      return;
    }

    setIsGrading(true);
    setFeedback(null);
    try {
      const result = await gradeMathSolution({
        question: exercise.question,
        studentSolutionLatex: solution,
      });
      setFeedback(result);
      onGraded(result, solution);
      toast({
        title: 'Solution Graded!',
        description: 'The AI has provided step-by-step feedback below.',
      });
    } catch (e: any) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: e.message || 'Failed to grade your solution.',
      });
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <div className="space-y-6">
      <MathEditor value={solution} onValueChange={setSolution} disabled={isGrading || isAnswered} />
      
      {!isAnswered && (
        <div className="flex justify-end">
            <Button onClick={handleGrade} disabled={isGrading || !solution.trim()}>
                {isGrading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Grade My Work
            </Button>
        </div>
      )}

      {feedback && (
        <Card className={cn("animate-in fade-in-20", feedback.isSolutionCorrect ? "bg-primary/10 border-primary/50" : "bg-destructive/10 border-destructive/50")}>
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
  );
}
