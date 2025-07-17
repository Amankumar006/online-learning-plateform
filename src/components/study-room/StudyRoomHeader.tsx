
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MessageSquare, Share2, BookOpen, Hand, Power, Lock, Globe, Timer, Link2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ParticipantList } from "./ParticipantList";
import { User, Lesson, StudyRoom } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { Badge } from "../ui/badge";

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

const CountdownTimer = ({ expiryTimestamp, status }: { expiryTimestamp: number, status: 'active' | 'ended' }) => {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        if (status === 'ended') {
            setTimeLeft("Session Ended");
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const distance = expiryTimestamp - now;

            if (distance < 0) {
                setTimeLeft("Session Ended");
                clearInterval(interval);
                return;
            }

            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);

        }, 1000);

        return () => clearInterval(interval);
    }, [expiryTimestamp, status]);

    return (
        <Badge variant={status === 'ended' || timeLeft === "Session Ended" ? "destructive" : "outline"} className="flex items-center gap-2 tabular-nums">
            <Timer className="h-4 w-4" />
            {timeLeft}
        </Badge>
    );
};


interface StudyRoomHeaderProps {
  room: StudyRoom | null;
  onToggleChat: () => void;
  onToggleResources: () => void;
  participants: User[];
  lessons: Lesson[];
  onAddLessonImage: (lesson: Lesson) => void;
  isOwner: boolean;
  onEndSession: () => void;
  currentUser: User | null;
  onToggleHandRaise: () => void;
}

export default function StudyRoomHeader({ room, onToggleChat, onToggleResources, participants, lessons, onAddLessonImage, isOwner, onEndSession, currentUser, onToggleHandRaise }: StudyRoomHeaderProps) {
  const pathname = usePathname();
  const { toast } = useToast();
  const [isLessonLoaderOpen, setIsLessonLoaderOpen] = useState(false);
  const isHandRaised = participants.find(p => p.uid === currentUser?.uid)?.handRaised || false;

  const handleShare = () => {
    const url = `${window.location.origin}${pathname}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied!",
      description: "You can now share the link with participants.",
    });
  };

  return (
    <header className="sticky top-0 z-50 flex h-20 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-4">
         <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/study-room">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
         </Button>
         <div className="flex flex-col">
            <h1 className="font-semibold text-lg flex items-center gap-2">
                {room?.name || 'Study Room'}
                <Badge variant="outline" className="capitalize">
                    {room?.visibility === 'public' ? <Globe className="mr-1 h-3 w-3"/> : <Lock className="mr-1 h-3 w-3"/>}
                    {room?.visibility}
                </Badge>
            </h1>
            {room?.lessonTitle && <p className="text-xs text-muted-foreground">Topic: {room.lessonTitle}</p>}
         </div>
         {room && <CountdownTimer expiryTimestamp={room.expiresAt.toMillis()} status={room.status} />}
      </div>
       <ParticipantList participants={participants} />
      <div className="flex items-center gap-2">
         <Dialog open={isLessonLoaderOpen} onOpenChange={setIsLessonLoaderOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={room?.status === 'ended'}>
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

        <Button variant={isHandRaised ? "secondary" : "outline"} onClick={onToggleHandRaise} disabled={room?.status === 'ended'}>
            <Hand className="mr-2 h-4 w-4" /> {isHandRaised ? "Lower Hand" : "Raise Hand"}
        </Button>

        <Button variant="outline" onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" /> Share
        </Button>
         <Button variant="secondary" onClick={onToggleResources}>
          <Link2 className="mr-2 h-4 w-4" /> Resources
        </Button>
         <Button variant="secondary" onClick={onToggleChat}>
          <MessageSquare className="mr-2 h-4 w-4" /> Chat
        </Button>
        {isOwner && room?.status === 'active' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Power className="mr-2 h-4 w-4" /> End Session
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>End Session for Everyone?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will make the whiteboard read-only for all participants. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onEndSession}>End Session</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        )}
      </div>
    </header>
  );
}
