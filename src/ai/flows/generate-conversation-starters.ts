// src/ai/flows/generate-conversation-starters.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate conversation starters related to a lesson.
 *
 * - generateConversationStarters - A function that generates conversation starters.
 * - GenerateConversationStartersInput - The input type for the generateConversationStarters function.
 * - GenerateConversationStartersOutput - The return type for the generateConversationStarters function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateConversationStartersInputSchema = z.object({
  lessonContent: z.string().describe('The content of the lesson.'),
});
export type GenerateConversationStartersInput = z.infer<typeof GenerateConversationStartersInputSchema>;

const GenerateConversationStartersOutputSchema = z.object({
  conversationStarters: z.array(z.string()).describe('An array of conversation starters related to the lesson.'),
  progress: z.string().describe('A short, one-sentence summary of what you have generated.')
});
export type GenerateConversationStartersOutput = z.infer<typeof GenerateConversationStartersOutputSchema>;

export async function generateConversationStarters(input: GenerateConversationStartersInput): Promise<GenerateConversationStartersOutput> {
  return generateConversationStartersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateConversationStartersPrompt',
  input: {schema: GenerateConversationStartersInputSchema},
  output: {schema: GenerateConversationStartersOutputSchema},
  prompt: `You are an AI study buddy helping a student learn. Generate five conversation starters related to the following lesson content, so that the student can practice applying their knowledge in a simulated discussion. Return your answer as a JSON array of strings. Also include a one-sentence summary of the generated conversation starters in the progress field.\n\nLesson Content: {{{lessonContent}}}`,
});

const generateConversationStartersFlow = ai.defineFlow(
  {
    name: 'generateConversationStartersFlow',
    inputSchema: GenerateConversationStartersInputSchema,
    outputSchema: GenerateConversationStartersOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
