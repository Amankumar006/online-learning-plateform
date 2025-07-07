
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

const KeyConceptSchema = z.object({
    name: z.string().describe("The name of the key concept."),
    description: z.string().describe("A brief description of the concept."),
});

const ExplainVisualConceptOutputSchema = z.object({
  title: z.string().describe("A concise title for the explanation."),
  summary: z.string().describe("A one-sentence summary of the concept."),
  explanation: z.string().describe('A clear and concise explanation of the visual selection, formatted in Markdown.'),
  keyConcepts: z.array(KeyConceptSchema).optional().describe("A list of key concepts related to the diagram."),
  analogy: z.string().optional().describe("A simple analogy to help understand the concept."),
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
1.  **Analyze the Image:** Carefully examine the provided image to understand the core concept it illustrates.
2.  **Generate a Structured Explanation:** Create a comprehensive explanation with the following fields:
    *   **title**: A concise, engaging title for the topic.
    *   **summary**: A single sentence that summarizes the core idea.
    *   **explanation**: A clear, multi-paragraph explanation. Use Markdown for formatting (bold, italics).
    *   **keyConcepts**: Identify 2-3 key concepts or terms from the diagram and provide a brief description for each.
    *   **analogy**: Create a simple, relatable analogy to help the user understand the main concept.
3.  **Tailor the Response:** If the user has provided an additional prompt (e.g., "explain this for a 5th grader" or "focus on the mitochondria"), you MUST tailor your explanation to meet their specific request. If no prompt is given, provide a general, high-level explanation suitable for a high school student.

{{#if prompt}}
**User's Request:** "{{{prompt}}}"
{{/if}}

**Diagram to explain:**
{{media url=imageDataUri}}

Respond with a single JSON object conforming to the output schema.
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
