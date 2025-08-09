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
    question: string;
    options: string[];
    correctAnswer: string;
}

export interface TrueFalseExercise extends BaseExercise {
    type: 'true_false';
    question: string;
    correctAnswer: boolean;
}

export interface LongFormExercise extends BaseExercise {
    type: 'long_form';
    question: string;
    language?: string;
    evaluationCriteria: string;
}

export interface FillInTheBlanksExercise extends BaseExercise {
    type: 'fill_in_the_blanks';
    question?: string; // Optional for compatibility, can be derived from questionParts
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

export interface ExerciseWithLessonTitle {
    id: string;
    lessonId: string;
    difficulty: number;
    explanation?: string;
    hint?: string;
    category?: 'code' | 'math' | 'general';
    isCustom?: boolean;
    userId?: string | null;
    tags?: string[];
    createdAt?: number;
    type: 'mcq' | 'true_false' | 'long_form' | 'fill_in_the_blanks';
    
    // Fields that vary by type
    question?: string; // For mcq, true_false, long_form
    questionParts?: string[]; // For fill_in_the_blanks
    options?: string[]; // For mcq
    correctAnswer?: string | boolean; // For mcq and true_false
    correctAnswers?: string[]; // For fill_in_the_blanks
    language?: string; // For long_form
    evaluationCriteria?: string; // For long_form
    
    // Added field
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

// --- Conversation Memory Types ---
export interface ConversationPattern {
    topicFrequency: { [topic: string]: number };
    difficultyPreference: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
    preferredExplanationStyle: 'visual' | 'textual' | 'examples' | 'step-by-step' | 'mixed';
    toolUsagePreference: {
        createExercise: number;
        visualDiagrams: number;
        webSearch: number;
        codeAnalysis: number;
    };
    commonQuestionPatterns: string[];
    learningVelocity: number; // concepts per session
    sessionDuration: number; // average minutes per session
    lastUpdated: Timestamp;
}

export interface ConversationMemory {
    userId: string;
    totalSessions: number;
    totalMessages: number;
    patterns: ConversationPattern;
    recentTopics: Array<{
        topic: string;
        timestamp: Timestamp;
        understanding: 'struggling' | 'learning' | 'mastered';
    }>;
    personalizedPrompts: string[];
    contextCarryover: {
        lastDiscussedConcept?: string;
        openQuestions: string[];
        suggestedNextTopics: string[];
    };
}

export interface MediaContent {
    id: string;
    type: 'image' | 'audio' | 'video';
    url: string;
    dataUri?: string;
    description?: string;
    generatedBy: 'ai' | 'user';
    associatedText?: string;
    metadata?: {
        duration?: number; // for audio/video
        dimensions?: { width: number; height: number }; // for images
        fileSize?: number;
    };
    createdAt: Timestamp;
}

export interface EnhancedMessage {
    id: string;
    role: 'user' | 'model';
    content: string;
    timestamp: Timestamp;
    mediaContent?: MediaContent[];
    context?: {
        lessonId?: string;
        topicTags?: string[];
        difficulty?: number;
        toolsUsed?: string[];
    };
    userFeedback?: {
        helpful: boolean;
        rating?: number;
        notes?: string;
    };
}

export interface ConversationSession {
    id: string;
    userId: string;
    persona: 'buddy' | 'mentor';
    title: string;
    messages: EnhancedMessage[];
    startTime: Timestamp;
    endTime?: Timestamp;
    duration?: number; // in seconds
    topicsCovered: string[];
    toolsUsed: string[];
    learningOutcomes?: string[];
    sessionSummary?: string;
}
