
// src/lib/data.ts
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, query, where, setDoc, addDoc, deleteDoc, updateDoc, arrayUnion, increment, runTransaction, Timestamp, orderBy, limit, writeBatch, onSnapshot, serverTimestamp, deleteField, or, and } from 'firebase/firestore';
import { format, startOfWeek, subDays, isYesterday } from 'date-fns';
import { generateLessonContent } from '@/ai/flows/generate-lesson-content';
import { generateLessonImage } from '@/ai/flows/generate-lesson-image';
import { uploadImageFromDataUrl, uploadAudioFromDataUrl } from './storage';
import { GradeMathSolutionOutput } from '@/ai/flows/grade-math-solution';
import { generateProactiveSuggestion } from '@/ai/flows/generate-proactive-suggestion';
import { generateAudioFromText } from '@/ai/flows/generate-audio-from-text';


// Old structure
export interface ContentBlock {
  type: 'paragraph';
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
    audioUrl?: string; // Add optional audioUrl field
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
  // New fields for educational context
  gradeLevel?: string;
  ageGroup?: string;
  curriculumBoard?: string;
  topicDepth?: string;
}

export interface ProactiveSuggestion {
    message: string;
    topic: string;
    timestamp: number;
}

export type Achievement = 
    | 'FIRST_CORRECT_ANSWER'
    | 'FIRST_LESSON_COMPLETE'
    | 'STREAK_3_DAYS'
    | 'STREAK_7_DAYS'
    | 'PYTHON_NOVICE'
    | 'JS_NOVICE'
    | 'MATH_WHIZ_10';


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
  xp: number;
  achievements: Achievement[];
}


export interface User {
  uid: string;
  email: string | null;
  name?: string;
  photoURL?: string;
  role: 'student' | 'admin';
  progress: UserProgress;
  lastLessonRequestAt?: number;
  lastCheckedAnnouncementsAt?: Timestamp;
  proactiveSuggestion?: ProactiveSuggestion | null;
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading/writing' | 'unspecified';
  interests?: string[];
  goals?: string;
  gradeLevel?: string;
  ageGroup?: string;
  loginStreak: number;
  lastLoginDate: string; // YYYY-MM-DD
  handRaised?: boolean;
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
    userId?: string | null;
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

export interface FillInTheBlanksExercise extends Omit<BaseExercise, 'question'> {
    type: 'fill_in_the_blanks';
    questionParts: string[];
    correctAnswers: string[];
}


export type Exercise = McqExercise | TrueFalseExercise | LongFormExercise | FillInTheBlanksExercise;

export interface UserExerciseResponse {
  id: string; // doc id
  userId: string;
  lessonId: string;
  exerciseId: string;
  submittedAnswer: string | boolean | string[];
  imageDataUri?: string | null;
  isCorrect: boolean;
  score: number;
  feedback?: string | GradeMathSolutionOutput;
  submittedAt: number; // using timestamp for sorting
  question: string;
  lessonTitle: string;
  tags?: string[];
  attempts: number;
}

export interface LessonRequest {
    id: string;
    userId: string;
    userName: string;
    title: string;
    subject: string;
    description: string;
    learningFormat: string;
    notes?: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: Timestamp;
}


export interface ExerciseWithLessonTitle extends Exercise {
    lessonTitle: string;
}

export type AnnouncementType = 'new_lesson' | 'new_exercise' | 'general_update' | 'new_feature';
export interface Announcement {
    id: string;
    type: AnnouncementType;
    title: string;
    message: string;
    link?: string;
    createdAt: Timestamp;
}


// --- Study Room Types ---
export interface StudyRoom {
    id: string;
    ownerId: string;
    name: string;
    visibility: 'public' | 'private';
    isPublic: boolean;
    lessonId?: string | null;
    lessonTitle?: string | null;
    ownerName?: string;
    ownerPhotoURL?: string | null;
    createdAt: Timestamp;
    expiresAt: Timestamp;
    roomState?: string;
    status: 'active' | 'ended';
    participantIds: string[];
}

export interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    content: string;
    createdAt: Timestamp;
}

