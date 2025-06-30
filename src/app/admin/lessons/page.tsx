
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getLessons, Lesson } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle } from "lucide-react";
import LessonActions from "@/components/admin/LessonActions";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";

function LessonsSkeleton() {
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
              <TableHead>Title</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(3)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}


export default function AdminLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLessons = async () => {
      const lessonsData = await getLessons();
      setLessons(lessonsData);
      setIsLoading(false);
    };
    fetchLessons();
  }, []);

  const breadcrumbItems = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/lessons", label: "Lessons" },
  ];

  if (isLoading) {
    return (
        <div>
            <Breadcrumb items={breadcrumbItems} />
            <LessonsSkeleton />
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
                    <CardTitle>Manage Lessons</CardTitle>
                    <CardDescription>
                        Here you can create, edit, and delete lessons.
                    </CardDescription>
                </div>
                <Button asChild>
                    <Link href="/admin/lessons/new">
                        <PlusCircle className="mr-2"/>
                        Create Lesson
                    </Link>
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {lessons.length > 0 ? (
                lessons.map((lesson: Lesson) => (
                    <TableRow key={lesson.id}>
                    <TableCell className="font-medium">{lesson.title}</TableCell>
                    <TableCell>{lesson.subject}</TableCell>
                    <TableCell>
                        <Badge variant="outline">{lesson.difficulty}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <LessonActions lessonId={lesson.id} />
                    </TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center">
                    No lessons found.
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
