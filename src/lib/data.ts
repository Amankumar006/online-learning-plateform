// src/lib/data.ts
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';

// NOTE: You will need to populate your Firestore database.
// 1. Create a 'lessons' collection with documents matching the Lesson interface.
// 2. Create a 'users' collection. Each document ID should be a user ID. The document
//    should contain fields matching the UserProgress interface.
// 3. Create an 'exercises' collection with documents matching the Exercise interface.

export interface Lesson {
  id: string;
  title: string;
  subject: string;
  description: string;
  image: string;
  videoUrl?: string;
  content: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface UserProgress {
  completedLessons: number;
  averageScore: number;
  mastery: number;
  subjectsMastery: { subject: string; mastery: number }[];
}

export interface Exercise {
    id: string;
    lessonId: string;
    difficulty: number;
    question: string;
    options: string[];
    correctAnswer: string;
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
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
    
        if (userSnap.exists()) {
            return userSnap.data() as UserProgress;
        }
    } catch (error) {
      console.error("Error fetching user progress: ", error);
    }

    // Return a default structure if user not found or on error
    return {
        completedLessons: 0,
        averageScore: 0,
        mastery: 0,
        subjectsMastery: [],
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
