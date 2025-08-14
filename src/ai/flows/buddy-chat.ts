'use server';
/**
 * @fileOverview A conversational AI flow for the main Buddy AI page, with tools.
 *
 * - buddyChatStream - A function that handles the conversation.
 * - BuddyChatInput - The input type for the function.
 * - StreamedOutput - The output type for the function's stream.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { PersonaSchema } from '@/ai/schemas/buddy-schemas';
import { getBuddyChatTools, setCurrentUserId, setCurrentUserData } from '@/ai/tools/buddy';
import { getSystemPrompt } from '@/ai/prompts';
import { generateFollowUpSuggestions } from './generate-follow-up-suggestions';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const BuddyChatInputSchema = z.object({
  userMessage: z.string().describe('The message sent by the user.'),
  userId: z.string().describe("The ID of the current user, used for context-aware actions."),
  history: z.array(MessageSchema).optional().describe('The conversation history.'),
  persona: PersonaSchema.optional().default('buddy').describe("The AI's persona, which determines its personality and expertise."),
  lessonContext: z.string().optional().describe('The content of a lesson the user is currently viewing, if any. This should be used as the primary source of truth for lesson-specific questions.'),
  userProgress: z.object({
    completedLessonIds: z.array(z.string()).optional(),
    subjectsMastery: z.array(z.object({
      subject: z.string(),
      mastery: z.number()
    })).optional()
  }).optional().describe('User progress data passed from client to avoid server-side Firebase access'),
  availableLessons: z.array(z.object({
    id: z.string(),
    title: z.string(),
    subject: z.string().optional()
  })).optional().describe('Available lessons passed from client to avoid server-side Firebase access')
});
export type BuddyChatInput = z.infer<typeof BuddyChatInputSchema>;

const StreamedOutputSchema = z.object({
    type: z.enum(['thought', 'response', 'error']),
    content: z.string(),
    suggestions: z.array(z.string()).optional(),
});
export type StreamedOutput = z.infer<typeof StreamedOutputSchema>;


const buddyChatPrompt = ai.definePrompt({
  name: 'buddyChatPrompt',
  input: { schema: BuddyChatInputSchema },
  output: { schema: z.object({ response: z.string(), suggestions: z.array(z.string()).optional() }) },
  prompt: `{{systemPrompt}}

{{#if lessonContext}}
**LESSON CONTEXT:**
---
{{lessonContext}}
---
{{/if}}

{{#if history}}
**CONVERSATION HISTORY:**
{{#each history}}
{{#if (eq role "user")}}Human: {{content}}{{/if}}
{{#if (eq role "model")}}Assistant: {{content}}{{/if}}
{{/each}}
{{/if}}

**USER MESSAGE:** {{userMessage}}

Please respond helpfully and appropriately based on the context and conversation history.`,
});

const buddyChatFlow = ai.defineFlow(
  {
    name: 'buddyChatFlow',
    inputSchema: BuddyChatInputSchema,
    outputSchema: z.object({
        response: z.string(),
        suggestions: z.array(z.string()).optional(),
        topics: z.array(z.string()).optional(),
        toolsUsed: z.array(z.string()).optional(),
    }),
  },
  async (input) => {
    try {
        // Set the user ID and data for tools to access
        await setCurrentUserId(input.userId);
        await setCurrentUserData(input.userProgress, input.availableLessons);
        
        // Skip conversation memory operations in the AI flow to avoid permission errors
        // These will be handled on the client side instead
        
        // Generate system prompt without conversation memory for now
        let systemPrompt = getSystemPrompt(input.persona, !!input.lessonContext);
        
        // Add basic user context if available
        if (input.userProgress) {
            const completedLessons = input.userProgress.completedLessonIds?.length || 0;
            systemPrompt += `\n\n**USER CONTEXT:**\nUser has completed ${completedLessons} lessons.`;
        }

        const tools = await getBuddyChatTools();
        const toolsUsed: string[] = [];
        
        // Use ai.generate with tools normally for all requests
        const response = await ai.generate({
            prompt: `${systemPrompt}

${input.lessonContext ? `**LESSON CONTEXT:**\n---\n${input.lessonContext}\n---\n\n` : ''}

${input.history && input.history.length > 0 ? `**CONVERSATION HISTORY:**\n${input.history.map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`).join('\n')}\n\n` : ''}

**USER MESSAGE:** ${input.userMessage}

Please respond helpfully and appropriately based on the context and conversation history.`,
            tools,
            config: {
                safetySettings: [
                  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                ],
            },
        });
        
        // Enhanced tool usage tracking through response analysis
        const trackToolUsage = (responseText: string, tools: any[]): string[] => {
            const usedTools: string[] = [];
            
            // Check for tool-specific patterns in the response
            if (responseText.includes('Exercise Created Successfully') || responseText.includes('practice exercise')) {
                usedTools.push('createCustomExercise');
            }
            if (responseText.includes('study suggestions') || responseText.includes('Based on your progress')) {
                usedTools.push('suggestStudyTopics');
            }
            if (responseText.includes('web search') || responseText.includes('search results')) {
                usedTools.push('searchTheWeb');
            }
            if (responseText.includes('Time Complexity') || responseText.includes('Space Complexity')) {
                usedTools.push('analyzeCodeComplexity');
            }
            if (responseText.includes('visual diagram') || responseText.includes('📊 **Visual Elements:**')) {
                usedTools.push('generateImageForExplanation');
            }
            
            return usedTools;
        };

        const aiResponseText = response.text || 'I apologize, but I was unable to generate a response.';
        const actualToolsUsed = trackToolUsage(aiResponseText, tools);

        // Extract topics from the conversation
        const topics = extractTopicsFromConversation(input.userMessage, aiResponseText);
        
        // Note: Tool usage tracking is handled differently in this Genkit version
        // Tool invocations are not exposed in the response object
        // We'll track tools based on response content analysis or other methods
        
        // Generate contextual follow-up suggestions
        const followUpResult = await generateFollowUpSuggestions({
            lastUserMessage: input.userMessage,
            aiResponse: aiResponseText,
        });
        
        return {
            response: aiResponseText,
            suggestions: followUpResult.suggestions.slice(0, 3),
            topics,
            toolsUsed: actualToolsUsed,
        };

    } catch (e: any) {
        console.error("Error in buddyChatFlow:", e);
        
        // Enhanced error categorization and user-friendly messages
        let userMessage = "I apologize, but I encountered an issue while processing your request.";
        let suggestions: string[] = [];
        
        if (e.message?.includes('API')) {
            userMessage = "I'm having trouble connecting to my knowledge services right now.";
            suggestions = ["Try again in a moment", "Ask a simpler question", "Check your internet connection"];
        } else if (e.message?.includes('timeout')) {
            userMessage = "Your request is taking longer than expected to process.";
            suggestions = ["Try breaking your question into smaller parts", "Ask about a more specific topic"];
        } else if (e.message?.includes('context')) {
            userMessage = "I need more context to properly answer your question.";
            suggestions = ["Provide more details about what you're trying to learn", "Ask about a specific concept"];
        } else {
            suggestions = ["Try rephrasing your question", "Ask about a different topic", "Start a new conversation"];
        }
        
        return {
            response: `${userMessage}\n\n**Error Details:** ${e.message || 'Unknown error occurred'}\n\n**Suggestions:**\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
            suggestions,
            topics: [],
            toolsUsed: [],
        };
    } finally {
        // Clear the user ID and data after processing
        await setCurrentUserId(null);
        await setCurrentUserData(null, null);
    }
  }
);

// Helper functions for extracting information from conversations
function extractTopicsFromConversation(userMessage: string, aiResponse: string): string[] {
    const topics: string[] = [];
    const commonTopics = [
        'python', 'javascript', 'react', 'math', 'algebra', 'calculus', 'physics', 
        'chemistry', 'biology', 'history', 'english', 'programming', 'algorithms',
        'data structures', 'machine learning', 'artificial intelligence', 'databases',
        'web development', 'mobile development', 'science', 'literature'
    ];
    
    const text = (userMessage + ' ' + aiResponse).toLowerCase();
    
    commonTopics.forEach(topic => {
        if (text.includes(topic)) {
            topics.push(topic);
        }
    });
    
    return [...new Set(topics)]; // Remove duplicates
}

function extractOpenQuestions(text: string): string[] {
    const questions: string[] = [];
    const questionMarkers = ['?', 'What do you think', 'How would you', 'Can you explain', 'Would you like'];
    
    questionMarkers.forEach(marker => {
        if (text.includes(marker)) {
            const sentences = text.split(/[.!?]+/);
            sentences.forEach(sentence => {
                if (sentence.includes(marker) && sentence.length < 100) {
                    questions.push(sentence.trim());
                }
            });
        }
    });
    
    return questions.slice(0, 3); // Limit to 3 questions
}

function extractSuggestedTopics(text: string): string[] {
    const suggestions: string[] = [];
    const suggestionMarkers = ['next', 'should learn', 'try studying', 'explore', 'dive into'];
    
    suggestionMarkers.forEach(marker => {
        if (text.includes(marker)) {
            // Simple extraction - in a real implementation, you might use NLP
            const words = text.split(/\s+/);
            const markerIndex = words.findIndex(word => word.includes(marker));
            if (markerIndex !== -1 && markerIndex < words.length - 2) {
                const nextWords = words.slice(markerIndex + 1, markerIndex + 4).join(' ');
                suggestions.push(nextWords);
            }
        }
    });
    
    return suggestions.slice(0, 3);
}


export async function buddyChatStream(input: BuddyChatInput): Promise<StreamedOutput> {
    try {
        const result = await buddyChatFlow(input);
        return {
            type: 'response',
            content: result.response,
            suggestions: result.suggestions,
        };
    } catch (e: any) {
        return {
            type: 'error',
            content: e.message,
        };
    }
}

