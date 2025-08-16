// src/hooks/use-adaptive-learning.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { adaptiveLearningService } from '@/ai/services/adaptive-learning-service';
import { 
  AdaptiveLearningProfile, 
  AdaptiveLearningPath, 
  InteractionEvent,
  AdaptationTrigger 
} from '@/lib/adaptive-learning';
import { Timestamp } from 'firebase/firestore';

export interface UseAdaptiveLearningReturn {
  profile: AdaptiveLearningProfile | null;
  currentPath: AdaptiveLearningPath | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  trackInteraction: (event: Omit<InteractionEvent, 'userId' | 'timestamp'>) => Promise<void>;
  refreshAnalysis: () => Promise<void>;
  
  // Real-time adaptations
  adaptationTriggers: AdaptationTrigger[];
  clearTriggers: () => void;
  
  // Utilities
  getCognitiveLoadStatus: () => 'low' | 'medium' | 'high' | 'overload';
  getLearningStyleRecommendations: () => string[];
  getNextLessonRecommendation: () => { lessonId: string; confidence: number } | null;
}

export function useAdaptiveLearning(): UseAdaptiveLearningReturn {
  const [user] = useAuthState(auth);
  const [profile, setProfile] = useState<AdaptiveLearningProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adaptationTriggers, setAdaptationTriggers] = useState<AdaptationTrigger[]>([]);

  // Load user's adaptive learning profile
  const loadProfile = useCallback(async () => {
    if (!user?.uid) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const userProfile = await adaptiveLearningService.getProfile(user.uid);
      setProfile(userProfile);
      
      // Check if analysis is needed
      const now = Date.now();
      const lastAnalysis = userProfile.lastAnalysis.toMillis();
      const scheduledAnalysis = userProfile.nextAnalysisScheduled.toMillis();
      
      if (now > scheduledAnalysis || (now - lastAnalysis) > 24 * 60 * 60 * 1000) {
        // Trigger background analysis
        refreshAnalysis();
      }
      
    } catch (err) {
      console.error('Error loading adaptive learning profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load learning profile');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // Track user interaction for learning analytics
  const trackInteraction = useCallback(async (
    event: Omit<InteractionEvent, 'userId' | 'timestamp'>
  ) => {
    if (!user?.uid) return;

    try {
      const fullEvent: InteractionEvent = {
        ...event,
        userId: user.uid,
        timestamp: Timestamp.now()
      };

      await adaptiveLearningService.trackInteraction(fullEvent);
      
      // Check for real-time adaptation triggers
      await checkAdaptationTriggers(fullEvent);
      
    } catch (err) {
      console.error('Error tracking interaction:', err);
    }
  }, [user?.uid]);

  // Refresh learning analysis
  const refreshAnalysis = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setError(null);
      const updatedPath = await adaptiveLearningService.analyzeAndAdapt(user.uid);
      
      // Update profile with new path
      if (profile) {
        setProfile({
          ...profile,
          currentPath: updatedPath,
          lastAnalysis: Timestamp.now()
        });
      }
      
    } catch (err) {
      console.error('Error refreshing analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh analysis');
    }
  }, [user?.uid, profile]);

  // Check for adaptation triggers based on recent interaction
  const checkAdaptationTriggers = useCallback(async (event: InteractionEvent) => {
    if (!profile) return;

    const triggers: AdaptationTrigger[] = [];

    // Cognitive overload detection
    if (profile.currentPath.cognitiveLoad >= 8) {
      triggers.push({
        type: 'cognitive_overload',
        severity: profile.currentPath.cognitiveLoad >= 9 ? 'high' : 'medium',
        suggestedAction: 'reduce_difficulty',
        confidence: 0.8,
        triggeredBy: [event.eventType]
      });
    }

    // Boredom detection (low cognitive load + fast completion)
    if (profile.currentPath.cognitiveLoad <= 3 && event.success && event.duration < 10000) {
      triggers.push({
        type: 'boredom',
        severity: 'medium',
        suggestedAction: 'increase_difficulty',
        confidence: 0.6,
        triggeredBy: [event.eventType]
      });
    }

    // Knowledge gap detection
    if (!event.success && event.eventType === 'exercise_attempt') {
      triggers.push({
        type: 'knowledge_gap',
        severity: 'medium',
        suggestedAction: 'provide_remediation',
        confidence: 0.7,
        triggeredBy: [event.eventType]
      });
    }

    // Learning style mismatch detection
    const stylePreferences = {
      visual: profile.styleMetrics.visual,
      auditory: profile.styleMetrics.auditory,
      kinesthetic: profile.styleMetrics.kinesthetic,
      reading: profile.styleMetrics.reading
    };

    const dominantStyle = Object.entries(stylePreferences)
      .reduce((a, b) => stylePreferences[a[0] as keyof typeof stylePreferences] > stylePreferences[b[0] as keyof typeof stylePreferences] ? a : b)[0];

    if (dominantStyle !== profile.currentPath.personalityType) {
      triggers.push({
        type: 'style_mismatch',
        severity: 'low',
        suggestedAction: 'change_modality',
        confidence: 0.5,
        triggeredBy: [event.eventType]
      });
    }

    if (triggers.length > 0) {
      setAdaptationTriggers(prev => [...prev, ...triggers]);
    }
  }, [profile]);

  // Clear adaptation triggers
  const clearTriggers = useCallback(() => {
    setAdaptationTriggers([]);
  }, []);

  // Get cognitive load status
  const getCognitiveLoadStatus = useCallback((): 'low' | 'medium' | 'high' | 'overload' => {
    if (!profile) return 'medium';
    
    const load = profile.currentPath.cognitiveLoad;
    if (load <= 3) return 'low';
    if (load <= 6) return 'medium';
    if (load <= 8) return 'high';
    return 'overload';
  }, [profile]);

  // Get learning style recommendations
  const getLearningStyleRecommendations = useCallback((): string[] => {
    if (!profile) return [];

    const style = profile.currentPath.personalityType;
    const recommendations = {
      visual: [
        'Use diagrams and charts to understand concepts',
        'Create mind maps for complex topics',
        'Watch video explanations when available',
        'Use color coding in your notes'
      ],
      auditory: [
        'Listen to lesson audio when available',
        'Discuss concepts with others',
        'Read content aloud to yourself',
        'Use verbal mnemonics for memorization'
      ],
      kinesthetic: [
        'Practice coding exercises hands-on',
        'Take breaks to move around',
        'Use physical objects to model concepts',
        'Try building projects to apply learning'
      ],
      reading: [
        'Take detailed written notes',
        'Create summaries of key concepts',
        'Use flashcards for memorization',
        'Read additional resources on topics'
      ]
    };

    return recommendations[style] || [];
  }, [profile]);

  // Get next lesson recommendation
  const getNextLessonRecommendation = useCallback((): { lessonId: string; confidence: number } | null => {
    if (!profile || !profile.currentPath.nextOptimalLesson) return null;

    return {
      lessonId: profile.currentPath.nextOptimalLesson,
      confidence: profile.currentPath.confidenceLevel
    };
  }, [profile]);

  // Load profile on mount and user change
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Auto-refresh analysis periodically
  useEffect(() => {
    if (!user?.uid || !profile) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const lastAnalysis = profile.lastAnalysis.toMillis();
      
      // Refresh every 30 minutes if user is active
      if (now - lastAnalysis > 30 * 60 * 1000) {
        refreshAnalysis();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [user?.uid, profile, refreshAnalysis]);

  return {
    profile,
    currentPath: profile?.currentPath || null,
    isLoading,
    error,
    trackInteraction,
    refreshAnalysis,
    adaptationTriggers,
    clearTriggers,
    getCognitiveLoadStatus,
    getLearningStyleRecommendations,
    getNextLessonRecommendation
  };
}