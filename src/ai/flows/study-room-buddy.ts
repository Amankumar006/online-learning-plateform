
'use server';
/**
 * @fileOverview A conversational AI for responding to @mentions in a study room chat.
 *
 * - studyRoomBuddy - A function that handles the conversation.
 * - StudyRoomBuddyInput - The input type for the function.
 * - StudyRoomBuddyOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const StudyRoomBuddyInputSchema = z.object({
  history: z.array(MessageSchema).optional().describe('The recent conversation history.'),
  userMessage: z.string().describe('The message that triggered the AI mention.'),
  lessonContext: z.string().optional().describe('The content of a lesson the study room is focused on, if any.'),
});
export type StudyRoomBuddyInput = z.infer<typeof StudyRoomBuddyInputSchema>;

const StudyRoomBuddyOutputSchema = z.object({
  response: z.string(),
});
export type StudyRoomBuddyOutput = z.infer<typeof StudyRoomBuddyOutputSchema>;


export async function studyRoomBuddy(input: StudyRoomBuddyInput): Promise<StudyRoomBuddyOutput> {
  return studyRoomBuddyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'studyRoomBuddyPrompt',
  input: {schema: StudyRoomBuddyInputSchema},
  output: {schema: StudyRoomBuddyOutputSchema},
  prompt: `You are Buddy AI, a helpful and knowledgeable study companion, currently participating in a group study session chat. Your goal is to answer questions concisely and accurately.

A user has mentioned you by typing "@BuddyAI". Your task is to respond directly to their message.

**Conversation History:**
{{#if history}}
{{#each history}}
- {{role}}: {{content}}
{{/each}}
{{else}}
- No history available.
{{/if}}

{{#if lessonContext}}
**Current Lesson Context:**
---
{{lessonContext}}
---
Use the lesson context as the primary source of truth if the question is about it.
{{/if}}

**User's Message to You:**
"{{{userMessage}}}"

Based on the history and context, provide a clear and direct answer to the user's message.
`,
});

const studyRoomBuddyFlow = ai.defineFlow(
  {
    name: 'studyRoomBuddyFlow',
    inputSchema: StudyRoomBuddyInputSchema,
    outputSchema: StudyRoomBuddyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('The AI was unable to generate a response.');
    }
    return output;
  }
);
