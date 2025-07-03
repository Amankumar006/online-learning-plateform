
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { createExercise, getCustomExercisesForUser, getAllUserResponses, UserExerciseResponse, Exercise, deleteExercise } from '@/lib/data';
import { generateCustomExercise, GeneratedExercise } from '@/ai/flows/generate-custom-exercise';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, ListChecks, Trash2, Eye, Pencil, BrainCircuit, Code, FunctionSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle } from 'lucide-react';


function PracticePageSkeleton() {
    return (
      <div className="space-y-8">
        <Card>
          <CardHeader><CardTitle><Skeleton className="h-7 w-64" /></CardTitle><CardDescription><Skeleton className="h-4 w-96 mt-2" /></CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-10 w-48" />
          </CardContent>
        </Card>
        <div className="h-8 w-56 bg-muted rounded-md" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="overflow-hidden flex flex-col">
                <Skeleton className="h-24 w-full" />
                <CardContent className="p-4 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-6 w-full mt-2" />
                    <Skeleton className="h-5 w-3/4 mt-1" />
                    <div className="flex-grow my-4 space-y-2">
                        <div className="flex gap-2">
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-5 w-20" />
                        </div>
                    </div>
                    <Skeleton className="h-10 w-full mt-auto" />
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
        });
        return () => unsubscribe();
    }, []);

    const handleGenerate = async () => {
        if (!prompt.trim() || !user) return;
        setIsGenerating(true);
        setPreviewExercise(null);
        try {
            const generatedExercise = await generateCustomExercise({ prompt });
            setPreviewExercise(generatedExercise);
        } catch (e: any) {
            console.error(e);
            toast({ variant: 'destructive', title: 'AI Error', description: e.message || 'Failed to generate exercise.' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!previewExercise || !user) return;
        try {
            let exerciseData: Omit<Exercise, 'id'>;

            switch (previewExercise.type) {
                case 'mcq':
                case 'true_false':
                    exerciseData = {
                        ...previewExercise,
                        correctAnswer: String(previewExercise.correctAnswer),
                        lessonId: 'custom',
                        isCustom: true,
                        userId: user.uid,
                        createdAt: Date.now()
                    };
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

            await createExercise(exerciseData);
            toast({ title: "Exercise Saved!", description: "Your new custom exercise has been added to your list." });
            setPrompt("");
            setPreviewExercise(null);
            fetchData(user.uid); // Refresh list
        } catch (e: any) {
             console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save exercise.' });
        }
    };
    
    const handleDiscardGenerated = () => {
        setPreviewExercise(null);
    };

    const handleDiscardSaved = async (exerciseId: string) => {
        if (!user) return;
        try {
            await deleteExercise(exerciseId);
            toast({ title: "Exercise Discarded", description: "The exercise has been removed." });
            fetchData(user.uid);
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to discard the exercise.' });
        }
    };
    
    if (isLoading || !user) return <PracticePageSkeleton />;
    
    const getDifficultyBadge = (level: number) => {
        switch (level) {
            case 1: return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Easy</Badge>;
            case 2: return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">Medium</Badge>;
            case 3: return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">Hard</Badge>;
            default: return <Badge variant="secondary">N/A</Badge>;
        }
    }
    
    const categoryIcons: Record<string, React.ReactNode> = {
        code: <Code className="w-12 h-12 text-muted-foreground/80" />,
        math: <FunctionSquare className="w-12 h-12 text-muted-foreground/80" />,
        general: <BrainCircuit className="w-12 h-12 text-muted-foreground/80" />,
    };

    const pendingExercises = exercises.filter(ex => !responses.has(ex.id));
    const completedExercises = exercises.filter(ex => responses.has(ex.id));

    const breadcrumbItems = [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/dashboard/practice", label: "Practice" },
    ];


    return (
      <div className="space-y-8">
        <Breadcrumb items={breadcrumbItems} />
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl font-headline">
                    <BrainCircuit className="text-primary h-7 w-7"/> Generate Custom Exercise
                </CardTitle>
                <CardDescription>Describe the type of exercise you want. The AI will generate a new exercise for you to review.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                           <p className="font-semibold">{previewExercise.type !== 'fill_in_the_blanks' ? (previewExercise as any).question : previewExercise.questionParts.join(' ___ ')}</p>
                           <div className="flex flex-wrap gap-2">
                                {previewExercise.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                {getDifficultyBadge(previewExercise.difficulty)}
                                {previewExercise.type && <Badge variant="secondary" className="capitalize">{previewExercise.type.replace(/_/g, ' ')}</Badge>}
                           </div>
                        </CardContent>
                    </Card>
                    <div className="flex gap-2">
                        <Button onClick={handleSave}>Save to My Exercises</Button>
                        <Button variant="outline" onClick={handleDiscardGenerated}>Discard</Button>
                    </div>
                </CardFooter>
            )}
        </Card>


        <div className="space-y-6">
            <h2 className="text-xl font-bold font-headline flex items-center gap-3">
                <ListChecks className="h-6 w-6" /> Your Custom Exercises
            </h2>
            
            <section>
                <h3 className="text-lg font-semibold mt-6 mb-3">Pending & In-Progress ({pendingExercises.length})</h3>
                {pendingExercises.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {pendingExercises.map(ex => (
                            <Card key={ex.id} className="overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                                <div className="h-24 bg-gradient-to-br from-muted to-secondary flex items-center justify-center">
                                    {categoryIcons[ex.category || 'general']}
                                </div>
                                <CardContent className="p-4 flex flex-col flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="capitalize">{ex.type.replace(/_/g, ' ')}</Badge>
                                        {getDifficultyBadge(ex.difficulty)}
                                    </div>
                                    <CardTitle className="text-base font-semibold leading-relaxed h-12 line-clamp-2">
                                        {ex.type !== 'fill_in_the_blanks' ? ex.question : (ex as any).questionParts.join(' ___ ')}
                                    </CardTitle>
                                    <div className="flex-grow my-4">
                                        {ex.tags && ex.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {ex.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 mt-auto">
                                        <Button asChild className="w-full"><Link href={`/dashboard/practice/${ex.id}`}><Pencil className="mr-2 h-4 w-4"/>Solve</Link></Button>
                                        <Button size="icon" variant="outline" onClick={() => handleDiscardSaved(ex.id)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Alert><AlertTitle>No pending exercises!</AlertTitle><AlertDescription>Use the generator above to create new practice problems.</AlertDescription></Alert>
                )}
            </section>

            <section>
                <h3 className="text-lg font-semibold mt-8 mb-3">Recently Completed ({completedExercises.length})</h3>
                {completedExercises.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {completedExercises.map(ex => {
                             const response = responses.get(ex.id);
                             return (
                                <Card key={ex.id} className="overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 opacity-80">
                                    <div className="relative h-24 bg-gradient-to-br from-muted to-secondary flex items-center justify-center">
                                        {categoryIcons[ex.category || 'general']}
                                        {response?.isCorrect && (
                                             <div className="absolute top-2 right-2 p-1 bg-green-500/80 backdrop-blur-sm rounded-full text-white">
                                                <CheckCircle className="h-4 w-4" />
                                            </div>
                                        )}
                                    </div>
                                    <CardContent className="p-4 flex flex-col flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="outline" className="capitalize">{ex.type.replace(/_/g, ' ')}</Badge>
                                            {getDifficultyBadge(ex.difficulty)}
                                        </div>
                                        <CardTitle className="text-base font-semibold leading-relaxed h-12 line-clamp-2">
                                            {ex.type !== 'fill_in_the_blanks' ? ex.question : (ex as any).questionParts.join(' ___ ')}
                                        </CardTitle>
                                        <div className="flex-grow my-4">
                                            {ex.tags && ex.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {ex.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                                </div>
                                            )}
                                        </div>
                                        <Button asChild variant="secondary" className="w-full mt-auto"><Link href={`/dashboard/practice/${ex.id}`}><Eye className="mr-2 h-4 w-4"/>View Solution</Link></Button>
                                    </CardContent>
                                </Card>
                             )
                        })}
                    </div>
                ) : (
                    <Alert><AlertTitle>No completed exercises yet.</AlertTitle><AlertDescription>Once you solve a pending exercise, it will appear here.</AlertDescription></Alert>
                )}
            </section>
        </div>
      </div>
    );
}
