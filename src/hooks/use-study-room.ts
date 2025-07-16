
"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Editor, createTLStore, defaultShapeUtils, getHashForString, TLShapeId, createShapeId } from 'tldraw';
import { getStudyRoom, updateStudyRoomState, getStudyRoomStateListener, StudyRoom, ChatMessage, sendStudyRoomMessage, getStudyRoomMessagesListener, getStudyRoomParticipantsListener, setParticipantStatus, User, removeParticipantStatus, Lesson, endStudyRoomSession, toggleHandRaise as toggleHandRaiseInDb } from '@/lib/data';
import throttle from 'lodash/throttle';
import { addDoc, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Moved from data.ts to keep client-side logic isolated
export async function createStudyRoomSession(
    data: Omit<StudyRoom, 'id' | 'createdAt' | 'status'>
): Promise<string> {
    const newRoomRef = doc(collection(db, 'studyRooms'));
    const payload: Omit<StudyRoom, 'id'> = {
        ...data,
        createdAt: Timestamp.now(),
        status: 'active',
    };
    await setDoc(newRoomRef, payload);
    return newRoomRef.id;
}


export function useStudyRoom(roomId: string, user: User | null) {
    const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));
    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState<StudyRoom | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [participants, setParticipants] = useState<User[]>([]);
    
    const saveStateToFirestore = useMemo(() =>
        throttle((snapshot: string) => {
            if (room?.status !== 'ended') {
                updateStudyRoomState(roomId, snapshot);
            }
        }, SAVE_STATE_INTERVAL, { trailing: true }),
        [roomId, room?.status]
    );

    useEffect(() => {
        if (!user) return;

        let stateUnsubscribe: (() => void) | undefined;
        let messagesUnsubscribe: (() => void) | undefined;
        let saveUnsubscribe: (() => void) | undefined;
        let participantsUnsubscribe: (() => void) | undefined;

        let stillMounted = true;
        
        const setup = async () => {
            try {
                // Set initial presence
                await setParticipantStatus(roomId, user);

                const initialRoom = await getStudyRoom(roomId);
                if (!stillMounted) return;

                if (initialRoom) {
                    setRoom(initialRoom);
                    if (initialRoom.status === 'ended') {
                        store.setReadOnly(true, 'session_ended');
                    }
                     if (initialRoom.roomState) {
                        try {
                            store.loadSnapshot(JSON.parse(initialRoom.roomState));
                        } catch (e) {
                            console.error("Failed to parse or load room state:", e);
                        }
                    }
                } else {
                    setError("Study room not found.");
                    setLoading(false);
                    return;
                }

                // Listener for whiteboard state
                stateUnsubscribe = getStudyRoomStateListener(roomId, (roomData) => {
                    if (roomData) {
                        setRoom(roomData);
                         if (roomData.status === 'ended') {
                            store.setReadOnly(true, 'session_ended');
                        }
                        if (roomData.roomState) {
                            try {
                                store.loadSnapshot(JSON.parse(roomData.roomState));
                            } catch (e) {
                                console.error("Failed to parse or load room state:", e);
                            }
                        }
                    }
                });

                // Listener for chat messages
                messagesUnsubscribe = getStudyRoomMessagesListener(roomId, (newMessages) => {
                    if (stillMounted) {
                        setMessages(newMessages);
                    }
                });
                
                 // Listener for participants
                participantsUnsubscribe = getStudyRoomParticipantsListener(roomId, (newParticipants) => {
                    if (stillMounted) {
                        setParticipants(newParticipants);
                    }
                });
                
                // Listener to save local changes to Firestore (for everyone)
                saveUnsubscribe = store.listen(
                    (event) => {
                        if (event.source !== 'user') return;
                        const snapshot = JSON.stringify(store.getSnapshot());
                        saveStateToFirestore(snapshot);
                    },
                    { source: 'user', scope: 'document' }
                );
                
            } catch (e: any) {
                console.error("Error setting up study room:", e);
                if (stillMounted) {
                    setError(e.message || "An unexpected error occurred.");
                }
            } finally {
                if (stillMounted) {
                    setLoading(false);
                }
            }
        };

        setup();

        const handleBeforeUnload = () => {
            if(user?.uid) removeParticipantStatus(roomId, user.uid);
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            stillMounted = false;
            removeParticipantStatus(roomId, user.uid);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            stateUnsubscribe?.();
            messagesUnsubscribe?.();
            saveUnsubscribe?.();
            participantsUnsubscribe?.();
        };
    }, [roomId, user, store, saveStateToFirestore]);
    
    const handleSendMessage = (content: string, userName: string) => {
        if (!user || room?.status === 'ended') return;
        sendStudyRoomMessage(roomId, user.uid, userName, content);
    };

    const addLessonImageToCanvas = useCallback((lesson: Lesson) => {
        if (!store || room?.status === 'ended') return;

        // Create a deterministic asset ID from the image URL
        const assetId = getHashForString(lesson.image);

        // Add the asset to the store
        store.put([
            {
                id: assetId,
                type: 'asset',
                typeName: 'asset',
                props: {
                    name: lesson.title,
                    src: lesson.image,
                    w: 1280, // Example width, tldraw will adjust
                    h: 720,  // Example height
                    isAnimated: false,
                    mimeType: 'image/png', // Assume PNG, can be made more robust
                },
            },
        ]);

        // Create an image shape that uses the asset
        store.createShape({
            id: createShapeId(),
            type: 'image',
            x: 200,
            y: 200,
            props: {
                assetId: assetId,
                w: 640,
                h: 360,
                url: lesson.image,
            },
        });

    }, [store, room?.status]);

    const endSession = useCallback(async () => {
        if (room?.ownerId === user?.uid) {
            await endStudyRoomSession(roomId);
        }
    }, [roomId, user?.uid, room?.ownerId]);
    
    const toggleHandRaise = useCallback(async () => {
        if (user) {
            await toggleHandRaiseInDb(roomId, user.uid);
        }
    }, [roomId, user]);

    return { 
        store, 
        error, 
        isLoading: loading, 
        messages,
        sendMessage: handleSendMessage,
        participants,
        addLessonImageToCanvas,
        room,
        endSession,
        toggleHandRaise
    };
}
