
"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Editor, createTLStore, defaultShapeUtils, getHashForString, TLShapeId, createShapeId, GeoShapeType, useValue } from 'tldraw';
import { updateStudyRoomState, getStudyRoomStateListener, StudyRoom, ChatMessage, sendStudyRoomMessage, getStudyRoomMessagesListener, getStudyRoomParticipantsListener, setParticipantStatus, User, removeParticipantStatus, Lesson, endStudyRoomSession, toggleHandRaise as toggleHandRaiseInDb, StudyRoomResource, getStudyRoomResourcesListener, addStudyRoomResource, deleteStudyRoomResource, toggleParticipantEditorRole, getStudyRoom } from '@/lib/data';
import throttle from 'lodash/throttle';
import { db } from '@/lib/firebase';
import { studyRoomBuddy } from '@/ai/flows/study-room-buddy';
import { useWebRTC } from './use-webrtc';

const SAVE_STATE_INTERVAL = 1000; // ms

export function useStudyRoom(roomId: string, user: User | null) {
    const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));
    const [editor, setEditor] = useState<Editor | null>(null);
    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState<StudyRoom | null>(null);
    const [isReadOnly, setIsReadOnly] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [participants, setParticipants] = useState<User[]>([]);
    const [resources, setResources] = useState<StudyRoomResource[]>([]);
    const lastProcessedMessageId = useRef<string | null>(null);
    
    const roomDataForWebRTC = useMemo(() => room ? {
        isPublic: room.isPublic,
        editorIds: room.editorIds,
    } : null, [room]);

    const { 
        isVoiceConnected,
        isMuted,
        joinVoiceChannel,
        leaveVoiceChannel,
        toggleMute,
        remoteStreams,
        speakingPeers,
    } = useWebRTC(roomId, user, roomDataForWebRTC);
    
    const participantsWithVoiceState = useMemo(() => {
        return participants.map(p => ({
            ...p,
            isSpeaking: speakingPeers.has(p.uid)
        }));
    }, [participants, speakingPeers]);
    
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
        let participantsUnsubscribe: (() => void) | undefined;
        let resourcesUnsubscribe: (() => void) | undefined;
        let stillMounted = true;
        
        const setup = async () => {
            try {
                // Fetch initial room data to decide if user can even attempt to join
                const initialRoomData = await getStudyRoom(roomId);
                if (!initialRoomData) {
                    if (stillMounted) setError("This study room does not exist.");
                    if (stillMounted) setLoading(false);
                    return;
                }
                const canAccess = initialRoomData.isPublic || initialRoomData.editorIds.includes(user.uid);
                if (!canAccess) {
                    if (stillMounted) setError("You do not have permission to access this room.");
                    if (stillMounted) setLoading(false);
                    return;
                }

                await setParticipantStatus(roomId, user);

                // Now setup listeners
                stateUnsubscribe = getStudyRoomStateListener(roomId, (roomData) => {
                    if (!stillMounted) return;
                    if (roomData) {
                        setRoom(roomData);
                        const editorIds = roomData.editorIds || [];
                        setIsReadOnly(!editorIds.includes(user.uid));

                        if (roomData.status === 'ended') {
                            setIsReadOnly(true);
                            leaveVoiceChannel();
                        }
                    } else {
                        setError("This study room does not exist or has been deleted.");
                    }
                    setLoading(false);
                });

                messagesUnsubscribe = getStudyRoomMessagesListener(roomId, (newMessages) => {
                    if (stillMounted) setMessages(newMessages);
                });
                
                participantsUnsubscribe = getStudyRoomParticipantsListener(roomId, (newParticipants) => {
                    if (stillMounted) setParticipants(newParticipants);
                });

                resourcesUnsubscribe = getStudyRoomResourcesListener(roomId, (newResources) => {
                    if(stillMounted) setResources(newResources);
                });
                
            } catch (e: any) {
                console.error("Error setting up study room:", e);
                if (stillMounted) {
                    setError(e.message || "An error occurred while joining the room.");
                    setLoading(false);
                }
            }
        };

        setup();

        const handleBeforeUnload = () => { 
            if(user?.uid) {
                leaveVoiceChannel(); 
                removeParticipantStatus(roomId, user.uid);
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            stillMounted = false;
            handleBeforeUnload(); 
            window.removeEventListener('beforeunload', handleBeforeUnload);
            stateUnsubscribe?.();
            messagesUnsubscribe?.();
            participantsUnsubscribe?.();
            resourcesUnsubscribe?.();
        };
    }, [roomId, user, store, leaveVoiceChannel]);

    useEffect(() => {
        const saveUnsubscribe = store.listen(
            (event) => {
                if (event.source !== 'user' || isReadOnly) return;
                const snapshot = JSON.stringify(store.getSnapshot());
                saveStateToFirestore(snapshot);
            },
            { source: 'user', scope: 'document' }
        );
        return () => saveUnsubscribe();
    }, [store, isReadOnly, saveStateToFirestore]);
    
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (
            lastMessage &&
            lastMessage.id !== lastProcessedMessageId.current &&
            lastMessage.userId !== 'buddy-ai' &&
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
                        userMessage: lastMessage.content, history, lessonContext: room?.lessonTitle || undefined
                    });
                    if (result.response) await sendStudyRoomMessage(roomId, 'buddy-ai', 'Buddy AI', result.response);
                } catch (error) {
                    console.error("Error calling Study Room Buddy AI:", error);
                    await sendStudyRoomMessage(roomId, 'buddy-ai', 'Buddy AI', "Sorry, I encountered an error.");
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
        const assetId = `asset:${getHashForString(lesson.image)}`;
        editor.createAssets([{
            id: assetId as any, type: 'image', typeName: 'asset',
            props: { name: lesson.title, src: lesson.image, w: 1280, h: 720, isAnimated: false, mimeType: 'image/png' },
        }]);
        editor.createShape({
            id: createShapeId(), type: 'image', x: 200, y: 200,
            props: { assetId: assetId as any, w: 640, h: 360, url: lesson.image },
        });
    }, [editor, isReadOnly]);

    const toggleHandRaise = useCallback(async () => {
        if (user && room?.status === 'active') await toggleHandRaiseInDb(roomId, user.uid);
    }, [roomId, user, room?.status]);
    
    return { 
        store, setEditor, editor, error, isLoading: loading, messages, sendMessage: handleSendMessage,
        participants: participantsWithVoiceState, addLessonImageToCanvas, room, isReadOnly, endSession,
        toggleHandRaise, resources, toggleParticipantEditorRole: handleToggleEditorRole,
        isVoiceConnected, isMuted, onJoinVoice: joinVoiceChannel, onLeaveVoice: leaveVoiceChannel, onToggleMute: toggleMute, remoteStreams,
    };
}
