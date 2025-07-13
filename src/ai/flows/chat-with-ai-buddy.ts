
'use server';
/**
 * @fileOverview A conversational AI flow for the AI Study Buddy popover on the lesson page.
 *
 * - chatWithAIBuddy - A function that handles the conversation.
 * - ChatWithAIBuddyInput - The input type for the function.
 * - ChatWithAIBuddyOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {generateConversationStartersTool, summarizeLessonContentTool} from '@/ai/tools/lesson-tools';

const ChatWithAIBuddyInputSchema = z.object({
  lessonContent: z.string().describe('The content of the lesson the user is currently viewing.'),
  userMessage: z.string().describe('The message sent by the user.'),
});
type ChatWithAIBuddyInput = z.infer<typeof ChatWithAIBuddyInputSchema>;

const ChatWithAIBuddyOutputSchema = z.object({
  response: z.string().describe("The AI's response to the user."),
});
type ChatWithAIBuddyOutput = z.infer<typeof ChatWithAIBuddyOutputSchema>;

export async function chatWithAIBuddy(input: ChatWithAIBuddyInput): Promise<ChatWithAIBuddyOutput> {
  return chatWithAIBuddyFlow(input);
}

const prompt = ai.definePrompt({
    name: 'aiBuddyChatPrompt',
    tools: [summarizeLessonContentTool, generateConversationStartersTool],
    system: `You are an AI study buddy. You are friendly, encouraging, and helpful.
The user is currently studying a lesson. Your primary source of information is the provided lesson content.
You have two tools available:
- 'summarizeLessonContent': Use this when the user asks for a summary, an explanation in simpler terms, or a similar request.
- 'generateConversationStarters': Use this when the user asks for discussion points, questions to think about, or conversation starters.

For any other questions, answer them directly using ONLY the provided lesson content. Do not use outside knowledge. If the answer is not in the lesson content, say "I can't find the answer to that in this lesson. Is there another way I can help?".
Be helpful and conversational. Handle typos gracefully.`,
    input: { schema: ChatWithAIBuddyInputSchema },
    prompt: `Lesson Content:
{{{lessonContent}}}

User's Message:
{{{userMessage}}}
`,
});

const chatWithAIBuddyFlow = ai.defineFlow(
  {
    name: 'chatWithAIBuddyFlow',
    inputSchema: ChatWithAIBuddyInputSchema,
    outputSchema: ChatWithAIBuddyOutputSchema,
  },
  async (input) => {
    const { text } = await prompt(input);

    return { response: text };
  }
);
