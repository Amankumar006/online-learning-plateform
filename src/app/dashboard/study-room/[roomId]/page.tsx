
"use client";

import { Tldraw } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { useStudyRoom } from "@/hooks/use-study-room";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useEffect, useState, useMemo } from "react";
import { User as FirebaseUser } from "firebase/auth";
import StudyRoomHeader from "@/components/study-room/StudyRoomHeader";
import { ChatPanel } from "@/components/study-room/ChatPanel";
import { ResourcePanel } from "@/components/study-room/ResourcePanel";
import { User as AppUser, Lesson, StudyRoomResource } from "@/lib/data";
import { getUser, getLessons, addStudyRoomResource, deleteStudyRoomResource } from "@/lib/data";

export default function StudyRoomPage() {
    const params = useParams();
    const roomId = params.roomId as string;
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isResourcesOpen, setIsResourcesOpen] = useState(false);
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
    
    const { 
        store, 
        error, 
        isLoading, 
        messages, 
        sendMessage, 
        participants, 
        addLessonImageToCanvas,
        room,
        endSession,
        toggleHandRaise,
        resources
    } = useStudyRoom(roomId, appUser);

    const handleToggleChat = () => {
        setIsChatOpen(prev => !prev);
        if (!isChatOpen) setIsResourcesOpen(false); // Close resources if opening chat
    };

    const handleToggleResources = () => {
        setIsResourcesOpen(prev => !prev);
        if (!isResourcesOpen) setIsChatOpen(false); // Close chat if opening resources
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <p className="text-destructive">Error: {error}</p>
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

    const handleAddResource = async (url: string) => {
        if (!appUser) return;
        await addStudyRoomResource(roomId, appUser.uid, appUser.name || 'Anonymous', url);
    };

    const handleDeleteResource = async (resourceId: string) => {
        await deleteStudyRoomResource(roomId, resourceId);
    };
    
    const activeSidePanel = useMemo(() => {
        if (isChatOpen) return 'chat';
        if (isResourcesOpen) return 'resources';
        return null;
    }, [isChatOpen, isResourcesOpen]);

    return (
        <div className="h-screen w-screen flex flex-col">
             <StudyRoomHeader
                room={room}
                onToggleChat={handleToggleChat}
                onToggleResources={handleToggleResources}
                participants={participants}
                lessons={lessons}
                onAddLessonImage={addLessonImageToCanvas}
                isOwner={room?.ownerId === appUser.uid}
                onEndSession={endSession}
                currentUser={appUser}
                onToggleHandRaise={toggleHandRaise}
             />
             <div className="flex-grow flex">
                <div className="flex-grow h-full relative">
                    <div className="absolute inset-0">
                         <Tldraw store={store} autoFocus />
                    </div>
                </div>
                 {activeSidePanel && (
                    <div className="w-full max-w-sm bg-background shadow-lg border-l shrink-0">
                        {activeSidePanel === 'chat' && <ChatPanel messages={messages} currentUser={appUser} onSendMessage={handleSendMessage}/>}
                        {activeSidePanel === 'resources' && <ResourcePanel resources={resources} onAddResource={handleAddResource} onDeleteResource={handleDeleteResource} currentUser={appUser} roomOwnerId={room?.ownerId} />}
                    </div>
                )}
             </div>
        </div>
    );
}
