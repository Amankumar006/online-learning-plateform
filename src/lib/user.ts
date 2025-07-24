// src/lib/user.ts
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion, increment, runTransaction, Timestamp, deleteField, query, orderBy, limit, where } from 'firebase/firestore';
import { format, isYesterday, startOfWeek } from 'date-fns';
import { generateProactiveSuggestion } from '@/ai/flows/generate-proactive-suggestion';
import { User, UserProgress, Achievement, UserExerciseResponse, Announcement, ConversationMemory, MediaContent, ConversationSession } from './types';

// Generic helper for fetching collections
async function fetchCollection<T>(collectionName: string, q?: any): Promise<T[]> {
    try {
        const queryToExecute = q || collection(db, collectionName);
        const snapshot = await getDocs(queryToExecute);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as unknown as T));
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
            return { uid: userSnap.id, ...(userSnap.data() as object) } as User;
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

export async function triggerSuggestionIfStruggling(userId: string, failedExerciseTags: string[]): Promise<void> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    const userData = userSnap.data() as User;

    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    if (userData.proactiveSuggestion && userData.proactiveSuggestion.timestamp > oneDayAgo) {
      return; 
    }

    const responsesQuery = query(collection(db, "exerciseResponses"), where("userId", "==", userId), where("isCorrect", "==", false), orderBy("submittedAt", "desc"), limit(5));
    const responseSnapshot = await getDocs(responsesQuery);
    const recentIncorrectResponses = responseSnapshot.docs.map(doc => doc.data() as UserExerciseResponse);

    const tagFrequencies = new Map<string, number>();
    recentIncorrectResponses.forEach(res => {
        res.tags?.forEach(tag => {
            tagFrequencies.set(tag, (tagFrequencies.get(tag) || 0) + 1);
        })
    });

    for (const tag of failedExerciseTags) {
        if ((tagFrequencies.get(tag) || 0) >= 2) { 
            try {
                const { suggestion } = await generateProactiveSuggestion({ strugglingTopic: tag });
                await updateDoc(userRef, { proactiveSuggestion: { message: suggestion, topic: tag, timestamp: Date.now() } });
                return; 
            } catch (error) {
                console.error("Failed to generate proactive suggestion:", error);
            }
        }
    }
}

// --- Conversation Memory Functions ---
export async function getConversationMemory(userId: string): Promise<ConversationMemory | null> {
    try {
        const memoryRef = doc(db, 'conversationMemory', userId);
        const memorySnap = await getDoc(memoryRef);
        if (memorySnap.exists()) {
            return { userId, ...(memorySnap.data() as object) } as ConversationMemory;
        }
        return null;
    } catch (error) {
        console.error("Error fetching conversation memory: ", error);
        return null;
    }
}

export async function initializeConversationMemory(userId: string): Promise<ConversationMemory> {
    const defaultMemory: ConversationMemory = {
        userId,
        totalSessions: 0,
        totalMessages: 0,
        patterns: {
            topicFrequency: {},
            difficultyPreference: 'mixed',
            preferredExplanationStyle: 'mixed',
            toolUsagePreference: {
                createExercise: 0,
                visualDiagrams: 0,
                webSearch: 0,
                codeAnalysis: 0,
            },
            commonQuestionPatterns: [],
            learningVelocity: 0,
            sessionDuration: 0,
            lastUpdated: Timestamp.now(),
        },
        recentTopics: [],
        personalizedPrompts: [],
        contextCarryover: {
            openQuestions: [],
            suggestedNextTopics: [],
        },
    };

    try {
        const memoryRef = doc(db, 'conversationMemory', userId);
        await setDoc(memoryRef, defaultMemory);
        return defaultMemory;
    } catch (error) {
        console.error("Error initializing conversation memory: ", error);
        throw error;
    }
}

