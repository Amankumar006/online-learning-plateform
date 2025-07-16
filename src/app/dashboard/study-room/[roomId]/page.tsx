
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

export default function StudyRoomPage() {
    const params = useParams();
    const roomId = params.roomId as string;
    const [user, setUser] = useState<User | null>(null);
    const { store, isOwner, error } = useStudyRoom(roomId, user?.uid);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    if (error) {
        return (
            <div className="flex items-center justify-center h-full text-destructive">
                Error: {error}
            </div>
        );
    }
    
    if (!store || !user) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Loading Study Room...</p>
            </div>
        );
    }

    return (
        <div className="w-full h-[calc(100vh-4rem)]">
            <Tldraw
                store={store}
                autoFocus
                // For the MVP, we will make the canvas read-only for non-owners.
                // In the future, this can be expanded with more granular permissions.
                isReadonly={!isOwner}
            />
        </div>
    );
}
