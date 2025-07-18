// src/lib/types.ts
import { Timestamp } from 'firebase/firestore';
import { GradeMathSolutionOutput } from '@/ai/flows/grade-math-solution';

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
  sections?: Section[];
  content?: any; // For backward compatibility
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
    editorIds: string[];
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

// --- Utility Panel Types ---
export interface Task {
    id: string;
    text: string;
    completed: boolean;
    createdAt: Timestamp;
}

export interface Note {
    id: string;
    title: string;
    content: string;
    isPinned: boolean;
    createdAt: Timestamp;
}