export async function updateConversationPatterns(
    userId: string,
    sessionData: {
        topics: string[];
        toolsUsed: string[];
        duration: number;
        messageCount: number;
        difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
        explanationPreference?: 'visual' | 'textual' | 'examples' | 'step-by-step';
    }
): Promise<void> {
    try {
        const memoryRef = doc(db, 'conversationMemory', userId);
        
        await runTransaction(db, async (transaction) => {
            const memoryDoc = await transaction.get(memoryRef);
            let memory: ConversationMemory;
            
            if (!memoryDoc.exists()) {
                memory = await initializeConversationMemory(userId);
            } else {
                memory = { userId, ...(memoryDoc.data() as object) } as ConversationMemory;
            }

            // Update topic frequency
            sessionData.topics.forEach(topic => {
                memory.patterns.topicFrequency[topic] = 
                    (memory.patterns.topicFrequency[topic] || 0) + 1;
            });

            // Update tool usage preferences
            sessionData.toolsUsed.forEach(tool => {
                if (tool === 'createCustomExercise') memory.patterns.toolUsagePreference.createExercise++;
                else if (tool === 'generateImageForExplanation') memory.patterns.toolUsagePreference.visualDiagrams++;
                else if (tool === 'searchTheWeb') memory.patterns.toolUsagePreference.webSearch++;
                else if (tool === 'analyzeCodeComplexity') memory.patterns.toolUsagePreference.codeAnalysis++;
            });

            // Update session metrics
            memory.totalSessions++;
            memory.totalMessages += sessionData.messageCount;
            
            // Calculate average session duration
            const totalDuration = (memory.patterns.sessionDuration * (memory.totalSessions - 1)) + sessionData.duration;
            memory.patterns.sessionDuration = totalDuration / memory.totalSessions;
            
            // Calculate learning velocity (topics per session)
            memory.patterns.learningVelocity = Object.keys(memory.patterns.topicFrequency).length / memory.totalSessions;

            // Update difficulty preference if provided
            if (sessionData.difficultyLevel) {
                memory.patterns.difficultyPreference = sessionData.difficultyLevel;
            }

            // Update explanation style preference if provided
            if (sessionData.explanationPreference) {
                memory.patterns.preferredExplanationStyle = sessionData.explanationPreference;
            }

            memory.patterns.lastUpdated = Timestamp.now();

            transaction.set(memoryRef, memory);
        });
    } catch (error) {
        console.error("Error updating conversation patterns: ", error);
        throw error;
    }
}

export async function addTopicToMemory(
    userId: string, 
    topic: string, 
    understanding: 'struggling' | 'learning' | 'mastered'
): Promise<void> {
    try {
        const memoryRef = doc(db, 'conversationMemory', userId);
        
        await runTransaction(db, async (transaction) => {
            const memoryDoc = await transaction.get(memoryRef);
            let memory: ConversationMemory;
            
            if (!memoryDoc.exists()) {
                memory = await initializeConversationMemory(userId);
            } else {
                memory = { userId, ...(memoryDoc.data() as object) } as ConversationMemory;
            }

            // Add to recent topics (keep last 20)
            memory.recentTopics.unshift({
                topic,
                timestamp: Timestamp.now(),
                understanding,
            });
            memory.recentTopics = memory.recentTopics.slice(0, 20);

            transaction.set(memoryRef, memory);
        });
    } catch (error) {
        console.error("Error adding topic to memory: ", error);
        throw error;
    }
}

export async function updateContextCarryover(
    userId: string,
    context: {
        lastDiscussedConcept?: string;
        openQuestions?: string[];
        suggestedNextTopics?: string[];
    }
): Promise<void> {
    try {
        const memoryRef = doc(db, 'conversationMemory', userId);
        await updateDoc(memoryRef, {
            'contextCarryover.lastDiscussedConcept': context.lastDiscussedConcept,
            'contextCarryover.openQuestions': context.openQuestions || [],
            'contextCarryover.suggestedNextTopics': context.suggestedNextTopics || [],
        });
    } catch (error) {
        console.error("Error updating context carryover: ", error);
        throw error;
    }
}

export async function generatePersonalizedPrompts(userId: string): Promise<string[]> {
    try {
        const memory = await getConversationMemory(userId);
        if (!memory) return [];

        const prompts: string[] = [];
        
        // Based on frequent topics
        const topTopics = Object.entries(memory.patterns.topicFrequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([topic]) => topic);

        topTopics.forEach(topic => {
            prompts.push(`Let's dive deeper into ${topic} - I noticed you're interested in this topic!`);
            prompts.push(`Can you create a practice exercise about ${topic}?`);
        });

        // Based on tool preferences
        if (memory.patterns.toolUsagePreference.visualDiagrams > 2) {
            prompts.push("Can you show me a visual diagram to explain this concept?");
        }
        
        if (memory.patterns.toolUsagePreference.createExercise > 2) {
            prompts.push("I'd like to practice what I've learned with a custom exercise");
        }

        // Based on recent struggling topics
        const strugglingTopics = memory.recentTopics
            .filter(t => t.understanding === 'struggling')
            .slice(0, 2);
            
        strugglingTopics.forEach(({ topic }) => {
            prompts.push(`Help me understand ${topic} better - I'm still struggling with it`);
        });

        return prompts.slice(0, 6); // Return max 6 personalized prompts
    } catch (error) {
        console.error("Error generating personalized prompts: ", error);
        return [];
    }
}

