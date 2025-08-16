// src/lib/adaptive-learning.ts
import { Timestamp } from 'firebase/firestore';

// Core Adaptive Learning Types
export interface AdaptiveLearningPath {
  personalityType: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  cognitiveLoad: number; // 1-10 scale
  learningVelocity: number; // concepts per hour
  knowledgeGaps: string[];
  nextOptimalLesson: string;
  difficultyAdjustment: number; // -2 to +2 adjustment from base difficulty
  confidenceLevel: number; // 0-1 scale
  lastUpdated: Timestamp;
}

export interface LearningStyleMetrics {
  visual: number; // preference score 0-1
  auditory: number;
  kinesthetic: number;
  reading: number;
  detectedFrom: {
    interactionPatterns: number;
    responseTypes: number;
    timeSpentOnContent: number;
    toolUsage: number;
  };
}

export interface CognitiveLoadIndicators {
  responseTime: number; // average ms per question
  errorRate: number; // 0-1 scale
  retryFrequency: number;
  sessionDuration: number; // minutes
  breakFrequency: number;
  frustrationSignals: number; // detected from patterns
  timestamp: Timestamp;
}

export interface LearningVelocityMetrics {
  conceptsPerHour: number;
  retentionRate: number; // 0-1 scale
  transferLearning: number; // ability to apply concepts to new problems
  masterySpeed: number; // time to reach 80% accuracy
  plateauDetection: boolean;
}

export interface KnowledgeGapAnalysis {
  subject: string;
  topic: string;
  gapType: 'prerequisite' | 'conceptual' | 'application' | 'synthesis';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedFrom: string[]; // exercise IDs, lesson IDs where gap was identified
  suggestedRemediation: string[];
  estimatedTimeToFill: number; // hours
}

export interface LearningPathNode {
  lessonId: string;
  prerequisites: string[];
  difficulty: number;
  estimatedDuration: number; // minutes
  learningObjectives: string[];
  adaptiveWeight: number; // how much this lesson should be prioritized
}

export interface AdaptiveLearningProfile {
  userId: string;
  currentPath: AdaptiveLearningPath;
  styleMetrics: LearningStyleMetrics;
  cognitiveHistory: CognitiveLoadIndicators[];
  velocityMetrics: LearningVelocityMetrics;
  knowledgeGaps: KnowledgeGapAnalysis[];
  pathNodes: LearningPathNode[];
  lastAnalysis: Timestamp;
  nextAnalysisScheduled: Timestamp;
}

// Interaction tracking for learning style detection
export interface InteractionEvent {
  userId: string;
  eventType: 'lesson_start' | 'lesson_complete' | 'exercise_attempt' | 'hint_request' | 
            'audio_play' | 'code_run' | 'image_view' | 'text_highlight' | 'note_take';
  lessonId?: string;
  exerciseId?: string;
  duration: number; // ms
  success: boolean;
  metadata: Record<string, any>;
  timestamp: Timestamp;
}

// Real-time adaptation triggers
export interface AdaptationTrigger {
  type: 'cognitive_overload' | 'boredom' | 'mastery_achieved' | 'knowledge_gap' | 'style_mismatch';
  severity: 'low' | 'medium' | 'high';
  suggestedAction: 'reduce_difficulty' | 'increase_difficulty' | 'change_modality' | 
                   'provide_remediation' | 'advance_topic' | 'take_break';
  confidence: number; // 0-1 scale
  triggeredBy: string[]; // event IDs that triggered this
}

// ML Model predictions
export interface LearningPrediction {
  nextOptimalLesson: {
    lessonId: string;
    confidence: number;
    reasoning: string[];
  };
  difficultyAdjustment: {
    adjustment: number;
    confidence: number;
    reasoning: string;
  };
  estimatedPerformance: {
    expectedScore: number;
    confidence: number;
    riskFactors: string[];
  };
  recommendedStudyTime: number; // minutes
}