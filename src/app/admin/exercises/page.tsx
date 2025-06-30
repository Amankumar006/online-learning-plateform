
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAllExercises, ExerciseWithLessonTitle } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";

function ExercisesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
            </div>
            <Skeleton className="h-10 w-36" />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Lesson</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(3)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}


export default function AdminExercisesPage() {
  const [exercises, setExercises] = useState<ExerciseWithLessonTitle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExercises = async () => {
      const exercisesData = await getAllExercises();
      setExercises(exercisesData);
      setIsLoading(false);
    };
    fetchExercises();
  }, []);

  const breadcrumbItems = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/exercises", label: "Exercises" },
  ];

  const getDifficultyBadge = (level: number) => {
    switch (level) {
        case 1: return <Badge variant="secondary">Easy</Badge>;
        case 2: return <Badge variant="outline">Medium</Badge>;
        case 3: return <Badge variant="default">Hard</Badge>;
        default: return <Badge variant="secondary">N/A</Badge>;
    }
  }

  if (isLoading) {
    return (
        <div>
            <Breadcrumb items={breadcrumbItems} />
            <ExercisesSkeleton />
        </div>
    )
  }

  return (
    <div>
        <Breadcrumb items={breadcrumbItems} />
        <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Manage Exercises</CardTitle>
                    <CardDescription>
                        Here you can create, edit, and delete exercises.
                    </CardDescription>
                </div>
                <Button asChild>
                    <Link href="/admin/exercises/new">
                        <PlusCircle className="mr-2"/>
                        Create Exercise
                    </Link>
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Lesson</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {exercises.length > 0 ? (
                exercises.map((exercise: ExerciseWithLessonTitle) => (
                    <TableRow key={exercise.id}>
                    <TableCell className="font-medium truncate max-w-sm">{exercise.question}</TableCell>
                    <TableCell>{exercise.lessonTitle}</TableCell>
                    <TableCell>
                        {getDifficultyBadge(exercise.difficulty)}
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" disabled>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                        </Button>
                         <Button variant="ghost" size="icon" disabled>
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Delete</span>
                        </Button>
                    </TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center">
                    No exercises found.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </CardContent>
        </Card>
    </div>
  );
}
