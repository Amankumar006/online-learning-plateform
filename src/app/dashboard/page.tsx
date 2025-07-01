
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUser, User, getLessons, Lesson, getUserProgress, UserProgress } from "@/lib/data";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { ArrowRight, Book, ChartLine, Sparkles, Target, Bot } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { generateStudyTopics } from "@/ai/flows/generate-study-topics";

function DashboardSkeleton() {
  return (
    <>
      <div className="space-y-2 mb-8">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-5 w-1/2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Next Lesson Card */}
        <div className="lg:col-span-2 md:col-span-2 rounded-xl p-6 space-y-4 bg-muted/50">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>

        {/* AI Recommendations */}
        <div className="rounded-xl p-6 space-y-3 bg-muted/50">
           <Skeleton className="h-5 w-40" />
           <Skeleton className="h-5 w-full mt-4" />
           <Skeleton className="h-5 w-5/6" />
           <Skeleton className="h-5 w-full" />
        </div>

        {/* Track Progress */}
        <div className="rounded-xl p-6 flex flex-col items-center justify-center bg-muted/50">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-5 w-24 mt-4" />
        </div>
      </div>
       <div className="mt-8">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
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
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(true);

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
            
            const progressSummary = `Completed lessons: ${progress.completedLessonIds?.length || 0}. Mastery by subject: ${progress.subjectsMastery?.map(s => `${s.subject}: ${s.mastery}%`).join(', ') || 'None'}.`;
            const goals = 'Achieve mastery in all available subjects and discover new areas of interest.';
            
            const uncompletedLessonTitles = lessonsData
                .filter(l => !progress.completedLessonIds?.includes(l.id))
                .map(l => l.title);
            
            if (uncompletedLessonTitles.length > 0) {
                 generateStudyTopics({ 
                    currentProgress: progressSummary, 
                    learningGoals: goals,
                    availableLessons: uncompletedLessonTitles
                 })
                  .then(result => {
                      setSuggestedTopics(result.suggestedTopics);
                  })
                  .catch(err => {
                      console.error("Failed to generate study topics:", err);
                       setSuggestedTopics([]);
                  })
                  .finally(() => {
                      setIsGeneratingTopics(false);
                  });
            } else {
                setSuggestedTopics([]);
                setIsGeneratingTopics(false);
            }

        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
            setIsGeneratingTopics(false);
        } finally {
            setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const completedLessonIds = userProgress?.completedLessonIds || [];
  const lessonMap = new Map(lessons.map(l => [l.id, l]));

  const recentlyCompleted = completedLessonIds.slice(-3).reverse().map(id => lessonMap.get(id)).filter(Boolean) as Lesson[];
  const lastCompletedLesson = recentlyCompleted.length > 0 ? recentlyCompleted[0] : null;

  const findLessonForTopic = (topic: string): Lesson | null => {
      if (!lessons) return null;
      return lessons.find(l => l.title === topic) || null;
  }
  
  const nextLesson = findLessonForTopic(suggestedTopics[0]) || lessons.find(l => !completedLessonIds.includes(l.id)) || lastCompletedLesson;


  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!user || !userProfile) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Welcome back, {userProfile.name?.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">Ready to continue your personalized learning journey? Let's achieve your goals together.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-2 md:col-span-2 rounded-lg bg-card/50 backdrop-blur-lg border border-primary/10 hover:border-primary/30 transition-all duration-300">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Your Next Lesson</CardTitle>
            </CardHeader>
            <CardContent>
                {nextLesson ? (
                    <div>
                        <p className="text-2xl font-semibold text-primary">{nextLesson.title}</p>
                        <p className="text-muted-foreground mb-4">{nextLesson.subject}</p>
                        <div className="w-full h-24 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center mb-4">
                            <ChartLine className="w-12 h-12 text-primary/50" />
                        </div>
                        <Button asChild className="w-full">
                            <Link href={`/dashboard/lessons/${nextLesson.id}`}>
                                {completedLessonIds.includes(nextLesson.id) ? 'Review Lesson' : 'Start Lesson'}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-muted-foreground mb-4">No new lessons to suggest. Why not review one you've completed?</p>
                        <Button asChild variant="secondary">
                            <Link href="/dashboard/lessons">Browse All Lessons</Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>

        <Card className="rounded-lg bg-card/50 backdrop-blur-lg border border-primary/10 hover:border-primary/30 transition-all duration-300">
             <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                <Bot className="w-6 h-6 text-primary"/>
                <CardTitle className="font-headline text-lg">AI Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
                 {isGeneratingTopics ? (
                    <div className="space-y-3 py-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                 ) : suggestedTopics.length > 1 ? (
                    <ul className="space-y-2 text-sm">
                        {suggestedTopics.slice(1, 4).map((topic, index) => {
                            const lesson = findLessonForTopic(topic);
                            return (
                               <li key={index} className="flex items-start gap-3 p-2 rounded-md hover:bg-secondary/50 transition-colors">
                                  <Sparkles className="w-4 h-4 mt-1 text-accent shrink-0" />
                                  {lesson ? (
                                    <Link href={`/dashboard/lessons/${lesson.id}`} className="flex-1 font-medium text-foreground hover:text-primary">
                                        {topic}
                                    </Link>
                                  ) : (
                                    <span className="flex-1 text-muted-foreground">{topic}</span>
                                  )}
                              </li>
                           );
                        })}
                    </ul>
                 ) : (
                    <p className="text-sm text-muted-foreground py-4">No other recommendations right now. Keep learning to get more!</p>
                 )}
            </CardContent>
        </Card>
        
        <Card className="rounded-lg bg-card/50 backdrop-blur-lg border border-primary/10 hover:border-primary/30 transition-all duration-300 flex flex-col">
             <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                <Target className="w-6 h-6 text-primary"/>
                <CardTitle className="font-headline text-lg">Track Progress</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col items-center justify-center">
                <div className="relative w-28 h-28">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path className="stroke-current text-secondary/50" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3"></path>
                        <path className="stroke-current text-primary" strokeDasharray={`${userProgress?.mastery || 0}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3" strokeLinecap="round" transform="rotate(-90 18 18)"></path>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">{userProgress?.mastery || 0}%</div>
                </div>
                 <Button variant="link" asChild className="mt-4">
                     <Link href="/dashboard/progress">View Details <ArrowRight className="w-4 h-4 ml-1" /></Link>
                 </Button>
            </CardContent>
        </Card>
      </div>

      {recentlyCompleted.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold font-headline mb-4">Recently Completed</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {recentlyCompleted.map((lesson) => (
                    <Link key={lesson.id} href={`/dashboard/lessons/${lesson.id}`}>
                        <Card className="h-full rounded-lg bg-card/50 backdrop-blur-lg border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:scale-105">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-primary/20 rounded-lg">
                                    <Book className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold">{lesson.title}</p>
                                    <p className="text-sm text-muted-foreground">{lesson.subject}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
          </div>
      )}
    </div>
  );
}
