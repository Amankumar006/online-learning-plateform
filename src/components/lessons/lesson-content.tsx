
"use client";

import * as React from "react";
import { useState } from "react";
import { Lesson, UserProgress } from "@/lib/data";
import { completeLesson } from "@/lib/data";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Lightbulb, HelpCircle } from "lucide-react";
import { BlockMath, InlineMath } from 'react-katex';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LessonContentProps {
  lesson: Lesson;
  userId: string;
  userProgress: UserProgress | null;
  onLessonComplete: () => void;
}

const parseTextWithMath = (text: string) => {
    const parts = text.split(/(\${1,2}[^$]+\${1,2})/g);
    return parts.filter(part => part).map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
            return <BlockMath key={index}>{part.slice(2, -2)}</BlockMath>;
        }
        if (part.startsWith('$') && part.endsWith('$')) {
            return <InlineMath key={index}>{part.slice(1, -1)}</InlineMath>;
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
    });
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
             {parseTextWithMath(content)}
          </CardContent>
        </Card>
      );
    }
  }
  
  return <p>{parseTextWithMath(text)}</p>;
};


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
    // Handle new modular content structure
    if (Array.isArray(lesson.content)) {
      return lesson.content.map((block, index) => {
        if (block.type === 'paragraph') {
          return <FormattedParagraph key={index} text={block.value} />;
        }
        if (block.type === 'video') {
          return (
             <div className="my-8" key={index}>
              <h3 className="text-xl font-semibold mb-4 font-headline">Watch a video lesson</h3>
              <div className="aspect-video">
                <iframe
                  className="w-full h-full rounded-lg"
                  src={block.value}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          );
        }
        return null;
      });
    }

    // Handle old string-based content for backward compatibility
    if (typeof lesson.content === 'string') {
      return lesson.content.split('\n').filter(p => p.trim() !== '').map((paragraph, index) => (
        <FormattedParagraph key={index} text={paragraph} />
      ));
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

        {/* Backward compatibility for old videoUrl field */}
        {lesson.videoUrl && !Array.isArray(lesson.content) && (
            <div className="my-8">
            <h3 className="text-xl font-semibold mb-4 font-headline">Watch a video lesson</h3>
            <div className="aspect-video">
                <iframe
                className="w-full h-full rounded-lg"
                src={lesson.videoUrl}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                ></iframe>
            </div>
            </div>
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
