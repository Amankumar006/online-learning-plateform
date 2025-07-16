
"use client";

import { useEffect, useState, useMemo } from 'react';
import { Editor, createTLStore, defaultShapeUtils } from 'tldraw';
import { getStudyRoom, updateStudyRoomState, getStudyRoomStateListener, StudyRoom, ChatMessage, sendStudyRoomMessage, getStudyRoomMessagesListener } from '@/lib/data';
import { throttle } from 'lodash';

const SAVE_STATE_INTERVAL = 500;

export function useStudyRoom(roomId: string, userId?: string) {
    const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));
    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState<StudyRoom | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    
    const saveStateToFirestore = useMemo(() =>
        throttle((snapshot: string) => {
            updateStudyRoomState(roomId, snapshot);
        }, SAVE_STATE_INTERVAL, { trailing: true }),
        [roomId]
    );

    useEffect(() => {
        if (!userId) return;

        let stateUnsubscribe: (() => void) | undefined;
        let messagesUnsubscribe: (() => void) | undefined;
        let saveUnsubscribe: (() => void) | undefined;

        let stillMounted = true;
        
        const setup = async () => {
            try {
                const initialRoom = await getStudyRoom(roomId);
                if (!stillMounted) return;

                if (initialRoom) {
                    setRoom(initialRoom);
                } else {
                    setError("Study room not found.");
                    setLoading(false);
                    return;
                }

                // Listener for whiteboard state
                stateUnsubscribe = getStudyRoomStateListener(roomId, (newState) => {
                    if (newState) {
                        try {
                            store.loadSnapshot(JSON.parse(newState));
                        } catch (e) {
                            console.error("Failed to parse or load room state:", e);
                        }
                    }
                });

                // Listener for chat messages
                messagesUnsubscribe = getStudyRoomMessagesListener(roomId, (newMessages) => {
                    if (stillMounted) {
                        setMessages(newMessages);
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

        return () => {
            stillMounted = false;
            stateUnsubscribe?.();
            messagesUnsubscribe?.();
            saveUnsubscribe?.();
        };
    }, [roomId, userId, store, saveStateToFirestore]);
    
    const handleSendMessage = (content: string, userName: string) => {
        if (!userId) return;
        sendStudyRoomMessage(roomId, userId, userName, content);
    }

    return { 
        store, 
        error, 
        isLoading: loading, 
        messages,
        sendMessage: handleSendMessage,
    };
}
