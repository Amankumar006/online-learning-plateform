
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
  prompt: `You are an expert math and science tutor. A user has selected a diagram from their digital whiteboard. Your task is to analyze the image and provide a structured response.

**Analysis Steps:**
1.  **Analyze the image:** Determine if it contains a specific question to be solved (like a math problem) or if it's a general concept.
2.  **Check for user prompt:** See if the user has provided additional context.

**Response Generation:**

**If the diagram is a solvable problem (e.g., math, physics):**
Provide a clear, step-by-step solution formatted as PLAIN TEXT. **Do NOT use LaTeX or Markdown.** Use simple characters for math (e.g., * for multiplication, / for division, ^2 for squared).

Follow this structure precisely:

**1. Identify the sides:** Briefly state the known values from the diagram.
   Example: "A rectangle has two pairs of equal sides. In this case, we have two sides of 4 cm and two sides of 5 cm."

**2. Use the formula:** State the relevant formula using plain text.
   Example: "The perimeter of a rectangle is calculated as: P = 2*l + 2*w"

**3. Plug in the values:** Show the substitution into the formula.
   Example: "P = 2*(5 cm) + 2*(4 cm)"

**4. Calculate:** Show the intermediate and final calculation steps on separate lines.
   Example: "P = 10 cm + 8 cm\nP = 18 cm"

**5. Final Answer:** State the final answer clearly.
   Example: "Therefore, the perimeter of the rectangle is 18 cm."

**If the diagram is a general concept:**
Provide a concise, clear explanation of what the diagram illustrates.

{{#if prompt}}
Tailor your response to the user's request: "{{{prompt}}}"
{{/if}}

**Diagram to analyze:**
{{media url=imageDataUri}}

Respond with the solution or explanation in a single block of formatted plain text.
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
