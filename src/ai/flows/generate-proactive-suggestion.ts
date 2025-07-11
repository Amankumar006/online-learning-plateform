
'use server';
/**
 * @fileOverview A Genkit flow to generate a proactive help message for a struggling student.
 *
 * - generateProactiveSuggestion - A function that generates a help message.
 * - GenerateProactiveSuggestionInput - The input type for the function.
 * - GenerateProactiveSuggestionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProactiveSuggestionInputSchema = z.object({
  strugglingTopic: z.string().describe('The topic the student is struggling with, e.g., "JavaScript Promises", "quadratic equations".'),
});
export type GenerateProactiveSuggestionInput = z.infer<typeof GenerateProactiveSuggestionInputSchema>;

const GenerateProactiveSuggestionOutputSchema = z.object({
  suggestion: z.string().describe('A friendly, encouraging message offering help on the topic.'),
});
export type GenerateProactiveSuggestionOutput = z.infer<typeof GenerateProactiveSuggestionOutputSchema>;

export async function generateProactiveSuggestion(
  input: GenerateProactiveSuggestionInput
): Promise<GenerateProactiveSuggestionOutput> {
  const result = await generateProactiveSuggestionFlow(input);
  if (!result) {
    throw new Error('The AI was unable to generate a suggestion.');
  }
  return result;
}

const prompt = ai.definePrompt({
  name: 'generateProactiveSuggestionPrompt',
  input: {schema: GenerateProactiveSuggestionInputSchema},
  output: {schema: GenerateProactiveSuggestionOutputSchema},
  prompt: `You are a friendly and encouraging AI tutor. A student you are helping seems to be struggling with the topic of **{{{strugglingTopic}}}**.

Your task is to write a short, proactive message to the student to offer help.
- Keep it friendly and supportive.
- Do not sound accusatory.
- Offer to explain the topic in a different way or provide a simpler example.
- Keep the message concise (2-3 sentences).
- End with an open-ended question to encourage engagement.

Example: "Hey! I noticed you're working on exercises about 'Loops'. They can be a bit tricky at first! Would you like me to explain them in a different way, or should we walk through a simple example together?"
`,
});

const generateProactiveSuggestionFlow = ai.defineFlow(
  {
    name: 'generateProactiveSuggestionFlow',
    inputSchema: GenerateProactiveSuggestionInputSchema,
    outputSchema: GenerateProactiveSuggestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output;
  }
);

    
