
"use client";

import { useState, useEffect } from "react";
import { getUserProgress, UserProgress, getSolutionHistory, getUser, User } from "@/lib/data";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Activity, Clock, TrendingUp, BookOpenCheck, Award } from "lucide-react";
import SubjectActivityChart from "@/components/progress/SubjectActivityChart";
import WeeklyActivityChart from "@/components/progress/WeeklyActivityChart";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import SolutionBoard from "@/components/progress/SolutionBoard";


function ProgressSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                             <Skeleton className="h-5 w-24" />
                             <Skeleton className="h-5 w-5 rounded-full" />
                        </CardHeader>
                        <CardContent>
                             <Skeleton className="h-8 w-1/4" />
                             <Skeleton className="h-4 w-1/2 mt-1" />
                        </CardContent>
                    </Card>
                ))}
            </div>
             <div className="grid gap-6 md:grid-cols-2">
                 <Card>
                    <CardHeader>
                         <Skeleton className="h-6 w-1/3 mb-2" />
                         <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[250px] w-full" />
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader>
                         <Skeleton className="h-6 w-1/3 mb-2" />
                         <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[250px] w-full" />
                    </CardContent>
                 </Card>
             </div>
             <Card>
                <CardHeader>
                    <Skeleton className="h-7 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full" />
                </CardContent>
             </Card>
        </div>
    )
}

export default function ProgressPage() {
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [solutionHistory, setSolutionHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setIsLoading(true);
        try {
            const [profile, history] = await Promise.all([
                getUser(currentUser.uid),
                getSolutionHistory(currentUser.uid)
            ]);
            setUserProfile(profile);
            setSolutionHistory(history);
        } catch (error) {
            console.error("Failed to load progress data", error);
        } finally {
            setIsLoading(false);
        }
      }
      // The layout now handles redirection if the user is not logged in.
    });

    return () => unsubscribe();
  }, []);
  
  const breadcrumbItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/progress", label: "Progress" },
  ];
  
  if (isLoading) {
    return <ProgressSkeleton />;
  }

  if (!userProfile) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-lg font-semibold mb-2">No progress data found.</p>
            <p className="text-muted-foreground mb-4">Complete some lessons and exercises to see your progress here.</p>
      </div>
    )
  }
  
  const userProgress = userProfile.progress;
  const timeSpentHours = userProgress.timeSpent ? (userProgress.timeSpent / 3600).toFixed(1) : "0.0";
  const exerciseAccuracy = userProgress.totalExercisesAttempted && userProgress.totalExercisesAttempted > 0
    ? Math.round(((userProgress.totalExercisesCorrect || 0) / userProgress.totalExercisesAttempted) * 100)
    : 0;

  return (
    <div className="space-y-6">
        <Breadcrumb items={breadcrumbItems} />
        <div className="flex items-center gap-2">
             <TrendingUp className="h-8 w-8 text-primary" />
             <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Your Learning Progress</h1>
                <p className="text-muted-foreground">Visualize your achievements and track your journey towards mastery.</p>
             </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Experience Points</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-primary">{userProgress.xp || 0} XP</div>
                    <p className="text-xs text-muted-foreground">Earned from lessons & exercises</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Exercise Accuracy</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-primary">{exerciseAccuracy}%</div>
                    <p className="text-xs text-muted-foreground">Based on all attempts</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Lessons Completed</CardTitle>
                    <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-primary">{userProgress.completedLessonIds?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">Total lessons finished</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Login Streak</CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-primary">{userProfile.loginStreak || 0} days</div>
                    <p className="text-xs text-muted-foreground">Keep up the great work!</p>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Weekly Activity</CardTitle>
                    <CardDescription>Skills mastered and time spent per week (last 5 weeks).</CardDescription>
                </CardHeader>
                <CardContent>
                    <WeeklyActivityChart data={userProgress.weeklyActivity || []} />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Subject Activity</CardTitle>
                    <CardDescription>Distribution of your activity across different subjects.</CardDescription>
                </CardHeader>
                <CardContent>
                    <SubjectActivityChart data={userProgress.subjectsMastery} />
                </CardContent>
            </Card>
        </div>

        <SolutionBoard history={solutionHistory} />

    </div>
  );
}
