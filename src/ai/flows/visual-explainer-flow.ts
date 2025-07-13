
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
  imageDataUri: z.string().describe("A PNG image of the user's selection, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  prompt: z.string().optional().describe("An optional user prompt for additional context, e.g., 'explain this for a 5th grader'."),
  learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'reading/writing', 'unspecified']).optional().describe("The user's preferred learning style to tailor the explanation."),
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
  const result = await explainVisualConceptFlow(input);
   if (!result) {
    throw new Error('The AI was unable to generate an explanation for the selection.');
  }
  return result;
}

const prompt = ai.definePrompt({
  name: 'explainVisualConceptPrompt',
  input: {schema: ExplainVisualConceptInputSchema},
  output: {schema: ExplainVisualConceptOutputSchema},
  model: 'googleai/gemini-2.0-flash', // Explicitly use a multimodal model
  prompt: `You are an expert educator with a talent for making complex topics easy to understand. A user has selected a diagram or concept from their digital whiteboard and wants an explanation.

**Your Task:**
1.  **Analyze the Image:** Carefully examine the provided image to understand the core concept it illustrates.
2.  **Generate a Structured Explanation:** Create a comprehensive explanation with the following fields:
    *   **title**: A concise, engaging title for the topic.
    *   **summary**: A single sentence that summarizes the core idea.
    *   **explanation**: A clear, multi-paragraph explanation. Use Markdown for formatting (bold, italics, lists).
    *   **keyConcepts**: Identify 2-3 key concepts or terms from the diagram and provide a brief description for each.
    *   **analogy**: Create a simple, relatable analogy to help the user understand the main concept.
3.  **Tailor the Response:** You MUST tailor your explanation to meet the user's needs.
    {{#if learningStyle}}
    *   **User's Learning Style:** '{{learningStyle}}'. Adapt your explanation:
        *   For **'visual'** learners, focus on describing the visual relationships in the diagram. Use phrases like "Notice how the arrows connect..." or "The shape of this component indicates...".
        *   For **'auditory'** learners, ensure the analogy is strong and the explanation is conversational and easy to read aloud. Use questions to engage them.
        *   For **'reading/writing'** learners, provide a well-structured, logical breakdown using lists and clear headings.
        *   For **'kinesthetic'** learners, suggest a simple real-world action or interaction related to the concept (e.g., "Imagine you're building with LEGOs, where each block...").
    {{/if}}
    {{#if prompt}}
    *   **User's Specific Request:** "{{{prompt}}}" (e.g., "explain this for a 5th grader"). This is a high-priority instruction. Simplify vocabulary and concepts accordingly.
    {{/if}}
    *   If no specific prompt or style is given, provide a general, high-level explanation suitable for a high school student.

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
