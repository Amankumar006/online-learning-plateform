// src/lib/exercises.ts
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, setDoc, deleteDoc, updateDoc, increment, runTransaction, query, where, orderBy, limit } from 'firebase/firestore';
import { Exercise, ExerciseWithLessonTitle, FillInTheBlanksExercise, BaseExercise, UserExerciseResponse, UserProgress, GradeMathSolutionOutput, Achievement, GradeLongFormAnswerOutput } from './types';
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
    return exercises.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0)));
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

export async function saveExerciseAttempt(
    userId: string, lessonTitle: string, exercise: Exercise, submittedAnswer: string | boolean | string[],
    isCorrect: boolean, score: number, feedback?: GradeLongFormAnswerOutput | null, imageDataUri?: string | null
) {
    const userRef = doc(db, 'users', userId);
    const responseRef = doc(db, 'exerciseResponses', `${userId}_${exercise.id}`);
    
    try {
        const responseSnap = await getDoc(responseRef);
        const isFirstAttempt = !responseSnap.exists();
        
        // Ensure feedback is stored as a string or is undefined.
        const feedbackString = typeof feedback === 'object' && feedback !== null ? feedback.feedback : undefined;

        const dataToSave: Partial<UserExerciseResponse> = {
            userId, lessonId: exercise.lessonId, exerciseId: exercise.id,
            question: exercise.type === 'fill_in_the_blanks' ? (exercise as FillInTheBlanksExercise).questionParts.join('___') : (exercise as BaseExercise).question,
            lessonTitle, submittedAnswer, isCorrect, score, feedback: feedbackString, tags: exercise.tags || [],
            submittedAt: Date.now(),
        };
        if (imageDataUri) dataToSave.imageDataUri = imageDataUri;

        if (isFirstAttempt) {
            await setDoc(responseRef, { ...dataToSave, attempts: 1 });
            await runTransaction(db, async (t) => {
                const userDoc = await t.get(userRef);
                if (!userDoc.exists()) throw "User not found";
                const progress = userDoc.data().progress as UserProgress;
                
                // Update aggregates
                const totalAttempted = (progress.totalExercisesAttempted || 0) + 1;
                const totalCorrect = (progress.totalExercisesCorrect || 0) + (isCorrect ? 1 : 0);
                const newAverageScore = totalAttempted > 0 ? Math.round(((progress.averageScore || 0) * (totalAttempted - 1) + score) / totalAttempted) : 0;
                
                // Update weekly activity
                const weeklyActivity = progress.weeklyActivity || [];
                const weekStartDateStr = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
                let currentWeek = weeklyActivity.find(w => w.week === weekStartDateStr);
                if (currentWeek) {
                    if(isCorrect) currentWeek.skillsMastered = (currentWeek.skillsMastered || 0) + 1;
                } else {
                    weeklyActivity.push({ week: weekStartDateStr, skillsMastered: isCorrect ? 1 : 0, timeSpent: 0 });
                }

                // Update achievements
                const xpGained = 10 + (exercise.difficulty * 5);
                const newAchievements: Achievement[] = [...(progress.achievements || [])];
                const addAchievement = (ach: Achievement) => !newAchievements.includes(ach) && newAchievements.push(ach);

                if (totalCorrect === 1) addAchievement('FIRST_CORRECT_ANSWER');
                if (exercise.category === 'math' && totalCorrect >= 10) addAchievement('MATH_WHIZ_10');
                if (exercise.tags?.includes('python')) addAchievement('PYTHON_NOVICE');
                if (exercise.tags?.includes('javascript')) addAchievement('JS_NOVICE');
                
                t.update(userRef, { 
                    'progress.totalExercisesAttempted': totalAttempted,
                    'progress.totalExercisesCorrect': totalCorrect,
                    'progress.averageScore': newAverageScore,
                    'progress.weeklyActivity': weeklyActivity.slice(-5),
                    'progress.xp': increment(xpGained),
                    'progress.achievements': newAchievements,
                });
            });
        } else {
            await updateDoc(responseRef, { ...dataToSave, attempts: increment(1) });
            if (isCorrect) {
                await updateDoc(userRef, {
                    'progress.totalExercisesCorrect': increment(1),
                    'progress.xp': increment(10 + (exercise.difficulty * 5)),
                });
            }
        }
        
        if (!isCorrect && exercise.tags) {
            await triggerSuggestionIfStruggling(userId, exercise.tags).catch(console.error);
        }

    } catch (e) {
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
