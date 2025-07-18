// src/lib/user.ts
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion, increment, runTransaction, Timestamp, deleteField, query, orderBy, limit, where } from 'firebase/firestore';
import { format, isYesterday, subDays } from 'date-fns';
import { generateProactiveSuggestion } from '@/ai/flows/generate-proactive-suggestion';
import { User, UserProgress, Achievement, UserExerciseResponse, Announcement } from './types';

// Generic helper for fetching collections
async function fetchCollection<T>(collectionName: string, q?: any): Promise<T[]> {
    try {
        const queryToExecute = q || collection(db, collectionName);
        const snapshot = await getDocs(queryToExecute);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
    } catch (error) {
        console.error(`Error fetching ${collectionName}: `, error);
        throw new Error(`Failed to fetch ${collectionName}.`);
    }
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
        throw new Error(`Failed to fetch user ${userId}.`);
    }
}

export async function getUsers(): Promise<User[]> {
    return fetchCollection<User>('users');
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

export async function updateUserProfile(userId: string, data: Partial<Pick<User, 'name' | 'photoURL' | 'learningStyle' | 'interests' | 'goals' | 'gradeLevel' | 'ageGroup'>>): Promise<void> {
    try {
        const userRef = doc(db, 'users', userId);
        const updateData: { [key: string]: any } = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.photoURL !== undefined) updateData.photoURL = data.photoURL;
        if (data.learningStyle !== undefined) updateData.learningStyle = data.learningStyle;
        if (data.interests !== undefined) updateData.interests = data.interests;
        if (data.goals !== undefined) updateData.goals = data.goals;
        if (data.gradeLevel !== undefined) updateData.gradeLevel = data.gradeLevel;
        if (data.ageGroup !== undefined) updateData.ageGroup = data.ageGroup;
        
        if (Object.keys(updateData).length > 0) {
            await updateDoc(userRef, updateData);
        }
    } catch (error) {
        console.error("Error updating user profile: ", error);
        throw new Error("Failed to update user profile");
    }
}

export async function createUserInFirestore(uid: string, email: string, name: string, photoURL: string | null) {
    try {
        await setDoc(doc(db, "users", uid), {
            uid, email, name, photoURL: photoURL || null, role: 'student',
            lastLessonRequestAt: null, lastCheckedAnnouncementsAt: Timestamp.now(), proactiveSuggestion: null,
            learningStyle: 'unspecified', interests: [], goals: '', gradeLevel: '', ageGroup: '',
            loginStreak: 1, lastLoginDate: format(new Date(), 'yyyy-MM-dd'),
            progress: {
                completedLessons: 0, averageScore: 0, mastery: 0, subjectsMastery: [],
                completedLessonIds: [], totalExercisesAttempted: 0, totalExercisesCorrect: 0,
                timeSpent: 0, weeklyActivity: [], exerciseProgress: {}, xp: 0, achievements: [],
            }
        });
    } catch (error) {
        console.error("Error creating user in Firestore: ", error);
        throw error;
    }
}

export async function handleUserLogin(userId: string) {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const userData = userSnap.data() as User;
        const today = format(new Date(), 'yyyy-MM-dd');
        if (userData.lastLoginDate !== today) {
            const lastLogin = new Date(userData.lastLoginDate);
            if (isYesterday(lastLogin)) {
                const newStreak = (userData.loginStreak || 0) + 1;
                await updateDoc(userRef, { lastLoginDate: today, loginStreak: newStreak });
                let newAchievements: Achievement[] = [];
                if (newStreak >= 3 && !userData.progress.achievements.includes('STREAK_3_DAYS')) newAchievements.push('STREAK_3_DAYS');
                if (newStreak >= 7 && !userData.progress.achievements.includes('STREAK_7_DAYS')) newAchievements.push('STREAK_7_DAYS');
                if (newAchievements.length > 0) await updateDoc(userRef, { 'progress.achievements': arrayUnion(...newAchievements) });
            } else {
                await updateDoc(userRef, { lastLoginDate: today, loginStreak: 1 });
            }
        }
    }
}

export async function getUserProgress(userId: string): Promise<UserProgress> {
    const user = await getUser(userId);
    if (user?.progress) {
        return user.progress;
    }
    return {
        completedLessons: 0, averageScore: 0, mastery: 0, subjectsMastery: [],
        completedLessonIds: [], timeSpent: 0, exerciseProgress: {}, xp: 0, achievements: [],
    };
}