export interface StudyRoomResource {
    id: string;
    url: string;
    addedByUserId: string;
    addedByUserName: string;
    createdAt: Timestamp;
}

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

        // Only add fields to the update object if they are defined in the data parameter
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
            uid,
            email,
            name,
            photoURL: photoURL || null,
            role: 'student', // Default role for new signups
            lastLessonRequestAt: null,
            lastCheckedAnnouncementsAt: Timestamp.now(),
            proactiveSuggestion: null,
            learningStyle: 'unspecified',
            interests: [],
            goals: '',
            gradeLevel: '',
            ageGroup: '',
            loginStreak: 1,
            lastLoginDate: format(new Date(), 'yyyy-MM-dd'),
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
                xp: 0,
                achievements: [],
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
                // It's a consecutive day
                const newStreak = (userData.loginStreak || 0) + 1;
                await updateDoc(userRef, {
                    lastLoginDate: today,
                    loginStreak: newStreak,
                });
                
                // Check for streak achievements
                let newAchievements: Achievement[] = [];
                if (newStreak >= 3 && !userData.progress.achievements.includes('STREAK_3_DAYS')) {
                    newAchievements.push('STREAK_3_DAYS');
                }
                if (newStreak >= 7 && !userData.progress.achievements.includes('STREAK_7_DAYS')) {
                    newAchievements.push('STREAK_7_DAYS');
                }

                if (newAchievements.length > 0) {
                    await updateDoc(userRef, {
                       'progress.achievements': arrayUnion(...newAchievements)
                    });
                }

            } else {
                // Streak is broken
                await updateDoc(userRef, {
                    lastLoginDate: today,
                    loginStreak: 1,
                });
            }
        }
    }
}


export async function createSystemAnnouncement(announcementData: Omit<Announcement, 'id' | 'createdAt'>): Promise<void> {
    try {
        const payload = { ...announcementData };
        if (!payload.link) {
            delete payload.link;
        }
        await addDoc(collection(db, "announcements"), {
            ...payload,
            createdAt: Timestamp.now()
        });
    } catch (error) {
        console.error("Error creating system announcement: ", error);
        throw new Error("Failed to create system announcement.");
    }
}

async function queueEmailsForAnnouncement(subject: string, message: string, link?: string): Promise<void> {
    try {
        const users = await getUsers();
        const emailQueueCollection = collection(db, "emailQueue");

        const emailPromises = users
            .filter(user => user.email) // Ensure user has an email
            .map(user => {
                const htmlBody = `
                    <h1>${subject}</h1>
                    <p>${message}</p>
                    ${link ? `<p><a href="${link}">Learn more here</a></p>` : ''}
                    <br/>
                    <p><small>You are receiving this email as a user of AdaptEd AI.</small></p>
                `;

                return addDoc(emailQueueCollection, {
                    to: user.email,
                    message: {
                        subject: `[AdaptEd AI] ${subject}`,
                        html: htmlBody,
                    },
                });
            });

        await Promise.all(emailPromises);

    } catch (error) {
        console.error("Error queuing emails:", error);
        // We don't throw an error here to allow the in-app announcement to succeed even if email queuing fails.
    }
}

export async function createCustomAnnouncement(announcementData: Omit<Announcement, 'id' | 'createdAt'>, sendToGmail?: boolean): Promise<void> {
    try {
        const payload: { [key: string]: any } = { ...announcementData };
        if (!payload.link) {
            delete payload.link;
        }
        await addDoc(collection(db, "announcements"), {
            ...payload,
            createdAt: Timestamp.now()
        });

        if (sendToGmail) {
            await queueEmailsForAnnouncement(payload.title, payload.message, payload.link);
        }

    } catch (error) {
        console.error("Error creating custom announcement: ", error);
        throw new Error("Failed to send the announcement.");
    }
}

export async function generateAndStoreLessonAudio(lessonId: string): Promise<void> {
  const lessonRef = doc(db, 'lessons', lessonId);
  const lessonDoc = await getDoc(lessonRef);
  if (!lessonDoc.exists()) {
    throw new Error("Lesson not found to generate audio for.");
  }

  const lesson = lessonDoc.data() as Lesson;
  if (!lesson.sections) return;

  const updatedSections = await Promise.all(
    lesson.sections.map(async (section, index) => {
      if (section.audioUrl || !section.blocks.some(b => b.type === 'text')) {
        return section;
      }
      
      const textContent = section.blocks.filter(b => b.type === 'text').map(b => (b as any).content).join('\n\n');
      if (!textContent.trim()) {
        return section;
      }

      try {
        const { audioDataUri } = await generateAudioFromText({ sectionTitle: section.title, sectionContent: textContent });
        const fileName = `${lessonId}_section_${index}`;
        const audioUrl = await uploadAudioFromDataUrl(audioDataUri, fileName);
        return { ...section, audioUrl };
      } catch (error) {
        console.error(`Failed to generate audio for section ${index} of lesson ${lessonId}:`, error);
        return section; 
      }
    })
  );

  await updateDoc(lessonRef, { sections: updatedSections });
}

