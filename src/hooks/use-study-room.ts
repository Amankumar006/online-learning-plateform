
"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Editor, createTLStore, defaultShapeUtils, getHashForString, TLShapeId, createShapeId, GeoShapeType, useValue } from 'tldraw';
import { getStudyRoomStateListener, StudyRoom, ChatMessage, sendStudyRoomMessage, getStudyRoomMessagesListener, getStudyRoomParticipantsListener, setParticipantStatus, User, removeParticipantStatus, Lesson, endStudyRoomSession, toggleHandRaise as toggleHandRaiseInDb, StudyRoomResource, getStudyRoomResourcesListener, addStudyRoomResource, deleteStudyRoomResource, toggleParticipantEditorRole, getStudyRoom } from '@/lib/data';
import throttle from 'lodash/throttle';
import { db } from '@/lib/firebase';
import { studyRoomBuddy } from '@/ai/flows/study-room-buddy';

const SAVE_STATE_INTERVAL = 1000; // ms

export function useStudyRoom(roomId: string, user: User | null) {
    const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));
    const [editor, setEditor] = useState<Editor | null>(null);
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
                // First, join the room by setting participant status. This will fail if the room doesn't exist or is ended.
                await setParticipantStatus(roomId, user);

                // Now that we have joined, set up the listeners.
                
                // Listener for whiteboard state and room metadata
                stateUnsubscribe = getStudyRoomStateListener(roomId, (roomData) => {
                    if (!stillMounted) return;

                    if (roomData) {
                        setRoom(roomData);
                        setIsReadOnly(!roomData.editorIds.includes(user.uid));

                        if (roomData.status === 'ended') {
                            setIsReadOnly(true);
                            if(expiryTimeout) clearTimeout(expiryTimeout);
                        } else {
                            const timeUntilExpiry = roomData.expiresAt.toMillis() - Date.now();
                            if (timeUntilExpiry > 0) {
                                expiryTimeout = setTimeout(() => {
                                    if (roomData.ownerId === user.uid) endSession();
                                }, timeUntilExpiry);
                            }
                        }

                        if (roomData.roomState) {
                            try {
                                const snapshot = JSON.parse(roomData.roomState);
                                if(snapshot) store.loadSnapshot(snapshot);
                            } catch (e) { console.error("Failed to parse or load room state:", e); }
                        }
                    } else {
                        // Room was deleted or no longer exists
                        setError("This study room does not exist or has been deleted.");
                    }
                    setLoading(false);
                });

                // Listener for chat messages
                messagesUnsubscribe = getStudyRoomMessagesListener(roomId, (newMessages) => {
                    if (stillMounted) setMessages(newMessages);
                });
                
                // Listener for participants
                participantsUnsubscribe = getStudyRoomParticipantsListener(roomId, (newParticipants) => {
                    if (stillMounted) setParticipants(newParticipants);
                });

                // Listener for resources
                resourcesUnsubscribe = getStudyRoomResourcesListener(roomId, (newResources) => {
                    if(stillMounted) setResources(newResources);
                });
                
                // Listener to save local changes to Firestore
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
                    if (e.message === "This study session has already ended.") {
                        setError(e.message);
                    } else {
                        setError(e.message || "Missing or insufficient permissions.");
                    }
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
        if (!editor || isReadOnly) return;

        // Create a deterministic asset ID from the image URL
        const assetId = getHashForString(lesson.image);

        // Add the asset to the store
        editor.createAssets([
            {
                id: assetId,
                type: 'image',
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
        editor.createShape({
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

    }, [editor, isReadOnly]);

    
    const toggleHandRaise = useCallback(async () => {
        if (user && room?.status === 'active') {
            await toggleHandRaiseInDb(roomId, user.uid);
        }
    }, [roomId, user, room?.status]);

    return { 
        store, 
        setEditor,
        editor,
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
