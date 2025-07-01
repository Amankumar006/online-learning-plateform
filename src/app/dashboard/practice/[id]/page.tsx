
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getExercise, getUserResponseForExercise, Exercise, UserExerciseResponse } from "@/lib/data";
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import SingleExerciseSolver from "@/components/practice/single-exercise-solver";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

function SolverPageSkeleton() {
    return (
        <div className="space-y-6">
            <div className="border rounded-lg h-[calc(100vh-10rem)] flex flex-col">
                <div className="p-6 border-b"><Skeleton className="h-7 w-3/4" /></div>
                <div className="p-6 flex-grow"><Skeleton className="h-48 w-full" /></div>
                <div className="p-4 border-t flex justify-end"><Skeleton className="h-10 w-32" /></div>
            </div>
        </div>
    )
}

export default function SolveExercisePage() {
    const params = useParams();
    const router = useRouter();
    const exerciseId = params.id as string;

    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [response, setResponse] = useState<UserExerciseResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                if (!exerciseId) {
                    setIsLoading(false);
                    return;
                }
                try {
                    const [exerciseData, responseData] = await Promise.all([
                        getExercise(exerciseId),
                        getUserResponseForExercise(currentUser.uid, exerciseId),
                    ]);
                    
                    if (!exerciseData) {
                        router.push('/dashboard/practice');
                        return;
                    }
                    
                    setExercise(exerciseData);
                    setResponse(responseData);

                } catch (error) {
                    console.error("Failed to load exercise data:", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                router.push('/login');
            }
        });

        return () => unsubscribe();
    }, [exerciseId, router]);

    const handleSolved = () => {
        router.push('/dashboard/practice');
    };
    
    if (isLoading) {
        return <SolverPageSkeleton />;
    }
    
    if (!exercise || !user) {
        return (
            <div className="text-center p-8">
                <p>Exercise not found or you are not logged in.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/dashboard/practice">Return to Practice</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-12rem)] bg-card rounded-lg border">
             <SingleExerciseSolver
                exercise={exercise}
                userId={user.uid}
                onSolved={handleSolved}
                initialResponse={response}
            />
        </div>
    );
}
