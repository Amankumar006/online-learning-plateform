'use server';
/**
 * @fileOverview A conversational AI flow for the AI Study Buddy.
 *
 * - chatWithAIBuddy - A function that handles the conversation.
 * - ChatWithAIBuddyInput - The input type for the function.
 * - ChatWithAIBuddyOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {generateConversationStartersTool, summarizeLessonContentTool} from '@/ai/tools/lesson-tools';

export const ChatWithAIBuddyInputSchema = z.object({
  lessonContent: z.string().describe('The content of the lesson the user is currently viewing.'),
  userMessage: z.string().describe('The message sent by the user.'),
});
export type ChatWithAIBuddyInput = z.infer<typeof ChatWithAIBuddyInputSchema>;

export const ChatWithAIBuddyOutputSchema = z.object({
  response: z.string().describe("The AI's response to the user."),
});
export type ChatWithAIBuddyOutput = z.infer<typeof ChatWithAIBuddyOutputSchema>;

export async function chatWithAIBuddy(input: ChatWithAIBuddyInput): Promise<ChatWithAIBuddyOutput> {
  return chatWithAIBuddyFlow(input);
}

const chatWithAIBuddyFlow = ai.defineFlow(
  {
    name: 'chatWithAIBuddyFlow',
    inputSchema: ChatWithAIBuddyInputSchema,
    outputSchema: ChatWithAIBuddyOutputSchema,
  },
  async (input) => {
    const prompt = ai.definePrompt({
        name: 'aiBuddyChatPrompt',
        tools: [summarizeLessonContentTool, generateConversationStartersTool],
        input: { schema: ChatWithAIBuddyInputSchema },
        prompt: `You are an AI study buddy. You are friendly, encouraging, and helpful.
The user is currently studying a lesson. Your primary source of information is the provided lesson content.
Based on the user's message, you can do one of three things:
1. If the user asks for a summary, to explain something in simpler terms, or a similar request, use the 'summarizeLessonContent' tool.
2. If the user asks for discussion points, questions to think about, or conversation starters, use the 'generateConversationStarters' tool.
3. For any other questions, answer them directly using ONLY the provided lesson content. Do not use outside knowledge. If the answer is not in the lesson content, say "I can't find the answer to that in this lesson. Is there another way I can help?".

Lesson Content:
{{{lessonContent}}}

User's Message:
{{{userMessage}}}
`,
    });

    const { text } = await prompt(input);

    return { response: text };
  }
);
