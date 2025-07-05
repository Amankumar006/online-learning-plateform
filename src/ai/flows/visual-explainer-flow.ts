'use server';
/**
 * @fileOverview A Genkit flow to explain a visual selection from a canvas.
 *
 * - explainVisualSelection - Explains an SVG diagram provided as a data URI.
 * - ExplainVisualSelectionInput - The input type for the function.
 * - ExplainVisualSelectionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainVisualSelectionInputSchema = z.object({
  svgDataUri: z.string().describe("An SVG diagram of the user's selection, as a data URI that must include the 'data:image/svg+xml;base64,' prefix."),
  prompt: z.string().optional().describe("An optional user prompt for additional context, e.g., 'explain this for a 5th grader'."),
});
export type ExplainVisualSelectionInput = z.infer<typeof ExplainVisualSelectionInputSchema>;

const ExplainVisualSelectionOutputSchema = z.object({
  explanation: z.string().describe('A clear and concise explanation of the visual selection.'),
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
  prompt: `You are an expert educator who can explain any concept visually. A user has selected the following diagram from their digital whiteboard. Your task is to explain it clearly and concisely.

{{#if prompt}}
The user provided this extra context: "{{{prompt}}}"
{{/if}}

Diagram:
{{media url=svgDataUri}}

Provide your explanation in a way that is easy to understand.
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
