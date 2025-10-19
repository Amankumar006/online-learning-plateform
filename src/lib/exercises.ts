// src/lib/exercises.ts
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, setDoc, deleteDoc, updateDoc, increment, runTransaction, query, where, orderBy, limit, arrayUnion } from 'firebase/firestore';
import { Exercise, ExerciseWithLessonTitle, FillInTheBlanksExercise, BaseExercise, UserExerciseResponse, UserProgress, GradeLongFormAnswerOutput, Achievement } from './types';
import { triggerSuggestionIfStruggling } from './user';
import { createSystemAnnouncement } from './announcements';
import { format, startOfWeek } from 'date-fns';

export async function getExercise(id: string): Promise<Exercise | null> {
    try {
        const exerciseRef = doc(db, 'exercises', id);
        const exerciseSnap = await getDoc(exerciseRef);
        if (exerciseSnap.exists()) {
            const data = exerciseSnap.data();   
            if (data.type === 'true_false' && typeof data.correctAnswer === 'string') {
                data.correctAnswer = data.correctAnswer.toLowerCase() === 'true';
            }
            return { id: exerciseSnap.id, ...data } as Exercise;
        } else {
            return null;
        }
    } catch (error) {   
        console.error("Error fetching exercise: ", error);
        throw new Error(`Failed to fetch exercise ${id}.`);
    }
}

export async function getExercises(lessonId: string): Promise<Exercise[]> {
    const q = query(collection(db, "exercises"), where("lessonId", "==", lessonId), where("isCustom", "==", false));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise));
}

export async function getCustomExercisesForUser(userId: string): Promise<Exercise[]> {
    if (!userId) return [];
    const q = query(collection(db, "exercises"), where("isCustom", "==", true), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const exercises = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise));
    return exercises.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getAllExercises(): Promise<ExerciseWithLessonTitle[]> {
    try {
        const [exercisesSnapshot, lessonsSnapshot] = await Promise.all([
            getDocs(collection(db, 'exercises')),
            getDocs(collection(db, 'lessons'))
        ]);
        const lessonsMap = new Map(lessonsSnapshot.docs.map(doc => [doc.id, doc.data().title]));
        return exercisesSnapshot.docs.map(doc => {
            const data = doc.data() as Omit<Exercise, 'id'>;
            const questionText = data.type === 'fill_in_the_blanks' 
                ? (data as FillInTheBlanksExercise).questionParts.join('___') 
                : (data as BaseExercise).question;

            return {
                id: doc.id, ...data, question: questionText,
                lessonTitle: lessonsMap.get(data.lessonId) || (data.isCustom ? 'Custom Practice' : 'Unknown Lesson'),
            } as ExerciseWithLessonTitle;
        });
    } catch (error) {
        console.error("Error fetching all exercises with lesson titles: ", error);
        throw new Error("Failed to fetch all exercises.");
    }
}

export async function createExercise(exerciseData: Omit<Exercise, 'id'>): Promise<string> {
    try {
        console.log("Creating exercise with data:", exerciseData);
        const docRef = await addDoc(collection(db, "exercises"), exerciseData);
        console.log("Exercise created successfully with ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error creating exercise: ", error);
        console.error("Exercise data that failed:", exerciseData);
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

export async function saveExerciseAttempt(
    userId: string, lessonTitle: string, exercise: Exercise, submittedAnswer: string | boolean | string[],
    isCorrect: boolean, score: number, feedback?: GradeLongFormAnswerOutput | null, imageDataUri?: string | null
) {
    const responseRef = doc(db, 'exerciseResponses', `${userId}_${exercise.id}`);
    let responseSnap: any = null;
    let isFirstAttempt = true;
    
    try {
        // Check if this response already exists
        responseSnap = await getDoc(responseRef);
        isFirstAttempt = !responseSnap.exists();
        
        const feedbackString = typeof feedback === 'object' && feedback !== null ? feedback.feedback : undefined;

        const dataToSave: Partial<UserExerciseResponse> = {
            userId, 
            lessonId: exercise.lessonId, 
            exerciseId: exercise.id,
            question: exercise.type === 'fill_in_the_blanks' ? (exercise as FillInTheBlanksExercise).questionParts.join('___') : (exercise as BaseExercise).question,
            lessonTitle, 
            submittedAnswer, 
            isCorrect, 
            score, 
            feedback: feedbackString, 
            tags: exercise.tags || [],
            submittedAt: Date.now(),
        };
        if (imageDataUri) dataToSave.imageDataUri = imageDataUri;

        // Save exercise response
        if (isFirstAttempt) {
            await setDoc(responseRef, { ...dataToSave, attempts: 1 });
        } else {
            await updateDoc(responseRef, { ...dataToSave, attempts: increment(1) });
        }

    } catch (e: any) {
        console.error("Save exercise attempt failed: ", e);
        throw new Error("Failed to save exercise result.");
    }
}

export async function getUserResponsesForLesson(userId: string, lessonId: string): Promise<UserExerciseResponse[]> {
    const q = query(collection(db, "exerciseResponses"), where("userId", "==", userId), where("lessonId", "==", lessonId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserExerciseResponse));
}

export async function getAllUserResponses(userId: string): Promise<Map<string, UserExerciseResponse>> {
    const q = query(collection(db, "exerciseResponses"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const responsesMap = new Map<string, UserExerciseResponse>();
    snapshot.docs.forEach(doc => {
        const data = doc.data() as Omit<UserExerciseResponse, 'id'>;
        responsesMap.set(data.exerciseId, { id: doc.id, ...data });
    });
    return responsesMap;
}

export async function updateUserExerciseIndex(userId: string, lessonId: string, index: number) {
    const userRef = doc(db, 'users', userId);
    try {
        await updateDoc(userRef, { 
            [`progress.exerciseProgress.${lessonId}`]: { currentExerciseIndex: index }
        });
    } catch (e) {
        console.error("Update exercise index failed: ", e);
        throw new Error("Failed to save exercise progress.");
    }
}

export async function getSolutionHistory(userId: string): Promise<UserExerciseResponse[]> {
    const q = query(collection(db, "exerciseResponses"), where("userId", "==", userId), orderBy("submittedAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserExerciseResponse));
}
