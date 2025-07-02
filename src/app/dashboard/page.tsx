
"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Card } from "@/components/ui/card";
import { getUser, User, getLessons, Lesson, getUserProgress, UserProgress } from "@/lib/data";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { ArrowRight, Bot, MessageSquare, BookOpen, BrainCircuit, User as UserIcon, BookOpenCheck, FlaskConical, Landmark, Calculator, Terminal, Leaf, Code } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { generateStudyTopics } from "@/ai/flows/generate-study-topics";
import { cn } from "@/lib/utils";

function DashboardSkeleton() {
  return (
    <div className="w-full h-full p-4 sm:p-6 flex flex-col">
      <div className="w-full h-full bg-slate-900/40 backdrop-blur-2xl p-6 rounded-2xl border border-slate-100/10 flex flex-col">
        {/* Main Grid Skeleton */}
        <div className="flex-grow">
            <div className="mb-8 space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-grow">
              <div className="lg:col-span-2 md:col-span-2 rounded-xl p-6 space-y-4 bg-white/5 backdrop-blur-lg">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-24 w-full" />
              </div>

              <div className="rounded-xl p-6 space-y-3 bg-white/5 backdrop-blur-lg">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-full mt-4" />
                <Skeleton className="h-5 w-5/6" />
              </div>

              <div className="rounded-xl p-6 flex flex-col items-center justify-center bg-white/5 backdrop-blur-lg">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <Skeleton className="h-5 w-24 mt-4" />
              </div>
            
              {/* Bottom Row Skeleton */}
              <div className="lg:col-span-4 md:col-span-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl bg-white/5" />)}
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}


