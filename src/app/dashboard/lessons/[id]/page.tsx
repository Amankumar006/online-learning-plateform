
"use client";

import { getLesson, getExercises, getUserProgress, Lesson, Exercise, UserProgress, TextBlock, Section } from "@/lib/data";
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
import { generateAudioFromText } from "@/ai/flows/generate-audio-from-text";
import { useToast } from "@/hooks/use-toast";
import LessonPlayer from "@/components/lessons/lesson-player";
import { uploadAudioFromDataUrl } from "@/lib/storage";


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
  const { toast } = useToast();

  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState<{ title: string; content: string } | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);


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
  
  const getSectionTextContent = (section: Section): string => {
    return section.blocks.filter(b => b.type === 'text').map(b => (b as TextBlock).content).join('\n\n');
  };

  const handlePlaySection = async (section: Section) => {
    if (isGeneratingAudio) return;
    const content = getSectionTextContent(section);
    if (!content) {
        toast({ variant: "destructive", title: "No Content", description: "This section has no text to read aloud." });
        return;
    }
    
    setCurrentSection({ title: section.title, content });
    setIsGeneratingAudio(true);
    setAudioUrl(null);
    if (audioRef.current) {
        audioRef.current.pause();
    }
    
    try {
        const result = await generateAudioFromText({ sectionTitle: section.title, sectionContent: content });
        setAudioUrl(result.audioDataUri);
    } catch (e: any) {
        toast({ variant: "destructive", title: "Audio Error", description: e.message || "Failed to generate audio." });
    } finally {
        setIsGeneratingAudio(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAudioUrl(null);
    setCurrentSection(null);
  };

  const handleDownload = async () => {
    if (!audioUrl || !currentSection) return;
    
    toast({ title: 'Preparing Download', description: 'Uploading audio to secure storage...' });
    try {
        const fileName = `${lesson?.title || 'lesson'}_${currentSection.title}`.replace(/[^a-zA-Z0-9]/g, '_');
        const publicUrl = await uploadAudioFromDataUrl(audioUrl, fileName);
        
        // Create a temporary link to trigger the download
        const link = document.createElement('a');
        link.href = publicUrl;
        link.download = `${fileName}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Download Failed", description: e.message || "Could not prepare the audio file for download." });
    }
  };
  
   useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
        setIsPlaying(false);
        // Optional: play next section automatically
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioRef.current]);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
  }, [audioUrl, playbackRate]);


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
        const sectionContent = getSectionTextContent(section);
        return sectionTitle + sectionContent;
      }).join('\n\n---\n\n')
    : "This lesson has no textual content.";


  return (
    <div>
      <audio ref={audioRef} />
      <Breadcrumb items={breadcrumbItems} />
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold font-headline">{lesson.title}</h1>
        <p className="text-lg text-muted-foreground">{lesson.subject}</p>
      </div>
       <LessonPlayer
          isPlaying={isPlaying}
          isGenerating={isGeneratingAudio}
          currentSectionTitle={currentSection?.title || null}
          audioUrl={audioUrl}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
          onDownload={handleDownload}
          playbackRate={playbackRate}
          onPlaybackRateChange={setPlaybackRate}
        />
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
                                    onPlaySection={handlePlaySection}
                                    isGeneratingAudio={isGeneratingAudio}
                                    currentSectionTitle={currentSection?.title || null}
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
