
// src/lib/data.ts
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, query, where, setDoc, addDoc, deleteDoc, updateDoc, arrayUnion, increment, runTransaction } from 'firebase/firestore';

// Old structure
export interface ContentBlock {
  type: 'paragraph' | 'video';
  value: string;
}

// New Structure
export interface TextBlock {
    type: 'text';
    content: string;
}
export interface CodeBlock {
    type: 'code';
    language: string;
    code: string;
}
export interface VideoBlock {
    type: 'video';
    url: string;
}
export type Block = TextBlock | CodeBlock | VideoBlock;

export interface Section {
    title: string;
    blocks: Block[];
}


export interface Lesson {
  id: string;
  title: string;
  subject: string;
  description: string;
  image: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tags?: string[];
  // New structure
  sections?: Section[];
  // Old structure for backward compatibility
  content?: ContentBlock[] | string;
  videoUrl?: string;
}

export interface UserProgress {
  completedLessons: number;
  averageScore: number;
  mastery: number;
  subjectsMastery: { subject: string; mastery: number }[];
  completedLessonIds: string[];
  totalExercisesAttempted?: number;
  totalExercisesCorrect?: number;
  timeSpent?: number; // in seconds
  weeklyActivity?: { week: string; skillsMastered: number; timeSpent: number }[];
  exerciseProgress?: {
      [lessonId: string]: {
          currentExerciseIndex: number;
      }
  };
}


export interface User {
  uid: string;
  email: string | null;
  name?: string;
  role: 'student' | 'admin';
  progress: UserProgress;
}

// New Exercise Data Structure
export interface BaseExercise {
    id: string;
    lessonId: string;
    difficulty: number;
    question: string;
    explanation?: string;
    hint?: string;
    category?: 'code' | 'math' | 'general';
    isCustom?: boolean;
    userId?: string;
    tags?: string[];
    createdAt?: number;
}

export interface McqExercise extends BaseExercise {
    type: 'mcq';
    options: string[];
    correctAnswer: string;
}

export interface TrueFalseExercise extends BaseExercise {
    type: 'true_false';
    correctAnswer: boolean;
}

export interface LongFormExercise extends BaseExercise {
    type: 'long_form';
    language?: string;
    evaluationCriteria: string;
}

export type Exercise = McqExercise | TrueFalseExercise | LongFormExercise;

export interface UserExerciseResponse {
  id: string; // doc id
  userId: string;
  lessonId: string;
  exerciseId: string;
  submittedAnswer: string | boolean;
  isCorrect: boolean;
  score: number;
  feedback?: string;
  submittedAt: number; // using timestamp for sorting
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

export async function updateUserProfile(userId: string, data: { name: string }): Promise<void> {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, data);
    } catch (error) {
        console.error("Error updating user profile: ", error);
        throw new Error("Failed to update user profile");
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
                timeSpent: 0,
                weeklyActivity: [],
                exerciseProgress: {},
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

export async function updateLesson(lessonId: string, lessonData: Partial<Omit<Lesson, 'id'>>): Promise<void> {
  try {
    const lessonRef = doc(db, 'lessons', lessonId);
    await updateDoc(lessonRef, lessonData);
  } catch (error) {
    console.error("Error updating lesson: ", error);
    throw new Error("Failed to update lesson");
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
        timeSpent: 0,
        exerciseProgress: {},
    };
}

export async function updateUserExerciseIndex(userId: string, lessonId: string, index: number) {
    const userRef = doc(db, 'users', userId);
    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw "User document does not exist!";
            }
            const progress = userDoc.data().progress || {};
            
            const newExerciseProgress = {
                ...(progress.exerciseProgress || {}),
                [lessonId]: {
                    currentExerciseIndex: index
                }
            };
            
            transaction.update(userRef, { 
                'progress.exerciseProgress': newExerciseProgress
            });
        });
    } catch (e) {
        console.error("Transaction failed: ", e);
        throw new Error("Failed to save exercise progress.");
    }
}

export async function getExercise(id: string): Promise<Exercise | null> {
    try {
        const exerciseRef = doc(db, 'exercises', id);
        const exerciseSnap = await getDoc(exerciseRef);
        if (exerciseSnap.exists()) {
            const data = exerciseSnap.data();
            // Handle boolean conversion for true/false from string stored in firestore
            if (data.type === 'true_false' && typeof data.correctAnswer === 'string') {
                data.correctAnswer = data.correctAnswer.toLowerCase() === 'true';
            }
            return { id: exerciseSnap.id, ...data } as Exercise;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching exercise: ", error);
        return null;
    }
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

export async function getCustomExercisesForUser(userId: string): Promise<Exercise[]> {
    const q = query(collection(db, "exercises"), where("userId", "==", userId), where("isCustom", "==", true));
    const querySnapshot = await getDocs(q);
    const exercisesList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        if (data.type === 'true_false' && typeof data.correctAnswer === 'string') {
            data.correctAnswer = data.correctAnswer.toLowerCase() === 'true';
        }
        return { id: doc.id, ...data } as Exercise;
    });
    return exercisesList;
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

export async function updateExercise(exerciseId: string, exerciseData: Partial<Omit<Exercise, 'id' | 'lessonId'>>): Promise<void> {
  try {
    const exerciseRef = doc(db, 'exercises', exerciseId);
    await updateDoc(exerciseRef, exerciseData);
  } catch (error) {
    console.error("Error updating exercise: ", error);
    throw new Error("Failed to update exercise");
  }
}

export async function deleteExercise(exerciseId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'exercises', exerciseId));
    } catch (error) {
        console.error("Error deleting exercise: ", error);
        throw new Error("Failed to delete exercise");
    }
}