export default function DashboardPage() {
  const router = useRouter();
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

  const findLessonForTopic = (topicTitle: string) => {
    return lessons.find(l => l.title === topicTitle) || null;
  }
  
  const subjects = lessons.reduce((acc, lesson) => {
    const subject = lesson.subject || 'General';
    if (!acc[subject]) {
        acc[subject] = 0;
    }
    acc[subject]++;
    return acc;
  }, {} as Record<string, number>);

  const subjectIcons: Record<string, React.ReactNode> = {
    'Science': <FlaskConical className="w-6 h-6 text-red-400" />,
    'History': <Landmark className="w-6 h-6 text-yellow-400" />,
    'Mathematics': <Calculator className="w-6 h-6 text-blue-400" />,
    'Computer Science': <Terminal className="w-6 h-6 text-green-400" />,
    'Web Development': <Code className="w-6 h-6 text-purple-400" />,
    'Biology': <Leaf className="w-6 h-6 text-teal-400" />,
    'default': <BookOpen className="w-6 h-6 text-gray-400" />
  };

  const getSubjectIcon = (subject: string) => {
    return subjectIcons[subject] || subjectIcons.default;
  };

  const subjectEntries = Object.entries(subjects);
  
  const nextLesson = findLessonForTopic(suggestedTopics[0]) || lessons.find(l => !userProgress?.completedLessonIds?.includes(l.id));

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!user || !userProfile) {
    return <DashboardSkeleton />;
  }
  
  const overallProgress = userProgress?.mastery || 0;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="relative w-full flex-grow bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-100/10 flex flex-col overflow-hidden p-6">
        
        {/* Background Decorative SVG */}
        <div className="absolute inset-0 z-0 opacity-50">
            <svg width="100%" height="100%" className="absolute inset-0">
                <defs>
                    <linearGradient id="thread-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary)/0.1)" />
                        <stop offset="100%" stopColor="hsl(var(--accent)/0.1)" />
                    </linearGradient>
                     <filter id="glow">
                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                {/* Threads */}
                <path d="M-100 100 Q 150 150, 400 -50" stroke="url(#thread-gradient)" fill="none" strokeWidth="1.5" filter="url(#glow)"/>
                <path d="M-50 400 Q 200 200, 500 500" stroke="url(#thread-gradient)" fill="none" strokeWidth="1" filter="url(#glow)"/>
                <path d="M 1200 100 Q 900 300, 700 600" stroke="url(#thread-gradient)" fill="none" strokeWidth="1.5" filter="url(#glow)"/>
                <path d="M 1000 800 Q 1200 600, 1400 700" stroke="url(#thread-gradient)" fill="none" strokeWidth="1" filter="url(#glow)"/>
                 {/* Particles */}
                <circle cx="15%" cy="20%" r="2" fill="hsl(var(--primary)/0.2)" filter="url(#glow)" />
                <circle cx="80%" cy="10%" r="2" fill="hsl(var(--accent)/0.2)" filter="url(#glow)" />
                <circle cx="5%" cy="85%" r="3" fill="hsl(var(--primary)/0.3)" filter="url(#glow)" />
                <circle cx="95%" cy="80%" r="2" fill="hsl(var(--accent)/0.2)" filter="url(#glow)" />
                <circle cx="50%" cy="50%" r="1" fill="hsl(var(--primary)/0.1)" filter="url(#glow)" />
            </svg>
        </div>
        
        {/* Main Content */}
        <div className="relative z-10 flex flex-col h-full">
            <div className="flex-grow overflow-y-auto">
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline">Welcome back, {userProfile.name?.split(' ')[0]}!</h1>
                    <p className="text-slate-400 text-md">Let's continue your learning journey.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    
                    {/* Your Next Lesson */}
                    <Card className="lg:col-span-2 md:col-span-2 rounded-xl bg-slate-800/50 backdrop-blur-lg border border-slate-100/10 hover:border-slate-100/20 transition-all duration-300 p-6 flex flex-col">
                        <h3 className="font-semibold text-slate-300 mb-2">Your Next Lesson</h3>
                        {nextLesson ? (
                            <Link href={`/dashboard/lessons/${nextLesson.id}`} className="block group flex-grow flex flex-col justify-between">
                                <div className="relative w-full h-24 mt-2">
                                    <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="lesson-chart-gradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3"/>
                                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0"/>
                                            </linearGradient>
                                        </defs>
                                        <path d="M 0 50 C 30 20, 50 60, 100 40 S 150 0, 200 30" fill="url(#lesson-chart-gradient)" />
                                        <path d="M 0 50 C 30 20, 50 60, 100 40 S 150 0, 200 30" stroke="hsl(var(--primary))" fill="none" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                    <div className="absolute top-0 left-0 bg-gradient-to-r from-orange-400/30 to-rose-400/30 text-white font-semibold px-4 py-2 rounded-lg text-lg">
                                        {nextLesson.subject}
                                    </div>
                                </div>
                                <div className="flex justify-between items-end mt-4">
                                    <p className="text-xl font-bold text-white">{nextLesson.title}</p>
                                    <ArrowRight className="w-6 h-6 text-slate-400 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        ) : (
                            <div className="flex-grow flex flex-col items-center justify-center h-full">
                                <p className="text-slate-400 mb-4">You've completed all lessons! Great job!</p>
                                <Button asChild variant="secondary">
                                    <Link href="/dashboard/lessons">Review Completed Lessons</Link>
                                </Button>
                            </div>
                        )}
                    </Card>

                    {/* AI Recommendation */}
                    <Card className="rounded-xl bg-slate-800/50 backdrop-blur-lg border border-slate-100/10 hover:border-slate-100/20 transition-all duration-300 p-6">
                        <h3 className="font-semibold text-slate-300 mb-4">AI Recommendation</h3>
                        {isGeneratingTopics ? (
                            <div className="space-y-4 py-4">
                                <Skeleton className="h-4 w-full bg-slate-700/50" />
                                <Skeleton className="h-4 w-5/6 bg-slate-700/50" />
                                <Skeleton className="h-4 w-full bg-slate-700/50" />
                            </div>
                        ) : suggestedTopics.length > 1 ? (
                            <div className="space-y-3">
                                {suggestedTopics.slice(1, 4).map((topic, index) => {
                                    const lesson = findLessonForTopic(topic);
                                    return (
                                    <Link href={lesson ? `/dashboard/lessons/${lesson.id}` : '#'} key={index} className="block p-2 rounded-md hover:bg-slate-700/50 transition-colors font-medium text-slate-300 hover:text-white">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-purple-500/20 rounded-md"><MessageSquare className="w-4 h-4 text-purple-400" /></div>
                                            <span>{topic}</span>
                                        </div>
                                    </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-center">
                                <p className="text-sm text-slate-400 py-4">No other recommendations right now. Explore all lessons!</p>
                            </div>
                        )}
                    </Card>
                    
                    {/* Track Progress */}
                    <Card className="rounded-xl bg-gradient-to-b from-teal-500/30 to-blue-500/30 backdrop-blur-lg border border-slate-100/10 hover:border-slate-100/20 transition-all duration-300 p-6 flex flex-col">
                        <h3 className="font-semibold text-slate-100 mb-2">Track Progress</h3>
                        <div className="flex-grow flex flex-col items-center justify-center">
                            <div className="relative w-32 h-32">
                                <svg className="w-full h-full" viewBox="0 0 36 36">
                                    <path className="stroke-current text-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3"></path>
                                    <path className="stroke-current text-teal-300" strokeDasharray={`${overallProgress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3.5" strokeLinecap="round" transform="rotate(-90 18 18)"></path>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-white">{overallProgress}%</div>
                            </div>
                            <Button variant="link" asChild className="mt-2 text-slate-300 hover:text-white">
                                <Link href="/dashboard/progress">View Details <ArrowRight className="w-4 h-4 ml-1" /></Link>
                            </Button>
                        </div>
                    </Card>
                </div>

                <div className="mt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {subjectEntries.map(([subject, count]) => (
                             <Link href={`/dashboard/lessons`} key={subject} className="block group">
                                <div className="h-full rounded-lg bg-slate-800/50 backdrop-blur-lg border border-slate-100/10 p-4 flex items-center gap-4 transition-all duration-300 hover:scale-105 hover:bg-slate-700/60">
                                    <div className="p-3 bg-slate-700/50 rounded-lg">
                                        {getSubjectIcon(subject)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">{subject}</p>
                                        <p className="text-sm text-slate-400">{count} Lessons</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
