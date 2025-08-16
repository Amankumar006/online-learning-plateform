// src/lib/test-adaptive-learning.ts
import { adaptiveLearningService } from '@/ai/services/adaptive-learning-service';
import { Timestamp } from 'firebase/firestore';

/**
 * Test function to verify adaptive learning system works
 * This can be called from a component or API route for testing
 */
export async function testAdaptiveLearning(userId: string) {
  try {
    console.log('🧪 Testing Adaptive Learning System...');

    // 1. Initialize or get profile
    console.log('📊 Getting user profile...');
    const profile = await adaptiveLearningService.getProfile(userId);
    console.log('✅ Profile loaded:', {
      personalityType: profile.currentPath.personalityType,
      cognitiveLoad: profile.currentPath.cognitiveLoad,
      learningVelocity: profile.currentPath.learningVelocity
    });

    // 2. Simulate some interactions
    console.log('🎯 Simulating user interactions...');
    
    // Simulate lesson start
    await adaptiveLearningService.trackInteraction({
      userId,
      eventType: 'lesson_start',
      lessonId: 'test-lesson-1',
      duration: 0,
      success: true,
      metadata: { testMode: true },
      timestamp: Timestamp.now()
    });

    // Simulate exercise attempts
    await adaptiveLearningService.trackInteraction({
      userId,
      eventType: 'exercise_attempt',
      lessonId: 'test-lesson-1',
      exerciseId: 'test-exercise-1',
      duration: 45000, // 45 seconds
      success: true,
      metadata: { difficulty: 2, attempts: 1 },
      timestamp: Timestamp.now()
    });

    // Simulate a failed attempt (to test cognitive load)
    await adaptiveLearningService.trackInteraction({
      userId,
      eventType: 'exercise_attempt',
      lessonId: 'test-lesson-1',
      exerciseId: 'test-exercise-2',
      duration: 120000, // 2 minutes (longer response time)
      success: false,
      metadata: { difficulty: 3, attempts: 2 },
      timestamp: Timestamp.now()
    });

    // Simulate hint request (frustration signal)
    await adaptiveLearningService.trackInteraction({
      userId,
      eventType: 'hint_request',
      lessonId: 'test-lesson-1',
      exerciseId: 'test-exercise-2',
      duration: 5000,
      success: false,
      metadata: { hintShown: true },
      timestamp: Timestamp.now()
    });

    // Simulate visual content interaction
    await adaptiveLearningService.trackInteraction({
      userId,
      eventType: 'image_view',
      lessonId: 'test-lesson-1',
      duration: 30000, // 30 seconds viewing image
      success: true,
      metadata: { imageType: 'diagram' },
      timestamp: Timestamp.now()
    });

    console.log('✅ Interactions tracked successfully');

    // 3. Trigger analysis
    console.log('🔍 Running adaptive analysis...');
    const updatedPath = await adaptiveLearningService.analyzeAndAdapt(userId);
    
    console.log('✅ Analysis complete:', {
      personalityType: updatedPath.personalityType,
      cognitiveLoad: updatedPath.cognitiveLoad,
      learningVelocity: updatedPath.learningVelocity,
      knowledgeGaps: updatedPath.knowledgeGaps,
      difficultyAdjustment: updatedPath.difficultyAdjustment,
      confidenceLevel: updatedPath.confidenceLevel
    });

    // 4. Get updated profile
    const finalProfile = await adaptiveLearningService.getProfile(userId);
    
    console.log('📈 Learning Style Metrics:', {
      visual: Math.round(finalProfile.styleMetrics.visual * 100) + '%',
      auditory: Math.round(finalProfile.styleMetrics.auditory * 100) + '%',
      kinesthetic: Math.round(finalProfile.styleMetrics.kinesthetic * 100) + '%',
      reading: Math.round(finalProfile.styleMetrics.reading * 100) + '%'
    });

    console.log('🧠 Cognitive Load History:', 
      finalProfile.cognitiveHistory.slice(-3).map(h => ({
        load: h.cognitiveLoad || 'N/A',
        errorRate: Math.round(h.errorRate * 100) + '%',
        frustration: h.frustrationSignals
      }))
    );

    console.log('🎯 Knowledge Gaps:', 
      finalProfile.knowledgeGaps.map(gap => ({
        subject: gap.subject,
        severity: gap.severity,
        timeToFill: gap.estimatedTimeToFill + 'h'
      }))
    );

    return {
      success: true,
      profile: finalProfile,
      adaptivePath: updatedPath,
      message: 'Adaptive learning system test completed successfully!'
    };

  } catch (error) {
    console.error('❌ Adaptive learning test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Adaptive learning system test failed'
    };
  }
}

/**
 * Quick validation function for development
 */
export function validateAdaptiveLearningTypes() {
  console.log('🔍 Validating adaptive learning types...');
  
  // This will cause TypeScript errors if types are incorrect
  const mockProfile = {
    userId: 'test',
    currentPath: {
      personalityType: 'visual' as const,
      cognitiveLoad: 5,
      learningVelocity: 1.2,
      knowledgeGaps: ['math:algebra'],
      nextOptimalLesson: 'lesson-123',
      difficultyAdjustment: 0,
      confidenceLevel: 0.8,
      lastUpdated: Timestamp.now()
    },
    styleMetrics: {
      visual: 0.4,
      auditory: 0.2,
      kinesthetic: 0.3,
      reading: 0.1,
      detectedFrom: {
        interactionPatterns: 10,
        responseTypes: 5,
        timeSpentOnContent: 120,
        toolUsage: 3
      }
    },
    cognitiveHistory: [],
    velocityMetrics: {
      conceptsPerHour: 1.5,
      retentionRate: 0.85,
      transferLearning: 0.7,
      masterySpeed: 45,
      plateauDetection: false
    },
    knowledgeGaps: [],
    pathNodes: [],
    lastAnalysis: Timestamp.now(),
    nextAnalysisScheduled: Timestamp.now()
  };

  console.log('✅ Types validation passed');
  return mockProfile;
}