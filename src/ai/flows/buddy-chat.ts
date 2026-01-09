'use server';
/**
 * @fileOverview A conversational AI flow for the main Buddy AI page, with tools.
 *
 * - buddyChatStream - A function that handles the conversation.
 * - BuddyChatInput - The input type for the function.
 * - StreamedOutput - The output type for the function's stream.
 */

import { ai } from '@/ai/ai';
import { z } from 'zod';
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
    })).optional().describe('Available lessons passed from client to avoid server-side Firebase access'),
    webSearchEnabled: z.boolean().optional().default(false).describe('Whether web search functionality is enabled for this conversation'),
    uploadedFiles: z.array(z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(['image', 'pdf', 'document', 'other']),
        content: z.string().optional(),
        preview: z.string().optional(),
        size: z.number()
    })).optional().describe('Files uploaded by the user for analysis')
});
export type BuddyChatInput = z.infer<typeof BuddyChatInputSchema>;

const StreamedOutputSchema = z.object({
    type: z.enum(['thought', 'response', 'error']),
    content: z.string(),
    suggestions: z.array(z.string()).optional(),
});
export type StreamedOutput = z.infer<typeof StreamedOutputSchema>;

const buddyChatFlow = ai.defineFlow(
    {
        name: 'buddyChatFlow',
        inputSchema: BuddyChatInputSchema,
        outputSchema: z.object({
            response: z.string(),
            suggestions: z.array(z.string()).optional(),
            topics: z.array(z.string()).optional(),
            toolsUsed: z.array(z.string()).optional(),
            intent: z.object({
                category: z.string(),
                confidence: z.number(),
                parameters: z.record(z.any())
            }).optional(),
            complexity: z.object({
                level: z.string(),
                score: z.number()
            }).optional(),
        }),
    },
    async (input) => {
        // DEBUG: Dummy handler to test flow wrapper compatibility
        console.log("🚀 buddyChatFlow handler executing");
        return {
            response: "Flow Logic Restored (Shell Only): " + input.userMessage,
            suggestions: ["Shell Suggestion 1", "Shell Suggestion 2"],
            topics: [],
            toolsUsed: [],
            intent: { category: 'debug', confidence: 1.0, parameters: {} },
            complexity: { level: 'debug', score: 0 }
        };
    }
);

// Helper function for file size formatting
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// DEBUG: Checking if module loads
console.log('🚀 LOADING buddy-chat.ts module');

export async function buddyChatStream(input: BuddyChatInput): Promise<StreamedOutput> {
    console.log('🚀 buddyChatStream called with input:', JSON.stringify(input));
    try {
        // Restore flow usage
        const result = await buddyChatFlow(input);
        return {
            type: 'response',
            content: result.response,
            suggestions: result.suggestions,
        };
    } catch (e: any) {
        console.error("❌ CRITICAL ERROR in buddyChatStream:", e);
        if (e.digest) console.error("Error digest:", e.digest);
        if (e.stack) console.error("Error stack:", e.stack);

        return {
            type: 'error',
            content: e.message || "An unexpected error occurred.",
        };
    }
}