
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Square, Loader2, Download, ListMusic, Volume2 } from "lucide-react";
import { Lesson, Section } from "@/lib/data";
import { generateAudioFromText } from "@/ai/flows/generate-audio-from-text";
import { uploadAudioFromDataUrl } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const getSectionTextContent = (section: Section): string => {
    return section.blocks?.filter((b) => b.type === 'text').map((b) => (b as any).content).join('\n\n') || '';
};


export default function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState<Section | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  const handlePlaySection = useCallback(async (section: Section) => {
    if (isGeneratingAudio) return;
    
    if (currentSection?.title === section.title && audioUrl) {
        onPlayPause();
        return;
    }
    
    if (section.audioUrl) {
        setCurrentSection(section);
        setAudioUrl(section.audioUrl);
        return;
    }

    const content = getSectionTextContent(section);
    if (!content) {
        toast({ variant: "destructive", title: "No Content", description: "This section has no text to read aloud." });
        return;
    }

    setCurrentSection(section);
    setIsGeneratingAudio(true);
    setAudioUrl(null);
    if (audioRef.current) audioRef.current.pause();
    
    try {
        const result = await generateAudioFromText({ sectionTitle: section.title, sectionContent: content });
        setAudioUrl(result.audioDataUri);
    } catch (e: any) {
        toast({ variant: "destructive", title: "Audio Error", description: e.message || "Failed to generate audio." });
    } finally {
        setIsGeneratingAudio(false);
    }
  }, [isGeneratingAudio, toast, currentSection, audioUrl]);

  const onPlayPause = () => {
    if (!audioRef.current) return;
    isPlaying ? audioRef.current.pause() : audioRef.current.play();
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
    
    if (audioUrl.startsWith('https://')) {
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = `${lesson.title || 'lesson'}_${currentSection.title}.wav`.replace(/[^a-zA-Z0-9_.]/g, '_');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }
    
    toast({ title: 'Preparing Download', description: 'Uploading audio to secure storage...' });
    try {
        const fileName = `${lesson.title || 'lesson'}_${currentSection.title}`.replace(/[^a-zA-Z0-9]/g, '_');
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
    const onEnded = () => handleStop();

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
  }, [audioUrl, playbackRate]);

  return (
    <>
      <audio ref={audioRef} />
      
      {/* Sections List */}
      <div className="space-y-2 mb-8">
         {lesson.sections?.map((section, index) => (
            <button 
                key={index}
                onClick={() => handlePlaySection(section)}
                disabled={isGeneratingAudio && currentSection?.title !== section.title}
                className={cn(
                    "w-full text-left p-3 flex items-center justify-between rounded-lg transition-colors border",
                    currentSection?.title === section.title 
                        ? "bg-primary/10 border-primary/30 text-primary" 
                        : "hover:bg-muted/50"
                )}
            >
                <span className="font-semibold">{section.title}</span>
                <div className="w-6 h-6 flex items-center justify-center">
                    {isGeneratingAudio && currentSection?.title === section.title 
                        ? <Loader2 className="animate-spin" /> 
                        : (isPlaying && currentSection?.title === section.title ? <Volume2 /> : <Play />)}
                </div>
            </button>
         ))}
      </div>
      
      {/* Bottom Player Bar */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-50 transition-all duration-300",
        (isGeneratingAudio || audioUrl) ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="bg-background/80 backdrop-blur-sm border-t p-2">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                 <div className="flex items-center gap-3 overflow-hidden">
                    <Button variant="secondary" size="icon" onClick={onPlayPause} disabled={isGeneratingAudio || !audioUrl} className="shrink-0 w-12 h-12">
                        {isGeneratingAudio ? <Loader2 className="animate-spin"/> : (isPlaying ? <Pause /> : <Play />)}
                    </Button>
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-semibold truncate text-sm">
                            {isGeneratingAudio ? "Generating audio..." : (currentSection?.title || "Select a section to play")}
                        </span>
                        <span className="text-xs text-muted-foreground uppercase">{lesson.title}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                    <Select value={String(playbackRate)} onValueChange={(value) => setPlaybackRate(Number(value))}>
                        <SelectTrigger className="w-[80px] sm:w-[90px] h-9 text-xs">
                            <SelectValue placeholder="Speed" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0.75">0.75x</SelectItem>
                            <SelectItem value="1">1x</SelectItem>
                            <SelectItem value="1.25">1.25x</SelectItem>
                            <SelectItem value="1.5">1.5x</SelectItem>
                            <SelectItem value="2">2x</SelectItem>
                        </SelectContent>
                    </Select>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon"><ListMusic /><span className="sr-only">Playlist</span></Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="p-0 w-80 mb-2">
                            <div className="p-3">
                                <h4 className="font-semibold text-sm">Lesson Sections</h4>
                            </div>
                             <Separator />
                             <ScrollArea className="h-[250px] p-1">
                                {lesson.sections?.map((section, index) => (
                                     <button 
                                        key={index}
                                        onClick={() => handlePlaySection(section)}
                                        disabled={isGeneratingAudio && currentSection?.title !== section.title}
                                        className={cn(
                                            "w-full text-left p-2 flex items-center justify-between rounded-md transition-colors text-sm",
                                            currentSection?.title === section.title 
                                                ? "bg-primary/10 text-primary" 
                                                : "hover:bg-muted/50"
                                        )}
                                    >
                                        <span className="truncate">{section.title}</span>
                                        <div className="w-5 h-5 flex items-center justify-center">
                                             {isGeneratingAudio && currentSection?.title === section.title 
                                                ? <Loader2 className="animate-spin w-4 h-4" /> 
                                                : (isPlaying && currentSection?.title === section.title ? <Volume2 className="w-4 h-4" /> : <Play className="w-4 h-4" />)}
                                        </div>
                                    </button>
                                ))}
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" onClick={handleDownload} disabled={!audioUrl || isGeneratingAudio}><Download /><span className="sr-only">Download</span></Button>
                    <Button variant="ghost" size="icon" onClick={handleStop}><Square /><span className="sr-only">Stop</span></Button>
                </div>
            </div>
        </div>
      </div>
    </>
  );
}
