
"use client";

import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { useStudyRoom } from "@/hooks/use-study-room";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import StudyRoomHeader from "@/components/study-room/StudyRoomHeader";

export default function StudyRoomPage() {
    const params = useParams();
    const roomId = params.roomId as string;
    const [user, setUser] = useState<User | null>(null);
    const { store, isOwner, error, isLoading } = useStudyRoom(roomId, user?.uid);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <StudyRoomHeader roomId={roomId} isOwner={false} />
                <div className="flex-grow flex items-center justify-center text-destructive">
                    Error: {error}
                </div>
            </div>
        );
    }
    
    if (isLoading || !store || !user) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2 mt-4 text-muted-foreground">Loading Study Room...</p>
            </div>
        );
    }

    return (
        <div className="w-full h-screen flex flex-col">
            <StudyRoomHeader roomId={roomId} isOwner={isOwner} />
            <div className="flex-grow">
                 <Tldraw
                    store={store}
                    autoFocus
                    isReadonly={!isOwner}
                />
            </div>
        </div>
    );
}
