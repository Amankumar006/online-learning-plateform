
"use client";

import * as React from "react";
import { useState } from "react";
import { Lesson, UserProgress, Section, Block } from "@/lib/data";
import { completeLesson } from "@/lib/data";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Lightbulb, HelpCircle, Code, Video, Copy } from "lucide-react";
import { BlockMath, InlineMath } from 'react-katex';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    const parts = text.split(/(```[\s\S]*?```|\*\*.*?\*\*|`.*?`|\$\$.*?\$\$|\$.*?\$)/g);
    return <>{parts.filter(Boolean).map((part, index) => {
        if (part.startsWith('```')) {
            const content = part.slice(3, -3);
            const firstLineBreak = content.indexOf('\n');
            const language = content.substring(0, firstLineBreak).trim();
            const code = content.substring(firstLineBreak + 1);
            return <CodeBlockDisplay key={index} language={language} code={code} />;
        }
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


const FormattedParagraph = ({ text }: { text: string }) => {
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
             <FormattedText text={content} />
          </CardContent>
        </Card>
      );
    }
  }

  const listSegments = text.split(/\s\*\s/g);
  if (listSegments.length > 1) {
    const intro = listSegments[0].trim();
    const listItems = listSegments.slice(1);
    return (
      <div className="prose-p:my-2">
        {intro && <p><FormattedText text={intro} /></p>}
        <ul className="list-disc pl-5 my-4 space-y-2">
          {listItems.map((item, index) => (
            <li key={index}><FormattedText text={item.trim()} /></li>
          ))}
        </ul>
      </div>
    );
  }
  
  return <p><FormattedText text={text} /></p>;
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
            return <FormattedParagraph text={block.content} />;
        case 'code':
            return <CodeBlockDisplay language={block.language} code={block.code} />;
        case 'video':
            return <VideoBlockDisplay url={block.url} />;
        default:
            return null;
    }
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

  const isCompleted = userProgress?.completedLessonIds?.includes(lesson.id);

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
    // Render new section-based content
    if (lesson.sections && lesson.sections.length > 0) {
        return lesson.sections.map((section, sIndex) => (
            <section key={sIndex} className="mb-8">
                <h2 className="text-2xl font-bold font-headline mt-8 mb-4 border-b pb-2">{section.title}</h2>
                <div className="space-y-4">
                    {section.blocks.map((block, bIndex) => <BlockRenderer key={bIndex} block={block} />)}
                </div>
            </section>
        ));
    }

    // Fallback for old string-based content
    if (typeof lesson.content === 'string') {
      return lesson.content.split('\n').filter(p => p.trim() !== '').map((paragraph, index) => (
        <FormattedParagraph key={index} text={paragraph} />
      ));
    }
    
    // Fallback for old block-based content
    if (Array.isArray(lesson.content)) {
        return lesson.content.map((block, index) => {
            if (block.type === 'paragraph') {
              return <FormattedParagraph key={index} text={block.value} />;
            }
            if (block.type === 'video') {
              return <VideoBlockDisplay key={index} url={block.value} />;
            }
            return null;
        });
    }
    
    return <p>No content available for this lesson.</p>;
  };

  return (
    <div>
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
        <div className="prose dark:prose-invert prose-lg max-w-none mb-8 space-y-0">
            {renderContent()}
        </div>

        {/* Backward compatibility for old top-level videoUrl field */}
        {lesson.videoUrl && !lesson.sections && (
             <VideoBlockDisplay url={lesson.videoUrl} />
        )}

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
