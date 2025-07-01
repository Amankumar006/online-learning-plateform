
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUser, User, getLessons, Lesson, getUserProgress, UserProgress } from "@/lib/data";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { ArrowRight, Book, Bot, MessageSquare, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { generateStudyTopics } from "@/ai/flows/generate-study-topics";

function DashboardSkeleton() {
  return (
    <div className="bg-black/10 dark:bg-black/20 backdrop-blur-2xl p-4 sm:p-6 rounded-2xl border border-white/10">
      <div className="space-y-2 mb-8">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-5 w-1/2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Next Lesson Card */}
        <div className="lg:col-span-2 md:col-span-2 rounded-xl p-6 space-y-4 bg-white/5 backdrop-blur-lg">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>

        {/* AI Recommendations */}
        <div className="rounded-xl p-6 space-y-3 bg-white/5 backdrop-blur-lg">
           <Skeleton className="h-5 w-40" />
           <Skeleton className="h-5 w-full mt-4" />
           <Skeleton className="h-5 w-5/6" />
           <Skeleton className="h-5 w-full" />
        </div>

        {/* Track Progress */}
        <div className="rounded-xl p-6 flex flex-col items-center justify-center bg-white/5 backdrop-blur-lg">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-5 w-24 mt-4" />
        </div>
      </div>
       <div className="mt-8">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                 {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl bg-white/5" />)}
            </div>
       </div>
    </div>
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
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Welcome back, {userProfile.name?.split(' ')[0]}!</h1>
        <p className="text-muted-foreground text-lg">Let's continue your learning journey.</p>
      </div>

      <div className="bg-black/10 dark:bg-black/20 backdrop-blur-2xl p-4 sm:p-6 rounded-2xl border border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-2 md:col-span-2 rounded-xl bg-white/10 dark:bg-white/5 backdrop-blur-lg border border-white/20 hover:border-white/40 transition-all duration-300">
                <CardHeader>
                    <CardTitle className="font-headline text-lg text-white/90">Your Next Lesson</CardTitle>
                </CardHeader>
                <CardContent>
                    {nextLesson ? (
                        <div>
                            <p className="text-2xl font-bold text-white">{nextLesson.title}</p>
                            <p className="text-white/70 mb-4">{nextLesson.subject}</p>
                            <div className="w-full h-24 bg-gradient-to-br from-white/20 to-transparent rounded-lg flex items-center justify-center p-4 mb-4">
                                <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                                    <path d="M 0 30 Q 10 10, 20 25 T 40 20 Q 50 10, 60 20 T 80 25 Q 90 35, 100 15" stroke="url(#line-gradient)" fill="none" strokeWidth="2" strokeLinecap="round"/>
                                    <defs>
                                        <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
                                            <stop offset="100%" stopColor="rgba(255,255,255,0.8)" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                            <Button asChild className="w-full bg-white/90 hover:bg-white text-black font-bold">
                                <Link href={`/dashboard/lessons/${nextLesson.id}`}>
                                    {completedLessonIds.includes(nextLesson.id) ? 'Review Lesson' : 'Start Lesson'}
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-white/70 mb-4">No new lessons to suggest. Why not review one you've completed?</p>
                            <Button asChild variant="secondary">
                                <Link href="/dashboard/lessons">Browse All Lessons</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="rounded-xl bg-white/10 dark:bg-white/5 backdrop-blur-lg border border-white/20 hover:border-white/40 transition-all duration-300">
                 <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                    <MessageSquare className="w-6 h-6 text-white/80"/>
                    <CardTitle className="font-headline text-lg text-white/90">AI Recommendation</CardTitle>
                </CardHeader>
                <CardContent>
                     {isGeneratingTopics ? (
                        <div className="space-y-3 py-4">
                            <Skeleton className="h-4 w-full bg-white/20" />
                            <Skeleton className="h-4 w-5/6 bg-white/20" />
                            <Skeleton className="h-4 w-full bg-white/20" />
                        </div>
                     ) : suggestedTopics.length > 1 ? (
                        <ul className="space-y-2 text-sm mt-2">
                            {suggestedTopics.slice(1, 4).map((topic, index) => {
                                const lesson = findLessonForTopic(topic);
                                return (
                                   <li key={index} className="p-2 rounded-md hover:bg-white/10 transition-colors">
                                      {lesson ? (
                                        <Link href={`/dashboard/lessons/${lesson.id}`} className="font-medium text-white/90 hover:text-white flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-accent/80 shrink-0" />
                                            {topic}
                                        </Link>
                                      ) : (
                                        <span className="flex items-center gap-2 text-white/60">
                                            <Sparkles className="w-4 h-4 text-accent/80 shrink-0" />
                                            {topic}
                                        </span>
                                      )}
                                  </li>
                               );
                            })}
                        </ul>
                     ) : (
                        <p className="text-sm text-white/60 py-4">No other recommendations right now. Keep learning to get more!</p>
                     )}
                </CardContent>
            </Card>
            
            <Card className="rounded-xl bg-gradient-to-br from-teal-400/30 to-blue-500/30 backdrop-blur-lg border border-white/20 hover:border-white/40 transition-all duration-300 flex flex-col">
                 <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                    <Target className="w-6 h-6 text-white/80"/>
                    <CardTitle className="font-headline text-lg text-white/90">Track Progress</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col items-center justify-center">
                    <div className="relative w-32 h-32">
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                            <path className="stroke-current text-white/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3"></path>
                            <path className="stroke-current text-white" strokeDasharray={`${userProgress?.mastery || 0}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3.5" strokeLinecap="round" transform="rotate(-90 18 18)"></path>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-white">{userProgress?.mastery || 0}%</div>
                    </div>
                     <Button variant="link" asChild className="mt-2 text-white/80 hover:text-white">
                         <Link href="/dashboard/progress">View Details <ArrowRight className="w-4 h-4 ml-1" /></Link>
                     </Button>
                </CardContent>
            </Card>
        </div>

        {recentlyCompleted.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold font-headline mb-4">Recently Completed</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentlyCompleted.map((lesson) => (
                    <Link key={lesson.id} href={`/dashboard/lessons/${lesson.id}`}>
                        <div className="h-full rounded-lg bg-white/10 dark:bg-white/5 backdrop-blur-lg border border-white/20 hover:border-white/40 p-4 flex items-center gap-4 transition-all duration-300 hover:scale-105">
                            <div className="p-3 bg-primary/20 rounded-lg">
                                <Book className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold text-white">{lesson.title}</p>
                                <p className="text-sm text-white/70">{lesson.subject}</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
