import { Lesson } from "@/lib/data";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

export default function LessonContent({ lesson }: { lesson: Lesson }) {
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
        <div className="prose dark:prose-invert prose-lg max-w-none">
          <p>{lesson.content}</p>
        </div>
        {lesson.videoUrl && (
          <div className="mt-8">
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
      </CardContent>
    </Card>
  );
}
