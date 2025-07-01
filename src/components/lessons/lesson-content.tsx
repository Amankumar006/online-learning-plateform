
"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { Lesson, UserProgress, Section, Block, TextBlock } from "@/lib/data";
import { completeLesson } from "@/lib/data";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Lightbulb, HelpCircle, Code, Video, Copy, Volume2, Pause, Play, Headphones } from "lucide-react";
import { BlockMath, InlineMath } from 'react-katex';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateAudioFromText } from "@/ai/flows/generate-audio-from-text";
import { cn } from "@/lib/utils";
import LessonPlayer from "./lesson-player";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CodeBlockDisplay = ({ language, code }: { language: string, code: string }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 2000);
    };

    return (
        <div className="my-6">
            <div className="flex justify-between items-center bg-secondary rounded-t-lg px-4 py-2">
                <div className="flex items-center gap-2">
                     <Code className="h-5 w-5" />
                     <span className="text-sm font-semibold">{language || 'code'}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleCopy}>
                    {copied ? <CheckCircle className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                    <span className="sr-only">Copy code</span>
                </Button>
            </div>
            <div className="bg-background border rounded-b-lg p-4 overflow-x-auto">
                <pre><code className={`language-${language}`}>{code}</code></pre>
            </div>
        </div>
    );
};

const FormattedText = ({ text }: { text: string }) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\$\$.*?\$\$|\$.*?\$)/g);
    return <>{parts.filter(Boolean).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={index} className="bg-muted px-1.5 py-1 rounded text-sm font-mono">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith('$$') && part.endsWith('$$')) {
            return <BlockMath key={index}>{part.slice(2, -2)}</BlockMath>;
        }
        if (part.startsWith('$') && part.endsWith('$')) {
            return <InlineMath key={index}>{part.slice(1, -1)}</InlineMath>;
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
    })}</>;
};


