
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Loader2, Download, ListMusic, Volume2 } from "lucide-react";
import { Lesson, Section } from "@/lib/data";
import { generateAudioFromText } from "@/ai/flows/generate-audio-from-text";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const getSectionTextContent = (section: Section): string => {
    return section.blocks?.filter((b) => b.type === 'text').map((b) => (b as any).content).join('\n\n') || '';
};

export default function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [currentlyPlayingSectionTitle, setCurrentlyPlayingSectionTitle] = useState<string | null>(null);

  const handlePlaySection = useCallback(async (section: Section) => {
    // If clicking the currently playing section, toggle play/pause
    if (currentlyPlayingSectionTitle === section.title && audioRef.current && !isGeneratingAudio) {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        return;
    }

    if (isGeneratingAudio) return;
    
    setCurrentlyPlayingSectionTitle(section.title);
    setIsGeneratingAudio(true);
    if (audioRef.current) audioRef.current.src = '';
    
    try {
        let audioUrl = section.audioUrl;
        if (!audioUrl) {
            const content = getSectionTextContent(section);
            if (!content) {
                toast({ variant: "destructive", title: "No Content", description: "This section has no text to read aloud." });
                setIsGeneratingAudio(false);
                setCurrentlyPlayingSectionTitle(null);
                return;
            }
            toast({ title: "Generating Audio...", description: "Please wait while we prepare the audio for this section." });
            const result = await generateAudioFromText({ sectionTitle: section.title, sectionContent: content });
            audioUrl = result.audioDataUri;
        }

        if (audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.play().catch(e => console.error("Audio play failed:", e));
        }
    } catch (e: any) {
        toast({ variant: "destructive", title: "Audio Error", description: e.message || "Failed to generate audio." });
        setCurrentlyPlayingSectionTitle(null);
    } finally {
        setIsGeneratingAudio(false);
    }
  }, [currentlyPlayingSectionTitle, isGeneratingAudio, isPlaying, toast]);


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
         {lesson.sections?.map((section, index) => {
            const isCurrentSection = currentlyPlayingSectionTitle === section.title;
            return (
                <button 
                    key={index}
                    onClick={() => handlePlaySection(section)}
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
                        {isGeneratingAudio && isCurrentSection 
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
