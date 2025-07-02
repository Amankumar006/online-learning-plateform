
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUser, User, getLessons, Lesson, getUserProgress, UserProgress } from "@/lib/data";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { ArrowRight, Bot, MessageSquare, Target, BookOpen, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { generateStudyTopics } from "@/ai/flows/generate-study-topics";

function DashboardSkeleton() {
  return (
    <div className="w-full h-full p-4 sm:p-6">
      <div className="w-full h-full bg-slate-900/40 backdrop-blur-2xl p-4 sm:p-6 rounded-2xl border border-slate-100/10 flex flex-col">
        <div className="space-y-2 mb-8">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-5 w-1/2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-grow">
          <div className="lg:col-span-2 md:col-span-2 rounded-xl p-6 space-y-4 bg-white/5 backdrop-blur-lg">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
          </div>

          <div className="rounded-xl p-6 space-y-3 bg-white/5 backdrop-blur-lg">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-full mt-4" />
            <Skeleton className="h-5 w-5/6" />
            <Skeleton className="h-5 w-full" />
          </div>

          <div className="rounded-xl p-6 flex flex-col items-center justify-center bg-white/5 backdrop-blur-lg">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-5 w-24 mt-4" />
          </div>
        
          <div className="lg:col-span-4 md:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl bg-white/5" />)}
            </div>
          </div>
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

  const findLessonForTopic = (topic: string): Lesson | null => {
      if (!lessons) return null;
      return lessons.find(l => l.title === topic) || null;
  }
  
  const nextLesson = findLessonForTopic(suggestedTopics[0]) || lessons.find(l => !completedLessonIds.includes(l.id));

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!user || !userProfile) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="w-full h-full p-4 sm:p-6">
      <div className="relative w-full h-full bg-slate-900/60 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-slate-100/10 flex flex-col overflow-hidden">
        
        <div className="absolute inset-0 z-0 opacity-50">
            <svg width="100%" height="100%" className="absolute inset-0">
                <defs>
                    <linearGradient id="thread-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary)/0.1)" />
                        <stop offset="100%" stopColor="hsl(var(--accent)/0.1)" />
                    </linearGradient>
                     <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <path d="M-100 100 Q 150 150, 400 -50" stroke="url(#thread-gradient)" fill="none" strokeWidth="2" filter="url(#glow)"/>
                <path d="M-50 400 Q 200 200, 500 500" stroke="url(#thread-gradient)" fill="none" strokeWidth="1" filter="url(#glow)"/>
                <path d="M 1200 100 Q 900 300, 700 600" stroke="url(#thread-gradient)" fill="none" strokeWidth="1.5" filter="url(#glow)"/>
                <path d="M 1000 800 Q 1200 600, 1400 700" stroke="url(#thread-gradient)" fill="none" strokeWidth="1" filter="url(#glow)"/>
            </svg>
        </div>

        <div className="relative z-10 flex flex-col h-full">
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-headline">Welcome back, {userProfile.name?.split(' ')[0]}!</h1>
                <p className="text-slate-400 text-lg">Let's continue your learning journey.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-2 md:col-span-2 rounded-xl bg-slate-800/50 backdrop-blur-lg border border-slate-100/10 hover:border-slate-100/20 transition-all duration-300">
                    <CardHeader>
                        <CardTitle className="font-headline text-lg text-slate-100">Your Next Lesson</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {nextLesson ? (
                            <Link href={`/dashboard/lessons/${nextLesson.id}`} className="block group">
                                <div className="flex justify-between items-end mb-4">
                                    <p className="text-2xl font-bold text-white">{nextLesson.title}</p>
                                    <ArrowRight className="w-6 h-6 text-slate-400 group-hover:translate-x-1 transition-transform" />
                                </div>
                                <div className="w-full h-24 p-4 relative overflow-hidden">
                                    <svg className="w-full h-full absolute bottom-0 left-0" viewBox="0 0 300 100" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="line-grad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3"/>
                                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0"/>
                                            </linearGradient>
                                        </defs>
                                        <path d="M 0 60 C 50 30, 70 80, 120 60 S 180 20, 230 50 S 300 70, 300 70" fill="url(#line-grad)" />
                                        <path d="M 0 60 C 50 30, 70 80, 120 60 S 180 20, 230 50 S 300 70, 300 70" stroke="hsl(var(--primary))" fill="none" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                    <div className="absolute top-0 left-0 bg-primary/10 text-primary-foreground text-sm font-semibold px-3 py-1 rounded-full">{nextLesson.subject}</div>
                                </div>
                            </Link>
                        ) : (
                            <div className="text-center py-10 flex flex-col items-center justify-center h-full">
                                <p className="text-slate-400 mb-4">You've completed all lessons! Great job!</p>
                                <Button asChild variant="secondary">
                                    <Link href="/dashboard/lessons">Review Completed Lessons</Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-xl bg-slate-800/50 backdrop-blur-lg border border-slate-100/10 hover:border-slate-100/20 transition-all duration-300">
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                        <Bot className="w-6 h-6 text-slate-300"/>
                        <CardTitle className="font-headline text-lg text-slate-100">AI Recommendation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isGeneratingTopics ? (
                            <div className="space-y-3 py-4">
                                <Skeleton className="h-4 w-full bg-slate-700/50" />
                                <Skeleton className="h-4 w-5/6 bg-slate-700/50" />
                                <Skeleton className="h-4 w-full bg-slate-700/50" />
                            </div>
                        ) : suggestedTopics.length > 1 ? (
                            <div className="space-y-2 mt-2">
                                {suggestedTopics.slice(1, 4).map((topic, index) => {
                                    const lesson = findLessonForTopic(topic);
                                    return (
                                    <div key={index} className="p-2 rounded-md hover:bg-slate-700/50 transition-colors">
                                        {lesson ? (
                                            <Link href={`/dashboard/lessons/${lesson.id}`} className="font-medium text-slate-300 hover:text-white flex items-center gap-2">
                                                <MessageSquare className="w-4 h-4 text-purple-400 shrink-0" />
                                                {topic}
                                            </Link>
                                        ) : (
                                            <span className="flex items-center gap-2 text-slate-400">
                                                <MessageSquare className="w-4 h-4 text-purple-400 shrink-0" />
                                                {topic}
                                            </span>
                                        )}
                                    </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-center">
                                <p className="text-sm text-slate-400 py-4">No other recommendations right now. Complete more lessons!</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                
                <Card className="rounded-xl bg-gradient-to-br from-teal-500/30 to-blue-500/30 backdrop-blur-lg border border-slate-100/10 hover:border-slate-100/20 transition-all duration-300 flex flex-col">
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                        <Target className="w-6 h-6 text-slate-300"/>
                        <CardTitle className="font-headline text-lg text-slate-100">Track Progress</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col items-center justify-center">
                        <div className="relative w-32 h-32">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path className="stroke-current text-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3"></path>
                                <path className="stroke-current text-teal-300" strokeDasharray={`${userProgress?.mastery || 0}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3.5" strokeLinecap="round" transform="rotate(-90 18 18)"></path>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-white">{userProgress?.mastery || 0}%</div>
                        </div>
                        <Button variant="link" asChild className="mt-2 text-slate-300 hover:text-white">
                            <Link href="/dashboard/progress">View Details <ArrowRight className="w-4 h-4 ml-1" /></Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-8 flex-grow">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    <Link href={`/dashboard/lessons`} className="block">
                        <div className="h-full rounded-lg bg-slate-800/50 backdrop-blur-lg border border-slate-100/10 p-4 flex items-center gap-4 transition-all duration-300 hover:scale-105 hover:bg-slate-700/60">
                            <div className="p-3 bg-red-500/20 rounded-lg">
                                <BookOpen className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-white">Science</p>
                                <p className="text-sm text-slate-400">12 Lessons</p>
                            </div>
                        </div>
                    </Link>
                    <Link href={`/dashboard/lessons`} className="block">
                        <div className="h-full rounded-lg bg-slate-800/50 backdrop-blur-lg border border-slate-100/10 p-4 flex items-center gap-4 transition-all duration-300 hover:scale-105 hover:bg-slate-700/60">
                            <div className="p-3 bg-blue-500/20 rounded-lg">
                                <BrainCircuit className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-white">History</p>
                                <p className="text-sm text-slate-400">8 Lessons</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

    