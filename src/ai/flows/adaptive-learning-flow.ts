// src/ai/flows/adaptive-learning-flow.ts
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { adaptiveLearningService } from '@/ai/services/adaptive-learning-service';
import { 
  AdaptiveLearningPath, 
  LearningPrediction,
  KnowledgeGapAnalysis 
} from '@/lib/adaptive-learning';

// Input schemas
const AnalyzeUserLearningInputSchema = z.object({
  userId: z.string().describe('The user ID to analyze'),
  includeRecommendations: z.boolean().optional().default(true).describe('Whether to include lesson recommendations')
});

const PredictOptimalPathInputSchema = z.object({
  userId: z.string().describe('The user ID'),
  currentLessonId: z.string().optional().describe('Current lesson being studied'),
  targetSubject: z.string().optional().describe('Subject to focus on'),
  timeAvailable: z.number().optional().describe('Available study time in minutes')
});

const GeneratePersonalizedContentInputSchema = z.object({
  userId: z.string().describe('The user ID'),
  lessonId: z.string().describe('The lesson to personalize'),
  learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'reading']).describe('Detected learning style'),
  cognitiveLoad: z.number().min(1).max(10).describe('Current cognitive load level'),
  knowledgeGaps: z.array(z.string()).describe('Identified knowledge gaps')
});

// Output schemas
const LearningAnalysisOutputSchema = z.object({
  adaptivePath: z.object({
    personalityType: z.enum(['visual', 'auditory', 'kinesthetic', 'reading']),
    cognitiveLoad: z.number().min(1).max(10),
    learningVelocity: z.number(),
    knowledgeGaps: z.array(z.string()),
    nextOptimalLesson: z.string(),
    difficultyAdjustment: z.number(),
    confidenceLevel: z.number()
  }),
  recommendations: z.array(z.object({
    type: z.enum(['lesson', 'exercise', 'break', 'review']),
    title: z.string(),
    description: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
    estimatedTime: z.number()
  })).optional(),
  insights: z.array(z.string()).describe('Key insights about the learner')
});

const PersonalizedContentOutputSchema = z.object({
  adaptedContent: z.object({
    introduction: z.string().describe('Personalized introduction based on learning style'),
    keyPoints: z.array(z.string()).describe('Main concepts adapted for the learner'),
    examples: z.array(z.object({
      title: z.string(),
      content: z.string(),
      type: z.enum(['visual', 'auditory', 'kinesthetic', 'textual'])
    })),
    exercises: z.array(z.object({
      question: z.string(),
      difficulty: z.number().min(1).max(5),
      type: z.enum(['multiple_choice', 'coding', 'explanation', 'practical'])
    })),
    studyTips: z.array(z.string()).describe('Personalized study tips')
  }),
  adaptationReasoning: z.string().describe('Explanation of why content was adapted this way')
});

// Type exports
export type AnalyzeUserLearningInput = z.infer<typeof AnalyzeUserLearningInputSchema>;
export type PredictOptimalPathInput = z.infer<typeof PredictOptimalPathInputSchema>;
export type GeneratePersonalizedContentInput = z.infer<typeof GeneratePersonalizedContentInputSchema>;
export type LearningAnalysisOutput = z.infer<typeof LearningAnalysisOutputSchema>;
export type PersonalizedContentOutput = z.infer<typeof PersonalizedContentOutputSchema>;

// AI Prompts
const analyzeUserLearningPrompt = ai.definePrompt({
  name: 'analyzeUserLearningPrompt',
  input: { 
    schema: z.object({
      learningData: z.string().describe('JSON string of user learning data'),
      includeRecommendations: z.boolean()
    })
  },
  output: { schema: LearningAnalysisOutputSchema },
  prompt: `You are an expert learning analytics AI. Analyze the provided user learning data and generate insights about their learning patterns, cognitive load, and optimal learning path.

**User Learning Data:**
{{{learningData}}}

**Analysis Instructions:**
1. **Learning Style Detection**: Based on interaction patterns, determine the dominant learning style
2. **Cognitive Load Assessment**: Evaluate current mental effort and capacity (1-10 scale)
3. **Learning Velocity**: Calculate how quickly the user masters new concepts
4. **Knowledge Gap Identification**: Identify areas where the user struggles
5. **Optimal Path Prediction**: Recommend the next best lesson/topic

{{#if includeRecommendations}}
**Generate Recommendations:**
- Prioritize based on knowledge gaps and cognitive load
- Include variety: lessons, exercises, breaks, reviews
- Estimate time requirements realistically
- Consider learning style preferences
{{/if}}

**Key Insights:**
Provide 3-5 actionable insights about this learner's patterns, strengths, and areas for improvement.

Return your analysis as a structured JSON response.`
});

