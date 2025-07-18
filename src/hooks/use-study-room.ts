
"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Editor, createTLStore, defaultShapeUtils, getHashForString, TLShapeId, createShapeId } from 'tldraw';
import { getStudyRoom, updateStudyRoomState, getStudyRoomStateListener, StudyRoom, ChatMessage, sendStudyRoomMessage, getStudyRoomMessagesListener, getStudyRoomParticipantsListener, setParticipantStatus, User, removeParticipantStatus, Lesson, endStudyRoomSession, toggleHandRaise as toggleHandRaiseInDb, StudyRoomResource, getStudyRoomResourcesListener, addStudyRoomResource, deleteStudyRoomResource, toggleParticipantEditorRole } from '@/lib/data';
import throttle from 'lodash/throttle';
import { addDoc, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { studyRoomBuddy } from '@/ai/flows/study-room-buddy';

const SAVE_STATE_INTERVAL = 1000; // ms

export function useStudyRoom(roomId: string, user: User | null) {
    const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));
    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState<StudyRoom | null>(null);
    const [isReadOnly, setIsReadOnly] = useState(true); // Default to read-only until permissions are checked
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [participants, setParticipants] = useState<User[]>([]);
    const [resources, setResources] = useState<StudyRoomResource[]>([]);
    const lastProcessedMessageId = useRef<string | null>(null);

    const saveStateToFirestore = useMemo(() =>
        throttle((snapshot: string) => {
            if (room?.status !== 'ended') {
                updateStudyRoomState(roomId, snapshot);
            }
        }, SAVE_STATE_INTERVAL, { trailing: true }),
        [roomId, room?.status]
    );
    
    const endSession = useCallback(async () => {
        if (room?.ownerId === user?.uid) {
            await endStudyRoomSession(roomId);
        }
    }, [roomId, user?.uid, room?.ownerId]);
    
    const handleToggleEditorRole = useCallback(async (targetUserId: string, grant: boolean) => {
        if (room?.ownerId === user?.uid) {
            await toggleParticipantEditorRole(roomId, user.uid, targetUserId, grant);
        }
    }, [roomId, user?.uid, room?.ownerId]);

    useEffect(() => {
        if (!user) return;

        let stateUnsubscribe: (() => void) | undefined;
        let messagesUnsubscribe: (() => void) | undefined;
        let saveUnsubscribe: (() => void) | undefined;
        let participantsUnsubscribe: (() => void) | undefined;
        let resourcesUnsubscribe: (() => void) | undefined;
        let expiryTimeout: NodeJS.Timeout | undefined;

        let stillMounted = true;
        
        const setup = async () => {
            try {
                // Fetch the room first to check its status before joining.
                const initialRoom = await getStudyRoom(roomId);
                if (!stillMounted) return;

                if (!initialRoom) {
                    throw new Error("This study room does not exist.");
                }

                if (initialRoom.status === 'ended') {
                     // Set read-only but still allow joining to view content
                    setIsReadOnly(true);
                }

                // Now that we know the room exists, join it.
                await setParticipantStatus(roomId, user);

                setRoom(initialRoom);

                // Set initial read-only status based on editorIds
                setIsReadOnly(!initialRoom.editorIds.includes(user.uid));
                    
                const isExpired = initialRoom.expiresAt.toMillis() < Date.now();
                if (isExpired && initialRoom.status === 'active') {
                    if (initialRoom.ownerId === user.uid) {
                        await endStudyRoomSession(roomId);
                    }
                } else if (initialRoom.status === 'active') {
                    const timeUntilExpiry = initialRoom.expiresAt.toMillis() - Date.now();
                    expiryTimeout = setTimeout(() => {
                        if (initialRoom.ownerId === user.uid) {
                            endSession();
                        }
                    }, timeUntilExpiry);
                }

                if (initialRoom.roomState) {
                    try {
                        store.loadSnapshot(JSON.parse(initialRoom.roomState));
                    } catch (e) {
                        console.error("Failed to parse or load room state:", e);
                    }
                }

                // Listener for whiteboard state
                stateUnsubscribe = getStudyRoomStateListener(roomId, (roomData) => {
                    if (roomData) {
                        setRoom(roomData);
                        setIsReadOnly(!roomData.editorIds.includes(user.uid));
                        if (roomData.status === 'ended') {
                            setIsReadOnly(true);
                            if(expiryTimeout) clearTimeout(expiryTimeout);
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

                // Listener for resources
                resourcesUnsubscribe = getStudyRoomResourcesListener(roomId, (newResources) => {
                    if(stillMounted) {
                        setResources(newResources);
                    }
                });
                
                // Listener to save local changes to Firestore (for everyone)
                saveUnsubscribe = store.listen(
                    (event) => {
                        if (event.source !== 'user' || isReadOnly) return;
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
            if(expiryTimeout) clearTimeout(expiryTimeout);
            stateUnsubscribe?.();
            messagesUnsubscribe?.();
            saveUnsubscribe?.();
            participantsUnsubscribe?.();
            resourcesUnsubscribe?.();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, user, store, saveStateToFirestore]);

    // Effect to handle AI triggers
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (
            lastMessage &&
            lastMessage.id !== lastProcessedMessageId.current &&
            lastMessage.userId !== 'buddy-ai' && // Don't trigger on AI's own messages
            lastMessage.content.includes('@BuddyAI')
        ) {
            lastProcessedMessageId.current = lastMessage.id;

            const triggerAI = async () => {
                const history = messages.slice(-10, -1).map(msg => ({
                    role: msg.userId === 'buddy-ai' ? 'model' : 'user',
                    content: msg.content
                }));
                
                try {
                    const result = await studyRoomBuddy({
                        userMessage: lastMessage.content,
                        history,
                        lessonContext: room?.lessonTitle || undefined
                    });
                    
                    if (result.response) {
                        // Post response back to chat as Buddy AI
                        await sendStudyRoomMessage(roomId, 'buddy-ai', 'Buddy AI', result.response);
                    }
                } catch (error) {
                    console.error("Error calling Study Room Buddy AI:", error);
                    await sendStudyRoomMessage(roomId, 'buddy-ai', 'Buddy AI', "Sorry, I encountered an error and couldn't process that request.");
                }
            };
            
            triggerAI();
        }
    }, [messages, room?.lessonTitle, roomId]);

    
    const handleSendMessage = (content: string, userName: string) => {
        if (!user || room?.status === 'ended') return;
        sendStudyRoomMessage(roomId, user.uid, userName, content);
    };

    const addLessonImageToCanvas = useCallback((lesson: Lesson) => {
        if (!store || isReadOnly) return;

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

    }, [store, isReadOnly]);

    
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
        isReadOnly,
        endSession,
        toggleHandRaise,
        resources,
        toggleParticipantEditorRole: handleToggleEditorRole,
    };
}
