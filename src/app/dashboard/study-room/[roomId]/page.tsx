
"use client";

import { Tldraw } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { useStudyRoom } from "@/hooks/use-study-room";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { User as FirebaseUser } from "firebase/auth";
import StudyRoomHeader from "@/components/study-room/StudyRoomHeader";
import { ChatPanel } from "@/components/study-room/ChatPanel";
import { User as AppUser, Lesson } from "@/lib/data";
import { getUser, getLessons } from "@/lib/data";

export default function StudyRoomPage() {
    const params = useParams();
    const roomId = params.roomId as string;
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [lessons, setLessons] = useState<Lesson[]>([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const [profile, allLessons] = await Promise.all([
                    getUser(currentUser.uid),
                    getLessons()
                ]);
                setAppUser(profile);
                setLessons(allLessons);
            }
        });
        return () => unsubscribe();
    }, []);
    
    const { store, error, isLoading, messages, sendMessage, participants, addLessonImageToCanvas } = useStudyRoom(roomId, appUser);


    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <StudyRoomHeader
                  roomId={roomId}
                  onToggleChat={() => {}}
                  participants={[]}
                  lessons={[]}
                  onAddLessonImage={() => {}}
                />
                <div className="flex-grow flex items-center justify-center text-destructive">
                    Error: {error}
                </div>
            </div>
        );
    }
    
    if (isLoading || !store || !user || !appUser) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2 mt-4 text-muted-foreground">Loading Study Room...</p>
            </div>
        );
    }
    
    const handleSendMessage = (content: string) => {
        if (!appUser) return;
        sendMessage(content, appUser.name || "Anonymous");
    }

    return (
        <div className="w-full h-screen flex flex-col">
            <StudyRoomHeader
              roomId={roomId}
              onToggleChat={() => setIsChatOpen(prev => !prev)}
              participants={participants}
              lessons={lessons}
              onAddLessonImage={addLessonImageToCanvas}
            />
            <div className="flex-grow flex relative">
                 <div className="flex-grow h-full">
                    <Tldraw
                        store={store}
                        autoFocus
                    />
                 </div>
                 {isChatOpen && (
                     <div className="absolute right-0 top-0 h-full w-full max-w-sm border-l bg-background shadow-lg z-10">
                        <ChatPanel 
                            messages={messages} 
                            currentUser={appUser} 
                            onSendMessage={handleSendMessage}
                        />
                     </div>
                 )}
            </div>
        </div>
    );
}
