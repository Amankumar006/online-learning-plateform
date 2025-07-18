// src/lib/utility-panel.ts
import { db } from './firebase';
import { collection, doc, addDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { Task, Note } from './types';

// Tasks
export function getTasksListener(userId: string, callback: (tasks: Task[]) => void): () => void {
    const q = query(collection(db, `users/${userId}/tasks`), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });
}

export async function addTask(userId: string, text: string): Promise<void> {
    await addDoc(collection(db, `users/${userId}/tasks`), {
        text,
        completed: false,
        createdAt: Timestamp.now(),
    });
}

export async function updateTask(userId: string, taskId: string, updates: Partial<Pick<Task, 'text' | 'completed'>>): Promise<void> {
    await updateDoc(doc(db, `users/${userId}/tasks`, taskId), updates);
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
    await deleteDoc(doc(db, `users/${userId}/tasks`, taskId));
}

// Notes
export function getNotesListener(userId: string, callback: (notes: Note[]) => void): () => void {
    const q = query(collection(db, `users/${userId}/notes`), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const fetchedNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
        fetchedNotes.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.createdAt.toMillis() - a.createdAt.toMillis();
        });
        callback(fetchedNotes);
    });
}

export async function addNote(userId: string, noteData: Omit<Note, 'id' | 'createdAt'>): Promise<void> {
    await addDoc(collection(db, `users/${userId}/notes`), {
        ...noteData,
        createdAt: Timestamp.now(),
    });
}

export async function updateNote(userId: string, noteId: string, updates: Partial<Omit<Note, 'id'>>): Promise<void> {
    await updateDoc(doc(db, `users/${userId}/notes`, noteId), updates);
}

export async function deleteNote(userId: string, noteId: string): Promise<void> {
    await deleteDoc(doc(db, `users/${userId}/notes`, noteId));
}
