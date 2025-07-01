
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { createExercise, getCustomExercisesForUser, getAllUserResponses, UserExerciseResponse, Exercise, deleteExercise } from '@/lib/data';
import { generateCustomExercise, GeneratedExercise } from '@/ai/flows/generate-custom-exercise';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, ListChecks, Trash2, Pencil, BrainCircuit, Save, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SingleExerciseSolver from '@/components/practice/single-exercise-solver';

function PracticePageSkeleton() {
    return (
      <div className="space-y-8">
        <Card>
          <CardHeader><CardTitle><div className="h-7 w-64 bg-muted rounded-md" /></CardTitle><CardDescription><div className="h-4 w-96 bg-muted rounded-md mt-2" /></CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="h-24 bg-muted rounded-md" />
            <div className="h-10 w-48 bg-muted rounded-md" />
          </CardContent>
        </Card>
        <div className="h-8 w-56 bg-muted rounded-md" />
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="h-6 w-3/4 bg-muted rounded-md" />
                <div className="h-4 w-1/2 bg-muted rounded-md" />
                <div className="flex justify-between items-center">
                   <div className="h-4 w-24 bg-muted rounded-md" />
                   <div className="flex gap-2"><div className="h-9 w-20 bg-muted rounded-md" /><div className="h-9 w-24 bg-muted rounded-md" /></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
}

export default function PracticePage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [responses, setResponses] = useState<Map<string, UserExerciseResponse>>(new Map());
    const [solvingExercise, setSolvingExercise] = useState<Exercise | null>(null);
    const [previewExercise, setPreviewExercise] = useState<GeneratedExercise | null>(null);

    const { toast } = useToast();

    const fetchData = async (uid: string) => {
        setIsLoading(true);
        try {
            const [customExercises, userResponses] = await Promise.all([
                getCustomExercisesForUser(uid),
                getAllUserResponses(uid)
            ]);
            setExercises(customExercises.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0)));
            setResponses(userResponses);
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load your practice exercises.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                fetchData(currentUser.uid);
            }
            // The layout now handles redirection if the user is not logged in.
        });
        return () => unsubscribe();
    }, []);

    const handleGeneratePreview = async () => {
        if (!prompt.trim() || !user) return;
        setIsGenerating(true);
        setPreviewExercise(null);
        try {
            const result = await generateCustomExercise({ prompt });
            setPreviewExercise(result);
            toast({ title: "Exercise Preview Generated!", description: "Review the exercise below and save it if you like it." });
        } catch (e: any) {
            console.error(e);
            toast({ variant: 'destructive', title: 'AI Error', description: e.message || 'Failed to generate exercise. Please try a different prompt.' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleSaveExercise = async () => {
        if (!previewExercise || !user) return;
        setIsSaving(true);
         try {
            await createExercise({
                ...previewExercise,
                lessonId: 'custom',
                correctAnswer: String(previewExercise.correctAnswer),
                isCustom: true,
                userId: user.uid,
                createdAt: Date.now()
            });
            toast({ title: "Exercise Saved!", description: "Your new custom exercise has been added to your list." });
            setPreviewExercise(null);
            setPrompt("");
            fetchData(user.uid); // Refresh list
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save the exercise.' });
        } finally {
            setIsSaving(false);
        }
    }
    
    const handleDiscardPreview = () => {
        setPreviewExercise(null);
    }

    const handleDiscard = async (exerciseId: string) => {
        if (!user) return;
        try {
            await deleteExercise(exerciseId);
            toast({ title: "Exercise Discarded", description: "The exercise has been removed." });
            fetchData(user.uid); // Refresh list
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to discard the exercise.' });
        }
    };

    const handleSolved = () => {
        setSolvingExercise(null);
        if (user) fetchData(user.uid);
    }
    
    if (isLoading || !user) return <PracticePageSkeleton />;
    
    const getDifficultyString = (level: number) => {
        switch (level) {
            case 1: return 'Beginner';
            case 2: return 'Intermediate';
            case 3: return 'Hard';
            default: return 'N/A';
        }
    }
    
    const getDifficultyBadge = (level: number) => {
        switch (level) {
            case 1: return <Badge variant="secondary">Easy</Badge>;
            case 2: return <Badge variant="outline">Medium</Badge>;
            case 3: return <Badge variant="default">Hard</Badge>;
            default: return <Badge variant="secondary">N/A</Badge>;
        }
    }

    const pendingExercises = exercises.filter(ex => !responses.has(ex.id));
    const completedExercises = exercises.filter(ex => responses.has(ex.id));

    return (
      <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                    <Sparkles className="text-primary"/> Generate Custom Exercise
                </CardTitle>
                <CardDescription>Describe the type of exercise you want. The AI will generate a preview for you to review and save.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea 
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="e.g., 'Create a Python exercise about list comprehensions...' or 'Give me an intermediate C++ problem on implementing a simple linked list...'"
                    rows={4}
                    disabled={isGenerating}
                />
                <Button onClick={handleGeneratePreview} disabled={isGenerating || !prompt.trim()}>
                    {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                    Generate Exercise
                </Button>
            </CardContent>
        </Card>

        {isGenerating && (
            <div className="flex items-center justify-center p-8 space-x-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p>Generating your exercise...</p>
            </div>
        )}

        {previewExercise && (
             <Card className="border-primary bg-primary/5 animate-in fade-in-0">
                <CardHeader>
                    <div className="flex justify-between items-start">
                         <div>
                            <CardTitle className="flex items-center gap-2">
                                <BrainCircuit className="h-6 w-6" /> Generated Preview
                            </CardTitle>
                            <CardDescription>Review the generated exercise. Save it to add it to your list.</CardDescription>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            {getDifficultyBadge(previewExercise.difficulty)}
                            {previewExercise.type && <Badge variant="default" className="capitalize">{previewExercise.type.replace('_', ' ')}</Badge>}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="font-semibold mb-4">{previewExercise.question}</p>
                    {previewExercise.type === 'mcq' && (
                        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                            {previewExercise.options.map(opt => <li key={opt} className={previewExercise.correctAnswer === opt ? 'font-semibold text-primary' : ''}>{opt}</li>)}
                        </ul>
                    )}
                    {previewExercise.type === 'true_false' && (
                        <p className="text-sm text-muted-foreground">Correct Answer: <span className="font-semibold text-primary">{String(previewExercise.correctAnswer)}</span></p>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={handleDiscardPreview}>Discard</Button>
                    <Button onClick={handleSaveExercise} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                        Save Exercise
                    </Button>
                </CardFooter>
            </Card>
        )}

        <div>
            <h2 className="text-xl font-bold font-headline flex items-center gap-2 mb-4">
                <ListChecks /> Your Custom Exercises
            </h2>
            
            <h3 className="text-lg font-semibold mt-6 mb-2">Pending & In-Progress ({pendingExercises.length})</h3>
            {pendingExercises.length > 0 ? (
                <div className="space-y-4">
                    {pendingExercises.map(ex => (
                         <Card key={ex.id}>
                            <CardContent className="p-4 space-y-4">
                                <div>
                                    <h4 className="font-semibold">{ex.question}</h4>
                                    <p className="text-sm text-muted-foreground capitalize">
                                        Difficulty: {getDifficultyString(ex.difficulty)} {ex.category === 'code' && `(${(ex as any).language || 'Code'})`}
                                    </p>
                                </div>
                                {ex.tags && ex.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {ex.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-xs text-muted-foreground pt-3 border-t">
                                    <span>Created: {ex.createdAt ? format(new Date(ex.createdAt), 'dd/MM/yyyy') : 'N/A'}</span>
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => setSolvingExercise(ex)}><Pencil className="mr-2 h-4 w-4"/>Solve</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDiscard(ex.id)}><Trash2 className="mr-2 h-4 w-4"/>Discard</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : <p className="text-muted-foreground text-center py-4">No pending exercises. Generate one above!</p>}

            <h3 className="text-lg font-semibold mt-8 mb-2">Recently Completed ({completedExercises.length})</h3>
             {completedExercises.length > 0 ? (
                <div className="space-y-4">
                    {completedExercises.map(ex => (
                        <Card key={ex.id} className="opacity-80">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <h4 className="font-semibold">{ex.question}</h4>
                                        <p className="text-sm text-muted-foreground capitalize">
                                            Difficulty: {getDifficultyString(ex.difficulty)} ({ex.category})
                                        </p>
                                    </div>
                                    <Badge variant="secondary">
                                        <CheckCircle className="mr-1.5 h-3 w-3 text-green-500"/>
                                        Completed
                                    </Badge>
                                </div>
                             </CardContent>
                        </Card>
                    ))}
                </div>
            ) : <p className="text-muted-foreground text-center py-4">No completed exercises yet.</p>}
        </div>

        <Dialog open={!!solvingExercise} onOpenChange={(open) => !open && setSolvingExercise(null)}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Solve Custom Exercise</DialogTitle>
                </DialogHeader>
                {solvingExercise && user && (
                    <SingleExerciseSolver 
                        exercise={solvingExercise}
                        userId={user.uid}
                        onSolved={handleSolved}
                    />
                )}
            </DialogContent>
        </Dialog>
      </div>
    );

    