export async function completeLesson(userId: string, lessonId: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    const lessonRef = doc(db, 'lessons', lessonId);

    try {
        // Fetch lesson details to get the subject
        const lessonSnap = await getDoc(lessonRef);
        if (!lessonSnap.exists()) {
            throw new Error("Lesson not found");
        }
        const lessonData = lessonSnap.data() as Omit<Lesson, 'id'>;
        const subject = lessonData.subject;

        // Fetch all lessons for that subject to calculate total
        const subjectQuery = query(collection(db, 'lessons'), where('subject', '==', subject));
        const subjectLessonsSnapshot = await getDocs(subjectQuery);
        const totalLessonsInSubject = subjectLessonsSnapshot.size;

        if (totalLessonsInSubject === 0) {
            // This case should ideally not be hit if a lesson exists, but it's a safe fallback.
            await updateDoc(userRef, {
                'progress.completedLessons': increment(1),
                'progress.completedLessonIds': arrayUnion(lessonId),
            });
            return;
        }

        await runTransaction(db, async (transaction) => {
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists()) {
                throw new Error("User not found");
            }
            const userData = userSnap.data() as User;
            const progress = userData.progress || {};

            // If already completed, do nothing.
            if (progress.completedLessonIds?.includes(lessonId)) {
                return;
            }

            // Get user's completed lessons in this subject
            const completedLessonIds = [...(progress.completedLessonIds || []), lessonId];
            const subjectLessonIds = subjectLessonsSnapshot.docs.map(doc => doc.id);

            let completedInSubjectCount = 0;
            completedLessonIds.forEach(id => {
                if (subjectLessonIds.includes(id)) {
                    completedInSubjectCount++;
                }
            });

            // Calculate new mastery percentage
            const newMastery = Math.round((completedInSubjectCount / totalLessonsInSubject) * 100);

            // Update or add the subject in the mastery array
            const subjectsMastery = progress.subjectsMastery || [];
            const subjectIndex = subjectsMastery.findIndex(sm => sm.subject === subject);

            if (subjectIndex > -1) {
                subjectsMastery[subjectIndex].mastery = newMastery;
            } else {
                subjectsMastery.push({ subject: subject, mastery: newMastery });
            }

            // Update user document
            transaction.update(userRef, {
                'progress.completedLessons': increment(1),
                'progress.completedLessonIds': completedLessonIds,
                'progress.subjectsMastery': subjectsMastery,
            });
        });
    } catch (error) {
        console.error("Error completing lesson: ", error);
        throw new Error("Failed to update lesson progress.");
    }
}


export async function saveExerciseAttempt(
    userId: string,
    lessonId: string,
    exerciseId: string,
    submittedAnswer: string | boolean,
    isCorrect: boolean,
    score: number,
    feedback?: string
) {
    const userRef = doc(db, 'users', userId);
    // Use a predictable ID to easily check for existence and avoid duplicates
    const responseRef = doc(db, 'exerciseResponses', `${userId}_${exerciseId}`);
    
    try {
        // Save the detailed response record
        await setDoc(responseRef, {
            userId,
            lessonId,
            exerciseId,
            submittedAnswer,
            isCorrect,
            score,
            feedback: feedback || "",
            submittedAt: Date.now()
        }, { merge: true }); // Use merge to allow for re-attempts if needed in future

        // Then, update aggregate stats in a transaction
        // NOTE: This logic increments stats on every attempt. For more complex logic 
        // (e.g., only counting first attempts), this would need to be enhanced.
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw "User document does not exist!";
            }
            const progress = userDoc.data().progress as UserProgress;
            
            const totalAttempted = (progress.totalExercisesAttempted || 0) + 1;
            const totalCorrect = (progress.totalExercisesCorrect || 0) + (isCorrect ? 1 : 0);
            
            const totalScore = (progress.averageScore || 0) * (totalAttempted - 1) + score;
            const newAverageScore = totalAttempted > 0 ? Math.round(totalScore / totalAttempted) : 0;

            const timePerExercise = 30; // approx 30 seconds per exercise
            const newTimeSpent = (progress.timeSpent || 0) + timePerExercise;

            transaction.update(userRef, { 
                'progress.totalExercisesAttempted': totalAttempted,
                'progress.totalExercisesCorrect': totalCorrect,
                'progress.averageScore': newAverageScore,
                'progress.timeSpent': newTimeSpent
            });
        });
    } catch (e) {
        console.error("Save exercise attempt failed: ", e);
        throw new Error("Failed to save exercise result.");
    }
}

export async function getUserResponsesForLesson(userId: string, lessonId: string): Promise<UserExerciseResponse[]> {
    try {
        const q = query(
            collection(db, "exerciseResponses"),
            where("userId", "==", userId),
            where("lessonId", "==", lessonId)
        );
        const querySnapshot = await getDocs(q);
        const responses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserExerciseResponse));
        return responses;
    } catch (error) {
        console.error("Error fetching user responses for lesson: ", error);
        return [];
    }
}

export async function getAllUserResponses(userId: string): Promise<Map<string, UserExerciseResponse>> {
    const q = query(collection(db, "exerciseResponses"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const responsesMap = new Map<string, UserExerciseResponse>();
    querySnapshot.docs.forEach(doc => {
        const data = doc.data() as Omit<UserExerciseResponse, 'id'>;
        responsesMap.set(data.exerciseId, { id: doc.id, ...data });
    });
    return responsesMap;
}
