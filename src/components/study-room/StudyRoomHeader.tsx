
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MessageSquare, Share2, BookOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ParticipantList } from "./ParticipantList";
import { User, Lesson } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

interface LessonLoaderProps {
  lessons: Lesson[];
  onSelectLesson: (lesson: Lesson) => void;
  closeDialog: () => void;
}

const LessonLoader = ({ lessons, onSelectLesson, closeDialog }: LessonLoaderProps) => (
  <ScrollArea className="h-96">
    <div className="space-y-2 p-1">
      {lessons.map((lesson) => (
        <button
          key={lesson.id}
          className="w-full text-left p-2 rounded-md hover:bg-muted flex items-start gap-3"
          onClick={() => {
            onSelectLesson(lesson);
            closeDialog();
          }}
        >
          <Image
            src={lesson.image}
            alt={lesson.title}
            width={80}
            height={45}
            className="rounded-md aspect-video object-cover"
          />
          <div className="flex-1">
            <p className="font-semibold text-sm">{lesson.title}</p>
            <p className="text-xs text-muted-foreground">{lesson.subject}</p>
          </div>
        </button>
      ))}
    </div>
  </ScrollArea>
);


interface StudyRoomHeaderProps {
  roomId: string;
  onToggleChat: () => void;
  participants: User[];
  lessons: Lesson[];
  onAddLessonImage: (lesson: Lesson) => void;
}

export default function StudyRoomHeader({ roomId, onToggleChat, participants, lessons, onAddLessonImage }: StudyRoomHeaderProps) {
  const pathname = usePathname();
  const { toast } = useToast();
  const [isLessonLoaderOpen, setIsLessonLoaderOpen] = useState(false);

  const handleShare = () => {
    const url = `${window.location.origin}${pathname}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied!",
      description: "You can now share the link with participants.",
    });
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
         <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>
         </Button>
         <ParticipantList participants={participants} />
      </div>
      <div className="flex items-center gap-2">
         <Dialog open={isLessonLoaderOpen} onOpenChange={setIsLessonLoaderOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <BookOpen className="mr-2 h-4 w-4" /> Load Lesson
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Load Lesson Content</DialogTitle>
              <DialogDescription>
                Select a lesson to add its main image to the whiteboard for annotation.
              </DialogDescription>
            </DialogHeader>
            <LessonLoader lessons={lessons} onSelectLesson={onAddLessonImage} closeDialog={() => setIsLessonLoaderOpen(false)} />
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" /> Share
        </Button>
         <Button variant="secondary" onClick={onToggleChat}>
          <MessageSquare className="mr-2 h-4 w-4" /> Chat
        </Button>
      </div>
    </header>
  );
}
