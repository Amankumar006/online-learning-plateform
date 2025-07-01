
"use client";

import { getLesson, getExercises, getUserProgress, Lesson, Exercise, UserProgress, TextBlock } from "@/lib/data";
import { notFound, useRouter, useParams } from "next/navigation";
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
import { Breadcrumb } from "@/components/ui/breadcrumb";


function LessonPageSkeleton() {
    return (
        <div>
            <Skeleton className="h-6 w-1/2 mb-6" />
            <Skeleton className="h-10 w-3/4 mb-2" />
            <Skeleton className="h-6 w-1/4 mb-6" />
            <Card>
                <CardContent className="p-6">
                    <Tabs defaultValue="lesson" className="w-full">
                        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-10 mb-6">
                            <TabsTrigger value="lesson" disabled><BookText className="mr-2"/>Lesson</TabsTrigger>
                            <TabsTrigger value="exercise" disabled><BrainCircuit className="mr-2"/>Exercise</TabsTrigger>
                            <TabsTrigger value="ai-buddy" disabled><Bot className="mr-2"/>AI Buddy</TabsTrigger>
                        </TabsList>
                        <TabsContent value="lesson" className="space-y-4">
                            <Skeleton className="h-[400px] w-full" />
                            <Skeleton className="h-24 w-full" />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}


export default function LessonPage() {
  const params = useParams();
  const id = params.id as string;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
            getLesson(id),
            getExercises(id),
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
      }
      // The layout now handles redirection if the user is not logged in.
    });

    return () => unsubscribe();
  }, [id]);

  if (isLoading) {
    return <LessonPageSkeleton />;
  }

  if (!user || !lesson) {
    // This case might be hit briefly before layout redirection or if data fetch fails.
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-lg font-semibold">Loading Lesson...</p>
      </div>
    );
  }
  
  const textContentForAI = lesson.sections && lesson.sections.length > 0
    ? lesson.sections.map(section => {
        const sectionTitle = `## ${section.title}\n\n`;
        const sectionContent = section.blocks
            .filter(block => block.type === 'text')
            .map(block => (block as TextBlock).content)
            .join('\n\n');
        return sectionTitle + sectionContent;
      }).join('\n\n---\n\n')
    : "This lesson has no textual content.";

  const breadcrumbItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/lessons", label: "Lessons" },
    { href: `/dashboard/lessons/${lesson.id}`, label: lesson.title },
  ];

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold font-headline">{lesson.title}</h1>
        <p className="text-lg text-muted-foreground">{lesson.subject}</p>
      </div>
      <Card>
          <CardContent className="p-4 sm:p-6">
            <Tabs defaultValue="lesson" className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-10 mb-6">
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
                <AdaptiveExercise exercises={exercises} userId={user.uid} />
                </TabsContent>
                <TabsContent value="ai-buddy">
                <AIBuddy lessonContent={textContentForAI} />
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
