
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createExercise, getLessons, Lesson, Exercise } from "@/lib/data";
import { generateCustomExercise, GeneratedExercise } from "@/ai/flows/generate-custom-exercise";
import { Loader2, Sparkles, Wand2, BrainCircuit } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export default function NewCustomExercisePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  // AI prompt state
  const [prompt, setPrompt] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [curriculumBoard, setCurriculumBoard] = useState("");
  const [difficulty, setDifficulty] = useState<number | undefined>();
  const [questionType, setQuestionType] = useState("any");
  
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [previewExercise, setPreviewExercise] = useState<GeneratedExercise | null>(null);

  useEffect(() => {
    const fetchLessons = async () => {
        const lessonsData = await getLessons();
        setLessons(lessonsData);
    }
    fetchLessons();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
        toast({ variant: "destructive", title: "Error", description: "Please enter a prompt for the AI." });
        return;
    }
    setIsGenerating(true);
    setPreviewExercise(null);
    try {
      const generatedExercise = await generateCustomExercise({
        prompt,
        gradeLevel,
        ageGroup,
        curriculumBoard,
        difficulty,
        questionType: questionType as any,
      });
      setPreviewExercise(generatedExercise);
      toast({ title: "Exercise Preview Generated!", description: "Review the exercise below. You can regenerate or save it." });
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "AI Error", description: e.message || "Failed to generate exercise." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewExercise) {
        toast({ variant: "destructive", title: "Error", description: "Please generate an exercise before saving." });
        return;
    }
     if (!selectedLessonId) {
        toast({ variant: "destructive", title: "Error", description: "Please select a lesson to associate this exercise with." });
        return;
    }

    setIsSaving(true);
    try {
        let exerciseData: Omit<Exercise, 'id'>;
        switch (previewExercise.type) {
            case 'mcq':
            case 'true_false':
                exerciseData = {
                    ...previewExercise,
                    correctAnswer: String(previewExercise.correctAnswer),
                    lessonId: selectedLessonId,
                    isCustom: false,
                };
                break;
            case 'long_form':
            case 'fill_in_the_blanks':
                exerciseData = {
                    ...previewExercise,
                    lessonId: selectedLessonId,
                    isCustom: false,
                };
                break;
            default:
                throw new Error("Unsupported exercise type");
        }
      
        await createExercise(exerciseData);
        toast({ title: "Success!", description: "New exercise has been created and saved." });
        router.push("/admin/exercises");
        router.refresh();
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to create the exercise." });
    } finally {
      setIsSaving(false);
    }
  };

  const breadcrumbItems = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/exercises", label: "Exercises" },
    { href: "/admin/exercises/new-custom", label: "New Custom" },
  ];
  
  const getDifficultyBadge = (level: number) => {
    switch (level) {
        case 1: return <Badge variant="secondary">Easy</Badge>;
        case 2: return <Badge variant="outline">Medium</Badge>;
        case 3: return <Badge variant="default">Hard</Badge>;
        default: return <Badge variant="secondary">N/A</Badge>;
    }
  }

  return (
    <div>
        <Breadcrumb items={breadcrumbItems} />
        <form onSubmit={handleSubmit}>
        <Card>
            <CardHeader>
                <CardTitle>Create Custom Exercise</CardTitle>
                <CardDescription>Use AI to generate a single, highly-specific exercise by providing a detailed prompt and context.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

            <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>AI Custom Exercise Generator</AlertTitle>
                <AlertDescription className="mb-4">
                    Write a prompt for the AI. For best results, provide as much context as possible below.
                </AlertDescription>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="ai-prompt">Admin Prompt</Label>
                        <Textarea 
                            id="ai-prompt"
                            value={prompt} 
                            onChange={(e) => setPrompt(e.target.value)} 
                            placeholder="e.g., 'An MCQ about the causes of the French Revolution for 9th grade ICSE students' or 'A hard Python coding problem involving recursion for advanced learners'."
                            className="min-h-[100px]"
                            disabled={isGenerating}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="gradeLevel">Grade Level</Label>
                            <Input id="gradeLevel" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="e.g., 10th" disabled={isGenerating}/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ageGroup">Age Group</Label>
                            <Input id="ageGroup" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} placeholder="e.g., 14-16" disabled={isGenerating}/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="curriculumBoard">Curriculum Board</Label>
                            <Input id="curriculumBoard" value={curriculumBoard} onChange={(e) => setCurriculumBoard(e.target.value)} placeholder="e.g., CBSE, NCERT" disabled={isGenerating}/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="difficulty">Difficulty</Label>
                            <Select onValueChange={(v) => setDifficulty(Number(v))} value={String(difficulty)} disabled={isGenerating}>
                                <SelectTrigger><SelectValue placeholder="Select Difficulty" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Easy</SelectItem>
                                    <SelectItem value="2">Medium</SelectItem>
                                    <SelectItem value="3">Hard</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="flex flex-col sm:flex-row gap-4 pt-2">
                         <div className="space-y-2 flex-grow">
                            <Label htmlFor="questionType">Question Type</Label>
                            <Select onValueChange={setQuestionType} value={questionType} disabled={isGenerating}>
                                <SelectTrigger id="questionType"><SelectValue placeholder="Select question type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="any">Any (AI Decides)</SelectItem>
                                    <SelectItem value="mcq">Multiple-Choice</SelectItem>
                                    <SelectItem value="true_false">True/False</SelectItem>
                                    <SelectItem value="long_form">Long Form</SelectItem>
                                    <SelectItem value="fill_in_the_blanks">Fill in the Blanks</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-shrink-0 self-end">
                            <Button type="button" variant="outline" onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                Generate Exercise
                            </Button>
                        </div>
                    </div>
                </div>
            </Alert>

            {previewExercise && (
                <div className="space-y-4 pt-6 border-t">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5" />
                        Generated Exercise Preview
                    </h3>
                    <Card className="bg-secondary/30">
                        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                            <div className="flex-1">
                                <CardTitle className="text-base font-normal">
                                    {previewExercise.type === 'fill_in_the_blanks' ? previewExercise.questionParts.join(' ___ ') : (previewExercise as any).question}
                                </CardTitle>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {getDifficultyBadge(previewExercise.difficulty)}
                                <Badge variant="default" className="capitalize">{previewExercise.type.replace(/_/g, ' ')}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                             {previewExercise.type === 'mcq' && <ul className="text-sm text-muted-foreground list-disc pl-5">{previewExercise.options.map(opt => <li key={opt} className={previewExercise.correctAnswer === opt ? 'font-semibold text-primary' : ''}>{opt}</li>)}</ul>}
                             {previewExercise.type === 'true_false' && <p className="text-sm text-muted-foreground">Correct Answer: <span className="font-semibold text-primary">{String(previewExercise.correctAnswer)}</span></p>}
                             {previewExercise.type === 'fill_in_the_blanks' && <p className="text-sm text-muted-foreground">Correct Answers: <span className="font-semibold text-primary">{previewExercise.correctAnswers.join(', ')}</span></p>}
                        </CardContent>
                    </Card>
                     <div className="space-y-2">
                        <Label htmlFor="lessonId">Link to Lesson</Label>
                        <Select onValueChange={setSelectedLessonId} value={selectedLessonId}>
                            <SelectTrigger id="lessonId"><SelectValue placeholder="Select a lesson to associate this exercise with" /></SelectTrigger>
                            <SelectContent>
                                {lessons.map(lesson => <SelectItem key={lesson.id} value={lesson.id}>{lesson.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
            
            <div className="flex justify-end gap-2 pt-6 border-t">
                <Button variant="outline" asChild>
                    <Link href="/admin/exercises">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSaving || isGenerating || !previewExercise || !selectedLessonId}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Exercise
                </Button>
            </div>
            </CardContent>
        </Card>
        </form>
    </div>
  );
}
