import Link from "next/link";
import { getLessons, Lesson } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle } from "lucide-react";
import LessonActions from "@/components/admin/LessonActions";

export default async function AdminLessonsPage() {
  const lessons = await getLessons();

  return (
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
  );
}
