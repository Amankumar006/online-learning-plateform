
"use client";

import { getLesson, getExercises, getUserProgress, Lesson, Exercise, UserProgress } from "@/lib/data";
import { notFound, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LessonContent from "@/components/lessons/lesson-content";
import AdaptiveExercise from "@/components/lessons/adaptive-exercise";
import AIBuddy from "@/components/lessons/ai-buddy";
import { BookText, Bot, BrainCircuit, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";


function LessonPageSkeleton() {
    return (
        <div>
            <Skeleton className="h-10 w-3/4 mb-2" />
            <Skeleton className="h-6 w-1/4 mb-6" />
            <Tabs defaultValue="lesson" className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-10">
                    <TabsTrigger value="lesson" disabled><BookText className="mr-2"/>Lesson</TabsTrigger>
                    <TabsTrigger value="exercise" disabled><BrainCircuit className="mr-2"/>Exercise</TabsTrigger>
                    <TabsTrigger value="ai-buddy" disabled><Bot className="mr-2"/>AI Buddy</TabsTrigger>
                </TabsList>
                <TabsContent value="lesson">
                    <Card><CardContent className="p-6 space-y-4">
                        <Skeleton className="h-[400px] w-full" />
                        <Skeleton className="h-24 w-full" />
                    </CardContent></Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}


export default function LessonPage({ params }: { params: { id: string } }) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUserProgress = async (uid: string) => {
    const progress = await getUserProgress(uid);
    setUserProgress(progress);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsLoading(true);
        try {
          const [lessonData, exercisesData, progressData] = await Promise.all([
            getLesson(params.id),
            getExercises(params.id),
            getUserProgress(currentUser.uid),
          ]);
          
          if (!lessonData) {
            notFound();
            return;
          }
          setLesson(lessonData);
          setExercises(exercisesData);
          setUserProgress(progressData);

        } catch (error) {
            console.error("Failed to load lesson data", error);
        } finally {
            setIsLoading(false);
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [params.id, router]);

  if (isLoading) {
    return <LessonPageSkeleton />;
  }

  if (!user || !lesson) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className="text-lg font-semibold mb-2">Could not load lesson.</p>
        <p className="text-muted-foreground mb-4">Please make sure you are logged in and the lesson exists.</p>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold font-headline">{lesson.title}</h1>
        <p className="text-lg text-muted-foreground">{lesson.subject}</p>
      </div>
      <Tabs defaultValue="lesson" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-10">
          <TabsTrigger value="lesson"><BookText className="mr-2"/>Lesson</TabsTrigger>
          <TabsTrigger value="exercise"><BrainCircuit className="mr-2"/>Exercise</TabsTrigger>
          <TabsTrigger value="ai-buddy"><Bot className="mr-2"/>AI Buddy</TabsTrigger>
        </TabsList>
        <TabsContent value="lesson">
          <LessonContent 
            lesson={lesson} 
            userId={user.uid}
            userProgress={userProgress}
            onLessonComplete={() => fetchUserProgress(user.uid)}
          />
        </TabsContent>
        <TabsContent value="exercise">
          <AdaptiveExercise exercises={exercises} />
        </TabsContent>
        <TabsContent value="ai-buddy">
          <AIBuddy lessonContent={lesson.content} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
