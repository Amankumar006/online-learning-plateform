import { getLesson, getExercises } from "@/lib/data";
import { notFound } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LessonContent from "@/components/lessons/lesson-content";
import AdaptiveExercise from "@/components/lessons/adaptive-exercise";
import AIBuddy from "@/components/lessons/ai-buddy";
import { BookText, Bot, BrainCircuit } from "lucide-react";

export default async function LessonPage({ params }: { params: { id: string } }) {
  const lesson = await getLesson(params.id);
  
  if (!lesson) {
    notFound();
  }
  
  const exercises = await getExercises(lesson.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold font-headline">{lesson.title}</h1>
        <p className="text-lg text-muted-foreground">{lesson.subject}</p>
      </div>
      <Tabs defaultValue="lesson" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-10">
          <TabsTrigger value="lesson"><BookText className="mr-2"/>Lesson</TabsTrigger>
          <TabsTrigger value="exercise"><BrainCircuit className="mr-2"/>Exercise</TabsTrigger>
          <TabsTrigger value="ai-buddy"><Bot className="mr-2"/>AI Buddy</TabsTrigger>
        </TabsList>
        <TabsContent value="lesson">
          <LessonContent lesson={lesson} />
        </TabsContent>
        <TabsContent value="exercise">
          <AdaptiveExercise exercises={exercises} />
        </TabsContent>
        <TabsContent value="ai-buddy">
          <AIBuddy lessonContent={lesson.content} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
