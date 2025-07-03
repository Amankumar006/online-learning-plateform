
"use client";

import { getLesson, getExercises, getUserProgress, Lesson, Exercise, UserProgress, TextBlock } from "@/lib/data";
import { notFound, useRouter, useParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LessonContent from "@/components/lessons/lesson-content";
import AdaptiveExercise from "@/components/lessons/adaptive-exercise";
import AIBuddy from "@/components/lessons/ai-buddy";
import { BookText, Bot, BrainCircuit, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Breadcrumb } from "@/components/ui/breadcrumb";


function LessonPageSkeleton() {
    return (
        <div>
            <Skeleton className="h-10 w-3/4 mb-2" />
            <Skeleton className="h-6 w-1/4 mb-6" />
            <Card>
                <CardContent className="p-6">
                    <Tabs defaultValue="lesson" className="w-full">
                        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-10 mb-6">
                            <TabsTrigger value="lesson" disabled><BookText className="mr-2"/>Lesson</TabsTrigger>
                            <TabsTrigger value="exercise" disabled><BrainCircuit className="mr-2"/>Exercise</TabsTrigger>
                            <TabsTrigger value="ai-buddy" disabled><Bot className="mr-2"/>AI Buddy</TabsTrigger>
                        </TabsList>
                        <div className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                            <Skeleton className="h-[400px] w-full" />
                            <Skeleton className="h-24 w-full mt-4" />
                        </div>
                    </Tabs>
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
    position: 'absolute' as 'absolute',
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

  const [activeTab, setActiveTab] = useState('lesson');
  const [direction, setDirection] = useState(0);
  const tabItems = ['lesson', 'exercise', 'ai-buddy'];

  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;
    const oldIndex = tabItems.indexOf(activeTab);
    const newIndex = tabItems.indexOf(newTab);
    setDirection(newIndex > oldIndex ? 1 : -1);
    setActiveTab(newTab);
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
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-10 mb-6">
                    <TabsTrigger value="lesson"><BookText className="mr-2"/>Lesson</TabsTrigger>
                    <TabsTrigger value="exercise"><BrainCircuit className="mr-2"/>Exercise</TabsTrigger>
                    <TabsTrigger value="ai-buddy"><Bot className="mr-2"/>AI Buddy</TabsTrigger>
                </TabsList>
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
                              <LessonContent 
                                  lesson={lesson} 
                                  userId={user.uid}
                                  userProgress={userProgress}
                                  onLessonComplete={() => fetchUserProgress(user.uid)}
                              />
                            )}
                            {activeTab === 'exercise' && (
                              <AdaptiveExercise exercises={exercises} userId={user.uid} />
                            )}
                            {activeTab === 'ai-buddy' && (
                              <AIBuddy lessonContent={textContentForAI} />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
