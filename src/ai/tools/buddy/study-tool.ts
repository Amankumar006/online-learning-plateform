import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { generateStudyTopics } from '../../flows/generate-study-topics';

export const suggestTopicsTool = ai.defineTool(
    {
        name: 'suggestStudyTopics',
        description: 'Suggests new topics for a user to study based on their progress. Use this when the user asks "what should I learn next?", "suggest a topic", or a similar question about guidance.',
        inputSchema: z.object({}),
        outputSchema: z.string(),
    },
    async (_) => {
        try {
            // Import context here to avoid circular dependencies
            const { getCurrentContext } = await import('./context');
            const { currentUserId, currentUserProgress, currentAvailableLessons } = getCurrentContext();

            if (!currentUserId) {
                return "I can suggest some general study topics, but to provide personalized recommendations based on your progress, please make sure you are logged in.";
            }

            if (!currentUserProgress || !currentAvailableLessons) {
                return "I don't have access to your progress data right now. Here are some popular topics you might enjoy: Python programming, JavaScript fundamentals, Data structures and algorithms, Web development basics, or Mathematics fundamentals.";
            }

            const completedLessonIds = currentUserProgress.completedLessonIds || [];
            const subjectsMastery = currentUserProgress.subjectsMastery || [];
            
            const progressSummary = `Completed lessons: ${completedLessonIds.length}. Mastery by subject: ${subjectsMastery.map((s: any) => `${s.subject}: ${s.mastery}%`).join(', ') || 'None'}.`;
            const goals = 'Achieve mastery in all available subjects and discover new areas of interest.';
            const uncompletedLessonTitles = currentAvailableLessons
                .filter((l: any) => !completedLessonIds.includes(l.id))
                .map((l: any) => l.title);

            if (uncompletedLessonTitles.length === 0) {
                return "It looks like you've completed all available lessons! Great job! I can't suggest any new ones right now, but feel free to ask me to create a custom practice exercise for you on any topic."
            }

            const result = await generateStudyTopics({
                currentProgress: progressSummary,
                learningGoals: goals,
                availableLessons: uncompletedLessonTitles.slice(0, 10)
            });

            return `Based on your progress, here are some personalized study suggestions:\n\n${result.suggestedTopics.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`;
        } catch (error) {
            console.error('Error in suggestTopicsTool:', error);
            return 'Sorry, I encountered an error while trying to suggest topics. Here are some general recommendations: Try exploring Python programming, JavaScript fundamentals, or mathematics concepts that interest you.';
        }
    }
);