export async function generateAndCacheLessonAudioForSection(lessonId: string, sectionIndex: number): Promise<string> {
  const lessonRef = doc(db, 'lessons', lessonId);
  const lessonDoc = await getDoc(lessonRef);

  if (!lessonDoc.exists()) throw new Error("Lesson not found");

  const lesson = lessonDoc.data() as Lesson;
  const section = lesson.sections?.[sectionIndex];

  if (!section) throw new Error("Section not found");
  if (section.audioUrl) return section.audioUrl;

  const textContent = section.blocks.filter(b => b.type === 'text').map(b => (b as any).content).join('\n\n');
  if (!textContent.trim()) throw new Error("Section has no text content to generate audio from.");

  const { audioDataUri } = await generateAudioFromText({ sectionTitle: section.title, sectionContent: textContent });
  const fileName = `${lessonId}_section_${sectionIndex}_${Date.now()}`;
  const audioUrl = await uploadAudioFromDataUrl(audioDataUri, fileName);

  const updatedSections = [...(lesson.sections || [])];
  updatedSections[sectionIndex] = { ...section, audioUrl };
  await updateDoc(lessonRef, { sections: updatedSections });

  return audioUrl;
}

export async function createLesson(lessonData: Omit<Lesson, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "lessons"), lessonData);
    generateAndStoreLessonAudio(docRef.id).catch(console.error);
    await createSystemAnnouncement({
        type: 'new_lesson',
        title: `New Lesson Added: ${lessonData.title}`,
        message: `Explore the new lesson on ${lessonData.subject}. Happy learning!`,
        link: `/dashboard/lessons/${docRef.id}`
    });
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
    generateAndStoreLessonAudio(lessonId).catch(console.error);
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
    return fetchCollection<Lesson>('lessons');
}

export async function getLesson(id: string): Promise<Lesson | null> {
    try {
        const lessonRef = doc(db, 'lessons', id);
        const lessonSnap = await getDoc(lessonRef);
        return lessonSnap.exists() ? { id: lessonSnap.id, ...lessonSnap.data() } as Lesson : null;
    } catch (error) {
        console.error("Error fetching lesson: ", error);
        throw new Error(`Failed to fetch lesson ${id}`);
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
    return fetchCollection<Exercise>('exercises', q);
}

export async function getCustomExercisesForUser(userId: string): Promise<Exercise[]> {
    if (!userId) return [];
    const q = query(collection(db, "exercises"), where("isCustom", "==", true), where("userId", "==", userId));
    const exercises = await fetchCollection<Exercise>('exercises', q);
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
    try {
        await runTransaction(db, async (transaction) => {
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists()) throw new Error("User not found");
            const userData = userSnap.data() as User;
            const progress = userData.progress || {};
            if (progress.completedLessonIds?.includes(lessonId)) return;

            const lessonSnap = await getDoc(doc(db, 'lessons', lessonId));
            if (!lessonSnap.exists()) throw new Error("Lesson not found");
            const subject = lessonSnap.data().subject;

            const subjectQuery = query(collection(db, 'lessons'), where('subject', '==', subject));
            const subjectLessonsSnapshot = await getDocs(subjectQuery);
            const totalLessonsInSubject = subjectLessonsSnapshot.size;

            const completedLessonIds = [...(progress.completedLessonIds || []), lessonId];
            const completedInSubjectCount = completedLessonIds.filter(id => subjectLessonsSnapshot.docs.some(d => d.id === id)).length;
            const newMastery = totalLessonsInSubject > 0 ? Math.round((completedInSubjectCount / totalLessonsInSubject) * 100) : 0;
            const subjectsMastery = [...(progress.subjectsMastery || [])];
            const subjectIndex = subjectsMastery.findIndex(sm => sm.subject === subject);
            if (subjectIndex > -1) subjectsMastery[subjectIndex].mastery = newMastery;
            else subjectsMastery.push({ subject: subject, mastery: newMastery });

            const overallMastery = subjectsMastery.length > 0 ? Math.round(subjectsMastery.reduce((acc, subj) => acc + subj.mastery, 0) / subjectsMastery.length) : 0;
            const newAchievements = (progress.completedLessonIds?.length || 0) === 0 ? ['FIRST_LESSON_COMPLETE'] : [];

            transaction.update(userRef, {
                'progress.completedLessons': increment(1),
                'progress.completedLessonIds': completedLessonIds,
                'progress.subjectsMastery': subjectsMastery,
                'progress.mastery': overallMastery,
                'progress.xp': increment(50),
                'progress.achievements': arrayUnion(...newAchievements),
            });
        });
    } catch (error) {
        console.error("Error completing lesson: ", error);
        throw new Error("Failed to update lesson progress.");
    }
}