// --- Enhanced Multi-modal Functions ---
export async function saveMediaContent(mediaContent: Omit<MediaContent, 'id' | 'createdAt'>): Promise<string> {
    try {
        const mediaRef = doc(collection(db, 'mediaContent'));
        const fullMediaContent: MediaContent = {
            ...mediaContent,
            id: mediaRef.id,
            createdAt: Timestamp.now(),
        };
        
        await setDoc(mediaRef, fullMediaContent);
        return mediaRef.id;
    } catch (error) {
        console.error("Error saving media content: ", error);
        throw error;
    }
}

export async function getMediaContent(mediaId: string): Promise<MediaContent | null> {
    try {
        const mediaRef = doc(db, 'mediaContent', mediaId);
        const mediaSnap = await getDoc(mediaRef);
        if (mediaSnap.exists()) {
            return { id: mediaSnap.id, ...(mediaSnap.data() as object) } as MediaContent;
        }
        return null;
    } catch (error) {
        console.error("Error fetching media content: ", error);
        return null;
    }
}

export async function saveConversationSession(session: Omit<ConversationSession, 'id'>): Promise<string> {
    try {
        const sessionRef = doc(collection(db, 'conversationSessions'));
        const fullSession: ConversationSession = {
            ...session,
            id: sessionRef.id,
        };
        
        await setDoc(sessionRef, fullSession);
        
        // Update conversation patterns based on session
        await updateConversationPatterns(session.userId, {
            topics: session.topicsCovered,
            toolsUsed: session.toolsUsed,
            duration: session.duration || 0,
            messageCount: session.messages.length,
        });
        
        return sessionRef.id;
    } catch (error) {
        console.error("Error saving conversation session: ", error);
        throw error;
    }
}

export async function getUserConversationSessions(
    userId: string, 
    limitCount: number = 10
): Promise<ConversationSession[]> {
    try {
        const sessionsQuery = query(
            collection(db, 'conversationSessions'),
            where('userId', '==', userId),
            orderBy('startTime', 'desc'),
            limit(limitCount)
        );
        
        const snapshot = await getDocs(sessionsQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as ConversationSession));
    } catch (error) {
        console.error("Error fetching user conversation sessions: ", error);
        return [];
    }
}

export async function analyzeUserLearningPatterns(userId: string) {
    try {
        const memory = await getConversationMemory(userId);
        if (!memory) return null;

        const patterns = memory.patterns;
        
        // Analyze learning style based on patterns
        let detectedLearningStyle: 'visual' | 'auditory' | 'reading/writing' | 'kinesthetic' = 'reading/writing';
        
        if (patterns.toolUsagePreference.visualDiagrams > patterns.toolUsagePreference.createExercise) {
            detectedLearningStyle = 'visual';
        } else if (patterns.preferredExplanationStyle === 'examples') {
            detectedLearningStyle = 'kinesthetic';
        }

        // Identify knowledge gaps
        const strugglingTopics = memory.recentTopics
            .filter(t => t.understanding === 'struggling')
            .map(t => t.topic);

        // Suggest next learning paths
        const masteredTopics = memory.recentTopics
            .filter(t => t.understanding === 'mastered')
            .map(t => t.topic);

        return {
            detectedLearningStyle,
            strugglingTopics,
            masteredTopics,
            averageSessionDuration: patterns.sessionDuration,
            learningVelocity: patterns.learningVelocity,
            preferredTools: Object.entries(patterns.toolUsagePreference)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 2)
                .map(([tool]) => tool),
        };
    } catch (error) {
        console.error("Error analyzing user learning patterns: ", error);
        return null;
    }
}
