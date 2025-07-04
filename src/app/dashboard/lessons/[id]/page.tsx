
"use client";

import { getLesson, getExercises, getUserProgress, Lesson, Exercise, UserProgress, TextBlock } from "@/lib/data";
import { notFound, useRouter, useParams } from "next/navigation";
import LessonContent from "@/components/lessons/lesson-content";
import AdaptiveExercise from "@/components/lessons/adaptive-exercise";
import AIBuddy from "@/components/lessons/ai-buddy";
import { BookText, Bot, BrainCircuit, Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";


function LessonPageSkeleton() {
    return (
        <div>
            <Skeleton className="h-10 w-3/4 mb-2" />
            <Skeleton className="h-6 w-1/4 mb-6" />
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center mb-6">
                       <Skeleton className="h-12 w-96 rounded-full" />
                    </div>
                    <div className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <Skeleton className="h-[400px] w-full" />
                        <Skeleton className="h-24 w-full mt-4" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    position: 'absolute' as 'absolute',
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    position: 'relative' as 'relative',
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    position: 'absolute' as 'absolute',
  }),
};


export default function LessonPage() {
  const params = useParams();
  const id = params.id as string;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [[activeTab, direction], setActiveTab] = useState(['lesson', 0]);
  
  const tabItems = [
    { id: 'lesson', label: 'Lesson', icon: BookText },
    { id: 'exercise', label: 'Exercise', icon: BrainCircuit },
    { id: 'ai-buddy', label: 'AI Buddy', icon: Bot },
  ];

  const tabContainerRef = useRef<HTMLDivElement>(null);
  const [highlighterStyle, setHighlighterStyle] = useState({});

  const handleTabChange = (newTabId: string) => {
    if (newTabId === activeTab) return;
    const oldIndex = tabItems.findIndex(t => t.id === activeTab);
    const newIndex = tabItems.findIndex(t => t.id === newTabId);
    setActiveTab([newTabId, newIndex > oldIndex ? 1 : -1]);
  };

  const fetchUserProgress = async (uid: string) => {
    const progress = await getUserProgress(uid);
    setUserProgress(progress);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsLoading(true);
        try {
          const [lessonData, exercisesData, progressData] = await Promise.all([
            getLesson(id),
            getExercises(id),
            getUserProgress(currentUser.uid),
          ]);
          
          if (!lessonData) {
            notFound();
            return;
          }
          setLesson(lessonData);
          setExercises(exercisesData);
          setUserProgress(progressData);

        } catch (error) {
            console.error("Failed to load lesson data", error);
        } finally {
            setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [id]);
  
  // Effect for highlighter
  useEffect(() => {
    if (isLoading || !tabContainerRef.current) return;

    const activeIndex = tabItems.findIndex((item) => item.id === activeTab);
    const activeTabEl = tabContainerRef.current.children[activeIndex] as HTMLElement | undefined;

    if (activeTabEl) {
        setHighlighterStyle({
            width: `${activeTabEl.offsetWidth}px`,
            transform: `translateX(${activeTabEl.offsetLeft}px)`,
            opacity: 1,
        });
    } else {
        setHighlighterStyle({ opacity: 0 });
    }
  }, [activeTab, isLoading, tabItems]);
  
  const breadcrumbItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/lessons", label: "Lessons" },
    { href: `/dashboard/lessons/${id}`, label: lesson?.title || "..." },
  ];

  if (isLoading) {
    return <LessonPageSkeleton />;
  }

  if (!user || !lesson) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-lg font-semibold">Loading Lesson...</p>
      </div>
    );
  }
  
  const textContentForAI = lesson.sections && lesson.sections.length > 0
    ? lesson.sections.map(section => {
        const sectionTitle = `## ${section.title}\n\n`;
        const sectionContent = section.blocks
            .filter(block => block.type === 'text')
            .map(block => (block as TextBlock).content)
            .join('\n\n');
        return sectionTitle + sectionContent;
      }).join('\n\n---\n\n')
    : "This lesson has no textual content.";


  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold font-headline">{lesson.title}</h1>
        <p className="text-lg text-muted-foreground">{lesson.subject}</p>
      </div>
      <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="w-full">
                <div className="relative w-full mb-6">
                    <div className="relative w-full rounded-md bg-muted p-1 backdrop-blur-lg border border-black/10 dark:border-white/10 shadow-inner">
                         <div
                            className="absolute h-[calc(100%-8px)] rounded-md bg-gradient-to-br from-white/50 to-white/20 dark:from-white/20 dark:to-white/5 border border-white/30 dark:border-white/10 shadow-md backdrop-blur-sm transition-all duration-300 ease-in-out"
                            style={highlighterStyle}
                        />
                        <div ref={tabContainerRef} className="relative grid grid-cols-3 gap-1">
                            {tabItems.map((tab) => (
                                <Button
                                    key={tab.id}
                                    variant="ghost"
                                    onClick={() => handleTabChange(tab.id)}
                                    className={cn(
                                        "z-10 rounded-md transition-colors flex items-center justify-center gap-2",
                                        activeTab === tab.id
                                        ? 'text-foreground dark:text-background font-semibold'
                                        : 'text-muted-foreground hover:text-foreground dark:hover:text-primary-foreground'
                                    )}
                                >
                                    <tab.icon className="h-4 w-4" />
                                    {tab.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="relative min-h-[60vh] mt-2 overflow-hidden">
                    <AnimatePresence initial={false} custom={direction}>
                        <motion.div
                            key={activeTab}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: "spring", stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 }
                            }}
                            className="w-full"
                        >
                            {activeTab === 'lesson' && user && lesson && (
                              <ScrollArea className="h-[60vh] pr-4">
                                <LessonContent 
                                    lesson={lesson} 
                                    userId={user.uid}
                                    userProgress={userProgress}
                                    onLessonComplete={() => fetchUserProgress(user.uid)}
                                />
                              </ScrollArea>
                            )}
                            {activeTab === 'exercise' && (
                              <ScrollArea className="h-[60vh] pr-4">
                                <AdaptiveExercise 
                                    exercises={exercises} 
                                    userId={user.uid} 
                                    lessonTitle={lesson.title}
                                />
                              </ScrollArea>
                            )}
                            {activeTab === 'ai-buddy' && (
                              <AIBuddy lessonContent={textContentForAI} />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
