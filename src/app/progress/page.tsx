
"use client";

import { useState, useEffect } from "react";
import { getUserProgress, UserProgress } from "@/lib/data";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import ProgressChart from "@/components/progress/progress-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function ProgressSkeleton() {
    return (
        <div className="flex flex-col gap-8">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[400px] w-full" />
                </CardContent>
            </Card>
        </div>
    )
}

export default function ProgressPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const progress = await getUserProgress(currentUser.uid);
        setUserProgress(progress);
      } else {
        setUser(null);
        setUserProgress(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return <ProgressSkeleton />;
  }

  if (!user || !userProgress) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-lg font-semibold mb-2">You need to be logged in to view your progress.</p>
            <p className="text-muted-foreground mb-4">Please log in to continue.</p>
            <Button asChild>
            <Link href="/login">Go to Login</Link>
            </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Subject Mastery</CardTitle>
          <CardDescription>
            Here is a breakdown of your mastery level in each subject.
            {userProgress.subjectsMastery.length === 0 && !isLoading && (
              <span className="block mt-2 text-xs">(Hint: No progress data found in Firestore for user '{user.uid}')</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProgressChart chartData={userProgress.subjectsMastery} />
        </CardContent>
      </Card>
    </div>
  );
}