export async function updateUserTimeSpent(userId: string, seconds: number) {
    if (!userId || seconds <= 0) return;
    const userRef = doc(db, 'users', userId);
    try {
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) throw new Error("User not found.");
        const progress = userDoc.data().progress as UserProgress;
        const weeklyActivity = progress.weeklyActivity || [];
        const weekStartDateStr = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        let currentWeek = weeklyActivity.find(w => w.week === weekStartDateStr);
        if (currentWeek) {
            currentWeek.timeSpent += seconds;
        } else {
            weeklyActivity.push({ week: weekStartDateStr, skillsMastered: 0, timeSpent: seconds });
        }
        await updateDoc(userRef, {
            'progress.timeSpent': increment(seconds),
            'progress.weeklyActivity': weeklyActivity.slice(-5)
        });
    } catch (error) {
        console.error("Error updating time spent:", error);
    }
}

export async function clearProactiveSuggestion(userId: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { proactiveSuggestion: deleteField() });
}

export async function checkForStrugglesAndSuggestHelp(userId: string, failedExercise: any) {
    if (!failedExercise.tags?.length) return;
    const user = await getUser(userId);
    if (!user || (user.proactiveSuggestion?.timestamp && user.proactiveSuggestion.timestamp > Date.now() - 24 * 60 * 60 * 1000)) return;

    const responsesQuery = query(collection(db, "exerciseResponses"), where("userId", "==", userId), orderBy("submittedAt", "desc"), limit(10));
    const recentResponses = await fetchCollection<UserExerciseResponse>('exerciseResponses', responsesQuery);
    
    const incorrectResponses = recentResponses.filter(r => !r.isCorrect);
    const struggleTags: { [key: string]: number } = {};
    incorrectResponses.forEach(response => {
        const commonTags = failedExercise.tags!.filter((t: string) => response.tags?.includes(t));
        commonTags.forEach((tag: string) => struggleTags[tag] = (struggleTags[tag] || 0) + 1);
    });

    const mostStruggled = Object.entries(struggleTags).find(([_, count]) => count >= 2);
    if (mostStruggled) {
        const [topic] = mostStruggled;
        const { suggestion } = await generateProactiveSuggestion({ strugglingTopic: topic });
        await updateDoc(doc(db, 'users', userId), {
            proactiveSuggestion: { message: suggestion, topic, timestamp: Date.now() }
        });
    }
}

export async function updateUserAggregates(transaction: any, userRef: any, progress: UserProgress, isCorrect: boolean, score: number) {
    const totalAttempted = (progress.totalExercisesAttempted || 0) + 1;
    const totalCorrect = (progress.totalExercisesCorrect || 0) + (isCorrect ? 1 : 0);
    const newAverageScore = totalAttempted > 0 ? Math.round(((progress.averageScore || 0) * (totalAttempted - 1) + score) / totalAttempted) : 0;
    transaction.update(userRef, { 
        'progress.totalExercisesAttempted': totalAttempted,
        'progress.totalExercisesCorrect': totalCorrect,
        'progress.averageScore': newAverageScore,
    });
}

export async function updateWeeklyActivity(transaction: any, userRef: any, progress: UserProgress, isCorrect: boolean) {
    const weeklyActivity = progress.weeklyActivity || [];
    const weekStartDateStr = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    let currentWeek = weeklyActivity.find(w => w.week === weekStartDateStr);
    if (currentWeek) {
        if(isCorrect) currentWeek.skillsMastered += 1;
    } else {
        weeklyActivity.push({ week: weekStartDateStr, skillsMastered: isCorrect ? 1 : 0, timeSpent: 0 });
    }
    transaction.update(userRef, { 'progress.weeklyActivity': weeklyActivity.slice(-5) });
}

export async function updateAchievements(transaction: any, userRef: any, progress: UserProgress, exercise: any, isCorrect: boolean) {
    if (!isCorrect) return;
    const totalCorrect = (progress.totalExercisesCorrect || 0) + 1;
    const xpGained = 10 + (exercise.difficulty * 5);
    const newAchievements: Achievement[] = [];
    if (totalCorrect === 1) newAchievements.push('FIRST_CORRECT_ANSWER');
    if (exercise.category === 'math' && totalCorrect >= 10 && !progress.achievements.includes('MATH_WHIZ_10')) newAchievements.push('MATH_WHIZ_10');
    if (exercise.tags?.includes('python') && !progress.achievements.includes('PYTHON_NOVICE')) newAchievements.push('PYTHON_NOVICE');
    if (exercise.tags?.includes('javascript') && !progress.achievements.includes('JS_NOVICE')) newAchievements.push('JS_NOVICE');
    
    transaction.update(userRef, {
        'progress.xp': increment(xpGained),
        'progress.achievements': arrayUnion(...newAchievements),
    });
}
