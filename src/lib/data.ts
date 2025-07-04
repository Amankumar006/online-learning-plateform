
// src/lib/data.ts
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, query, where, setDoc, addDoc, deleteDoc, updateDoc, arrayUnion, increment, runTransaction, Timestamp, orderBy, limit } from 'firebase/firestore';
import { format, startOfWeek, subDays } from 'date-fns';
import { generateLessonContent } from '@/ai/flows/generate-lesson-content';
import { generateLessonImage } from '@/ai/flows/generate-lesson-image';
import { uploadImageFromDataUrl } from './storage';
import { GradeMathSolutionOutput } from '@/ai/flows/grade-math-solution';


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
  photoURL?: string;
  role: 'student' | 'admin';
  progress: UserProgress;
  lastLessonRequestAt?: number;
  lastCheckedAnnouncementsAt?: Timestamp;
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading/writing' | 'unspecified';
  interests?: string[];
  goals?: string;
  gradeLevel?: string;
  ageGroup?: string;
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
            learningStyle: 'unspecified',
            interests: [],
            goals: '',
            gradeLevel: '',
            ageGroup: '',
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
    }
}

export async function createCustomAnnouncement(announcementData: Omit<Announcement, 'id' | 'createdAt'>, sendToGmail?: boolean): Promise<void> {
    try {
        const payload: { [key: string]: any } = { ...announcementData };
        // Firestore rejects `undefined` values. If the link is falsy (empty or undefined), remove it.
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

export async function createLesson(lessonData: Omit<Lesson, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "lessons"), lessonData);
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
        const q = query(collection(db, "exercises"), where("lessonId", "==", lessonId), where("isCustom", "==", false));
        const querySnapshot = await getDocs(q);
        const exercisesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise));
        return exercisesList;
    } catch (error) {
      console.error("Error fetching exercises: ", error);
      return [];
    }
}

export async function getCustomExercisesForUser(userId: string): Promise<Exercise[]> {
    if (!userId) {
        return [];
    }
    const userExercisesQuery = query(collection(db, "exercises"), where("isCustom", "==", true), where("userId", "==", userId));

    const snapshot = await getDocs(userExercisesQuery);

    const exercisesList = snapshot.docs.map(doc => {
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
            
            // To accommodate FillInTheBlanksExercise which has no `question` prop
            const questionText = data.type === 'fill_in_the_blanks' 
                ? (data as FillInTheBlanksExercise).questionParts.join('___') 
                : (data as BaseExercise).question;

            return {
                id: doc.id,
                ...data,
                question: questionText,
                lessonTitle: lessonsMap.get(data.lessonId) || (data.isCustom ? 'Custom Practice' : 'Unknown Lesson'),
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
        throw new Error("Failed to delete lesson");
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
            const newMastery = totalLessonsInSubject > 0 ? Math.round((completedInSubjectCount / totalLessonsInSubject) * 100) : 0;

            // Update or add the subject in the mastery array
            const subjectsMastery = progress.subjectsMastery || [];
            const subjectIndex = subjectsMastery.findIndex(sm => sm.subject === subject);

            if (subjectIndex > -1) {
                subjectsMastery[subjectIndex].mastery = newMastery;
            } else {
                subjectsMastery.push({ subject: subject, mastery: newMastery });
            }

            // Calculate overall mastery
            const totalMastery = subjectsMastery.reduce((acc, subj) => acc + subj.mastery, 0);
            const overallMastery = subjectsMastery.length > 0 ? Math.round(totalMastery / subjectsMastery.length) : 0;

            // Update user document
            transaction.update(userRef, {
                'progress.completedLessons': increment(1),
                'progress.completedLessonIds': completedLessonIds,
                'progress.subjectsMastery': subjectsMastery,
                'progress.mastery': overallMastery,
            });
        });
    } catch (error) {
        console.error("Error completing lesson: ", error);
        throw new Error("Failed to update lesson progress.");
    }
}


