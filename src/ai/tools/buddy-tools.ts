'use server';
/**
 * @fileOverview This file defines the tools available to the Buddy AI chat flow.
 * Separating tools into their own file keeps the main flow logic cleaner.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { generateCustomExercise } from '../flows/generate-custom-exercise';
import { generateStudyTopics } from '../flows/generate-study-topics';
import { simulateCodeExecution } from '../flows/simulate-code-execution';
import { createExercise, getLessons, getUser, Exercise } from '@/lib/data';

// Global variables to store current user context and data
let currentUserId: string | null = null;
let currentUserProgress: any = null;
let currentAvailableLessons: any = null;

export async function setCurrentUserId(userId: string | null) {
    currentUserId = userId;
}

export async function setCurrentUserData(userProgress: any, availableLessons: any) {
    currentUserProgress = userProgress;
    currentAvailableLessons = availableLessons;
}

const createExerciseTool = ai.defineTool(
    {
        name: 'createCustomExercise',
        description: 'Creates a custom practice exercise based on a user prompt. Use this when the user asks for a practice problem, a quiz question, or a custom exercise on a specific topic.',
        inputSchema: z.object({ 
            prompt: z.string().describe("The user's specific request for an exercise, e.g., 'a medium-difficulty question about javascript arrays'.")
        }),
        outputSchema: z.string(),
    },
    async (input) => {
        try {
            const { prompt } = input;
            if (!currentUserId) {
                return "I can create an exercise concept for you, but to save it to your account, please make sure you are logged in. Here's what I would create based on your request...";
            }
            
            console.log('🔍 Starting exercise creation for prompt:', prompt);
            console.log('👤 Current user ID:', currentUserId);
            
            // Generate the exercise with explicit parameters for better success rate
            const exerciseInput = {
                prompt,
                difficulty: 2, // Medium difficulty
                questionType: 'mcq' as const // Start with MCQ for better reliability
            };
            
            console.log('📝 Calling generateCustomExercise with:', exerciseInput);
            const exercise = await generateCustomExercise(exerciseInput);
            
            console.log('🎯 Generated exercise result:', exercise);
            
            if (!exercise) {
                console.error('❌ Exercise generation returned null');
                return "I had trouble generating an exercise from that prompt. Let me try creating a simple multiple-choice question about Python loops instead:\n\n**Question:** Which of the following correctly iterates through a list in Python?\n\nA) `for i in range(list):`\nB) `for item in list:`\nC) `for i = 0; i < len(list); i++:`\nD) `for list in item:`\n\n**Answer:** B\n\nWould you like me to save this as a custom exercise for you?";
            }
            
            // Ensure all required fields are present
            const requiredFields = ['type', 'difficulty', 'category'];
            for (const field of requiredFields) {
                if (!(field in exercise)) {
                    console.error(`❌ Missing required field: ${field}`);
                    return `I generated an exercise but it's missing some required information (${field}). Let me create a complete one manually for you instead.`;
                }
            }
            
            console.log('✅ Exercise validation passed');
            
            // Create the exercise data with all required fields
            const baseExerciseData = {
                lessonId: 'custom',
                difficulty: exercise.difficulty,
                category: exercise.category || 'code',
                isCustom: true,
                userId: currentUserId,
                createdAt: Date.now(),
                tags: exercise.tags || ['python', 'loops', 'practice']
            };
            
            let exerciseData: Omit<Exercise, 'id'>;
            let questionPreview: string;
            
            // Handle different exercise types
            switch (exercise.type) {
                case 'mcq':
                    if (!exercise.question || !exercise.options || !exercise.correctAnswer) {
                        return "I generated a multiple choice question but some parts were incomplete. Let me create a complete one:\n\n**Question:** What does a `for` loop in Python do?\n\nA) Executes code once\nB) Repeats code for each item in a sequence\nC) Only works with numbers\nD) Creates a new list\n\n**Answer:** B) Repeats code for each item in a sequence";
                    }
                    exerciseData = {
                        ...baseExerciseData,
                        type: 'mcq',
                        question: exercise.question,
                        options: exercise.options,
                        correctAnswer: exercise.correctAnswer,
                        explanation: exercise.explanation || 'This is the correct answer.',
                        hint: exercise.hint || 'Think about the basic purpose of loops.'
                    } as Omit<Exercise, 'id'>;
                    questionPreview = exercise.question;
                    break;
                    
                case 'true_false':
                    if (!exercise.question || typeof exercise.correctAnswer !== 'boolean') {
                        return "I generated a true/false question but had trouble with the format. Here's a sample: **True or False:** Python for loops can iterate through lists. (Answer: True)";
                    }
                    exerciseData = {
                        ...baseExerciseData,
                        type: 'true_false',
                        question: exercise.question,
                        correctAnswer: exercise.correctAnswer,
                        explanation: exercise.explanation || 'This is the correct answer.',
                        hint: exercise.hint || 'Consider the basic properties of the concept.'
                    } as Omit<Exercise, 'id'>;
                    questionPreview = exercise.question;
                    break;
                    
                case 'long_form':
                    if (!exercise.question || !exercise.evaluationCriteria) {
                        return "I generated a long-form question but the evaluation criteria were unclear. Here's a sample: **Question:** Explain how a for loop works in Python and give an example. **Expected:** Should mention iteration, syntax, and provide code example.";
                    }
                    exerciseData = {
                        ...baseExerciseData,
                        type: 'long_form',
                        question: exercise.question,
                        evaluationCriteria: exercise.evaluationCriteria,
                        language: exercise.language || 'python',
                        hint: exercise.hint || 'Think about the structure and components.'
                    } as Omit<Exercise, 'id'>;
                    questionPreview = exercise.question;
                    break;
                    
                case 'fill_in_the_blanks':
                    if (!exercise.questionParts || !exercise.correctAnswers) {
                        return "I generated a fill-in-the-blanks question but the format was incomplete. Here's a sample: 'In Python, you use a ___ loop to iterate through a list.' (Answer: for)";
                    }
                    exerciseData = {
                        ...baseExerciseData,
                        type: 'fill_in_the_blanks',
                        questionParts: exercise.questionParts,
                        correctAnswers: exercise.correctAnswers,
                        explanation: exercise.explanation || 'These are the correct answers.',
                        hint: exercise.hint || 'Think about the key terms.'
                    } as Omit<Exercise, 'id'>;
                    questionPreview = exercise.questionParts.join(' ___ ');
                    break;
                    
                default:
                    // This should never happen due to the type system, but adding for completeness
                    return `I tried to create an exercise but encountered an unknown type. Let me create a simple multiple choice question instead.`;
            }
            
            console.log('💾 Attempting to save exercise data:', exerciseData);
            
            // Save to Firebase
            const exerciseId = await createExercise(exerciseData);
            console.log('✅ Exercise saved successfully with ID:', exerciseId);
            
            return `🎉 **Exercise Created Successfully!**

**Question:** ${questionPreview}

Your new ${exercise.type.replace('_', ' ')} exercise has been saved to your account! You can find it on your **Practice** page.

Would you like me to create another exercise or help you with something else?`;
            
        } catch (error) {
            console.error('💥 Detailed error in createExerciseTool:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            
            // Provide a fallback exercise
            return `I encountered an error while creating your custom exercise, but I can still help! Here's a Python loops exercise I can create manually:

**Question:** Which loop is best for iterating through a list in Python?
A) while loop
B) for loop  
C) do-while loop
D) repeat loop

**Answer:** B) for loop

The error was: ${errorMessage}. Would you like me to try creating a different type of exercise, or should I save this manual one for you?`;
        }
    }
);

const searchTheWebTool = ai.defineTool(
    {
        name: 'searchTheWeb',
        description: 'Searches the web for up-to-date information on a given topic. Use this for general knowledge questions, current events, or topics not covered in the user\'s study materials.',
        inputSchema: z.object({ query: z.string().describe("The user's question or topic to search for.") }),
        outputSchema: z.string(),
    },
    async ({ query }) => {
        try {
            const apiKey = process.env.GOOGLE_API_KEY;
            const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
            
            if (!apiKey || !searchEngineId) {
                 return "I am sorry, but the web search tool is not configured correctly. I cannot access real-time information right now.";
            }

            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`;
            
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Google Search API Error:", errorData);
                return `Sorry, I encountered an error while searching the web: ${errorData.error.message}`;
            }

            const data = await response.json();
            
            if (!data.items || data.items.length === 0) {
                return `I couldn't find any direct results for "${query}". You might want to try rephrasing your question.`;
            }

            const searchResults = data.items.slice(0, 3).map((item: any) => ({
                title: item.title,
                link: item.link,
                snippet: item.snippet
            }));
            
            const summary = searchResults.map((r: any) => `Title: ${r.title}\nSnippet: ${r.snippet}`).join('\n\n');
            return `Based on a web search for "${query}", here is a summary of the top results:\n\n${summary}`;

        } catch (error) {
            console.error("Error in searchTheWebTool:", error);
            return "I ran into a problem while trying to search the web. Please try again in a moment.";
        }
    }
);

const analyzeCodeComplexityTool = ai.defineTool(
    {
        name: 'analyzeCodeComplexity',
        description: "Analyzes a given code snippet for its time and space complexity (Big O notation) and provides a brief explanation. Use this when a user's code could be analyzed for performance.",
        inputSchema: z.object({ 
            code: z.string().describe("The code snippet to analyze."),
            language: z.string().describe("The programming language of the code, e.g., 'python' or 'javascript'.")
        }),
        outputSchema: z.string().describe("A summary of the complexity analysis, e.g., 'Time Complexity: O(n), Space Complexity: O(1). This is because...'")
    },
    async (input) => {
        try {
            const result = await simulateCodeExecution({ code: input.code, language: input.language });
            return `
Time Complexity: **${result.complexity.time}**
Space Complexity: **${result.complexity.space}**

Summary: ${result.analysis.summary}
            `.trim();
        } catch (e) {
            console.error('Error in analyzeCodeComplexityTool:', e);
            return "I was unable to analyze the complexity of that code snippet.";
        }
    }
);

const suggestTopicsTool = ai.defineTool(
    {
        name: 'suggestStudyTopics',
        description: 'Suggests new topics for a user to study based on their progress. Use this when the user asks "what should I learn next?", "suggest a topic", or a similar question about guidance.',
        inputSchema: z.object({}), // No specific input needed from AI
        outputSchema: z.string(),
    },
    async (_, context) => {
        try {
            if (!currentUserId) {
                return "I can suggest some general study topics, but to provide personalized recommendations based on your progress, please make sure you are logged in.";
            }

            // Use the cached data instead of making Firebase calls
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

const generateImageForExplanationTool = ai.defineTool(
    {
        name: 'generateImageForExplanation',
        description: 'Generates a visual diagram or illustration to help explain a concept. Use this when explaining complex topics that would benefit from visual aids.',
        inputSchema: z.object({ 
            concept: z.string().describe("The concept to create a visual explanation for"),
            description: z.string().describe("Detailed description of what the image should show")
        }),
        outputSchema: z.string(),
    },
    async ({ concept, description }) => {
        try {
            // For now, return a placeholder since we don't have image generation set up
            return `I would create a visual diagram for "${concept}" that shows: ${description}. 

*[Image generation is not currently available, but I can provide detailed text explanations and suggest creating diagrams manually or finding relevant visual resources online.]*

Would you like me to provide a detailed text-based explanation instead?`;
        } catch (error) {
            console.error('Error in generateImageForExplanationTool:', error);
            return 'Sorry, I cannot generate images at the moment. Let me provide a detailed text explanation instead.';
        }
    }
);

// Export the tools array - these are defined once at module load time
export async function getBuddyChatTools() {
    return [
        createExerciseTool, 
        suggestTopicsTool,
        searchTheWebTool, 
        generateImageForExplanationTool,
        analyzeCodeComplexityTool
    ];
}
