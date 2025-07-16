
'use server';
/**
 * @fileOverview A fast, stateless Genkit flow for the AI Toolkit sidebar.
 *
 * - quickChat - A function that provides a direct answer to a single question.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const QuickChatInputSchema = z.object({
  question: z.string().describe('The user\'s question.'),
});
export type QuickChatInput = z.infer<typeof QuickChatInputSchema>;

const QuickChatOutputSchema = z.object({
  answer: z.string().describe('A concise and direct answer to the user\'s question.'),
});
export type QuickChatOutput = z.infer<typeof QuickChatOutputSchema>;

export async function quickChat(
  input: QuickChatInput
): Promise<QuickChatOutput> {
  const result = await quickChatFlow(input);
  if (!result) {
    throw new Error('The AI was unable to answer your question.');
  }
  return result;
}

const prompt = ai.definePrompt({
  name: 'quickChatPrompt',
  input: {schema: QuickChatInputSchema},
  output: {schema: QuickChatOutputSchema},
  prompt: `You are a helpful AI assistant. A user has asked a quick question. Provide a concise, accurate, and direct answer. Do not add any conversational fluff.

User's Question: "{{{question}}}"`,
});

const quickChatFlow = ai.defineFlow(
  {
    name: 'quickChatFlow',
    inputSchema: QuickChatInputSchema,
    outputSchema: QuickChatOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output;
  }
);
