
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Loader2, Download, ListMusic, Volume2 } from "lucide-react";
import { Lesson, Section, generateAndCacheLessonAudioForSection } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Optimistically store updated section data with new audio URLs
  const [localSections, setLocalSections] = useState<Section[]>(lesson.sections || []);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [currentlyPlayingSectionTitle, setCurrentlyPlayingSectionTitle] = useState<string | null>(null);

  useEffect(() => {
    setLocalSections(lesson.sections || []);
  }, [lesson.sections]);


  const handlePlaySection = useCallback(async (section: Section, sectionIndex: number) => {
    if (isGeneratingAudio) return;
    
    // If clicking the currently playing section, toggle play/pause
    if (currentlyPlayingSectionTitle === section.title && audioRef.current && !isGeneratingAudio) {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        return;
    }

    setCurrentlyPlayingSectionTitle(section.title);
    if (audioRef.current) audioRef.current.src = '';
    
    try {
        let audioUrl = section.audioUrl;

        // If no cached URL, generate, cache, and then play it.
        if (!audioUrl) {
            setIsGeneratingAudio(true);
            toast({ title: "Generating Audio...", description: "This will be saved for future use. Please wait." });
            audioUrl = await generateAndCacheLessonAudioForSection(lesson.id, sectionIndex);

            // Optimistically update local state so we don't regenerate again
            setLocalSections(prevSections => {
                const newSections = [...prevSections];
                newSections[sectionIndex] = { ...newSections[sectionIndex], audioUrl };
                return newSections;
            });
        }

        if (audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.play().catch(e => console.error("Audio play failed:", e));
        }
    } catch (e: any) {
        toast({ variant: "destructive", title: "Audio Error", description: e.message || "Failed to generate or play audio." });
        setCurrentlyPlayingSectionTitle(null);
    } finally {
        setIsGeneratingAudio(false);
    }
  }, [currentlyPlayingSectionTitle, isGeneratingAudio, isPlaying, toast, lesson.id]);


  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
        setIsPlaying(false);
        setCurrentlyPlayingSectionTitle(null);
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
            return (
                <button 
                    key={index}
                    onClick={() => handlePlaySection(section, index)}
                    disabled={isGeneratingAudio && !isCurrentSection}
                    className={cn(
                        "w-full text-left p-4 pr-6 flex items-center justify-between rounded-lg transition-all border bg-background/30",
                        isCurrentSection 
                            ? "border-primary/50 ring-2 ring-primary/30" 
                            : "hover:bg-muted/50 border-muted-foreground/20"
                    )}
                >
                    <span className="font-semibold">{section.title}</span>
                    <div className="w-6 h-6 flex items-center justify-center text-primary">
                        {isLoadingThisSection 
                            ? <Loader2 className="animate-spin" /> 
                            : (isPlaying && isCurrentSection ? <Pause /> : <Play />)}
                    </div>
                </button>
            )
         })}
      </div>
    </>
  );
}