async function checkForStrugglesAndSuggestHelp(userId: string, failedExercise: Exercise) {
    if (!failedExercise.tags?.length) return;
    const user = await getUser(userId);
    if (!user) return;
    if (user.proactiveSuggestion?.timestamp && user.proactiveSuggestion.timestamp > Date.now() - 24 * 60 * 60 * 1000) return;

    const responsesQuery = query(collection(db, "exerciseResponses"), where("userId", "==", userId), orderBy("submittedAt", "desc"), limit(10));
    const recentResponses = await fetchCollection<UserExerciseResponse>('exerciseResponses', responsesQuery);
    
    const incorrectResponses = recentResponses.filter(r => !r.isCorrect);
    const struggleTags: { [key: string]: number } = {};
    incorrectResponses.forEach(response => {
        const commonTags = failedExercise.tags!.filter(t => response.tags?.includes(t));
        commonTags.forEach(tag => struggleTags[tag] = (struggleTags[tag] || 0) + 1);
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

async function updateUserAggregates(transaction: any, userRef: any, progress: UserProgress, isCorrect: boolean, score: number) {
    const totalAttempted = (progress.totalExercisesAttempted || 0) + 1;
    const totalCorrect = (progress.totalExercisesCorrect || 0) + (isCorrect ? 1 : 0);
    const newAverageScore = totalAttempted > 0 ? Math.round(((progress.averageScore || 0) * (totalAttempted - 1) + score) / totalAttempted) : 0;
    transaction.update(userRef, { 
        'progress.totalExercisesAttempted': totalAttempted,
        'progress.totalExercisesCorrect': totalCorrect,
        'progress.averageScore': newAverageScore,
    });
}

async function updateWeeklyActivity(transaction: any, userRef: any, progress: UserProgress, isCorrect: boolean) {
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

async function updateAchievements(transaction: any, userRef: any, progress: UserProgress, exercise: Exercise, isCorrect: boolean) {
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

export async function saveExerciseAttempt(
    userId: string, lessonTitle: string, exercise: Exercise, submittedAnswer: string | boolean | string[],
    isCorrect: boolean, score: number, feedback?: string | GradeMathSolutionOutput, imageDataUri?: string | null
) {
    const userRef = doc(db, 'users', userId);
    const responseRef = doc(db, 'exerciseResponses', `${userId}_${exercise.id}`);
    
    try {
        const responseSnap = await getDoc(responseRef);
        const isFirstAttempt = !responseSnap.exists();
        const dataToSave: Partial<UserExerciseResponse> = {
            userId, lessonId: exercise.lessonId, exerciseId: exercise.id,
            question: exercise.type === 'fill_in_the_blanks' ? exercise.questionParts.join('___') : exercise.question,
            lessonTitle, submittedAnswer, isCorrect, score, feedback: feedback || "", tags: exercise.tags || [],
            submittedAt: Date.now(),
        };
        if (imageDataUri) dataToSave.imageDataUri = imageDataUri;

        if (isFirstAttempt) {
            await setDoc(responseRef, { ...dataToSave, attempts: 1 });
            await runTransaction(db, async (t) => {
                const userDoc = await t.get(userRef);
                if (!userDoc.exists()) throw "User not found";
                const progress = userDoc.data().progress as UserProgress;
                await updateUserAggregates(t, userRef, progress, isCorrect, score);
                await updateWeeklyActivity(t, userRef, progress, isCorrect);
                await updateAchievements(t, userRef, progress, exercise, isCorrect);
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
        
        if (!isCorrect) await checkForStrugglesAndSuggestHelp(userId, exercise).catch(console.error);

    } catch (e) {
        console.error("Save exercise attempt failed: ", e);
        throw new Error("Failed to save exercise result.");
    }
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

export async function getUserResponsesForLesson(userId: string, lessonId: string): Promise<UserExerciseResponse[]> {
    const q = query(collection(db, "exerciseResponses"), where("userId", "==", userId), where("lessonId", "==", lessonId));
    return fetchCollection<UserExerciseResponse>('exerciseResponses', q);
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

export async function clearProactiveSuggestion(userId: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { proactiveSuggestion: deleteField() });
}

// Lesson Request Functions
export async function createLessonRequest(userId: string, userName: string, requestData: Omit<LessonRequest, 'id' | 'userId' | 'userName' | 'status' | 'createdAt'>): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found.");
        const userData = userDoc.data() as User;
        if (userData.lastLessonRequestAt && userData.lastLessonRequestAt > subDays(new Date(), 7).getTime()) {
            throw new Error("You can only submit one lesson request per week.");
        }
        transaction.set(doc(collection(db, 'lessonRequests')), {
            ...requestData, userId, userName, status: 'pending', createdAt: Timestamp.now(),
        });
        transaction.update(userRef, { lastLessonRequestAt: Date.now() });
    });
}

export async function getPendingLessonRequests(): Promise<LessonRequest[]> {
    const q = query(collection(db, "lessonRequests"), where("status", "==", "pending"));
    return fetchCollection<LessonRequest>('lessonRequests', q);
}

export async function approveLessonRequest(requestId: string): Promise<void> {
    const requestRef = doc(db, 'lessonRequests', requestId);
    const requestDoc = await getDoc(requestRef);
    if (!requestDoc.exists() || requestDoc.data().status !== 'pending') {
        throw new Error("Request not found or already processed.");
    }
    const requestData = requestDoc.data() as Omit<LessonRequest, 'id'>;

    const lessonContent = await generateLessonContent({
        topic: requestData.title, subject: requestData.subject, topicDepth: "Detailed",
    });
    const { imageUrl } = await generateLessonImage({
        prompt: `A high-quality, educational illustration for a lesson on "${lessonContent.title}" in ${lessonContent.subject}.`
    });
    const publicImageUrl = await uploadImageFromDataUrl(imageUrl, `lesson_${Date.now()}`);
    
    await createLesson({ ...lessonContent, image: publicImageUrl });
    await updateDoc(requestRef, { status: 'approved' });
}

export async function getRecentAnnouncements(count = 10): Promise<Announcement[]> {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(count));
    return fetchCollection<Announcement>('announcements', q);
}

export async function markAnnouncementsAsRead(userId: string): Promise<void> {
    try {
        await updateDoc(doc(db, 'users', userId), { lastCheckedAnnouncementsAt: Timestamp.now() });
    } catch (error) {
        console.error("Error marking announcements as read:", error);
        throw new Error("Failed to update user's notification status.");
    }
}

export async function getSolutionHistory(userId: string): Promise<UserExerciseResponse[]> {
    const q = query(collection(db, "exerciseResponses"), where("userId", "==", userId), orderBy("submittedAt", "desc"));
    return fetchCollection<UserExerciseResponse>('exerciseResponses', q);
}

// Study Room Functions
export async function createStudyRoomSession(
    data: Omit<StudyRoom, 'id' | 'createdAt' | 'status' | 'isPublic' | 'participantIds' | 'ownerName' | 'ownerPhotoURL'>
): Promise<string> {
    const newRoomRef = doc(collection(db, 'studyRooms'));
    const owner = await getUser(data.ownerId);
    const payload: Omit<StudyRoom, 'id'> = {
        ...data,
        isPublic: data.visibility === 'public',
        participantIds: [data.ownerId],
        ownerName: owner?.name || 'Anonymous',
        ownerPhotoURL: owner?.photoURL || null,
        createdAt: Timestamp.now(),
        status: 'active',
    };
    await setDoc(newRoomRef, payload);
    return newRoomRef.id;
}


export async function getStudyRoomsForUser(userId: string): Promise<StudyRoom[]> {
    if (!userId) return [];
    
    try {
        const publicRoomsQuery = query(
            collection(db, 'studyRooms'), 
            where('status', '==', 'active'),
            where('isPublic', '==', true)
        );
        
        const participantRoomsQuery = query(
            collection(db, 'studyRooms'),
            where('status', '==', 'active'),
            where('participantIds', 'array-contains', userId)
        );

        const [publicSnapshot, participantSnapshot] = await Promise.all([
            getDocs(publicRoomsQuery),
            getDocs(participantRoomsQuery)
        ]);
        
        const roomsMap = new Map<string, StudyRoom>();
        
        const processSnapshot = (snapshot: any) => {
            snapshot.docs.forEach((doc: any) => {
                const roomData = doc.data();
                if (roomData.expiresAt.toMillis() > Date.now()) {
                    roomsMap.set(doc.id, { id: doc.id, ...roomData } as StudyRoom);
                }
            });
        };

        processSnapshot(publicSnapshot);
        processSnapshot(participantSnapshot);
        
        return Array.from(roomsMap.values()).sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    } catch (error) {
        console.error("Error fetching study rooms:", error);
        throw error;
    }
}

export async function endStudyRoomSession(roomId: string): Promise<void> {
    await updateDoc(doc(db, 'studyRooms', roomId), { status: 'ended' });
}

export async function getStudyRoom(roomId: string): Promise<StudyRoom | null> {
    const roomSnap = await getDoc(doc(db, 'studyRooms', roomId));
    return roomSnap.exists() ? { id: roomSnap.id, ...roomSnap.data() } as StudyRoom : null;
}

export async function updateStudyRoomState(roomId: string, roomState: string): Promise<void> {
    const roomDoc = await getDoc(doc(db, 'studyRooms', roomId));
    if (roomDoc.exists() && roomDoc.data().status === 'active') {
        await updateDoc(doc(db, 'studyRooms', roomId), { roomState });
    }
}

export function getStudyRoomStateListener(roomId: string, callback: (roomData: StudyRoom | null) => void) {
    return onSnapshot(doc(db, 'studyRooms', roomId), (doc) => {
        callback(doc.exists() ? { id: doc.id, ...doc.data() } as StudyRoom : null);
    });
}

export async function sendStudyRoomMessage(roomId: string, userId: string, userName: string, content: string) {
    await addDoc(collection(db, 'studyRooms', roomId, 'messages'), {
        userId, userName, content, createdAt: Timestamp.now(),
    });
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
    const roomRef = doc(db, 'studyRooms', roomId);
    const participantRef = doc(db, `studyRooms/${roomId}/participants`, user.uid);
    
    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) return; // Room doesn't exist

        const participantIds = roomDoc.data()?.participantIds || [];
        if (!participantIds.includes(user.uid)) {
            transaction.update(roomRef, {
                participantIds: arrayUnion(user.uid)
            });
        }
        
        transaction.set(participantRef, {
            uid: user.uid, name: user.name, photoURL: user.photoURL || null, handRaised: false,
        }, { merge: true });
    });
}

export async function toggleHandRaise(roomId: string, userId: string) {
    const participantRef = doc(db, `studyRooms/${roomId}/participants`, userId);
    await runTransaction(db, async (t) => {
        const doc = await t.get(participantRef);
        if (doc.exists()) t.update(participantRef, { handRaised: !doc.data().handRaised });
    });
}

export async function removeParticipantStatus(roomId: string, userId: string) {
    await deleteDoc(doc(db, `studyRooms/${roomId}/participants`, userId));
    // We intentionally do not remove from the participantIds array to maintain a historical record of who joined.
    // The presence check in the 'participants' subcollection is the source of truth for who is *currently* active.
}

export async function addStudyRoomResource(roomId: string, userId: string, userName: string, url: string): Promise<void> {
    await addDoc(collection(db, `studyRooms/${roomId}/resources`), {
        url, addedByUserId: userId, addedByUserName: userName, createdAt: Timestamp.now(),
    });
}

export async function deleteStudyRoomResource(roomId: string, resourceId: string): Promise<void> {
    await deleteDoc(doc(db, `studyRooms/${roomId}/resources`, resourceId));
}

export function getStudyRoomResourcesListener(roomId: string, callback: (resources: StudyRoomResource[]) => void): () => void {
    const q = query(collection(db, `studyRooms/${roomId}/resources`), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyRoomResource)));
    });
}

    
