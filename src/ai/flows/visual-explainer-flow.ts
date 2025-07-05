
'use server';
/**
 * @fileOverview A Genkit flow to explain a concept from a visual selection on a canvas.
 *
 * - explainVisualConcept - Explains a concept from an image of a diagram provided as a data URI.
 * - ExplainVisualConceptInput - The input type for the function.
 * - ExplainVisualConceptOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainVisualConceptInputSchema = z.object({
  imageDataUri: z.string().describe("A PNG image of the user's selection, as a data URI."),
  prompt: z.string().optional().describe("An optional user prompt for additional context, e.g., 'explain this for a 5th grader'."),
});
export type ExplainVisualConceptInput = z.infer<typeof ExplainVisualConceptInputSchema>;

const ExplainVisualConceptOutputSchema = z.object({
  explanation: z.string().describe('A clear and concise explanation of the visual selection.'),
});
export type ExplainVisualConceptOutput = z.infer<typeof ExplainVisualConceptOutputSchema>;

export async function explainVisualConcept(
  input: ExplainVisualConceptInput
): Promise<ExplainVisualConceptOutput> {
  return explainVisualConceptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainVisualConceptPrompt',
  input: {schema: ExplainVisualConceptInputSchema},
  output: {schema: ExplainVisualConceptOutputSchema},
  prompt: `You are an expert educator with a talent for making complex topics easy to understand. A user has selected a diagram or concept from their digital whiteboard and wants an explanation.

**Your Task:**
1.  **Analyze the Image:** Carefully examine the provided image to understand the core concept it illustrates. This could be anything from a scientific diagram (like a plant cell) to a historical map or a mathematical graph.
2.  **Generate a Clear Explanation:** Write a clear, concise, and easy-to-digest explanation of the concept. Use analogies and simple language where appropriate.
3.  **Tailor the Response:** If the user has provided an additional prompt (e.g., "explain this for a 5th grader" or "focus on the mitochondria"), you MUST tailor your explanation to meet their specific request. If no prompt is given, provide a general, high-level explanation suitable for a high school student.
4.  **Formatting:** Use plain text with simple paragraphs and line breaks. Do NOT use Markdown, LaTeX, or any other special formatting.

{{#if prompt}}
**User's Request:** "{{{prompt}}}"
{{/if}}

**Diagram to explain:**
{{media url=imageDataUri}}

Respond with the explanation in a single block of formatted plain text.
`,
});

const explainVisualConceptFlow = ai.defineFlow(
  {
    name: 'explainVisualConceptFlow',
    inputSchema: ExplainVisualConceptInputSchema,
    outputSchema: ExplainVisualConceptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('The AI was unable to generate an explanation for the selection.');
    }
    return output;
  }
);
