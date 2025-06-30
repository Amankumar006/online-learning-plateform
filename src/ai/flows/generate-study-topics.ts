'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting relevant study topics to a user.
 *
 * - generateStudyTopics - A function that suggests study topics based on user progress and goals.
 * - GenerateStudyTopicsInput - The input type for the generateStudyTopics function.
 * - GenerateStudyTopicsOutput - The return type for the generateStudyTopics function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStudyTopicsInputSchema = z.object({
  currentProgress: z
    .string()
    .describe('A summary of the user\'s current progress and understanding.'),
  learningGoals: z.string().describe('The user\'s learning objectives and goals.'),
});
export type GenerateStudyTopicsInput = z.infer<typeof GenerateStudyTopicsInputSchema>;

const GenerateStudyTopicsOutputSchema = z.object({
  suggestedTopics: z
    .array(z.string())
    .describe('A list of suggested study topics relevant to the user.'),
});
export type GenerateStudyTopicsOutput = z.infer<typeof GenerateStudyTopicsOutputSchema>;

export async function generateStudyTopics(
  input: GenerateStudyTopicsInput
): Promise<GenerateStudyTopicsOutput> {
  return generateStudyTopicsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStudyTopicsPrompt',
  input: {schema: GenerateStudyTopicsInputSchema},
  output: {schema: GenerateStudyTopicsOutputSchema},
  prompt: `You are an AI study buddy. Your goal is to suggest relevant study topics to the user based on their current progress and learning goals.

Current Progress: {{{currentProgress}}}
Learning Goals: {{{learningGoals}}}

Suggest a list of study topics that would be most beneficial for the user to focus on next. Return the topics as a JSON array of strings.
`,
});

const generateStudyTopicsFlow = ai.defineFlow(
  {
    name: 'generateStudyTopicsFlow',
    inputSchema: GenerateStudyTopicsInputSchema,
    outputSchema: GenerateStudyTopicsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
