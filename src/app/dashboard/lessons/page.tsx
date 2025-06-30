
"use client";

import { useState, useEffect } from "react";
import { getLessons, Lesson, getUserProgress, UserProgress } from "@/lib/data";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

function LessonsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="overflow-hidden flex flex-col">
          <Skeleton className="w-full h-40" />
          <CardContent className="p-4 flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-6 w-full mt-2" />
            <Skeleton className="h-10 w-full my-4" />
            <div className="flex-grow" />
            <Skeleton className="h-10 w-full mt-auto" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setIsLoading(true);
        try {
            const lessonsData = await getLessons();
            setLessons(lessonsData);

            if (currentUser) {
                const progressData = await getUserProgress(currentUser.uid);
                setUserProgress(progressData);
            } else {
                setUserProgress(null);
            }
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setIsLoading(false);
        }
    });

    return () => unsubscribe();
  }, []);


  const breadcrumbItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/lessons", label: "Lessons" },
  ];

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold font-headline">All Lessons</h1>
        <p className="text-lg text-muted-foreground">Browse our library of lessons to continue your learning journey.</p>
      </div>
      {isLoading ? (
        <LessonsSkeleton />
      ) : lessons.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson) => {
            const isCompleted = userProgress?.completedLessonIds?.includes(lesson.id) ?? false;
            return (
                <Card key={lesson.id} className="overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                    <div className="relative">
                        <Link href={`/dashboard/lessons/${lesson.id}`} className="block overflow-hidden">
                        <Image
                            src={lesson.image || "https://placehold.co/600x400.png"}
                            width="600"
                            height="400"
                            alt={lesson.title}
                            data-ai-hint={`${lesson.subject.toLowerCase()} learning`}
                            className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        </Link>
                        {isCompleted && (
                            <Badge variant="secondary" className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm">
                                <CheckCircle className="mr-1.5 h-3 w-3 text-green-500" />
                                Completed
                            </Badge>
                        )}
                    </div>
                    <CardContent className="p-4 flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="font-medium">{lesson.subject}</Badge>
                            <Badge variant="outline" className="font-normal">{lesson.difficulty}</Badge>
                        </div>
                        
                        <CardTitle className="text-lg font-headline mt-1">{lesson.title}</CardTitle>
                        
                        <CardDescription className="mb-4 mt-2 text-sm h-10 line-clamp-2 flex-grow">{lesson.description}</CardDescription>
    
                        <Button asChild className="w-full mt-auto">
                            <Link href={`/dashboard/lessons/${lesson.id}`}>{isCompleted ? 'Review Lesson' : 'Start Lesson'}</Link>
                        </Button>
                    </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>No lessons available yet. Check back soon!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
