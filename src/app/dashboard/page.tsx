
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getUser, User, getLessons, Lesson, getUserProgress, UserProgress } from "@/lib/data";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { History, Sparkles, ArrowRight, BookOpen, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function DashboardSkeleton() {
  return (
    <>
      <div className="space-y-2 mb-8">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-5 w-1/2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
              <Card>
                  <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                  <CardContent><Skeleton className="h-5 w-1/2" /></CardContent>
              </Card>
              <Card>
                  <CardHeader><Skeleton className="h-6 w-56" /></CardHeader>
                  <CardContent className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                          <div key={i} className="p-4 border-b border-border">
                              <Skeleton className="h-5 w-3/4 mb-2" />
                              <Skeleton className="h-4 w-1/2" />
                          </div>
                      ))}
                  </CardContent>
              </Card>
          </div>
          <div className="lg:col-span-1">
              <Card>
                  <CardHeader>
                      <Skeleton className="h-6 w-40 mb-2" />
                      <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-10 w-full" />
                  </CardContent>
              </Card>
          </div>
      </div>
    </>
  );
}


export default function DashboardPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsLoading(true);
        try {
            const [profile, progress, lessonsData] = await Promise.all([
                getUser(currentUser.uid),
                getUserProgress(currentUser.uid),
                getLessons()
            ]);
            setUserProfile(profile);
            setUserProgress(progress);
            setLessons(lessonsData);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const completedLessonIds = userProgress?.completedLessonIds || [];
  const lessonMap = new Map(lessons.map(l => [l.id, l]));

  const recentlyCompleted = completedLessonIds.slice(-3).reverse().map(id => lessonMap.get(id)).filter(Boolean) as Lesson[];
  const lastCompletedLesson = recentlyCompleted.length > 0 ? recentlyCompleted[0] : null;

  const recommendedLessons = lessons.filter(lesson => !completedLessonIds.includes(lesson.id));
  const nextLesson = recommendedLessons.length > 0 ? recommendedLessons[0] : null;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!user || !userProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className="text-lg font-semibold mb-2">You need to be logged in to view your dashboard.</p>
        <p className="text-muted-foreground mb-4">Please log in to continue.</p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Welcome back, {userProfile.name?.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">Ready to continue your personalized learning journey? Let's achieve your goals together.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <History className="w-6 h-6 text-primary"/>
              <CardTitle className="font-headline text-xl">Continue Where You Left Off</CardTitle>
            </CardHeader>
            <CardContent>
              {lastCompletedLesson ? (
                <>
                  <p className="text-muted-foreground">Your last completed lesson was:</p>
                  <p className="text-lg font-semibold text-primary mt-1">{lastCompletedLesson.title}</p>
                   <Button variant="link" asChild className="p-0 h-auto mt-2">
                     <Link href={`/dashboard/lessons/${lastCompletedLesson.id}`}>Review Lesson <ArrowRight className="w-4 h-4 ml-1" /></Link>
                   </Button>
                </>
              ) : (
                <>
                 <p className="text-muted-foreground">You haven't completed any lessons yet. Start your first one!</p>
                 <Button variant="secondary" asChild className="mt-4">
                    <Link href="/dashboard/lessons">Browse Lessons</Link>
                 </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <Sparkles className="w-6 h-6 text-primary"/>
              <CardTitle className="font-headline text-xl">Recently Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">A look at the lessons you've recently finished.</CardDescription>
              <div className="space-y-2">
                {recentlyCompleted.length > 0 ? (
                  recentlyCompleted.map((item) => (
                    <div key={item.id} className="border-b border-border/50 last:border-b-0 py-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold">{item.title}</h4>
                        <Badge variant="outline" className="border-primary text-primary">
                          <CheckCircle className="mr-1.5 h-3 w-3" />
                          Completed
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.subject}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No completed lessons yet. Finish a lesson to see it here!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="font-headline text-xl">Your Learning Path</CardTitle>
              <CardDescription>Based on your progress, here's a recommended next step.</CardDescription>
            </CardHeader>
            <CardContent>
              {nextLesson ? (
                <div className="space-y-4">
                    <div className="p-4 bg-card-foreground/5 rounded-lg">
                      <p className="text-xs font-semibold text-primary flex items-center gap-1"><BookOpen className="w-3 h-3" /> Recommended Lesson</p>
                      <h4 className="font-semibold text-foreground mb-1">{nextLesson.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{nextLesson.description}</p>
                      <Link href={`/dashboard/lessons/${nextLesson.id}`} className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                        Start Lesson <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                    <div className="p-4 bg-card-foreground/5 rounded-lg opacity-50">
                      <p className="text-xs font-semibold text-primary">Generate Custom Exercise</p>
                      <h4 className="font-semibold text-foreground mb-1">AI-Powered Practice</h4>
                      <p className="text-sm text-muted-foreground mb-2">Apply your knowledge in a new context. (Coming Soon)</p>
                       <span className="text-sm font-semibold text-primary/50 flex items-center gap-1 cursor-not-allowed">
                        Generate Exercise <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                </div>
              ) : (
                 <div className="text-center py-6">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                    <h3 className="mt-2 text-lg font-medium">All Lessons Completed!</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Congratulations! You've completed all available lessons.
                    </p>
                 </div>
              )}
               <Button variant="secondary" className="w-full mt-6" asChild>
                <Link href="/dashboard/lessons">
                    Browse All Lessons <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
