
"use client";

import { useEffect, useState, useMemo } from 'react';
import { Editor, createTLStore, defaultShapeUtils } from 'tldraw';
import { getStudyRoom, updateStudyRoomState, getStudyRoomStateListener, StudyRoom } from '@/lib/data';
import { throttle } from 'lodash';

// The interval (in milliseconds) at which to save the room state to Firestore.
const SAVE_STATE_INTERVAL = 500;

export function useStudyRoom(roomId: string, userId?: string) {
    const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));
    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState<StudyRoom | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const isOwner = useMemo(() => room?.ownerId === userId, [room, userId]);

    // Throttle the function that saves the state to Firestore to avoid excessive writes.
    const saveStateToFirestore = useMemo(() =>
        throttle((snapshot: string) => {
            updateStudyRoomState(roomId, snapshot);
        }, SAVE_STATE_INTERVAL, { trailing: true }),
        [roomId]
    );

    useEffect(() => {
        if (!userId) return;

        let unsubscribe: (() => void) | undefined;
        let stillMounted = true;
        
        const setup = async () => {
            try {
                // 1. Fetch initial room data to check ownership
                const initialRoom = await getStudyRoom(roomId);
                if (!stillMounted) return;

                if (initialRoom) {
                    setRoom(initialRoom);
                } else {
                    setError("Study room not found.");
                    setLoading(false);
                    return;
                }

                // 2. Set up a real-time listener for the room state
                unsubscribe = getStudyRoomStateListener(roomId, (newState) => {
                    if (newState) {
                        try {
                            // On update, load the new state into the store.
                            // We use JSON.parse because we store the state as a stringified object.
                            store.loadSnapshot(JSON.parse(newState));
                        } catch (e) {
                            console.error("Failed to parse or load room state:", e);
                        }
                    }
                });
                
                // 3. If the current user is the owner, set up a listener to save their changes.
                if (initialRoom.ownerId === userId) {
                    const saveUnsubscribe = store.listen(
                        (event) => {
                            if (event.source !== 'user') return;
                            // When the user makes a change, save the new state.
                            const snapshot = JSON.stringify(store.getSnapshot());
                            saveStateToFirestore(snapshot);
                        },
                        { source: 'user', scope: 'document' }
                    );
                     // Add the save listener's unsubscribe to the main unsubscribe function.
                    const originalUnsubscribe = unsubscribe;
                    unsubscribe = () => {
                        originalUnsubscribe?.();
                        saveUnsubscribe();
                    };
                }
                
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
            unsubscribe?.();
        };
    }, [roomId, userId, store, saveStateToFirestore]);

    return { store, error, isLoading: loading, isOwner };
}
