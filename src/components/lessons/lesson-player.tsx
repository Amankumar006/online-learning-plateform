
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
  const [audioGenerationStatus, setAudioGenerationStatus] = useState<string>((lesson as any).audioGenerationStatus || 'unknown');

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setLocalSections(lesson.sections || []);
    setAudioGenerationStatus((lesson as any).audioGenerationStatus || 'unknown');
  }, [lesson.sections, lesson]);


  const handlePlaySection = useCallback(async (section: Section, sectionIndex: number) => {
    if (isGeneratingAudio) return;
    
    // Handle play/pause for already playing section
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

        // If no audio URL, check if we should generate or wait
        if (!audioUrl) {
            // Check if audio is still being generated in background
            if (audioGenerationStatus === 'processing') {
                toast({ 
                  title: "Audio Still Processing", 
                  description: "Audio is being generated in the background. Please try again in a moment." 
                });
                setCurrentlyPlayingSectionTitle(null);
                return;
            }

            // Generate audio on-demand as fallback
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

        // Play the audio
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
  }, [currentlyPlayingSectionTitle, isGeneratingAudio, isPlaying, toast, lesson.id, audioGenerationStatus]);


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

  // Helper function to get audio status for a section
  const getSectionAudioStatus = (section: Section) => {
    if (section.audioUrl) return 'ready';
    if ((section as any).audioGenerationError) return 'error';
    if (audioGenerationStatus === 'processing') return 'generating';
    if (audioGenerationStatus === 'failed') return 'failed';
    return 'pending';
  };

  return (
    <>
      <audio ref={audioRef} />
      
      {/* Audio Generation Status Banner */}
      {audioGenerationStatus === 'processing' && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-800 dark:text-blue-200">
              Audio is being generated for this lesson. You can start reading, and audio will be available shortly!
            </span>
          </div>
        </div>
      )}

      {audioGenerationStatus === 'failed' && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Square className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-800 dark:text-red-200">
              Audio generation encountered an issue. You can still read the lesson content.
            </span>
          </div>
        </div>
      )}
      
      <div className="space-y-2 mb-8">
         {localSections.map((section, index) => {
            const isCurrentSection = currentlyPlayingSectionTitle === section.title;
            const isLoadingThisSection = isGeneratingAudio && isCurrentSection;
            const sectionAudioStatus = getSectionAudioStatus(section);

            return (
                <button 
                    key={index}
                    onClick={() => handlePlaySection(section, index)}
                    disabled={isGeneratingAudio && !isCurrentSection}
                    className={cn(
                        "w-full text-left p-3 md:p-4 pr-4 md:pr-6 flex items-center justify-between rounded-lg transition-all border bg-background/30",
                        isCurrentSection 
                            ? "border-primary/50 ring-2 ring-primary/30" 
                            : "hover:bg-muted/50 border-muted-foreground/20",
                        isLoadingThisSection && "animate-pulse",
                        sectionAudioStatus === 'error' && "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10"
                    )}
                >
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm md:text-base block truncate">{section.title}</span>
                      {sectionAudioStatus === 'generating' && (
                        <span className="text-xs text-blue-600 dark:text-blue-400">Audio generating...</span>
                      )}
                      {sectionAudioStatus === 'error' && (
                        <span className="text-xs text-red-600 dark:text-red-400">Audio unavailable</span>
                      )}
                    </div>
                    
                    <div className="relative w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-primary shrink-0 ml-2">
                        {isLoadingThisSection ? (
                            <Loader2 className="animate-spin h-4 w-4 md:h-5 md:w-5" />
                        ) : sectionAudioStatus === 'error' ? (
                            <Square className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
                        ) : (
                            <>
                                {isPlaying && isCurrentSection ? (
                                    <Pause className="h-4 w-4 md:h-5 md:w-5" />
                                ) : (
                                    <Play className="h-4 w-4 md:h-5 md:w-5" />
                                )}
                                
                                {sectionAudioStatus === 'ready' && !isCurrentSection && (
                                   <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500" />
                                )}
                            </>
                        )}
                    </div>
                </button>
            )
         })}
      </div>
    </>
  );
}
