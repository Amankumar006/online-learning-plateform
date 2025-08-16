// src/ai/services/adaptive-learning-service.ts
import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    Timestamp,
    addDoc
} from 'firebase/firestore';
import {
    AdaptiveLearningProfile,
    AdaptiveLearningPath,
    LearningStyleMetrics,
    CognitiveLoadIndicators,
    KnowledgeGapAnalysis,
    InteractionEvent,
    LearningPrediction
} from '@/lib/adaptive-learning';
import { UserExerciseResponse, Lesson } from '@/lib/types';
import { prepareForFirestore, getDocumentData } from '@/lib/firestore-utils';

export class AdaptiveLearningService {

    // Initialize adaptive learning profile for new user
    async initializeProfile(userId: string): Promise<AdaptiveLearningProfile> {
        const profile: AdaptiveLearningProfile = {
            userId,
            currentPath: {
                personalityType: 'reading', // default, will be detected
                cognitiveLoad: 5,
                learningVelocity: 1.0,
                knowledgeGaps: [],
                nextOptimalLesson: '',
                difficultyAdjustment: 0,
                confidenceLevel: 0.5,
                lastUpdated: Timestamp.now()
            },
            styleMetrics: {
                visual: 0.25,
                auditory: 0.25,
                kinesthetic: 0.25,
                reading: 0.25,
                detectedFrom: {
                    interactionPatterns: 0,
                    responseTypes: 0,
                    timeSpentOnContent: 0,
                    toolUsage: 0
                }
            },
            cognitiveHistory: [],
            velocityMetrics: {
                conceptsPerHour: 1.0,
                retentionRate: 0.7,
                transferLearning: 0.5,
                masterySpeed: 60, // minutes
                plateauDetection: false
            },
            knowledgeGaps: [],
            pathNodes: [],
            lastAnalysis: Timestamp.now(),
            nextAnalysisScheduled: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000))
        };

        // Convert to Firestore-compatible format
        const profileData = prepareForFirestore(profile);
        await setDoc(doc(db, 'adaptiveLearningProfiles', userId), profileData);
        return profile;
    }

    // Get or create adaptive learning profile
    async getProfile(userId: string): Promise<AdaptiveLearningProfile> {
        const profileDoc = await getDoc(doc(db, 'adaptiveLearningProfiles', userId));

        if (!profileDoc.exists()) {
            return await this.initializeProfile(userId);
        }

        const data = profileDoc.data();
        return getDocumentData<AdaptiveLearningProfile>(data);
    }



    // Track interaction for learning style detection
    async trackInteraction(event: InteractionEvent): Promise<void> {
        // Convert to Firestore-compatible format
        const eventData = prepareForFirestore(event);
        await addDoc(collection(db, 'interactionEvents'), eventData);

        // Trigger real-time analysis if needed
        if (this.shouldTriggerAnalysis(event)) {
            await this.analyzeAndAdapt(event.userId);
        }
    }

    // Analyze cognitive load from recent interactions
    async analyzeCognitiveLoad(userId: string): Promise<CognitiveLoadIndicators> {
        const recentEvents = await this.getRecentInteractions(userId, 50);
        const recentResponses = await this.getRecentExerciseResponses(userId, 20);

        // Calculate response time patterns
        const responseTimes = recentResponses
            .filter(r => r.submittedAt > Date.now() - 24 * 60 * 60 * 1000) // last 24 hours
            .map(r => this.estimateResponseTime(r));

        const avgResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 30000; // default 30 seconds

        // Calculate error rate
        const errorRate = recentResponses.length > 0
            ? recentResponses.filter(r => !r.isCorrect).length / recentResponses.length
            : 0.5;

        // Detect frustration signals
        const frustrationSignals = this.detectFrustrationSignals(recentEvents, recentResponses);

        // Calculate session patterns
        const sessionMetrics = this.analyzeSessionPatterns(recentEvents);

        const cognitiveLoad: CognitiveLoadIndicators = {
            responseTime: avgResponseTime,
            errorRate,
            retryFrequency: this.calculateRetryFrequency(recentResponses),
            sessionDuration: sessionMetrics.avgDuration,
            breakFrequency: sessionMetrics.breakFrequency,
            frustrationSignals,
            timestamp: Timestamp.now()
        };

        return cognitiveLoad;
    }

    // Detect learning style from interaction patterns
    async detectLearningStyle(userId: string): Promise<LearningStyleMetrics> {
        const recentEvents = await this.getRecentInteractions(userId, 100);

        const styleScores = {
            visual: 0,
            auditory: 0,
            kinesthetic: 0,
            reading: 0
        };

        // Analyze interaction patterns
        for (const event of recentEvents) {
            switch (event.eventType) {
                case 'image_view':
                    styleScores.visual += event.duration / 1000; // seconds spent viewing
                    break;
                case 'audio_play':
                    styleScores.auditory += event.duration / 1000;
                    break;
                case 'code_run':
                case 'exercise_attempt':
                    styleScores.kinesthetic += 1;
                    break;
                case 'text_highlight':
                case 'note_take':
                    styleScores.reading += 1;
                    break;
            }
        }

        // Normalize scores
        const total = Object.values(styleScores).reduce((a, b) => a + b, 0);
        if (total > 0) {
            Object.keys(styleScores).forEach(key => {
                styleScores[key as keyof typeof styleScores] /= total;
            });
        } else {
            // Default equal distribution
            Object.keys(styleScores).forEach(key => {
                styleScores[key as keyof typeof styleScores] = 0.25;
            });
        }

        return {
            ...styleScores,
            detectedFrom: {
                interactionPatterns: recentEvents.length,
                responseTypes: this.countResponseTypes(recentEvents),
                timeSpentOnContent: this.calculateTotalTimeSpent(recentEvents),
                toolUsage: this.countToolUsage(recentEvents)
            }
        };
    }

    // Analyze knowledge gaps from exercise performance
    async analyzeKnowledgeGaps(userId: string): Promise<KnowledgeGapAnalysis[]> {
        const responses = await this.getRecentExerciseResponses(userId, 100);
        const lessons = await this.getAllLessons();

        const gaps: KnowledgeGapAnalysis[] = [];
        const subjectPerformance = new Map<string, { correct: number; total: number; exercises: string[] }>();

        // Group responses by subject
        for (const response of responses) {
            const lesson = lessons.find(l => l.id === response.lessonId);
            if (!lesson) continue;

            const subject = lesson.subject;
            if (!subjectPerformance.has(subject)) {
                subjectPerformance.set(subject, { correct: 0, total: 0, exercises: [] });
            }

            const perf = subjectPerformance.get(subject)!;
            perf.total++;
            perf.exercises.push(response.exerciseId);
            if (response.isCorrect) perf.correct++;
        }

        // Identify gaps
        for (const [subject, perf] of subjectPerformance) {
            const accuracy = perf.correct / perf.total;

            if (accuracy < 0.6) { // Below 60% accuracy indicates a gap
                const severity = accuracy < 0.3 ? 'critical' :
                    accuracy < 0.45 ? 'high' :
                        accuracy < 0.6 ? 'medium' : 'low';

                gaps.push({
                    subject,
                    topic: subject, // Could be more granular with topic analysis
                    gapType: 'conceptual',
                    severity: severity as 'low' | 'medium' | 'high' | 'critical',
                    detectedFrom: perf.exercises,
                    suggestedRemediation: await this.generateRemediationSuggestions(subject, accuracy),
                    estimatedTimeToFill: this.estimateRemediationTime(severity, perf.total)
                });
            }
        }

        return gaps;
    }

    // Main analysis and adaptation function
    async analyzeAndAdapt(userId: string): Promise<AdaptiveLearningPath> {
        const profile = await this.getProfile(userId);

        // Perform all analyses
        const [cognitiveLoad, learningStyle, knowledgeGaps] = await Promise.all([
            this.analyzeCognitiveLoad(userId),
            this.detectLearningStyle(userId),
            this.analyzeKnowledgeGaps(userId)
        ]);

        // Update cognitive history
        profile.cognitiveHistory.push(cognitiveLoad);
        if (profile.cognitiveHistory.length > 50) {
            profile.cognitiveHistory = profile.cognitiveHistory.slice(-50); // Keep last 50
        }

        // Update learning style
        profile.styleMetrics = learningStyle;

        // Determine dominant learning style
        const dominantStyle = Object.entries(learningStyle)
            .filter(([key]) => key !== 'detectedFrom')
            .reduce((a, b) => learningStyle[a[0] as keyof LearningStyleMetrics] > learningStyle[b[0] as keyof LearningStyleMetrics] ? a : b)[0] as 'visual' | 'auditory' | 'kinesthetic' | 'reading';

        // Calculate cognitive load score (1-10)
        const cognitiveLoadScore = this.calculateCognitiveLoadScore(cognitiveLoad);

        // Update knowledge gaps
        profile.knowledgeGaps = knowledgeGaps;

        // Generate predictions for next optimal lesson
        const prediction = await this.predictNextOptimalLesson(userId, profile);

        // Update adaptive learning path
        const updatedPath: AdaptiveLearningPath = {
            personalityType: dominantStyle,
            cognitiveLoad: cognitiveLoadScore,
            learningVelocity: this.calculateLearningVelocity(profile),
            knowledgeGaps: knowledgeGaps.map(gap => `${gap.subject}:${gap.topic}`),
            nextOptimalLesson: prediction.nextOptimalLesson.lessonId,
            difficultyAdjustment: prediction.difficultyAdjustment.adjustment,
            confidenceLevel: Math.min(prediction.nextOptimalLesson.confidence, prediction.difficultyAdjustment.confidence),
            lastUpdated: Timestamp.now()
        };

        // Update profile
        profile.currentPath = updatedPath;
        profile.lastAnalysis = Timestamp.now();
        profile.nextAnalysisScheduled = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

        // Save updated profile - convert to Firestore-compatible format
        const profileData = prepareForFirestore(profile);
        await updateDoc(doc(db, 'adaptiveLearningProfiles', userId), profileData);

        return updatedPath;
    }

    // Helper methods
    private shouldTriggerAnalysis(event: InteractionEvent): boolean {
        // Trigger analysis on certain events or patterns
        return event.eventType === 'lesson_complete' ||
            (event.eventType === 'exercise_attempt' && !event.success) ||
            Math.random() < 0.1; // 10% chance for continuous learning
    }

    private async getRecentInteractions(userId: string, limit_count: number): Promise<InteractionEvent[]> {
        const q = query(
            collection(db, 'interactionEvents'),
            where('userId', '==', userId),
            orderBy('timestamp', 'desc'),
            limit(limit_count)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => getDocumentData<InteractionEvent>(doc.data()));
    }

    private async getRecentExerciseResponses(userId: string, limit_count: number): Promise<UserExerciseResponse[]> {
        const q = query(
            collection(db, 'exerciseResponses'),
            where('userId', '==', userId),
            orderBy('submittedAt', 'desc'),
            limit(limit_count)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as UserExerciseResponse);
    }

    private async getAllLessons(): Promise<Lesson[]> {
        const snapshot = await getDocs(collection(db, 'lessons'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
    }

    private estimateResponseTime(_response: UserExerciseResponse): number {
        // Estimate based on question complexity and user patterns
        // This is a simplified version - in reality, you'd track actual response times
        return 30000; // 30 seconds default
    }

    private detectFrustrationSignals(events: InteractionEvent[], responses: UserExerciseResponse[]): number {
        let signals = 0;

        // Multiple wrong attempts in short time
        const recentWrongAnswers = responses.filter(r =>
            !r.isCorrect && r.submittedAt > Date.now() - 10 * 60 * 1000 // last 10 minutes
        );
        signals += Math.min(recentWrongAnswers.length, 3);

        // Rapid hint requests
        const hintRequests = events.filter(e =>
            e.eventType === 'hint_request' &&
            e.timestamp.toMillis() > Date.now() - 5 * 60 * 1000 // last 5 minutes
        );
        signals += Math.min(hintRequests.length, 2);

        return signals;
    }

    private analyzeSessionPatterns(events: InteractionEvent[]): { avgDuration: number; breakFrequency: number } {
        // Simplified session analysis
        const totalDuration = events.reduce((sum, event) => sum + event.duration, 0);
        const avgDuration = events.length > 0 ? totalDuration / events.length / 1000 / 60 : 30; // minutes

        // Estimate break frequency based on gaps in activity
        const breakFrequency = 0.1; // placeholder

        return { avgDuration, breakFrequency };
    }

    private calculateRetryFrequency(responses: UserExerciseResponse[]): number {
        const exerciseAttempts = new Map<string, number>();

        for (const response of responses) {
            const key = `${response.lessonId}_${response.exerciseId}`;
            exerciseAttempts.set(key, (exerciseAttempts.get(key) || 0) + 1);
        }

        const retries = Array.from(exerciseAttempts.values()).filter(attempts => attempts > 1);
        return retries.length / exerciseAttempts.size;
    }

    private countResponseTypes(events: InteractionEvent[]): number {
        const types = new Set(events.map(e => e.eventType));
        return types.size;
    }

    private calculateTotalTimeSpent(events: InteractionEvent[]): number {
        return events.reduce((sum, event) => sum + event.duration, 0) / 1000 / 60; // minutes
    }

    private countToolUsage(events: InteractionEvent[]): number {
        const toolEvents = events.filter(e =>
            ['code_run', 'hint_request', 'audio_play', 'image_view'].includes(e.eventType)
        );
        return toolEvents.length;
    }

    private async generateRemediationSuggestions(subject: string, accuracy: number): Promise<string[]> {
        // Generate AI-powered remediation suggestions
        const suggestions = [
            `Review fundamental concepts in ${subject}`,
            `Practice more basic exercises before advancing`,
            `Use visual aids and examples for better understanding`
        ];

        if (accuracy < 0.3) {
            suggestions.push(`Consider one-on-one tutoring for ${subject}`);
        }

        return suggestions;
    }

    private estimateRemediationTime(severity: string, totalExercises: number): number {
        const baseTime = {
            'low': 2,
            'medium': 4,
            'high': 8,
            'critical': 16
        }[severity] || 4;

        return baseTime + (totalExercises * 0.1); // Additional time based on exercise count
    }

    private calculateCognitiveLoadScore(indicators: CognitiveLoadIndicators): number {
        // Combine multiple indicators into a 1-10 score
        let score = 5; // baseline

        // High error rate increases cognitive load
        score += indicators.errorRate * 3;

        // High retry frequency increases load
        score += indicators.retryFrequency * 2;

        // Frustration signals increase load
        score += indicators.frustrationSignals * 0.5;

        // Long response times might indicate struggle
        if (indicators.responseTime > 60000) { // > 1 minute
            score += 1;
        }

        return Math.max(1, Math.min(10, Math.round(score)));
    }

    private calculateLearningVelocity(profile: AdaptiveLearningProfile): number {
        // Calculate based on recent performance trends
        const recentCognitive = profile.cognitiveHistory.slice(-10);
        if (recentCognitive.length === 0) return 1.0;

        const avgErrorRate = recentCognitive.reduce((sum, c) => sum + c.errorRate, 0) / recentCognitive.length;
        const avgResponseTime = recentCognitive.reduce((sum, c) => sum + c.responseTime, 0) / recentCognitive.length;

        // Lower error rate and faster response time = higher velocity
        let velocity = 1.0;
        velocity *= (1 - avgErrorRate); // Reduce velocity for high error rates
        velocity *= Math.max(0.5, Math.min(2.0, 30000 / avgResponseTime)); // Adjust for response time

        return Math.max(0.1, Math.min(3.0, velocity));
    }

    private async predictNextOptimalLesson(userId: string, profile: AdaptiveLearningProfile): Promise<LearningPrediction> {
        // This would integrate with your ML model
        // For now, implementing rule-based logic

        const lessons = await this.getAllLessons();
        const userProgress = await this.getUserProgress(userId);

        // Filter lessons based on knowledge gaps and completed lessons
        const availableLessons = lessons.filter(lesson =>
            !userProgress.completedLessonIds.includes(lesson.id)
        );

        // Simple scoring based on difficulty and knowledge gaps
        let bestLesson = availableLessons[0];
        let bestScore = 0;

        for (const lesson of availableLessons) {
            let score = 0;

            // Prefer lessons that address knowledge gaps
            if (profile.knowledgeGaps.some(gap => gap.subject === lesson.subject)) {
                score += 2;
            }

            // Adjust for cognitive load
            const difficultyMap = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
            const lessonDifficulty = difficultyMap[lesson.difficulty];

            if (profile.currentPath.cognitiveLoad > 7) {
                // High cognitive load - prefer easier lessons
                score += (4 - lessonDifficulty);
            } else if (profile.currentPath.cognitiveLoad < 4) {
                // Low cognitive load - can handle harder lessons
                score += lessonDifficulty;
            }

            if (score > bestScore) {
                bestScore = score;
                bestLesson = lesson;
            }
        }

        // Calculate difficulty adjustment
        let difficultyAdjustment = 0;
        if (profile.currentPath.cognitiveLoad > 7) {
            difficultyAdjustment = -1; // Make it easier
        } else if (profile.currentPath.cognitiveLoad < 4) {
            difficultyAdjustment = 1; // Make it harder
        }

        return {
            nextOptimalLesson: {
                lessonId: bestLesson?.id || '',
                confidence: 0.7,
                reasoning: ['Based on knowledge gaps and cognitive load analysis']
            },
            difficultyAdjustment: {
                adjustment: difficultyAdjustment,
                confidence: 0.8,
                reasoning: `Cognitive load is ${profile.currentPath.cognitiveLoad}/10`
            },
            estimatedPerformance: {
                expectedScore: 75,
                confidence: 0.6,
                riskFactors: profile.knowledgeGaps.map(gap => `Knowledge gap in ${gap.subject}`)
            },
            recommendedStudyTime: 45 // minutes
        };
    }

    private async getUserProgress(userId: string): Promise<{ completedLessonIds: string[] }> {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();
        return {
            completedLessonIds: userData?.progress?.completedLessonIds || []
        };
    }
}

// Singleton instance
export const adaptiveLearningService = new AdaptiveLearningService();