const TextContentRenderer = ({ text }: { text: string }) => {
  const keyWordStyleMap = {
    '**Example:**': {
      icon: <Lightbulb className="h-5 w-5 text-primary" />,
      title: "Example",
      cardClass: "my-6 bg-secondary/50",
    },
    '**Question:**': {
      icon: <HelpCircle className="h-5 w-5 text-primary" />,
      title: "Question",
      cardClass: "my-6 border-primary",
    },
  };

  for (const keyword in keyWordStyleMap) {
    if (text.startsWith(keyword)) {
      const { icon, title, cardClass } = keyWordStyleMap[keyword as keyof typeof keyWordStyleMap];
      const content = text.replace(keyword, '').trim();
      return (
        <Card className={cardClass}>
          <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-4">
            {icon}
            <CardTitle className="text-lg font-headline">{title}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 text-sm md:text-base prose-p:my-2">
             <TextContentRenderer text={content} />
          </CardContent>
        </Card>
      );
    }
  }

  const segments = text.split(/(```[\s\S]*?```)/g);

  const renderedSegments = segments.filter(Boolean).map((segment, index) => {
    if (segment.startsWith('```')) {
      const content = segment.slice(3, -3);
      const firstLineBreak = content.indexOf('\n');
      const language = content.substring(0, firstLineBreak).trim();
      const code = content.substring(firstLineBreak + 1);
      return <CodeBlockDisplay key={index} language={language} code={code} />;
    }

    const lines = segment.trim().split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];

    lines.forEach((line, lineIndex) => {
      const isListItem = line.trim().startsWith('* ');
      if (isListItem) {
        currentList.push(line.trim().substring(2));
      } else {
        if (currentList.length > 0) {
          elements.push(
            <ul key={`list-${index}-${lineIndex}`} className="list-disc pl-5 my-4 space-y-2">
              {currentList.map((item, i) => (
                <li key={i}><FormattedText text={item} /></li>
              ))}
            </ul>
          );
          currentList = [];
        }
        if (line.trim()) {
          elements.push(<p key={`p-${index}-${lineIndex}`}><FormattedText text={line} /></p>);
        }
      }
    });

    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-final-${index}`} className="list-disc pl-5 my-4 space-y-2">
          {currentList.map((item, i) => (
            <li key={i}><FormattedText text={item} /></li>
          ))}
        </ul>
      );
    }

    return elements;
  });

  return <>{renderedSegments}</>;
};


const VideoBlockDisplay = ({ url }: { url: string }) => (
    <div className="my-8" >
        <h3 className="text-xl font-semibold mb-4 font-headline flex items-center gap-2"><Video /> Watch a video lesson</h3>
        <div className="aspect-video">
            <iframe
                className="w-full h-full rounded-lg"
                src={url}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            ></iframe>
        </div>
    </div>
);

const BlockRenderer = ({ block }: { block: Block }) => {
    switch (block.type) {
        case 'text':
            return <TextContentRenderer text={block.content} />;
        case 'code':
            return <CodeBlockDisplay language={block.language} code={block.code} />;
        case 'video':
            return <VideoBlockDisplay url={block.url} />;
        default:
            return null;
    }
};

const SectionHeader = ({ section, onPlay, isPlaying, isGenerating, isActive }: { section: Section, onPlay: () => void, isPlaying: boolean, isGenerating: boolean, isActive: boolean }) => {
    return (
        <div className="flex justify-between items-center mt-8 mb-4 border-b pb-2">
            <h2 className={cn("text-2xl font-bold font-headline transition-colors", isActive && "text-primary")}>{section.title}</h2>
            <div className="flex items-center gap-2">
                 <Button variant="ghost" size="icon" onClick={onPlay} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="animate-spin" /> : (isPlaying ? <Pause /> : <Play />)}
                    <span className="sr-only">Listen to this section</span>
                 </Button>
            </div>
        </div>
    );
};


interface LessonContentProps {
  lesson: Lesson;
  userId: string;
  userProgress: UserProgress | null;
  onLessonComplete: () => void;
}

export default function LessonContent({ lesson, userId, userProgress, onLessonComplete }: LessonContentProps) {
  const { toast } = useToast();
  const [isCompleting, setIsCompleting] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [selectedVoice, setSelectedVoice] = useState('Algenib');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioPlayerState, setAudioPlayerState] = useState<{
    isGenerating: boolean;
    isPlaying: boolean;
    currentSectionIndex: number | null;
    audioUrl: string | null;
  }>({
    isGenerating: false,
    isPlaying: false,
    currentSectionIndex: null,
    audioUrl: null,
  });

  const isCompleted = userProgress?.completedLessonIds?.includes(lesson.id);
  const sections = lesson.sections || [];

  const playSection = async (index: number) => {
    if (index >= sections.length) {
      handleStop();
      return;
    }
    
    setAudioPlayerState({ isPlaying: false, audioUrl: null, isGenerating: true, currentSectionIndex: index });

    try {
      const section = sections[index];
      const textContent = section.blocks.filter(b => b.type === 'text').map(b => (b as TextBlock).content).join('\n');
      
      if (!textContent.trim()) {
        playSection(index + 1); // Skip empty sections
        return;
      }
      
      const result = await generateAudioFromText({ text: textContent, voice: selectedVoice });
      setAudioPlayerState(prev => ({ ...prev, isGenerating: false, isPlaying: true, audioUrl: result.audioDataUri }));
    } catch (error) {
      console.error(error);
      toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to generate audio for this section.",
      });
      handleStop();
    }
  };
  
  const handlePlayPause = () => {
    if (audioPlayerState.isGenerating) return;
    
    if (audioPlayerState.isPlaying) {
      setAudioPlayerState(prev => ({ ...prev, isPlaying: false }));
    } else {
      if (audioPlayerState.currentSectionIndex === null) {
        playSection(0); // Start from the beginning
      } else {
        setAudioPlayerState(prev => ({ ...prev, isPlaying: true }));
      }
    }
  };

  const handlePlaySection = (index: number) => {
    if (audioPlayerState.currentSectionIndex === index) {
      handlePlayPause();
    } else {
      playSection(index);
    }
  };
  
  const handleStop = () => {
    setAudioPlayerState({
      isGenerating: false,
      isPlaying: false,
      currentSectionIndex: null,
      audioUrl: null
    });
  };
  
  const handleAudioEnded = () => {
    if (audioPlayerState.currentSectionIndex !== null) {
      playSection(audioPlayerState.currentSectionIndex + 1);
    }
  };

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audioPlayerState.isPlaying && audio.src) {
        audio.play().catch(e => console.error("Audio play failed:", e));
    } else {
        audio.pause();
    }
  }, [audioPlayerState.isPlaying, audioPlayerState.audioUrl]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
        audio.playbackRate = playbackRate;
    }
  }, [playbackRate]);


  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await completeLesson(userId, lesson.id);
      toast({
        title: "Lesson Completed!",
        description: `Great job on finishing "${lesson.title}".`,
      });
      onLessonComplete();
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not mark lesson as complete.",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const renderContent = () => {
    if (sections.length > 0) {
        return sections.map((section, sIndex) => (
            <section key={sIndex} id={`section-${sIndex}`} className={cn("mb-8 p-4 rounded-lg transition-all", audioPlayerState.currentSectionIndex === sIndex && "bg-primary/10 ring-2 ring-primary/50")}>
                <SectionHeader 
                    section={section}
                    onPlay={() => handlePlaySection(sIndex)}
                    isPlaying={audioPlayerState.isPlaying && audioPlayerState.currentSectionIndex === sIndex}
                    isGenerating={audioPlayerState.isGenerating && audioPlayerState.currentSectionIndex === sIndex}
                    isActive={audioPlayerState.currentSectionIndex === sIndex}
                />
                <div>
                    {section.blocks.map((block, bIndex) => <BlockRenderer key={bIndex} block={block} />)}
                </div>
            </section>
        ));
    }

    if (typeof lesson.content === 'string') return <TextContentRenderer text={lesson.content} />;
    
    if (Array.isArray(lesson.content)) {
        return lesson.content.map((block, index) => {
            if (block.type === 'paragraph') return <TextContentRenderer key={index} text={block.value} />;
            if (block.type === 'video') return <VideoBlockDisplay key={index} url={block.value} />;
            return null;
        });
    }
    
    return <p>No content available for this lesson.</p>;
  };
  
  const currentSectionTitle = audioPlayerState.currentSectionIndex !== null ? sections[audioPlayerState.currentSectionIndex]?.title : null;

  return (
    <div>
        {sections.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 mb-6 rounded-lg bg-muted/50">
             <div className="flex-1 text-center sm:text-left">
                <p className="font-semibold text-lg flex items-center gap-2"><Headphones className="text-primary h-5 w-5"/> Read Aloud</p>
                <p className="text-muted-foreground text-sm">Listen to the lesson and select a voice.</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedVoice} onValueChange={setSelectedVoice} disabled={audioPlayerState.isPlaying || audioPlayerState.isGenerating}>
                  <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Algenib">Voice Algenib</SelectItem>
                      <SelectItem value="Achernar">Voice Achernar</SelectItem>
                      <SelectItem value="Polaris">Voice Polaris</SelectItem>
                      <SelectItem value="Regulus">Voice Regulus</SelectItem>
                  </SelectContent>
              </Select>
              <Button onClick={() => playSection(0)} disabled={audioPlayerState.isGenerating || audioPlayerState.isPlaying}>
                <Play className="mr-2 h-4 w-4"/>
                Start
              </Button>
            </div>
          </div>
        )}

        <LessonPlayer 
            isPlaying={audioPlayerState.isPlaying}
            isGenerating={audioPlayerState.isGenerating}
            currentSectionTitle={currentSectionTitle}
            onPlayPause={handlePlayPause}
            onStop={handleStop}
            playbackRate={playbackRate}
            onPlaybackRateChange={setPlaybackRate}
        />

        {lesson.image && (
            <div className="mb-6">
            <Image
                src={lesson.image}
                alt={lesson.title}
                width={800}
                height={450}
                data-ai-hint={`${lesson.subject.toLowerCase()} education`}
                className="rounded-lg object-cover w-full aspect-video"
            />
            </div>
        )}
        <div className="prose dark:prose-invert prose-lg max-w-none mb-8">
            {renderContent()}
        </div>

        {lesson.videoUrl && !lesson.sections && (
             <VideoBlockDisplay url={lesson.videoUrl} />
        )}

        <audio ref={audioRef} src={audioPlayerState.audioUrl || undefined} onEnded={handleAudioEnded} />

        <div className="mt-8 pt-6 border-t">
          {isCompleted ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
              <div className="text-center sm:text-left">
                <p className="font-semibold text-lg flex items-center gap-2"><CheckCircle className="text-primary h-5 w-5"/> Lesson Completed</p>
                <p className="text-muted-foreground text-sm">You have already completed this lesson.</p>
              </div>
              <Button disabled className="sm:ml-auto">
                <CheckCircle className="mr-2 h-4 w-4" />
                Completed
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="text-center sm:text-left">
                <p className="font-semibold text-lg">Finished the lesson?</p>
                <p className="text-muted-foreground text-sm">Mark it as complete to save your progress.</p>
              </div>
              <Button onClick={handleComplete} disabled={isCompleting} className="sm:ml-auto">
                {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mark as Complete
              </Button>
            </div>
          )}
        </div>
    </div>
  );
}