const personalizeContentPrompt = ai.definePrompt({
  name: 'personalizeContentPrompt',
  input: { schema: GeneratePersonalizedContentInputSchema },
  output: { schema: PersonalizedContentOutputSchema },
  prompt: `You are an expert educational content personalization AI. Adapt the given lesson content to match the learner's specific profile.

**Learner Profile:**
- Learning Style: {{learningStyle}}
- Cognitive Load: {{cognitiveLoad}}/10
- Knowledge Gaps: {{#each knowledgeGaps}}{{this}}, {{/each}}

**Personalization Guidelines:**

**For Visual Learners:**
- Use diagrams, charts, and visual metaphors
- Include step-by-step visual processes
- Suggest mind maps and flowcharts

**For Auditory Learners:**
- Include verbal explanations and discussions
- Use analogies and storytelling
- Suggest reading aloud and verbal repetition

**For Kinesthetic Learners:**
- Include hands-on activities and experiments
- Use physical analogies and movement
- Suggest building and manipulating objects

**For Reading/Writing Learners:**
- Provide detailed written explanations
- Include note-taking strategies
- Use lists, definitions, and written exercises

**Cognitive Load Adaptation:**
- High Load (7-10): Simplify concepts, break into smaller chunks, add more scaffolding
- Medium Load (4-6): Standard complexity with good examples
- Low Load (1-3): Add complexity, advanced examples, extension activities

**Address Knowledge Gaps:**
- Provide prerequisite review where needed
- Include remedial explanations for gap areas
- Connect new concepts to existing knowledge

Generate personalized content that maximizes learning effectiveness for this specific learner profile.`
});

// Flow definitions
export const analyzeUserLearningFlow = ai.defineFlow({
  name: 'analyzeUserLearningFlow',
  inputSchema: AnalyzeUserLearningInputSchema,
  outputSchema: LearningAnalysisOutputSchema,
}, async (input) => {
  try {
    // Get comprehensive learning data
    const profile = await adaptiveLearningService.getProfile(input.userId);
    const adaptivePath = await adaptiveLearningService.analyzeAndAdapt(input.userId);
    
    // Prepare data for AI analysis
    const learningData = JSON.stringify({
      profile,
      adaptivePath,
      timestamp: new Date().toISOString()
    });

    // Get AI analysis
    const { output } = await analyzeUserLearningPrompt({
      learningData,
      includeRecommendations: input.includeRecommendations
    });

    if (!output) {
      throw new Error('Failed to generate learning analysis');
    }

    return output;
  } catch (error) {
    console.error('Error in analyzeUserLearningFlow:', error);
    throw new Error(`Learning analysis failed: ${error}`);
  }
});

export const predictOptimalPathFlow = ai.defineFlow({
  name: 'predictOptimalPathFlow',
  inputSchema: PredictOptimalPathInputSchema,
  outputSchema: z.object({
    nextLessons: z.array(z.object({
      lessonId: z.string(),
      title: z.string(),
      confidence: z.number(),
      reasoning: z.string(),
      estimatedDuration: z.number()
    })),
    difficultyAdjustments: z.object({
      current: z.number(),
      recommended: z.number(),
      reasoning: z.string()
    }),
    studyPlan: z.object({
      totalTime: z.number(),
      sessions: z.array(z.object({
        duration: z.number(),
        focus: z.string(),
        activities: z.array(z.string())
      }))
    })
  })
}, async (input) => {
  try {
    // This would integrate with your ML prediction model
    // For now, using the adaptive learning service
    const profile = await adaptiveLearningService.getProfile(input.userId);
    
    // Simple implementation - in production, this would use ML models
    return {
      nextLessons: [{
        lessonId: profile.currentPath.nextOptimalLesson,
        title: "Recommended Next Lesson",
        confidence: profile.currentPath.confidenceLevel,
        reasoning: "Based on learning pattern analysis",
        estimatedDuration: input.timeAvailable || 45
      }],
      difficultyAdjustments: {
        current: 0,
        recommended: profile.currentPath.difficultyAdjustment,
        reasoning: `Cognitive load is ${profile.currentPath.cognitiveLoad}/10`
      },
      studyPlan: {
        totalTime: input.timeAvailable || 60,
        sessions: [{
          duration: input.timeAvailable || 60,
          focus: "Core concepts",
          activities: ["Read lesson", "Practice exercises", "Review"]
        }]
      }
    };
  } catch (error) {
    console.error('Error in predictOptimalPathFlow:', error);
    throw new Error(`Path prediction failed: ${error}`);
  }
});

export const generatePersonalizedContentFlow = ai.defineFlow({
  name: 'generatePersonalizedContentFlow',
  inputSchema: GeneratePersonalizedContentInputSchema,
  outputSchema: PersonalizedContentOutputSchema,
}, async (input) => {
  try {
    const { output } = await personalizeContentPrompt(input);
    
    if (!output) {
      throw new Error('Failed to generate personalized content');
    }

    return output;
  } catch (error) {
    console.error('Error in generatePersonalizedContentFlow:', error);
    throw new Error(`Content personalization failed: ${error}`);
  }
});

// Convenience functions
export async function analyzeUserLearning(input: AnalyzeUserLearningInput): Promise<LearningAnalysisOutput> {
  return await analyzeUserLearningFlow(input);
}

export async function predictOptimalPath(input: PredictOptimalPathInput) {
  return await predictOptimalPathFlow(input);
}

export async function generatePersonalizedContent(input: GeneratePersonalizedContentInput): Promise<PersonalizedContentOutput> {
  return await generatePersonalizedContentFlow(input);
}