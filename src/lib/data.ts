
// src/lib/data.ts
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, query, where, setDoc, addDoc, deleteDoc, updateDoc, arrayUnion, increment, runTransaction } from 'firebase/firestore';

export interface Lesson {
  id: string;
  title: string;
  subject: string;
  description: string;
  image: string;
  videoUrl?: string;
  content: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tags?: string[];
}

export interface UserProgress {
  completedLessons: number;
  averageScore: number;
  mastery: number;
  subjectsMastery: { subject: string; mastery: number }[];
  completedLessonIds: string[];
  totalExercisesAttempted?: number;
  totalExercisesCorrect?: number;
}

export interface User {
  uid: string;
  email: string | null;
  name?: string;
  role: 'student' | 'admin';
  progress: UserProgress;
}

export interface Exercise {
    id: string;
    lessonId: string;
    difficulty: number;
    question: string;
    options: string[];
    correctAnswer: string;
    hint?: string;
    explanation?: string;
}

export interface ExerciseWithLessonTitle extends Exercise {
    lessonTitle: string;
}

export async function getUser(userId: string): Promise<User | null> {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            return { uid: userSnap.id, ...userSnap.data() } as User;
        } else {
            console.warn(`No user found with id: ${userId}`);
            return null;
        }
    } catch (error) {
        console.error("Error fetching user: ", error);
        return null;
    }
}

export async function getUsers(): Promise<User[]> {
    try {
        const usersCol = collection(db, 'users');
        const userSnapshot = await getDocs(usersCol);
        const userList = userSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
        return userList;
    } catch (error) {
        console.error("Error fetching users: ", error);
        return [];
    }
}

export async function updateUserRole(userId: string, role: 'student' | 'admin'): Promise<void> {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { role });
    } catch (error) {
        console.error("Error updating user role: ", error);
        throw new Error("Failed to update user role");
    }
}


export async function createUserInFirestore(uid: string, email: string, name: string) {
    try {
        await setDoc(doc(db, "users", uid), {
            uid,
            email,
            name,
            role: 'student', // Default role for new signups
            progress: {
                completedLessons: 0,
                averageScore: 0,
                mastery: 0,
                subjectsMastery: [],
                completedLessonIds: [],
                totalExercisesAttempted: 0,
                totalExercisesCorrect: 0,
            }
        });
    } catch (error) {
        console.error("Error creating user in Firestore: ", error);
        throw error;
    }
}

export async function createLesson(lessonData: Omit<Lesson, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "lessons"), lessonData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating lesson: ", error);
    throw new Error("Failed to create lesson");
  }
}

export async function deleteLesson(lessonId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'lessons', lessonId));
    } catch (error) {
        console.error("Error deleting lesson: ", error);
        throw new Error("Failed to delete lesson");
    }
}

export async function getLessons(): Promise<Lesson[]> {
  try {
    const lessonsCol = collection(db, 'lessons');
    const lessonSnapshot = await getDocs(lessonsCol);
    const lessonList = lessonSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
    return lessonList;
  } catch (error) {
    console.error("Error fetching lessons: ", error);
    return [];
  }
}

export async function getLesson(id: string): Promise<Lesson | null> {
    try {
        const lessonRef = doc(db, 'lessons', id);
        const lessonSnap = await getDoc(lessonRef);
        if (lessonSnap.exists()) {
            return { id: lessonSnap.id, ...lessonSnap.data() } as Lesson;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching lesson: ", error);
        return null;
    }
}

export async function getUserProgress(userId: string): Promise<UserProgress> {
    const user = await getUser(userId);
    if (user && user.progress) {
        return user.progress;
    }

    // Return a default structure if user not found or on error
    return {
        completedLessons: 0,
        averageScore: 0,
        mastery: 0,
        subjectsMastery: [],
        completedLessonIds: [],
    };
}

export async function getExercises(lessonId: string): Promise<Exercise[]> {
    try {
        const q = query(collection(db, "exercises"), where("lessonId", "==", lessonId));
        const querySnapshot = await getDocs(q);
        const exercisesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise));
        return exercisesList;
    } catch (error) {
      console.error("Error fetching exercises: ", error);
      return [];
    }
}

export async function getAllExercises(): Promise<ExerciseWithLessonTitle[]> {
    try {
        const [exercisesSnapshot, lessonsSnapshot] = await Promise.all([
            getDocs(collection(db, 'exercises')),
            getDocs(collection(db, 'lessons'))
        ]);

        const lessonsMap = new Map<string, string>();
        lessonsSnapshot.docs.forEach(doc => {
            lessonsMap.set(doc.id, doc.data().title);
        });

        const exerciseList = exercisesSnapshot.docs.map(doc => {
            const data = doc.data() as Omit<Exercise, 'id'>;
            return {
                id: doc.id,
                ...data,
                lessonTitle: lessonsMap.get(data.lessonId) || 'Unknown Lesson'
            } as ExerciseWithLessonTitle;
        });

        return exerciseList;
    } catch (error) {
        console.error("Error fetching all exercises with lesson titles: ", error);
        return [];
    }
}


export async function createExercise(exerciseData: Omit<Exercise, 'id'>): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, "exercises"), exerciseData);
        return docRef.id;
    } catch (error) {
        console.error("Error creating exercise: ", error);
        throw new Error("Failed to create exercise");
    }
}


export async function completeLesson(userId: string, lessonId: string): Promise<void> {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            throw new Error("User not found");
        }
        
        const userData = userSnap.data() as User;
        if (userData.progress?.completedLessonIds?.includes(lessonId)) {
            console.log("Lesson already completed.");
            return;
        }

        await updateDoc(userRef, {
            'progress.completedLessons': increment(1),
            'progress.completedLessonIds': arrayUnion(lessonId)
        });

    } catch (error) {
        console.error("Error completing lesson: ", error);
        throw new Error("Failed to update lesson progress.");
    }
}

export async function saveExerciseResult(userId: string, isCorrect: boolean) {
    const userRef = doc(db, 'users', userId);
    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw "User document does not exist!";
            }
            const progress = userDoc.data().progress as UserProgress;
            
            const totalAttempted = (progress.totalExercisesAttempted || 0) + 1;
            const totalCorrect = (progress.totalExercisesCorrect || 0) + (isCorrect ? 1 : 0);
            const newAverageScore = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

            transaction.update(userRef, { 
                'progress.totalExercisesAttempted': totalAttempted,
                'progress.totalExercisesCorrect': totalCorrect,
                'progress.averageScore': newAverageScore
            });
        });
    } catch (e) {
        console.error("Transaction failed: ", e);
        throw new Error("Failed to save exercise result.");
    }
}
