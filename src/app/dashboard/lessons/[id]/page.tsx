
"use client";

import { getLesson, getExercises, getUserProgress, Lesson, Exercise, UserProgress, Section } from "@/lib/data";
import { notFound, useParams } from "next/navigation";
import LessonContent from "@/components/lessons/lesson-content";
import AdaptiveExercise from "@/components/lessons/adaptive-exercise";
import { buddyChat } from "@/ai/flows/buddy-chat";
import { Bot, BookText, BrainCircuit, Loader2, SendHorizontal, CheckCircle, Target } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateAudioFromText } from "@/ai/flows/generate-audio-from-text";
import { useToast } from "@/hooks/use-toast";
import LessonPlayer from "@/components/lessons/lesson-player";
import { uploadAudioFromDataUrl } from "@/lib/storage";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import FormattedContent from "@/components/common/FormattedContent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

function LessonPageSkeleton() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6 md:p-8">
            <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="w-full h-48" />
                <div className="space-y-4 pt-4">
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            </div>
            <div className="lg:col-span-1">
                <Skeleton className="w-full h-96" />
            </div>
        </div>
    )
}

interface Message {
    role: 'user' | 'model';
    content: string;
}

const AIBuddy = ({ user, lessonTitle }: { user: FirebaseUser, lessonTitle: string }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: `Hello! I'm your AI study buddy. Ask me anything about "${lessonTitle}", or ask me to create a practice problem for you!` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const historyForAI = messages.map(m => ({role: m.role, content: m.content}));

    try {
      const result = await buddyChat({ 
          userMessage: input, 
          userId: user.uid,
          persona: 'buddy', 
          history: historyForAI,
      });
      const assistantMessage: Message = { role: 'model', content: result.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (e: any) {
      console.error(e);
      const errorMessage: Message = { role: 'model', content: `Sorry, I ran into an error: ${e.message}` };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
        <ScrollArea className="flex-1 mb-4" ref={scrollAreaRef}>
             <div className="space-y-6 p-1">
                {messages.map((message, index) => (
                    <div key={index} className={cn("flex items-start gap-3", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                        {message.role === 'model' && (
                            <Avatar className="w-8 h-8 shrink-0"><AvatarFallback><Bot size={20} /></AvatarFallback></Avatar>
                        )}
                        <div className={cn("max-w-md p-3 rounded-lg", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                           <FormattedContent content={message.content} />
                        </div>
                         {message.role === 'user' && (
                            <Avatar className="w-8 h-8 shrink-0"><AvatarFallback>You</AvatarFallback></Avatar>
                        )}
                    </div>
                ))}
                 {isLoading && (
                     <div className="flex items-start gap-4 justify-start">
                        <Avatar className="w-8 h-8 shrink-0"><AvatarFallback><Bot size={20} /></AvatarFallback></Avatar>
                        <div className="bg-muted p-3 rounded-lg"><Loader2 className="w-5 h-5 animate-spin" /></div>
                    </div>
                 )}
            </div>
        </ScrollArea>
        <div className="flex items-center gap-2 mt-auto">
            <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 resize-none"
                rows={1}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                    }
                }}
                disabled={isLoading}
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()} size="icon">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
                <span className="sr-only">Send</span>
            </Button>
        </div>
    </div>
  );
}


export default function LessonPage() {
  const params = useParams();
  const id = params.id as string;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('lesson');
  const { toast } = useToast();

  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState<{ title: string; content: string } | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLessonCompleted, setIsLessonCompleted] = useState(false);


  const fetchUserProgress = async (uid: string) => {
    const progress = await getUserProgress(uid);
    setUserProgress(progress);
    if (progress.completedLessonIds?.includes(id)) {
      setIsLessonCompleted(true);
    }
  };
  
  const getSectionTextContent = (section: Section): string => {
    return section.blocks.filter(b => b.type === 'text').map((b: any) => b.content).join('\n\n');
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
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioRef, audioUrl]);

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
           if (progressData.completedLessonIds?.includes(id)) {
             setIsLessonCompleted(true);
           }
        } catch (error) {
            console.error("Failed to load lesson data", error);
        } finally {
            setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [id]);
  
  
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

  const exercisesAttempted = userProgress?.exerciseProgress?.[id]?.currentExerciseIndex || 0;
  const progressPercentage = exercises.length > 0 ? (exercisesAttempted / exercises.length) * 100 : 0;
  

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 md:p-6 lg:p-8 h-full">
      <audio ref={audioRef} />
      {/* Left Column (Main Content) */}
      <div className="lg:col-span-2 flex flex-col h-full">
        <div className="mb-4">
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
        <ScrollArea className="flex-grow pr-4 -mr-4">
            <LessonContent 
                lesson={lesson} 
                userId={user.uid}
                userProgress={userProgress}
                onLessonComplete={() => {
                  fetchUserProgress(user.uid);
                  setActiveTab('exercise');
                }}
                onPlaySection={handlePlaySection}
                isGeneratingAudio={isGeneratingAudio}
                currentSectionTitle={currentSection?.title || null}
            />
        </ScrollArea>
      </div>

      {/* Right Column (Tools) */}
      <div className="lg:col-span-1 flex flex-col">
         <Card className="flex-grow flex flex-col">
             <CardContent className="p-4 flex flex-col flex-1">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="lesson"><BookText className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="exercise"><BrainCircuit className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="ai-buddy"><Bot className="h-4 w-4" /></TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="lesson" className="mt-4 flex-1 flex flex-col">
                      <div className="space-y-4">
                          <h3 className="font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Lesson Objective</h3>
                          <p className="text-sm text-muted-foreground">{lesson.description}</p>
                          <Separator />
                           {isLessonCompleted ? (
                             <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 text-primary">
                               <CheckCircle className="h-5 w-5"/>
                               <div>
                                 <p className="font-semibold text-sm">Lesson Complete!</p>
                                 <p className="text-xs">You've mastered this topic.</p>
                               </div>
                             </div>
                           ) : (
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Your Progress</h4>
                                <Progress value={progressPercentage} className="h-2"/>
                                <p className="text-xs text-muted-foreground mt-2">{exercisesAttempted} of {exercises.length} exercises attempted.</p>
                              </div>
                           )}
                      </div>
                    </TabsContent>

                    <TabsContent value="exercise" className="mt-4 flex-1">
                        <AdaptiveExercise 
                            exercises={exercises} 
                            userId={user.uid} 
                            lessonTitle={lesson.title}
                        />
                    </TabsContent>

                    <TabsContent value="ai-buddy" className="mt-4 flex-1 flex flex-col">
                        <AIBuddy user={user} lessonTitle={lesson.title} />
                    </TabsContent>
                </Tabs>
             </CardContent>
         </Card>
      </div>
    </div>
  );
}
