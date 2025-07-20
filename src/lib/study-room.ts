
// src/lib/study-room.ts
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, setDoc, addDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy, Timestamp, where, arrayUnion, arrayRemove, runTransaction } from 'firebase/firestore';
import { StudyRoom, ChatMessage, StudyRoomResource, User } from './types';
import { getUser } from './user';

export async function createStudyRoomSession(data: Omit<StudyRoom, 'id' | 'createdAt' | 'status' | 'ownerName' | 'ownerPhotoURL' | 'isPublic' | 'editorIds'>): Promise<string> {
    const newRoomRef = doc(collection(db, 'studyRooms'));
    const owner = await getUser(data.ownerId);
    const payload: Omit<StudyRoom, 'id'> = {
        ...data,
        isPublic: data.visibility === 'public',
        ownerName: owner?.name || 'Anonymous',
        ownerPhotoURL: owner?.photoURL || null,
        createdAt: Timestamp.now(),
        status: 'active',
        editorIds: [data.ownerId],
    };
    await setDoc(newRoomRef, payload);
    return newRoomRef.id;
}

export async function getStudyRoomsForUser(userId: string): Promise<StudyRoom[]> {
    if (!userId) return [];
    try {
        const publicRoomsQuery = query(collection(db, 'studyRooms'), where('isPublic', '==', true));
        const privateRoomsQuery = query(collection(db, 'studyRooms'), where('editorIds', 'array-contains', userId));

        const [publicSnapshot, privateSnapshot] = await Promise.all([
            getDocs(publicRoomsQuery),
            getDocs(privateRoomsQuery)
        ]);
        
        const roomsMap = new Map<string, StudyRoom>();
        const processSnapshot = (snapshot: any) => {
            snapshot.docs.forEach((doc: any) => {
                if (doc.data().status === 'active') { // Only show active rooms on the dashboard
                   roomsMap.set(doc.id, { id: doc.id, ...doc.data() } as StudyRoom);
                }
            });
        };
        processSnapshot(publicSnapshot);
        processSnapshot(privateSnapshot);
        return Array.from(roomsMap.values()).sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    } catch (error) {
        console.error("Error fetching study rooms:", error);
        throw error;
    }
}

export async function endStudyRoomSession(roomId: string): Promise<void> {
    try {
        await updateDoc(doc(db, 'studyRooms', roomId), { status: 'ended' });
    } catch (error) {
        console.error("Error ending study room session:", error);
        throw new Error("Could not end the session.");
    }
}

export async function getStudyRoom(roomId: string): Promise<StudyRoom | null> {
    const roomRef = doc(db, 'studyRooms', roomId);
    const roomSnap = await getDoc(roomRef);
    return roomSnap.exists() ? { id: roomSnap.id, ...roomSnap.data() } as StudyRoom : null;
}


export async function updateStudyRoomState(roomId: string, roomState: string): Promise<void> {
    try {
        const roomDoc = await getDoc(doc(db, 'studyRooms', roomId));
        if (roomDoc.exists() && roomDoc.data().status === 'active') {
            await updateDoc(doc(db, 'studyRooms', roomId), { roomState });
        }
    } catch (error) {
        console.warn("Could not update room state (it may have ended):", error);
    }
}

export function getStudyRoomStateListener(roomId: string, callback: (roomData: StudyRoom | null) => void) {
    return onSnapshot(doc(db, 'studyRooms', roomId), (doc) => {
        callback(doc.exists() ? { id: doc.id, ...doc.data() } as StudyRoom : null);
    });
}

export async function sendStudyRoomMessage(roomId: string, userId: string, userName: string, content: string) {
    try {
        await addDoc(collection(db, 'studyRooms', roomId, 'messages'), {
            userId, userName, content, createdAt: Timestamp.now(),
        });
    } catch (error) {
        console.error("Error sending study room message:", error);
        throw new Error("Failed to send message.");
    }
}

export function getStudyRoomMessagesListener(roomId: string, callback: (messages: ChatMessage[]) => void): () => void {
    const q = query(collection(db, 'studyRooms', roomId, 'messages'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
    });
}

export function getStudyRoomParticipantsListener(roomId: string, callback: (participants: User[]) => void): () => void {
    return onSnapshot(collection(db, `studyRooms/${roomId}/participants`), (snapshot) => {
        callback(snapshot.docs.map(doc => doc.data() as User));
    });
}

export async function setParticipantStatus(roomId: string, user: User) {
    const participantRef = doc(db, `studyRooms/${roomId}/participants`, user.uid);
    try {
        await runTransaction(db, async (transaction) => {
            const roomRef = doc(db, 'studyRooms', roomId);
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists()) throw new Error("Room does not exist.");
            const roomData = roomDoc.data() as StudyRoom;
            if (roomData.status === 'ended') throw new Error("This study session has already ended.");
           
            transaction.set(participantRef, {
                uid: user.uid, name: user.name || "Anonymous", photoURL: user.photoURL || null, handRaised: false,
            }, { merge: true });
        });
    } catch (e: any) {
        console.error("setParticipantStatus failed:", e.message);
        throw e;
    }
}

export async function toggleHandRaise(roomId: string, userId: string) {
    const participantRef = doc(db, `studyRooms/${roomId}/participants`, userId);
    try {
        await runTransaction(db, async (t) => {
            const doc = await t.get(participantRef);
            if (doc.exists()) t.update(participantRef, { handRaised: !doc.data().handRaised });
        });
    } catch (error) {
        console.error("Error toggling hand raise:", error);
        throw new Error("Could not update your status.");
    }
}

export async function toggleParticipantEditorRole(roomId: string, ownerId: string, targetUserId: string, grant: boolean) {
    const roomRef = doc(db, 'studyRooms', roomId);
    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists() || roomDoc.data()?.ownerId !== ownerId) {
            throw new Error("You do not have permission to perform this action.");
        }
        if (grant) {
            transaction.update(roomRef, { editorIds: arrayUnion(targetUserId) });
        } else {
            transaction.update(roomRef, { editorIds: arrayRemove(targetUserId) });
        }
    });
}

export async function removeParticipantStatus(roomId: string, userId: string) {
    try {
        await deleteDoc(doc(db, `studyRooms/${roomId}/participants`, userId));
    } catch (error) {
        console.error("Error removing participant status:", error);
    }
}

export async function addStudyRoomResource(roomId: string, userId: string, userName: string, url: string): Promise<void> {
    try {
        await addDoc(collection(db, `studyRooms/${roomId}/resources`), {
            url, addedByUserId: userId, addedByUserName: userName, createdAt: Timestamp.now(),
        });
    } catch (error) {
        console.error("Error adding resource:", error);
        throw new Error("Could not add the resource link.");
    }
}

export async function deleteStudyRoomResource(roomId: string, resourceId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, `studyRooms/${roomId}/resources`, resourceId));
    } catch (error) {
        console.error("Error deleting resource:", error);
        throw new Error("Could not delete the resource link.");
    }
}

export function getStudyRoomResourcesListener(roomId: string, callback: (resources: StudyRoomResource[]) => void): () => void {
    const q = query(collection(db, `studyRooms/${roomId}/resources`), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyRoomResource)));
    });
}
