
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { createExercise, getLessons, Lesson } from "@/lib/data";
import { Loader2 } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Textarea } from "@/components/ui/textarea";

export default function NewExercisePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [formData, setFormData] = useState({
    lessonId: "",
    question: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    difficulty: "1",
    hint: "",
    explanation: "",
  });

  useEffect(() => {
    const fetchLessons = async () => {
        const lessonsData = await getLessons();
        setLessons(lessonsData);
    }
    fetchLessons();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    // if the edited option was the correct answer, update the correct answer
    if (formData.correctAnswer === formData.options[index]) {
        setFormData(prev => ({ ...prev, options: newOptions, correctAnswer: value }));
    } else {
        setFormData(prev => ({ ...prev, options: newOptions }));
    }
  }

  const handleCorrectAnswerChange = (value: string) => {
    setFormData(prev => ({...prev, correctAnswer: value}));
  }

  const handleSelectChange = (id: 'lessonId' | 'difficulty', value: string) => {
    setFormData((prev) => ({...prev, [id]: value}));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.lessonId || !formData.question || formData.options.some(opt => opt === "") || !formData.correctAnswer) {
        toast({ variant: "destructive", title: "Error", description: "Please fill all required fields." });
        setIsLoading(false);
        return;
    }

    try {
      await createExercise({
        ...formData,
        difficulty: parseInt(formData.difficulty, 10),
      });
      toast({
        title: "Success!",
        description: "New exercise has been created.",
      });
      router.push("/admin/exercises");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create the exercise.",
      });
      setIsLoading(false);
    }
  };

  const breadcrumbItems = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/exercises", label: "Exercises" },
    { href: "/admin/exercises/new", label: "New" },
  ];

  return (
    <div>
        <Breadcrumb items={breadcrumbItems} />
        <form onSubmit={handleSubmit}>
        <Card>
            <CardHeader>
            <CardTitle>Create New Exercise</CardTitle>
            <CardDescription>Fill out the form below to add a new exercise.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="lessonId">Link to Lesson</Label>
                    <Select onValueChange={(value) => handleSelectChange('lessonId', value)} value={formData.lessonId}>
                        <SelectTrigger id="lessonId"><SelectValue placeholder="Select a lesson" /></SelectTrigger>
                        <SelectContent>
                            {lessons.map(lesson => <SelectItem key={lesson.id} value={lesson.id}>{lesson.title}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select onValueChange={(value) => handleSelectChange('difficulty', value)} value={formData.difficulty}>
                        <SelectTrigger id="difficulty"><SelectValue placeholder="Select difficulty"/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">Easy</SelectItem>
                            <SelectItem value="2">Medium</SelectItem>
                            <SelectItem value="3">Hard</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="question">Question Text</Label>
                <Input id="question" value={formData.question} onChange={handleChange} placeholder="e.g., What is 2 + 2?" required />
            </div>
            
            <div className="space-y-4">
                <Label>Answer Options & Correct Answer</Label>
                <RadioGroup value={formData.correctAnswer} onValueChange={handleCorrectAnswerChange} className="space-y-2">
                    {formData.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-4">
                            <RadioGroupItem value={option} id={`option-${index}`} />
                            <Label htmlFor={`option-${index}`} className="sr-only">Set as correct</Label>
                            <Input 
                                id={`option-input-${index}`}
                                value={option} 
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                                required
                            />
                        </div>
                    ))}
                </RadioGroup>
                <p className="text-xs text-muted-foreground">Enter the answer options and select the correct one using the radio button.</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="hint">Hint (Optional)</Label>
                <Input id="hint" value={formData.hint} onChange={handleChange} placeholder="e.g., Remember the order of operations." />
            </div>

            <div className="space-y-2">
                <Label htmlFor="explanation">Explanation (Optional)</Label>
                <Textarea id="explanation" value={formData.explanation} onChange={handleChange} placeholder="Explain why the correct answer is right." rows={3} />
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" asChild>
                    <Link href="/admin/exercises">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Exercise
                </Button>
            </div>
            </CardContent>
        </Card>
        </form>
    </div>
  );
}
