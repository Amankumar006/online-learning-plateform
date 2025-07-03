'use server';
/**
 * @fileOverview A Genkit flow to convert natural language math queries into LaTeX.
 *
 * - convertSpeechToLatex - Converts a spoken query into a LaTeX string.
 * - ConvertSpeechToLatexInput - The input type for the function.
 * - ConvertSpeechToLatexOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const ConvertSpeechToLatexInputSchema = z.object({
  query: z.string().describe('The natural language math query to convert.'),
});
export type ConvertSpeechToLatexInput = z.infer<typeof ConvertSpeechToLatexInputSchema>;

export const ConvertSpeechToLatexOutputSchema = z.object({
  latex: z.string().describe('The resulting LaTeX string.'),
});
export type ConvertSpeechToLatexOutput = z.infer<typeof ConvertSpeechToLatexOutputSchema>;

export async function convertSpeechToLatex(
  input: ConvertSpeechToLatexInput
): Promise<ConvertSpeechToLatexOutput> {
  return convertSpeechToLatexFlow(input);
}

const prompt = ai.definePrompt({
  name: 'convertSpeechToLatexPrompt',
  input: {schema: ConvertSpeechToLatexInputSchema},
  output: {schema: ConvertSpeechToLatexOutputSchema},
  prompt: `You are an expert in mathematical notation. Your task is to convert a natural language phrase into a single, clean LaTeX expression.
- Do not include any surrounding text, explanations, or markdown.
- Do not wrap the expression in '$' or '$$'.
- Convert common words to their symbols (e.g., "plus" to "+", "times" to "\\times", "divided by" to "\\frac{}{}", "equals" to "=").

Query: "{{{query}}}"
`,
});

const convertSpeechToLatexFlow = ai.defineFlow(
  {
    name: 'convertSpeechToLatexFlow',
    inputSchema: ConvertSpeechToLatexInputSchema,
    outputSchema: ConvertSpeechToLatexOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('The AI was unable to convert your speech to LaTeX.');
    }
    return output;
  }
);
