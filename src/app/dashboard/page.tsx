
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getLessons, getUserProgress, Lesson, UserProgress } from "@/lib/data";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { BookOpen, Target, Award, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardSkeleton() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lessons Completed</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-4 w-1/2 mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-4 w-3/4 mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Mastery</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/4 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight font-headline my-4">Continue Learning</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden flex flex-col">
              <Skeleton className="w-full h-40" />
              <CardContent className="p-4 flex flex-col flex-1">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-10 w-full mt-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}


export default function DashboardPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const [progress, lessonsData] = await Promise.all([
          getUserProgress(currentUser.uid),
          getLessons()
        ]);
        setUserProgress(progress);
        setLessons(lessonsData);
      } else {
        // Handle case where user is not logged in, maybe redirect or show a message
        setUser(null);
        setUserProgress(null);
        setLessons([]);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!user || !userProgress) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className="text-lg font-semibold mb-2">You need to be logged in to view your dashboard.</p>
        <p className="text-muted-foreground mb-4">Please log in to continue.</p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lessons Completed</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userProgress.completedLessons}</div>
            <p className="text-xs text-muted-foreground">+2 since last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userProgress.averageScore}%</div>
            <p className="text-xs text-muted-foreground">Keep up the great work!</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Mastery</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{userProgress.mastery}%</div>
            <Progress value={userProgress.mastery} aria-label={`${userProgress.mastery}% mastery`} />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight font-headline my-4">Continue Learning</h2>
        {lessons.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {lessons.map((lesson) => (
              <Card key={lesson.id} className="overflow-hidden flex flex-col">
                <Link href={`/lessons/${lesson.id}`} className="block">
                  <Image
                    src={lesson.image}
                    width="600"
                    height="400"
                    alt={lesson.title}
                    data-ai-hint={`${lesson.subject.toLowerCase()} learning`}
                    className="w-full h-40 object-cover hover:opacity-90 transition-opacity"
                  />
                </Link>
                <CardContent className="p-4 flex flex-col flex-1">
                  <CardTitle className="text-lg font-headline mb-2">{lesson.title}</CardTitle>
                  <CardDescription className="mb-4 h-10 flex-grow">{lesson.description}</CardDescription>
                  <Button asChild className="w-full mt-auto">
                    <Link href={`/lessons/${lesson.id}`}>Start Lesson</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>No lessons available yet. Check back soon!</p>
              <p className="text-sm mt-2">(Hint: Admins can add lessons in the /admin/lessons section)</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
