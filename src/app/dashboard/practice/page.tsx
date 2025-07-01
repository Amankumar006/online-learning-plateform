
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createExercise, getCustomExercisesForUser, getAllUserResponses, UserExerciseResponse, Exercise, deleteExercise } from '@/lib/data';
import { generateCustomExercise, GeneratedExercise } from '@/ai/flows/generate-custom-exercise';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, ListChecks, Trash2, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SingleExerciseSolver from '@/components/practice/single-exercise-solver';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
    const [prompt, setPrompt] = useState('');
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [responses, setResponses] = useState<Map<string, UserExerciseResponse>>(new Map());
    const [solvingExercise, setSolvingExercise] = useState<Exercise | null>(null);

    const router = useRouter();
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
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleGenerate = async () => {
        if (!prompt.trim() || !user) return;
        setIsGenerating(true);
        try {
            const result = await generateCustomExercise({ prompt });
            await createExercise({
                ...result,
                correctAnswer: String(result.correctAnswer),
                isCustom: true,
                userId: user.uid,
                createdAt: Date.now()
            });
            toast({ title: "Exercise Generated!", description: "Your new custom exercise is ready to be solved." });
            setPrompt('');
            fetchData(user.uid); // Refresh list
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'AI Error', description: 'Failed to generate exercise. Please try a different prompt.' });
        } finally {
            setIsGenerating(false);
        }
    };

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
    
    if (isLoading) return <PracticePageSkeleton />;

    const pendingExercises = exercises.filter(ex => !responses.has(ex.id));
    const completedExercises = exercises.filter(ex => responses.has(ex.id));

    return (
      <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                    <Sparkles className="text-primary"/> Generate Custom Exercise
                </CardTitle>
                <CardDescription>Describe the type of exercise you want. It will be saved for you to solve.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea 
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="e.g., 'Create a Python exercise about list comprehensions...' or 'Give me an intermediate C++ problem on implementing a simple linked list...'"
                    rows={4}
                    disabled={isGenerating}
                />
                <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
                    {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                    Generate & Save Exercise
                </Button>
            </CardContent>
        </Card>

        <div>
            <h2 className="text-xl font-bold font-headline flex items-center gap-2 mb-4">
                <ListChecks /> Your Custom Exercises
            </h2>
            
            <h3 className="text-lg font-semibold mt-6 mb-2">Pending & In-Progress ({pendingExercises.length})</h3>
            {pendingExercises.length > 0 ? (
                <div className="space-y-4">
                    {pendingExercises.map(ex => (
                        <Card key={ex.id}>
                            <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex-1 space-y-1">
                                    <p className="font-semibold">{ex.question}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Difficulty: {ex.difficulty}/3 | Category: <span className="capitalize">{ex.category}</span>
                                        {ex.category === 'code' && ` (${(ex as any).language})`}
                                    </p>
                                     <div className="flex flex-wrap gap-1 pt-1">
                                        {ex.tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                    </div>
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-2 w-full sm:w-auto">
                                    <Button onClick={() => setSolvingExercise(ex)} className="flex-1 sm:flex-none">
                                        <Pencil className="mr-2"/>Solve
                                    </Button>
                                    <Button variant="destructive" onClick={() => handleDiscard(ex.id)} className="flex-1 sm:flex-none">
                                        <Trash2 className="mr-2"/>Discard
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : <p className="text-muted-foreground">No pending exercises. Generate one above!</p>}

            <h3 className="text-lg font-semibold mt-8 mb-2">Recently Completed ({completedExercises.length})</h3>
             {completedExercises.length > 0 ? (
                <div className="space-y-4">
                    {completedExercises.map(ex => (
                        <Card key={ex.id} className="opacity-70">
                             <CardContent className="p-4 flex justify-between items-center gap-4">
                                <div>
                                    <p className="font-semibold">{ex.question}</p>
                                    <p className="text-sm text-muted-foreground">Completed {formatDistanceToNow(responses.get(ex.id)!.submittedAt)} ago</p>
                                </div>
                                <Badge variant={responses.get(ex.id)?.isCorrect ? 'default' : 'destructive'}>
                                    {responses.get(ex.id)?.isCorrect ? 'Correct' : 'Incorrect'}
                                </Badge>
                             </CardContent>
                        </Card>
                    ))}
                </div>
            ) : <p className="text-muted-foreground">No completed exercises yet.</p>}
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
}
