
'use server';
/**
 * @fileOverview A Genkit flow to convert LaTeX math into a natural language phrase.
 *
 * - convertLatexToSpeech - Converts a LaTeX string into a spoken phrase.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConvertLatexToSpeechInputSchema = z.object({
  latex: z.string().describe('The LaTeX expression to convert.'),
});
type ConvertLatexToSpeechInput = z.infer<typeof ConvertLatexToSpeechInputSchema>;

const ConvertLatexToSpeechOutputSchema = z.object({
  speech: z.string().describe('The resulting natural language phrase.'),
});
type ConvertLatexToSpeechOutput = z.infer<typeof ConvertLatexToSpeechOutputSchema>;

export async function convertLatexToSpeech(
  input: ConvertLatexToSpeechInput
): Promise<ConvertLatexToSpeechOutput> {
  const result = await convertLatexToSpeechFlow(input);
  if (!result) {
    throw new Error('The AI was unable to convert the LaTeX to speech.');
  }
  return result;
}

const prompt = ai.definePrompt({
  name: 'convertLatexToSpeechPrompt',
  input: {schema: ConvertLatexToSpeechInputSchema},
  output: {schema: ConvertLatexToSpeechOutputSchema},
  prompt: `You are an expert in reading mathematical notation aloud. Your task is to convert a LaTeX expression into a simple, clear, and easy-to-understand natural language phrase.
- Do not add any extra explanations.
- Pronounce symbols and structures clearly (e.g., "\\frac{a}{b}" as "a divided by b", "x^2" as "x squared").

LaTeX Expression: "{{{latex}}}"
`,
});

const convertLatexToSpeechFlow = ai.defineFlow(
  {
    name: 'convertLatexToSpeechFlow',
    inputSchema: ConvertLatexToSpeechInputSchema,
    outputSchema: ConvertLatexToSpeechOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output;
  }
);
