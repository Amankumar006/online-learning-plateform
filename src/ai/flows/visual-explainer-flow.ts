
'use server';
/**
 * @fileOverview A Genkit flow to explain a visual selection from a canvas.
 *
 * - explainVisualSelection - Explains an image of a diagram provided as a data URI.
 * - ExplainVisualSelectionInput - The input type for the function.
 * - ExplainVisualSelectionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainVisualSelectionInputSchema = z.object({
  imageDataUri: z.string().describe("A PNG image of the user's selection, as a data URI."),
  prompt: z.string().optional().describe("An optional user prompt for additional context, e.g., 'explain this for a 5th grader'."),
});
export type ExplainVisualSelectionInput = z.infer<typeof ExplainVisualSelectionInputSchema>;

const ExplainVisualSelectionOutputSchema = z.object({
  explanation: z.string().describe('A clear and concise explanation of the visual selection, or a step-by-step solution if it is a problem.'),
});
export type ExplainVisualSelectionOutput = z.infer<typeof ExplainVisualSelectionOutputSchema>;

export async function explainVisualSelection(
  input: ExplainVisualSelectionInput
): Promise<ExplainVisualSelectionOutput> {
  return explainVisualSelectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainVisualSelectionPrompt',
  input: {schema: ExplainVisualSelectionInputSchema},
  output: {schema: ExplainVisualSelectionOutputSchema},
  prompt: `You are an expert educator who can explain any concept visually. A user has selected the following diagram from their digital whiteboard.

Your task is to analyze the image.
1.  Determine if the image contains a specific question to be solved (e.g., a math problem, a physics diagram with a query).
2.  If it is a question, provide a clear, step-by-step solution. Format your answer using Markdown. Use LaTeX for equations.
3.  If it is a general diagram or concept without a specific question, provide a concise explanation of what it illustrates.
4.  If the user provides an additional prompt, tailor your response to their request (e.g., explain it for a 5th grader).

{{#if prompt}}
User's request: "{{{prompt}}}"
{{/if}}

Diagram to analyze:
{{media url=imageDataUri}}

Respond with the solution or explanation in Markdown format.
`,
});

const explainVisualSelectionFlow = ai.defineFlow(
  {
    name: 'explainVisualSelectionFlow',
    inputSchema: ExplainVisualSelectionInputSchema,
    outputSchema: ExplainVisualSelectionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('The AI was unable to generate an explanation for the selection.');
    }
    return output;
  }
);