export async function saveExerciseAttempt(
    userId: string,
    lessonTitle: string,
    exercise: Exercise,
    submittedAnswer: string | boolean | string[],
    isCorrect: boolean,
    score: number,
    feedback?: string | GradeMathSolutionOutput,
    imageDataUri?: string | null
) {
    const userRef = doc(db, 'users', userId);
    // Use a predictable ID to easily check for existence and avoid duplicates
    const responseRef = doc(db, 'exerciseResponses', `${userId}_${exercise.id}`);
    
    try {
        const questionText = exercise.type === 'fill_in_the_blanks' ? exercise.questionParts.join('___') : exercise.question;

        const dataToSave: Omit<UserExerciseResponse, 'id'> = {
            userId,
            lessonId: exercise.lessonId,
            exerciseId: exercise.id,
            question: questionText,
            lessonTitle: lessonTitle,
            submittedAnswer,
            isCorrect,
            score,
            feedback: feedback || "",
            submittedAt: Date.now()
        };

        if (imageDataUri) {
            dataToSave.imageDataUri = imageDataUri;
        }

        // Save the detailed response record
        await setDoc(responseRef, dataToSave, { merge: true }); // Use merge to allow for re-attempts if needed in future

        // Then, update aggregate stats in a transaction
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

             // --- Weekly Activity Logic ---
            const weeklyActivity = progress.weeklyActivity || [];
            const weekStartDateStr = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
            let currentWeek = weeklyActivity.find(w => w.week === weekStartDateStr);

            if (currentWeek) {
                currentWeek.skillsMastered += (isCorrect ? 1 : 0);
                currentWeek.timeSpent += timePerExercise;
            } else {
                currentWeek = {
                    week: weekStartDateStr,
                    skillsMastered: (isCorrect ? 1 : 0),
                    timeSpent: timePerExercise
                };
                weeklyActivity.push(currentWeek);
            }
            const sortedWeeklyActivity = weeklyActivity
                .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
                .slice(-5); // Keep only the last 5 weeks

            transaction.update(userRef, { 
                'progress.totalExercisesAttempted': totalAttempted,
                'progress.totalExercisesCorrect': totalCorrect,
                'progress.averageScore': newAverageScore,
                'progress.timeSpent': newTimeSpent,
                'progress.weeklyActivity': sortedWeeklyActivity,
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

export async function getUserResponseForExercise(userId: string, exerciseId: string): Promise<UserExerciseResponse | null> {
    const responseRef = doc(db, 'exerciseResponses', `${userId}_${exerciseId}`);
    try {
        const responseSnap = await getDoc(responseRef);
        if (responseSnap.exists()) {
            return { id: responseSnap.id, ...responseSnap.data() } as UserExerciseResponse;
        }
        return null;
    } catch (error) {
        console.error("Error fetching user response for exercise:", error);
        return null;
    }
}

// Lesson Request Functions
export async function createLessonRequest(userId: string, userName: string, requestData: Omit<LessonRequest, 'id' | 'userId' | 'userName' | 'status' | 'createdAt'>): Promise<void> {
    const userRef = doc(db, 'users', userId);
    const requestRef = collection(db, 'lessonRequests');

    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
            throw new Error("User not found.");
        }

        const userData = userDoc.data() as User;
        const lastRequestTimestamp = userData.lastLessonRequestAt || 0;
        const oneWeekAgo = subDays(new Date(), 7).getTime();

        if (lastRequestTimestamp > oneWeekAgo) {
            throw new Error("You can only submit one lesson request per week.");
        }

        // Add the new lesson request
        transaction.set(doc(requestRef), {
            ...requestData,
            userId,
            userName,
            status: 'pending',
            createdAt: Timestamp.now(),
        });

        // Update the user's last request timestamp
        transaction.update(userRef, { lastLessonRequestAt: Date.now() });
    });
}

export async function getPendingLessonRequests(): Promise<LessonRequest[]> {
    try {
        const q = query(collection(db, "lessonRequests"), where("status", "==", "pending"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LessonRequest));
    } catch (error) {
        console.error("Error fetching pending lesson requests:", error);
        return [];
    }
}

export async function approveLessonRequest(requestId: string): Promise<void> {
    const requestRef = doc(db, 'lessonRequests', requestId);
    
    await runTransaction(db, async (transaction) => {
        const requestDoc = await transaction.get(requestRef);
        if (!requestDoc.exists() || requestDoc.data().status !== 'pending') {
            throw new Error("Request not found or already processed.");
        }
        
        const requestData = requestDoc.data() as Omit<LessonRequest, 'id'>;

        // 1. Generate Lesson Content with AI
        const lessonContent = await generateLessonContent({
            topic: requestData.title,
            subject: requestData.subject,
            topicDepth: "Detailed", // Can be customized further
        });

        // 2. Generate Lesson Image with AI
        const imagePrompt = `A high-quality, educational illustration for a lesson on "${lessonContent.title}" in the subject of ${lessonContent.subject}.`;
        const generatedImage = await generateLessonImage({ prompt: imagePrompt });

        // 3. Upload Image to Storage
        const fileName = `lesson_${Date.now()}`;
        const imageUrl = await uploadImageFromDataUrl(generatedImage.imageUrl, fileName);

        // 4. Create Lesson in Firestore
        const lessonData = {
            ...lessonContent,
            image: imageUrl,
        };
        const lessonRef = doc(collection(db, 'lessons'));
        transaction.set(lessonRef, lessonData);

        // 5. Update Request Status
        transaction.update(requestRef, { status: 'approved' });

        // 6. Create Announcement
        const announcementData = {
            type: 'new_lesson' as AnnouncementType,
            title: `New Lesson Added: ${lessonData.title}`,
            message: `A new lesson requested by the community is now available.`,
            link: `/dashboard/lessons/${lessonRef.id}`,
            createdAt: Timestamp.now(),
        };
        const announcementRef = doc(collection(db, 'announcements'));
        transaction.set(announcementRef, announcementData);

    });
}

export async function getRecentAnnouncements(count = 10): Promise<Announcement[]> {
    try {
        const q = query(
            collection(db, "announcements"),
            orderBy("createdAt", "desc"),
            limit(count)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
    } catch (error) {
        console.error("Error fetching recent announcements:", error);
        return [];
    }
}

export async function markAnnouncementsAsRead(userId: string): Promise<void> {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { lastCheckedAnnouncementsAt: Timestamp.now() });
    } catch (error) {
        console.error("Error marking announcements as read:", error);
        throw new Error("Failed to update user's notification status.");
    }
}
export async function getSolutionHistory(userId: string): Promise<UserExerciseResponse[]> {
    try {
        const responsesQuery = query(
            collection(db, "exerciseResponses"), 
            where("userId", "==", userId), 
            orderBy("submittedAt", "desc")
        );
        
        const responsesSnapshot = await getDocs(responsesQuery);
        if (responsesSnapshot.empty) {
            return [];
        }
        
        const history = responsesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as UserExerciseResponse));

        return history;
    } catch (error) {
        console.error("Error fetching solution history:", error);
        // Return empty array on error to prevent crashing the UI
        return [];
    }
}
