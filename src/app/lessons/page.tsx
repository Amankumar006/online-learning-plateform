"use client";

import { useState, useEffect } from "react";
import { getLessons, Lesson } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function LessonsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
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
  );
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoading(true);
      const lessonsData = await getLessons();
      setLessons(lessonsData);
      setIsLoading(false);
    };
    fetchLessons();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold font-headline">All Lessons</h1>
        <p className="text-lg text-muted-foreground">Browse our library of lessons to continue your learning journey.</p>
      </div>
      {isLoading ? (
        <LessonsSkeleton />
      ) : lessons.length > 0 ? (
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
