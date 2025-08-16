
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { getExercise, updateExercise, Exercise } from "@/lib/data";
import { Loader2 } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";

function EditExerciseSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-20 w-full" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
          <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
        </div>
        <div className="space-y-4 pt-4 border-t">
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-32 ml-auto" />
      </CardFooter>
    </Card>
  );
}


export default function EditExercisePage() {
  const router = useRouter();
  const params = useParams();
  const exerciseId = params.id as string;
  const { toast } = useToast();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [question, setQuestion] = useState("");
  const [explanation, setExplanation] = useState("");
  const [hint, setHint] = useState("");
  const [difficulty, setDifficulty] = useState(1);

  // MCQ specific state
  const [mcqOptions, setMcqOptions] = useState<string[]>(['', '', '', '']);
  const [mcqCorrectAnswer, setMcqCorrectAnswer] = useState("");

  // True/False specific state
  const [tfCorrectAnswer, setTfCorrectAnswer] = useState<boolean | null>(null);

  // Long Form specific state
  const [longFormCriteria, setLongFormCriteria] = useState("");

  useEffect(() => {
    if (!exerciseId) return;

    const fetchExerciseData = async () => {
      setIsLoading(true);
      try {
        const data = await getExercise(exerciseId);
        if (data) {
          setExercise(data);
          setQuestion(data.question || "");
          setExplanation(data.explanation || "");
          setHint(data.hint || "");
          setDifficulty(data.difficulty);

          if (data.type === 'mcq') {
            setMcqOptions(data.options);
            setMcqCorrectAnswer(data.correctAnswer);
          } else if (data.type === 'true_false') {
            const correctAnswer = data.correctAnswer;
            setTfCorrectAnswer(typeof correctAnswer === 'boolean' ? correctAnswer : correctAnswer === 'true');
          } else if (data.type === 'long_form') {
            setLongFormCriteria(data.evaluationCriteria);
          }
        } else {
          toast({ variant: "destructive", title: "Error", description: "Exercise not found." });
          router.push('/admin/exercises');
        }
      } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: "Failed to fetch exercise data." });
      } finally {
        setIsLoading(false);
      }
    };

    fetchExerciseData();
  }, [exerciseId, router, toast]);

  const handleMcqOptionChange = (index: number, value: string) => {
    const newOptions = [...mcqOptions];
    newOptions[index] = value;
    setMcqOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exercise) return;
    setIsSaving(true);

    const commonData = {
      question,
      explanation,
      hint,
      difficulty,
    };

    let exerciseData: Partial<Exercise>;

    switch (exercise.type) {
      case 'mcq':
        exerciseData = { ...commonData, type: 'mcq', options: mcqOptions, correctAnswer: mcqCorrectAnswer };
        break;
      case 'true_false':
        exerciseData = { ...commonData, type: 'true_false', correctAnswer: tfCorrectAnswer ?? false };
        break;
      case 'long_form':
        exerciseData = { ...commonData, type: 'long_form', evaluationCriteria: longFormCriteria };
        break;
      default:
        toast({ variant: "destructive", title: "Error", description: "Invalid exercise type." });
        setIsSaving(false);
        return;
    }

    try {
      await updateExercise(exerciseId, exerciseData);
      toast({
        title: "Success!",
        description: "Exercise has been updated.",
      });
      router.push("/admin/exercises");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update the exercise.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const breadcrumbItems = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/exercises", label: "Exercises" },
    { href: `/admin/exercises/${exerciseId}/edit`, label: "Edit" },
  ];

  const renderTypeSpecificFields = () => {
    if (!exercise) return null;

    switch (exercise.type) {
      case 'mcq':
        return (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-lg">Multiple Choice Options</h4>
            {mcqOptions.map((option, index) => (
              <div key={index} className="space-y-2">
                <Label htmlFor={`option-${index}`}>Option {index + 1}</Label>
                <Input id={`option-${index}`} value={option} onChange={(e) => handleMcqOptionChange(index, e.target.value)} />
              </div>
            ))}
            <div className="space-y-2">
              <Label htmlFor="correct-answer-mcq">Correct Answer</Label>
              <Select onValueChange={setMcqCorrectAnswer} value={mcqCorrectAnswer}>
                <SelectTrigger id="correct-answer-mcq"><SelectValue placeholder="Select the correct answer" /></SelectTrigger>
                <SelectContent>
                  {mcqOptions.map((opt, i) => opt && <SelectItem key={i} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 'true_false':
        return (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-lg">Correct Answer</h4>
            <RadioGroup onValueChange={(v) => setTfCorrectAnswer(v === 'true')} value={String(tfCorrectAnswer)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="true" />
                <Label htmlFor="true">True</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="false" />
                <Label htmlFor="false">False</Label>
              </div>
            </RadioGroup>
          </div>
        );
      case 'long_form':
        return (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-lg">Evaluation</h4>
            <div className="space-y-2">
              <Label htmlFor="evaluation-criteria">Evaluation Criteria</Label>
              <Textarea id="evaluation-criteria" value={longFormCriteria} onChange={(e) => setLongFormCriteria(e.target.value)} placeholder="Describe how the AI should grade this answer." />
            </div>
          </div>
        );
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <EditExerciseSkeleton />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Edit Exercise</CardTitle>
            <CardDescription>Make changes to an existing exercise. The exercise type cannot be changed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="question">Question Text</Label>
              <Textarea id="question" value={question} onChange={(e) => setQuestion(e.target.value)} required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="explanation">Explanation</Label>
                <Input id="explanation" value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Why is the answer correct?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hint">Hint</Label>
                <Input id="hint" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="A small hint for the student" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty (1-3)</Label>
              <Input id="difficulty" type="number" min="1" max="3" value={difficulty} onChange={(e) => setDifficulty(Math.max(1, Math.min(3, Number(e.target.value))))} />
            </div>

            {renderTypeSpecificFields()}

          </CardContent>
          <CardFooter className="border-t px-6 py-4 flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/exercises">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
