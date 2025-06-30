
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getLessons, getUserProgress, Lesson, UserProgress } from "@/lib/data";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { BookOpen, Target, Award, Loader2, CheckCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";

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
        <h2 className="text-2xl font-bold tracking-tight font-headline my-4">Recommended for You</h2>
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
  
  const recommendedLessons = lessons.filter(
    (lesson) => !(userProgress.completedLessonIds || []).includes(lesson.id)
  );

  const breadcrumbItems = [{ href: "/dashboard", label: "Dashboard" }];

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
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
        <h2 className="text-2xl font-bold tracking-tight font-headline my-4">Recommended for You</h2>
        <p className="text-muted-foreground mb-6">Here are some lessons we think you should tackle next.</p>
        {recommendedLessons.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recommendedLessons.map((lesson) => (
              <Card key={lesson.id} className="overflow-hidden flex flex-col">
                <Link href={`/dashboard/lessons/${lesson.id}`} className="block">
                  <Image
                    src={lesson.image || "https://placehold.co/600x400.png"}
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
                    <Link href={`/dashboard/lessons/${lesson.id}`}>Start Lesson</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
           <Card className="flex flex-col items-center justify-center p-10 text-center">
            <CheckCircle className="h-12 w-12 text-primary mb-4" />
            <CardTitle className="mb-2 font-headline">All Caught Up!</CardTitle>
            <CardDescription>You've completed all available lessons. Great job!</CardDescription>
            <Button asChild className="mt-6">
                <Link href="/dashboard/lessons">Review Lessons</Link>
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
