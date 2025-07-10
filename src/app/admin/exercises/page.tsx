
"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getAllExercises, ExerciseWithLessonTitle, getLessons, Lesson } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, FilterX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import ExerciseActions from "@/components/admin/ExerciseActions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

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
              <TableHead>Type</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
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

function ExercisesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exercises, setExercises] = useState<ExerciseWithLessonTitle[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchExercises = async () => {
      setIsLoading(true);
      const [exercisesData, lessonsData] = await Promise.all([
        getAllExercises(),
        getLessons(),
      ]);
      setExercises(exercisesData);
      setLessons(lessonsData);
      
      const lessonFilter = searchParams.get('lesson');
      if (lessonFilter) {
        setFilter(lessonFilter);
      }
      setIsLoading(false);
    };
    fetchExercises();
  }, [searchParams]);

  const handleFilterChange = (lessonId: string) => {
    setFilter(lessonId);
    router.push(`/admin/exercises?lesson=${lessonId}`);
  };

  const clearFilter = () => {
    setFilter('');
    router.push('/admin/exercises');
  };

  const filteredExercises = filter
    ? exercises.filter((ex) => ex.lessonId === filter)
    : exercises;

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
                        Here you can create, edit, and delete exercises.
                    </CardDescription>
                </div>
                 <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Select value={filter} onValueChange={handleFilterChange}>
                        <SelectTrigger className="w-full sm:w-[250px]">
                            <SelectValue placeholder="Filter by lesson..." />
                        </SelectTrigger>
                        <SelectContent>
                            {lessons.map(lesson => (
                                <SelectItem key={lesson.id} value={lesson.id}>{lesson.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {filter && (
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
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Lesson</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredExercises.length > 0 ? (
                filteredExercises.map((exercise: ExerciseWithLessonTitle) => (
                    <TableRow key={exercise.id}>
                    <TableCell className="font-medium truncate max-w-sm">{exercise.question}</TableCell>
                    <TableCell>{exercise.lessonTitle}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{exercise.type.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell>
                        {getDifficultyBadge(exercise.difficulty)}
                    </TableCell>
                    <TableCell className="text-right">
                        <ExerciseActions exerciseId={exercise.id} />
                    </TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center">
                    No exercises found for the selected filter.
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

export default function AdminExercisesPage() {
  return (
    <Suspense fallback={<ExercisesSkeleton />}>
      <ExercisesPageContent />
    </Suspense>
  );
}
