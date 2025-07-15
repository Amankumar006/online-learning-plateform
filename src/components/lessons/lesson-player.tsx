
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Loader2, Download } from "lucide-react";
import { Lesson, Section, generateAndCacheLessonAudioForSection } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);

  const [localSections, setLocalSections] = useState<Section[]>(lesson.sections || []);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [currentlyPlayingSectionTitle, setCurrentlyPlayingSectionTitle] = useState<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setLocalSections(lesson.sections || []);
  }, [lesson.sections]);


  const handlePlaySection = useCallback(async (section: Section, sectionIndex: number) => {
    if (isGeneratingAudio) return;
    
    if (currentlyPlayingSectionTitle === section.title && audioRef.current && !isGeneratingAudio) {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        return;
    }

    if (isMountedRef.current) {
      setCurrentlyPlayingSectionTitle(section.title);
      if (audioRef.current) audioRef.current.src = '';
    }
    
    try {
        let audioUrl = section.audioUrl;

        if (!audioUrl) {
            if (isMountedRef.current) {
              setIsGeneratingAudio(true);
              toast({ title: "Generating Audio...", description: "This will be saved for future use. Please wait." });
            }
            audioUrl = await generateAndCacheLessonAudioForSection(lesson.id, sectionIndex);
            
            if (isMountedRef.current) {
              setLocalSections(prevSections => {
                  const newSections = [...prevSections];
                  newSections[sectionIndex] = { ...newSections[sectionIndex], audioUrl };
                  return newSections;
              });
            }
        }

        if (audioRef.current && isMountedRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.play().catch(e => {
              console.error("Audio play failed:", e);
              if (isMountedRef.current) {
                  toast({ variant: "destructive", title: "Playback Error", description: "Could not play the audio file." });
              }
            });
        }
    } catch (e: any) {
        console.error("Audio Generation/Caching Error:", e);
        if (isMountedRef.current) {
            toast({ variant: "destructive", title: "Audio Generation Failed", description: e.message || "An unknown error occurred while preparing audio." });
            setCurrentlyPlayingSectionTitle(null);
        }
    } finally {
        if (isMountedRef.current) {
            setIsGeneratingAudio(false);
        }
    }
  }, [currentlyPlayingSectionTitle, isGeneratingAudio, isPlaying, toast, lesson.id]);


  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => isMountedRef.current && setIsPlaying(true);
    const onPause = () => isMountedRef.current && setIsPlaying(false);
    const onEnded = () => {
        if (isMountedRef.current) {
          setIsPlaying(false);
          setCurrentlyPlayingSectionTitle(null);
        }
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  return (
    <>
      <audio ref={audioRef} />
      
      <div className="space-y-2 mb-8">
         {localSections.map((section, index) => {
            const isCurrentSection = currentlyPlayingSectionTitle === section.title;
            const isLoadingThisSection = isGeneratingAudio && isCurrentSection;
            const isAudioCached = !!section.audioUrl;

            return (
                <button 
                    key={index}
                    onClick={() => handlePlaySection(section, index)}
                    disabled={isGeneratingAudio && !isCurrentSection}
                    className={cn(
                        "w-full text-left p-4 pr-6 flex items-center justify-between rounded-lg transition-all border bg-background/30",
                        isCurrentSection 
                            ? "border-primary/50 ring-2 ring-primary/30" 
                            : "hover:bg-muted/50 border-muted-foreground/20",
                        isLoadingThisSection && "animate-pulse"
                    )}
                >
                    <span className="font-semibold">{section.title}</span>
                    <div className="relative w-6 h-6 flex items-center justify-center text-primary">
                        {isLoadingThisSection 
                            ? <Loader2 className="animate-spin" /> 
                            : (isPlaying && isCurrentSection ? <Pause /> : <Play />)}
                        
                        {isAudioCached && !isCurrentSection && (
                           <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500" />
                        )}
                    </div>
                </button>
            )
         })}
      </div>
    </>
  );
}
