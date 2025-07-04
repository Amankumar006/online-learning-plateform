
'use server';
/**
 * @fileOverview A Genkit flow to convert a natural language math query into LaTeX for the canvas.
 *
 * - canvasMathFlow - The flow function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CanvasMathInputSchema = z.object({
  query: z.string().describe('The natural language math query to convert.'),
});
export type CanvasMathInput = z.infer<typeof CanvasMathInputSchema>;

const CanvasMathOutputSchema = z.object({
  latex: z.string().describe('The resulting LaTeX string, without any wrapping characters like $.'),
});
export type CanvasMathOutput = z.infer<typeof CanvasMathOutputSchema>;

export async function canvasMathFlow(
  input: CanvasMathInput
): Promise<CanvasMathOutput> {
  const result = await mathPrompt(input);
  if (!result.output) {
      throw new Error('The AI was unable to convert your speech to LaTeX.');
  }
  return result.output;
}

const mathPrompt = ai.definePrompt({
  name: 'canvasMathPrompt',
  input: {schema: CanvasMathInputSchema},
  output: {schema: CanvasMathOutputSchema},
  prompt: `You are an expert in mathematical notation. Your task is to convert a natural language phrase into a single, clean LaTeX expression.
- Do not include any surrounding text, explanations, or markdown.
- Do not wrap the expression in '$' or '$$'.
- Convert common words to their symbols (e.g., "plus" to "+", "times" to "\\times", "divided by" to "\\frac{}{}", "equals" to "=").

Query: "{{{query}}}"
`,
});
