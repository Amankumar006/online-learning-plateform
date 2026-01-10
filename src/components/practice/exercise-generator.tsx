"use client";

import { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { generateCustomExercise, GeneratedExercise } from '@/ai/flows/generate-custom-exercise';
import { Exercise } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, BrainCircuit } from 'lucide-react';

interface ExerciseGeneratorProps {
    user: FirebaseUser | null;
    onSave: (exerciseData: Omit<Exercise, 'id'>) => Promise<void>;
}

export function ExerciseGenerator({ user, onSave }: ExerciseGeneratorProps) {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [questionType, setQuestionType] = useState<string>('any');
    const [previewExercise, setPreviewExercise] = useState<GeneratedExercise | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim() || !user) return;
        setIsGenerating(true);
        setPreviewExercise(null);
        try {
            // Slight delay to ensure UI updates if needed
            await new Promise(resolve => setTimeout(resolve, 100));

            // Handle special case: math_long_form generates long_form with math hint
            let effectiveType = questionType;
            let extraPrompt = '';
            if (questionType === 'math_long_form') {
                effectiveType = 'long_form';
                extraPrompt = ' Generate a math problem where the student must show their work. Set category to "math". The question should require step-by-step mathematical solution with equations.';
            }

            const generatedExercise = await generateCustomExercise({
                prompt: prompt + extraPrompt,
                questionType: effectiveType as "any" | "mcq" | "true_false" | "long_form" | "fill_in_the_blanks" | "code" | undefined
            });

            if (!generatedExercise) {
                toast({ variant: 'destructive', title: 'Generation Failed', description: 'The AI could not generate a valid exercise. Please try again with a different prompt.' });
                return;
            }

            // For math_long_form, ensure category is set to math
            if (questionType === 'math_long_form' && generatedExercise.type === 'long_form') {
                (generatedExercise as any).category = 'math';
            }

            setPreviewExercise(generatedExercise);
        } catch (e: any) {
            console.error(e);
            toast({ variant: 'destructive', title: 'AI Error', description: e.message || 'Failed to generate exercise.' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveClick = async () => {
        if (!previewExercise || !user) return;

        let exerciseData: Omit<Exercise, 'id'>;
        try {
            switch (previewExercise.type) {
                case 'mcq':
                    exerciseData = {
                        ...previewExercise,
                        correctAnswer: String(previewExercise.correctAnswer),
                        lessonId: 'custom',
                        isCustom: true,
                        userId: user.uid,
                        createdAt: Date.now()
                    } as Omit<Exercise, 'id'>;
                    break;
                case 'true_false':
                    exerciseData = {
                        ...previewExercise,
                        correctAnswer: Boolean(previewExercise.correctAnswer),
                        lessonId: 'custom',
                        isCustom: true,
                        userId: user.uid,
                        createdAt: Date.now()
                    } as Omit<Exercise, 'id'>;
                    break;
                case 'code':
                    exerciseData = {
                        ...previewExercise,
                        lessonId: 'custom',
                        isCustom: true,
                        userId: user.uid,
                        createdAt: Date.now()
                    } as Omit<Exercise, 'id'>;
                    break;
                case 'long_form':
                case 'fill_in_the_blanks':
                    exerciseData = {
                        ...previewExercise,
                        lessonId: 'custom',
                        isCustom: true,
                        userId: user.uid,
                        createdAt: Date.now()
                    };
                    break;
                default:
                    throw new Error("Unsupported exercise type");
            }

            await onSave(exerciseData);
            setPrompt("");
            setPreviewExercise(null);
            setQuestionType('any');
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to prepare exercise for saving.' });
        }
    };

    const handleDiscardGenerated = () => {
        setPreviewExercise(null);
    };

    const getDifficultyBadge = (level: number) => {
        switch (level) {
            case 1: return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Easy</Badge>;
            case 2: return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">Medium</Badge>;
            case 3: return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">Hard</Badge>;
            default: return <Badge variant="secondary">N/A</Badge>;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl font-headline">
                    <BrainCircuit className="text-primary h-7 w-7" /> Generate Custom Exercise
                </CardTitle>
                <CardDescription>Describe the type of exercise you want. The AI will generate a new exercise for you to review.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Question Type</label>
                    <Select value={questionType} onValueChange={setQuestionType}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a question type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="any">Any (AI Decides)</SelectItem>
                            <SelectItem value="mcq">Multiple Choice</SelectItem>
                            <SelectItem value="true_false">True / False</SelectItem>
                            <SelectItem value="code">Coding Challenge</SelectItem>
                            <SelectItem value="long_form">Essay / Conceptual</SelectItem>
                            <SelectItem value="math_long_form">Math Problem (Show Work)</SelectItem>
                            <SelectItem value="fill_in_the_blanks">Fill in the Blanks</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="e.g., 'Create a Python exercise about list comprehensions...' or 'Give me an intermediate C++ problem on implementing a simple linked list...'"
                    rows={4}
                    disabled={isGenerating}
                />
                <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} size="lg">
                    {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                    Generate Exercise
                </Button>
            </CardContent>
            {isGenerating && (
                <CardFooter>
                    <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> The AI is thinking... please wait.</p>
                </CardFooter>
            )}
            {previewExercise && (
                <CardFooter className="flex flex-col items-start gap-4 border-t pt-6">
                    <h3 className="text-lg font-semibold">AI Generated Preview</h3>
                    <Card className="w-full bg-secondary/30">
                        <CardContent className="p-4 space-y-3">
                            <p className="font-semibold">
                                {previewExercise.type === 'fill_in_the_blanks'
                                    ? previewExercise.questionParts.join(' ___ ')
                                    : previewExercise.type === 'code'
                                        ? previewExercise.title
                                        : previewExercise.question}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {previewExercise.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                {getDifficultyBadge(previewExercise.difficulty)}
                                {previewExercise.type && <Badge variant="secondary" className="capitalize">{previewExercise.type.replace(/_/g, ' ')}</Badge>}
                            </div>
                        </CardContent>
                    </Card>
                    <div className="flex gap-2">
                        <Button onClick={handleSaveClick}>Save to My Exercises</Button>
                        <Button variant="outline" onClick={handleDiscardGenerated}>Discard</Button>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}
