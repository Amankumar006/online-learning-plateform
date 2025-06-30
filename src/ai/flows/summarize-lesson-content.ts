// src/ai/flows/summarize-lesson-content.ts
'use server';

/**
 * @fileOverview Summarizes lesson content into key points.
 *
 * - summarizeLessonContent - A function that summarizes the lesson content.
 * - SummarizeLessonContentInput - The input type for the summarizeLessonContent function.
 * - SummarizeLessonContentOutput - The return type for the summarizeLessonContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeLessonContentInputSchema = z.object({
  lessonContent: z
    .string()
    .describe('The content of the lesson to be summarized.'),
});

export type SummarizeLessonContentInput = z.infer<
  typeof SummarizeLessonContentInputSchema
>;

const SummarizeLessonContentOutputSchema = z.object({
  summary: z.string().describe('The summarized key points of the lesson.'),
});

export type SummarizeLessonContentOutput = z.infer<
  typeof SummarizeLessonContentOutputSchema
>;

export async function summarizeLessonContent(
  input: SummarizeLessonContentInput
): Promise<SummarizeLessonContentOutput> {
  return summarizeLessonContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeLessonContentPrompt',
  input: {schema: SummarizeLessonContentInputSchema},
  output: {schema: SummarizeLessonContentOutputSchema},
  prompt: `Summarize the following lesson content into key points:\n\n{{lessonContent}}`,
});

const summarizeLessonContentFlow = ai.defineFlow(
  {
    name: 'summarizeLessonContentFlow',
    inputSchema: SummarizeLessonContentInputSchema,
    outputSchema: SummarizeLessonContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
