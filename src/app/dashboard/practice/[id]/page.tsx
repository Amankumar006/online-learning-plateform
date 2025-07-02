
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
        <div className="space-y-4">
            <div className="border rounded-lg h-[calc(100vh-14rem)] flex flex-col p-6 space-y-6">
                {/* Question Skeleton */}
                <div className="space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-5 w-2/3" />
                </div>
                {/* Metadata Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
                {/* Tags Skeleton */}
                <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                </div>
                {/* Hint Skeleton */}
                <Skeleton className="h-20 w-full" />
                 {/* Answer Area Skeleton */}
                <Skeleton className="h-48 w-full flex-grow" />
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
        <div className="space-y-4">
             <div className="flex flex-col h-full bg-card rounded-lg border">
                 <SingleExerciseSolver
                    exercise={exercise}
                    userId={user.uid}
                    onSolved={handleSolved}
                    initialResponse={response}
                />
            </div>
        </div>
    );
}
