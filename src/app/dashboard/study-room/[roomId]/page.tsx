
"use client";

import '@tldraw/tldraw/tldraw.css';
import dynamic from 'next/dynamic';
import { useStudyRoom } from "@/hooks/use-study-room";
import { useParams } from "next/navigation";
import { Loader2, AlertTriangle, ArrowLeft, Timer } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useEffect, useState, useMemo, useRef } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { ChatPanel } from "@/components/study-room/ChatPanel";
import { ResourcePanel } from "@/components/study-room/ResourcePanel";
import { ParticipantPanel } from "@/components/study-room/ParticipantList";
import { User as AppUser, Lesson } from "@/lib/data";
import { getUser, getLessons, addStudyRoomResource, deleteStudyRoomResource } from "@/lib/data";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import StudyRoomControls from '@/components/study-room/StudyRoomControls';
import CanvasToolbar from '@/components/study-room/CanvasToolbar';

// Dynamically import Tldraw with SSR disabled
const Tldraw = dynamic(() => import('@tldraw/tldraw').then(mod => mod.Tldraw), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full w-full">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  ),
});


export default function StudyRoomPage() {
    const params = useParams();
    const roomId = params.roomId as string;
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isResourcesOpen, setIsResourcesOpen] = useState(false);
    const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const audioContainerRef = useRef<HTMLDivElement>(null);
    
    const activeSidePanel = useMemo(() => {
        if (isChatOpen) return 'chat';
        if (isResourcesOpen) return 'resources';
        if (isParticipantsOpen) return 'participants';
        return null;
    }, [isChatOpen, isResourcesOpen, isParticipantsOpen]);

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
        editor,
        setEditor,
        error, 
        isLoading,
        isReadOnly,
        messages, 
        sendMessage, 
        participants, 
        addLessonImageToCanvas,
        room,
        endSession,
        toggleHandRaise,
        resources,
        toggleParticipantEditorRole,
        isVoiceConnected,
        isMuted,
        onJoinVoice,
        onLeaveVoice,
        onToggleMute,
        remoteStreams,
    } = useStudyRoom(roomId, user);
    
    // Effect to manage remote audio streams
    useEffect(() => {
        if (!audioContainerRef.current) return;
        
        const audioContainer = audioContainerRef.current;
        const existingAudioElements = new Set(Array.from(audioContainer.children).map(child => child.id));
        
        // Add new audio elements
        remoteStreams.forEach((stream, userId) => {
            if (!existingAudioElements.has(userId)) {
                const audioEl = document.createElement('audio');
                audioEl.id = userId;
                audioEl.srcObject = stream;
                audioEl.autoplay = true;
                // audioEl.controls = true; // For debugging
                audioContainer.appendChild(audioEl);
            }
        });
        
        // Remove old audio elements
        existingAudioElements.forEach(id => {
            if (!remoteStreams.has(id)) {
                const audioEl = document.getElementById(id);
                if (audioEl) {
                    audioContainer.removeChild(audioEl);
                }
            }
        });

    }, [remoteStreams]);


    const handleToggleChat = () => {
        setIsChatOpen(prev => !prev);
        if (!isChatOpen) {
             setIsResourcesOpen(false);
             setIsParticipantsOpen(false);
        }
    };

    const handleToggleResources = () => {
        setIsResourcesOpen(prev => !prev);
        if (!isResourcesOpen) {
             setIsChatOpen(false);
             setIsParticipantsOpen(false);
        }
    };
    
    const handleToggleParticipants = () => {
        setIsParticipantsOpen(prev => !prev);
        if (!isParticipantsOpen) {
            setIsChatOpen(false);
            setIsResourcesOpen(false);
        }
    };

    if (error) {
        const isSessionEndedError = error.includes("ended");

        return (
            <div className="flex flex-col items-center justify-center h-screen text-center p-4">
                {isSessionEndedError ? (
                     <Timer className="h-12 w-12 text-muted-foreground mb-4" />
                ) : (
                    <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                )}
                
                <h2 className={`text-2xl font-bold mb-2 ${isSessionEndedError ? '' : 'text-destructive'}`}>
                    {isSessionEndedError ? "Session Ended" : "Error Loading Room"}
                </h2>
                
                <p className="text-muted-foreground mb-4 max-w-md">{error}</p>
                <Button asChild>
                    <Link href="/dashboard/study-room">Back to Study Rooms</Link>
                </Button>
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

    return (
        <div className="h-screen w-screen flex flex-col bg-background relative">
             {/* Container for remote audio streams */}
             <div ref={audioContainerRef} />

             <Button variant="outline" size="sm" asChild className="absolute top-4 left-4 z-50">
                <Link href="/dashboard/study-room">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Rooms
                </Link>
             </Button>
             
             <div className="flex-grow flex relative overflow-hidden">
                <div className="flex-1 relative">
                    <Tldraw store={store} autoFocus onMount={setEditor} isReadOnly={isReadOnly} hideUi={true} />
                     <CanvasToolbar editor={editor} />
                     <StudyRoomControls
                        room={room}
                        onToggleChat={handleToggleChat}
                        onToggleResources={handleToggleResources}
                        onToggleParticipants={handleToggleParticipants}
                        participants={participants}
                        lessons={lessons}
                        onAddLessonImage={addLessonImageToCanvas}
                        isOwner={room?.ownerId === appUser.uid}
                        onEndSession={endSession}
                        currentUser={appUser}
                        onToggleHandRaise={toggleHandRaise}
                        isVoiceConnected={isVoiceConnected}
                        isMuted={isMuted}
                        onJoinVoice={onJoinVoice}
                        onLeaveVoice={onLeaveVoice}
                        onToggleMute={onToggleMute}
                     />
                </div>
                 {activeSidePanel && (
                    <div className="w-[22rem] bg-background shadow-lg border-l shrink-0 flex flex-col animate-in slide-in-from-right-1/4 duration-300">
                        {activeSidePanel === 'chat' && <ChatPanel messages={messages} currentUser={appUser} onSendMessage={handleSendMessage}/>}
                        {activeSidePanel === 'resources' && <ResourcePanel resources={resources} onAddResource={handleAddResource} onDeleteResource={handleDeleteResource} currentUser={appUser} roomOwnerId={room?.ownerId} />}
                        {activeSidePanel === 'participants' && <ParticipantPanel participants={participants} room={room} currentUserId={appUser.uid} onToggleEditorRole={toggleParticipantEditorRole} />}
                    </div>
                )}
             </div>
        </div>
    );
}
