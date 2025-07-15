
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Square, Loader2, Download } from "lucide-react";
import { Lesson, Section } from "@/lib/data";
import { generateAudioFromText } from "@/ai/flows/generate-audio-from-text";
import { uploadAudioFromDataUrl } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const getSectionTextContent = (section: Section): string => {
    return section.blocks?.filter((b) => b.type === 'text').map((b) => (b as any).content).join('\n\n') || '';
};

const SectionPlayer = ({ section, onPlay, isGenerating, isPlaying }: { section: Section, onPlay: () => void, isGenerating: boolean, isPlaying: boolean}) => (
    <div className="flex justify-between items-center mt-8 mb-4 border-b pb-2">
        <h2 className="text-2xl font-bold font-headline">{section.title}</h2>
        <Button variant="ghost" size="icon" onClick={onPlay} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="animate-spin" /> : (isPlaying ? <Pause /> : <Play />)}
            <span className="sr-only">{isPlaying ? "Pause section" : "Play section"}</span>
        </Button>
    </div>
);

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
    
    // If it's the current section, just toggle play/pause
    if (currentSection?.title === section.title && audioUrl) {
        onPlayPause();
        return;
    }
    
    // Set the new section and audio immediately if URL exists
    if (section.audioUrl) {
        setCurrentSection(section);
        setAudioUrl(section.audioUrl);
        return;
    }

    // Fallback: Generate on demand if no URL is present
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
    
    // If it's a direct URL, we can download it easily.
    if (audioUrl.startsWith('https://')) {
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = `${lesson.title || 'lesson'}_${currentSection.title}.wav`.replace(/[^a-zA-Z0-9_.]/g, '_');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }
    
    // If it's a data URI, we need to upload first.
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
      <div className={cn(
        "sticky top-[65px] z-30 transition-all duration-300",
        (isGeneratingAudio || audioUrl) ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
      )}>
        <Card className="mb-6 bg-background/80 backdrop-blur-sm shadow-lg">
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 overflow-hidden">
                <Button variant="secondary" size="icon" onClick={onPlayPause} disabled={isGeneratingAudio || !audioUrl} className="shrink-0">
                    {isGeneratingAudio ? <Loader2 className="animate-spin"/> : (isPlaying ? <Pause /> : <Play />)}
                </Button>
                <div className="flex flex-col overflow-hidden">
                    <span className="text-xs text-muted-foreground uppercase">Now Playing</span>
                    <span className="font-semibold truncate text-sm">
                        {isGeneratingAudio ? "Generating audio..." : (currentSection?.title || "Select a section to play")}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
                <Select
                    value={String(playbackRate)}
                    onValueChange={(value) => setPlaybackRate(Number(value))}
                >
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
                <Button variant="ghost" size="icon" onClick={handleDownload} disabled={!audioUrl || isGeneratingAudio} className="shrink-0">
                    <Download className="h-4 w-4"/>
                    <span className="sr-only">Download Audio</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={handleStop} className="shrink-0">
                    <Square />
                    <span className="sr-only">Stop</span>
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>

       {lesson.sections?.map((section, index) => (
            <SectionPlayer 
                key={index}
                section={section}
                onPlay={() => handlePlaySection(section)}
                isGenerating={isGeneratingAudio && currentSection?.title === section.title}
                isPlaying={isPlaying && currentSection?.title === section.title}
            />
       ))}
    </>
  );
}
