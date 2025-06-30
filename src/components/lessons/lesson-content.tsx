
"use client";

import { useState } from "react";
import { Lesson, UserProgress } from "@/lib/data";
import { completeLesson } from "@/lib/data";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";

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

  return (
    <Card>
      <CardContent className="p-6">
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
        <div className="prose dark:prose-invert prose-lg max-w-none mb-8 space-y-4">
          {lesson.content.split('\n').filter(p => p.trim() !== '').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        {lesson.videoUrl && (
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
         <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-center gap-4">
          {isCompleted ? (
            <>
              <div className="text-center sm:text-left">
                <p className="font-semibold text-lg flex items-center gap-2"><CheckCircle className="text-primary"/> Lesson Completed</p>
                <p className="text-muted-foreground text-sm">You have already completed this lesson.</p>
              </div>
              <Button disabled className="sm:ml-auto">
                <CheckCircle className="mr-2 h-4 w-4" />
                Completed
              </Button>
            </>
          ) : (
            <>
              <div className="text-center sm:text-left">
                <p className="font-semibold text-lg">Finished the lesson?</p>
                <p className="text-muted-foreground text-sm">Mark it as complete to save your progress.</p>
              </div>
              <Button onClick={handleComplete} disabled={isCompleting} className="sm:ml-auto">
                {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mark as Complete
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
