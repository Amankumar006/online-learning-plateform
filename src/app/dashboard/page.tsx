import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getLessons, getUserProgress } from "@/lib/data";
import { BookOpen, Target, Award } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  // In a real app, you'd get the user ID from the session.
  const MOCK_USER_ID = "user123";
  const userProgress = await getUserProgress(MOCK_USER_ID);
  const lessons = await getLessons();

  return (
    <>
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
        <h2 className="text-2xl font-bold tracking-tight font-headline my-4">Continue Learning</h2>
        {lessons.length > 0 ? (
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
              <p className="text-sm mt-2">(Hint: Populate your Firestore 'lessons' collection)</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
