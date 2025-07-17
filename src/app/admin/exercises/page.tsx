
"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getAllExercises, ExerciseWithLessonTitle, getLessons, Lesson } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, FilterX, Folder } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import ExerciseActions from "@/components/admin/ExerciseActions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type GroupedExercises = Record<string, { lessonTitle: string; exercises: ExerciseWithLessonTitle[] }>;

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
      <CardContent className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border rounded-md">
            <div className="p-4">
                <Skeleton className="h-6 w-1/2" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function ExercisesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allExercises, setAllExercises] = useState<ExerciseWithLessonTitle[]>([]);
  
  const lessonFilter = searchParams.get('lesson') || 'all';

  useEffect(() => {
    const fetchExercises = async () => {
      setIsLoading(true);
      const [exercisesData, lessonsData] = await Promise.all([
        getAllExercises(),
        getLessons(),
      ]);
      setAllExercises(exercisesData);
      setLessons(lessonsData);
      setIsLoading(false);
    };
    fetchExercises();
  }, []);

  const handleFilterChange = (lessonId: string) => {
    const params = new URLSearchParams(searchParams);
    if (lessonId && lessonId !== 'all') {
        params.set('lesson', lessonId);
    } else {
        params.delete('lesson');
    }
    router.push(`/admin/exercises?${params.toString()}`);
  };

  const clearFilter = () => {
    handleFilterChange('all');
  };

  const filteredAndGroupedExercises = useMemo((): GroupedExercises => {
    const exercisesToGroup = lessonFilter !== 'all' ? allExercises.filter(ex => ex.lessonId === lessonFilter) : allExercises;
    
    return exercisesToGroup.reduce((acc: GroupedExercises, exercise) => {
        const { lessonId, lessonTitle } = exercise;
        if (!acc[lessonId]) {
          acc[lessonId] = { lessonTitle: lessonTitle || 'Uncategorized', exercises: [] };
        }
        acc[lessonId].exercises.push(exercise);
        return acc;
      }, {});

  }, [allExercises, lessonFilter]);


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
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                <div>
                    <CardTitle>Manage Exercises</CardTitle>
                    <CardDescription>
                        Here you can create, edit, and delete exercises, grouped by lesson.
                    </CardDescription>
                </div>
                 <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Select value={lessonFilter} onValueChange={handleFilterChange}>
                        <SelectTrigger className="w-full sm:w-[250px]">
                            <SelectValue placeholder="Filter by lesson..." />
                        </SelectTrigger>
                        <SelectContent>
                             <SelectItem value="all">All Lessons</SelectItem>
                            {lessons.map(lesson => (
                                <SelectItem key={lesson.id} value={lesson.id}>{lesson.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {lessonFilter !== 'all' && (
                        <Button variant="ghost" onClick={clearFilter} className="flex-shrink-0">
                            <FilterX className="mr-2 h-4 w-4" /> Clear Filter
                        </Button>
                    )}
                    <Button asChild className="flex-shrink-0">
                        <Link href="/admin/exercises/new">
                            <PlusCircle className="mr-2"/> New Exercise
                        </Link>
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            {Object.keys(filteredAndGroupedExercises).length > 0 ? (
                <Accordion type="single" collapsible defaultValue={lessonFilter !== 'all' ? lessonFilter : Object.keys(filteredAndGroupedExercises)[0]}>
                    {Object.entries(filteredAndGroupedExercises).map(([lessonId, group]) => (
                        <AccordionItem value={lessonId} key={lessonId}>
                            <AccordionTrigger className="hover:no-underline p-4 rounded-lg hover:bg-muted/50 text-lg">
                                <div className="flex items-center gap-3">
                                    <Folder className="h-5 w-5 text-primary" />
                                    <span className="font-semibold">{group.lessonTitle}</span>
                                    <Badge variant="outline">{group.exercises.length} questions</Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Question</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Difficulty</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {group.exercises.map((exercise) => (
                                            <TableRow key={exercise.id}>
                                                <TableCell className="font-medium truncate max-w-md">{exercise.question}</TableCell>
                                                <TableCell><Badge variant="secondary" className="capitalize">{exercise.type.replace(/_/g, ' ')}</Badge></TableCell>
                                                <TableCell>{getDifficultyBadge(exercise.difficulty)}</TableCell>
                                                <TableCell className="text-right"><ExerciseActions exerciseId={exercise.id} /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                 <div className="text-center text-muted-foreground py-16">
                    <p className="mb-2 text-lg font-semibold">No exercises found.</p>
                    <p>Click "New Exercise" to get started.</p>
                </div>
            )}
        </CardContent>
        </Card>
    </div>
  );
}

export default function AdminExercisesPage() {
  return (
    <Suspense>
      <ExercisesPageContent />
    </Suspense>
  );
}
