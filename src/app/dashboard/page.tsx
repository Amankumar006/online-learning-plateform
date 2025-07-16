
"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { getUser, User, getLessons, Lesson, getUserProgress, UserProgress, clearProactiveSuggestion, createStudyRoomSession } from "@/lib/data";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { ArrowRight, Bot, MessageSquare, BookOpen, BrainCircuit, User as UserIcon, BookOpenCheck, FlaskConical, Landmark, Calculator, Terminal, Leaf, Code, TrendingUp, Sparkles, Pen, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { generateStudyTopics } from "@/ai/flows/generate-study-topics";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

function DashboardSkeleton() {
  return (
    <div className="w-full h-full flex flex-col">
       {/* Main Glass Panel Skeleton */}
       <div className="relative w-full flex-grow bg-white/20 dark:bg-black/25 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/20 flex flex-col overflow-hidden p-6">
        <div className="relative z-10 flex flex-col h-full">
            <div className="flex-grow overflow-y-auto -mr-6 pr-6">
                {/* Header Skeleton */}
                <div className="mb-12">
                    <Skeleton className="h-10 w-1/2 md:w-1/3" />
                    <Skeleton className="h-6 w-2/3 md:w-1/2 mt-3" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Next Lesson Skeleton */}
                    <div className="lg:col-span-2 md:col-span-2 rounded-xl bg-white/5 backdrop-blur-lg border border-white/5 p-6 flex flex-col">
                        <Skeleton className="h-5 w-24 mb-4" />
                        <div className="flex-grow flex flex-col justify-between">
                            <Skeleton className="w-full h-24 mt-2" />
                            <div className="flex justify-between items-end mt-4">
                                <Skeleton className="h-8 w-3/4" />
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </div>
                        </div>
                    </div>

                    {/* AI Recommendation Skeleton */}
                    <div className="rounded-xl bg-white/5 backdrop-blur-lg border border-white/5 p-6">
                        <Skeleton className="h-5 w-32 mb-4" />
                        <div className="space-y-3">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </div>
                    
                    {/* Track Progress Skeleton */}
                    <div className="rounded-xl bg-white/5 backdrop-blur-lg border border-white/5 p-6 flex flex-col">
                        <Skeleton className="h-5 w-24 mb-2" />
                        <div className="flex-grow flex flex-col items-center justify-center">
                            <Skeleton className="h-32 w-32 rounded-full" />
                            <Skeleton className="h-4 w-24 mt-4" />
                        </div>
                    </div>
                </div>

                {/* Subjects Skeleton */}
                <div className="mt-8">
                     <Skeleton className="h-6 w-32 mb-4" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                             <div key={i} className="h-full rounded-lg bg-white/5 backdrop-blur-lg border border-white/5 p-4 flex flex-col items-center justify-center gap-4">
                                <Skeleton className="p-3 h-14 w-14 rounded-lg" />
                                <div className="space-y-2 flex-1 w-full">
                                    <Skeleton className="h-5 w-full" />
                                    <Skeleton className="h-4 w-1/2 mx-auto" />
                                </div>
                            </div>
                        ))}
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
  const { toast } = useToast();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(true);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

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

  const handleDismissSuggestion = () => {
    if (user) {
        clearProactiveSuggestion(user.uid);
        setUserProfile(prev => prev ? { ...prev, proactiveSuggestion: null } : null);
    }
  };
  
  const handleCreateStudyRoom = async () => {
    if (!user) return;
    setIsCreatingRoom(true);
    try {
        const roomId = await createStudyRoomSession(user.uid);
        toast({
            title: "Study Room Created!",
            description: "Redirecting you to your new collaborative space."
        });
        router.push(`/dashboard/study-room/${roomId}`);
    } catch (error) {
        console.error("Failed to create study room:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not create a new study room. Please try again."
        });
        setIsCreatingRoom(false);
    }
  };

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
    'Science': <FlaskConical className="w-8 h-8 text-red-500 dark:text-red-400" />,
    'History': <Landmark className="w-8 h-8 text-yellow-500 dark:text-yellow-400" />,
    'Mathematics': <Calculator className="w-8 h-8 text-blue-500 dark:text-blue-400" />,
    'Computer Science': <Terminal className="w-8 h-8 text-green-500 dark:text-green-400" />,
    'Web Development': <Code className="w-8 h-8 text-purple-500 dark:text-purple-400" />,
    'Biology': <Leaf className="w-8 h-8 text-teal-500 dark:text-teal-400" />,
    'default': <BookOpen className="w-8 h-8 text-gray-500 dark:text-gray-400" />
  };

  const getSubjectIcon = (subject: string) => {
    return subjectIcons[subject] || subjectIcons.default;
  };

  const subjectEntries = Object.entries(subjects);
  
  const nextLesson = findLessonForTopic(suggestedTopics[0]) || lessons.find(l => !userProgress?.completedLessonIds?.includes(l.id));

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!user || !userProfile || !userProgress) {
    return <DashboardSkeleton />;
  }
  
  const exerciseAccuracy = userProgress.totalExercisesAttempted && userProgress.totalExercisesAttempted > 0
    ? Math.round(((userProgress.totalExercisesCorrect || 0) / userProgress.totalExercisesAttempted) * 100)
    : 0;

  return (
    <div className="w-full h-full flex flex-col">
      {/* Main Glass Panel */}
      <div className="relative w-full flex-grow bg-white/20 dark:bg-black/25 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/20 flex flex-col overflow-hidden p-6">
        
        {/* Richer SVG Background */}
        <div className="absolute inset-0 z-0 opacity-60">
            <svg width="100%" height="100%" className="absolute inset-0">
                <defs>
                    <linearGradient id="thread-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary)/0.15)" />
                        <stop offset="100%" stopColor="hsl(var(--accent)/0.15)" />
                    </linearGradient>
                    <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--chart-1))" />
                        <stop offset="100%" stopColor="hsl(var(--chart-2))" />
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
                <path d="M-50 400 Q 200 200, 500 500" stroke="url(#thread-gradient)" fill="none" strokeWidth="1.5" filter="url(#glow)"/>
                <path d="M 1200 100 Q 900 300, 700 600" stroke="url(#thread-gradient)" fill="none" strokeWidth="2" filter="url(#glow)"/>
                <path d="M 1000 800 Q 1200 600, 1400 700" stroke="url(#thread-gradient)" fill="none" strokeWidth="1.5" filter="url(#glow)"/>
                <path d="M 200 800 Q 400 700, 600 900" stroke="url(#thread-gradient)" fill="none" strokeWidth="1.5" filter="url(#glow)"/>
                <circle cx="15%" cy="20%" r="2" fill="hsl(var(--primary)/0.2)" filter="url(#glow)" />
                <circle cx="80%" cy="10%" r="2" fill="hsl(var(--accent)/0.2)" filter="url(#glow)" />
                <circle cx="5%" cy="85%" r="3" fill="hsl(var(--primary)/0.3)" filter="url(#glow)" />
                <circle cx="95%" cy="80%" r="2" fill="hsl(var(--accent)/0.2)" filter="url(#glow)" />
                <circle cx="50%" cy="50%" r="1" fill="hsl(var(--primary)/0.1)" filter="url(#glow)" />
            </svg>
        </div>
        
        {/* Main Content */}
        <div className="relative z-10 flex flex-col h-full">
            <div className="flex-grow overflow-y-auto -mr-6 pr-6">
                <div className="mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-headline text-foreground">Welcome back, {userProfile.name?.split(' ')[0]}!</h1>
                    <p className="text-muted-foreground text-lg">Let's continue your learning journey.</p>
                </div>
                
                {userProfile.proactiveSuggestion && (
                    <Alert className="mb-6 bg-accent/20 border-accent/50">
                        <Sparkles className="h-4 w-4 text-accent" />
                        <AlertTitle className="font-semibold text-accent">A Message from Your AI Buddy!</AlertTitle>
                        <AlertDescription className="flex items-start justify-between gap-4">
                           <span>{userProfile.proactiveSuggestion.message}</span>
                            <div className="flex gap-2 -mt-1 -mr-1">
                                <Button size="sm" onClick={() => router.push('/dashboard/buddy-ai')}>Chat Now</Button>
                                <Button size="sm" variant="ghost" onClick={handleDismissSuggestion}>Dismiss</Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}


                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    
                    {/* Your Next Lesson (Hero) */}
                    <div className="lg:col-span-2 md:col-span-2 rounded-xl bg-gradient-to-tr from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10 backdrop-blur-lg border border-white/10 hover:border-primary/30 transition-all duration-300 p-6 flex flex-col hover:shadow-xl hover:shadow-primary/10">
                        <h3 className="font-semibold text-muted-foreground mb-2 flex items-center gap-2"><BookOpen className="h-4 w-4"/> Your Next Lesson</h3>
                        {nextLesson ? (
                            <Link href={`/dashboard/lessons/${nextLesson.id}`} className="block group flex-grow flex flex-col justify-between">
                                <div className="flex-grow flex flex-col items-center justify-center">
                                    <p className="text-2xl font-bold text-foreground text-center">{nextLesson.title}</p>
                                    <Badge variant="secondary" className="mt-2">{nextLesson.subject}</Badge>
                                </div>
                                <div className="flex justify-between items-end mt-4">
                                    <p className="text-lg font-semibold text-primary">Start Learning</p>
                                    <div className="p-2 rounded-full bg-primary/20 group-hover:bg-primary/30 transition-colors">
                                       <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1.5 transition-transform" />
                                    </div>
                                </div>
                            </Link>
                        ) : (
                            <div className="flex-grow flex flex-col items-center justify-center h-full">
                                <p className="text-muted-foreground mb-4">You've completed all lessons! Great job!</p>
                                <Button asChild variant="secondary">
                                    <Link href="/dashboard/lessons">Review Completed Lessons</Link>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* AI Recommendation */}
                    <div className="rounded-xl bg-white/5 backdrop-blur-lg border border-white/5 p-6">
                        <h3 className="font-semibold text-muted-foreground mb-4 flex items-center gap-2"><Bot className="h-4 w-4"/> AI Recommendations</h3>
                        {isGeneratingTopics ? (
                            <div className="space-y-4 py-4">
                                <Skeleton className="h-5 w-full bg-white/10" />
                                <Skeleton className="h-5 w-5/6 bg-white/10" />
                                <Skeleton className="h-5 w-full bg-white/10" />
                            </div>
                        ) : suggestedTopics.length > 1 ? (
                            <div className="space-y-3">
                                {suggestedTopics.slice(1, 4).map((topic, index) => {
                                    const lesson = findLessonForTopic(topic);
                                    return (
                                    <Link href={lesson ? `/dashboard/lessons/${lesson.id}` : '#'} key={index} className="block p-3 rounded-md hover:bg-white/10 dark:hover:bg-black/20 transition-colors font-medium text-muted-foreground hover:text-foreground group">
                                        <div className="flex items-center justify-between">
                                            <span>{topic}</span>
                                            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-center">
                                <p className="text-sm text-muted-foreground py-4">No other recommendations right now. Explore all lessons!</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Track Progress */}
                    <div className="rounded-xl bg-white/5 backdrop-blur-lg border border-white/5 p-6 flex flex-col">
                        <h3 className="font-semibold text-muted-foreground mb-2 flex items-center gap-2"><TrendingUp className="h-4 w-4"/> Track Progress</h3>
                        <div className="flex-grow flex flex-col items-center justify-center">
                            <div className="relative w-36 h-36">
                                <svg className="w-full h-full" viewBox="0 0 36 36">
                                    <path className="stroke-current text-foreground/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="4"></path>
                                    <path className="stroke-[url(#progress-gradient)]" strokeDasharray={`${exerciseAccuracy}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="4" strokeLinecap="round" transform="rotate(-90 18 18)"></path>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-foreground">{exerciseAccuracy}<span className="text-lg font-medium mt-1">%</span></div>
                            </div>
                            <Button variant="link" asChild className="mt-2 text-muted-foreground hover:text-foreground">
                                <Link href="/dashboard/progress">View Details <ArrowRight className="w-4 h-4 ml-1" /></Link>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    {/* Explore Subjects */}
                    <div className="rounded-xl bg-white/5 backdrop-blur-lg border border-white/5 p-6">
                        <h3 className="text-xl font-bold tracking-tight font-headline text-foreground mb-4">Explore Subjects</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {subjectEntries.map(([subject, count]) => (
                                 <Link href={`/dashboard/lessons`} key={subject} className="block group">
                                    <div className="h-full rounded-lg bg-white/5 dark:bg-black/10 backdrop-blur-lg border border-white/5 p-4 flex flex-col items-center justify-center gap-4 text-center transition-all duration-300 hover:-translate-y-1.5 hover:bg-white/10 dark:hover:bg-black/20 hover:shadow-lg hover:shadow-accent/10">
                                        <div className="p-4 bg-white/10 dark:bg-black/20 rounded-lg">
                                            {getSubjectIcon(subject)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">{subject}</p>
                                            <p className="text-sm text-muted-foreground">{count} Lessons</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                     {/* Study Room */}
                    <div className="rounded-xl bg-white/5 backdrop-blur-lg border border-white/5 p-6 flex flex-col items-center justify-center text-center">
                        <div className="p-4 bg-accent/10 rounded-full mb-4">
                            <Users className="w-8 h-8 text-accent" />
                        </div>
                        <h3 className="text-xl font-bold tracking-tight font-headline text-foreground">Study Room</h3>
                        <p className="text-muted-foreground mt-2 mb-4">Collaborate with others on a shared whiteboard in real-time.</p>
                        <Button onClick={handleCreateStudyRoom} disabled={isCreatingRoom}>
                            {isCreatingRoom ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pen className="mr-2 h-4 w-4" />}
                            Start a Study Session
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
