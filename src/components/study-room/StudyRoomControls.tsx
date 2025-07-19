
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Share2, BookOpen, Hand, Power, Lock, Globe, Timer, Link2, Users, Mic, MicOff, Phone } from "lucide-react";
import { usePathname } from "next/navigation";
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
import { Separator } from "../ui/separator";
import { cn } from "@/lib/utils";

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


interface StudyRoomControlsProps {
  room: StudyRoom | null;
  onToggleChat: () => void;
  onToggleResources: () => void;
  onToggleParticipants: () => void;
  participants: User[];
  lessons: Lesson[];
  onAddLessonImage: (lesson: Lesson) => void;
  isOwner: boolean;
  onEndSession: () => void;
  currentUser: User | null;
  onToggleHandRaise: () => void;
  isVoiceConnected: boolean;
  isMuted: boolean;
  onJoinVoice: () => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;
}

export default function StudyRoomControls({
  room,
  onToggleChat,
  onToggleResources,
  onToggleParticipants,
  participants,
  lessons,
  onAddLessonImage,
  isOwner,
  onEndSession,
  currentUser,
  onToggleHandRaise,
  isVoiceConnected,
  isMuted,
  onJoinVoice,
  onLeaveVoice,
  onToggleMute,
}: StudyRoomControlsProps) {
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
    <div className="control-bar">
      <div className="flex items-center gap-3">
         <h1 className="font-semibold text-base">{room?.name || 'Study Room'}</h1>
         {room && <CountdownTimer expiryTimestamp={room.expiresAt.toMillis()} status={room.status} />}
      </div>
      
      <div className="flex items-center gap-2">
        {!isVoiceConnected ? (
          <Button variant="outline" className="bg-green-500 hover:bg-green-600 text-white" onClick={onJoinVoice}>
            <Phone className="h-4 w-4 mr-2" /> Join Voice
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onToggleMute} className={cn(isMuted && "text-destructive")}>
              {isMuted ? <MicOff /> : <Mic />}
            </Button>
            <Button variant="destructive" onClick={onLeaveVoice}>
              <Phone className="h-4 w-4 mr-2" /> Leave
            </Button>
          </>
        )}
        <Separator orientation="vertical" className="h-6" />
        <Dialog open={isLessonLoaderOpen} onOpenChange={setIsLessonLoaderOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" disabled={room?.status === 'ended'}>
              <BookOpen />
              <span className="sr-only">Load Lesson</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Load Lesson Content</DialogTitle>
              <DialogDescription>Select a lesson to add its main image to the whiteboard for annotation.</DialogDescription>
            </DialogHeader>
            <LessonLoader lessons={lessons} onSelectLesson={onAddLessonImage} closeDialog={() => setIsLessonLoaderOpen(false)} />
          </DialogContent>
        </Dialog>
        <Button variant={isHandRaised ? "secondary" : "ghost"} size="icon" onClick={onToggleHandRaise} disabled={room?.status === 'ended'}>
            <Hand />
            <span className="sr-only">{isHandRaised ? "Lower Hand" : "Raise Hand"}</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={handleShare}>
          <Share2 />
           <span className="sr-only">Share</span>
        </Button>
      </div>

      <div className="flex items-center gap-2">
         <Button variant="ghost" size="icon" onClick={onToggleParticipants}>
            <Users />
            <span className="sr-only">Participants</span>
        </Button>

         <Button variant="ghost" size="icon" onClick={onToggleResources}>
          <Link2 />
           <span className="sr-only">Resources</span>
        </Button>
         <Button variant="ghost" size="icon" onClick={onToggleChat}>
          <MessageSquare />
           <span className="sr-only">Chat</span>
        </Button>
        <Separator orientation="vertical" className="h-6" />
        {isOwner && room?.status === 'active' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Power />
                   <span className="sr-only">End Session</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>End Session for Everyone?</AlertDialogTitle>
                  <AlertDialogDescription>This will make the whiteboard read-only. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onEndSession}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        )}
      </div>
    </div>
  );
}
