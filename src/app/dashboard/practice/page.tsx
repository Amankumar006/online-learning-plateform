
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { createExercise, getCustomExercisesForUser, getAllUserResponses, UserExerciseResponse, Exercise, deleteExercise } from '@/lib/data';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ExerciseGenerator } from '@/components/practice/exercise-generator';
import { ExerciseList } from '@/components/practice/exercise-list';

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
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [responses, setResponses] = useState<Map<string, UserExerciseResponse>>(new Map());

    const { toast } = useToast();

    const fetchData = async (uid: string) => {
        setIsLoading(true);
        try {
            const [customExercises, userResponses] = await Promise.all([
                getCustomExercisesForUser(uid),
                getAllUserResponses(uid)
            ]);
            setExercises(customExercises.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSaveExercise = async (exerciseData: Omit<Exercise, 'id'>) => {
        try {
            await createExercise(exerciseData);
            toast({ title: "Exercise Saved!", description: "Your new custom exercise has been added to your list." });
            if (user) fetchData(user.uid);
        } catch (e: any) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save exercise.' });
            throw e; // Re-throw to let the generator know it failed if needed
        }
    };

    const handleDiscardSaved = async (exerciseId: string) => {
        if (!user) return;
        try {
            await deleteExercise(exerciseId);
            toast({ title: "Exercise Discarded", description: "The exercise has been removed." });
            if (user) fetchData(user.uid);
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to discard the exercise.' });
        }
    };

    if (isLoading || !user) return <PracticePageSkeleton />;

    const breadcrumbItems = [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/dashboard/practice", label: "Practice" },
    ];

    return (
        <div className="space-y-8">
            <Breadcrumb items={breadcrumbItems} />

            <ExerciseGenerator
                user={user}
                onSave={handleSaveExercise}
            />

            <ExerciseList
                exercises={exercises}
                responses={responses}
                onDiscard={handleDiscardSaved}
            />
        </div>
    );
}
