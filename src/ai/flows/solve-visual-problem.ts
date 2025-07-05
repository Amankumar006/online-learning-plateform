
'use server';
/**
 * @fileOverview A Genkit flow to solve a problem from a visual selection on a canvas.
 *
 * - solveVisualProblem - Solves a problem from an image of a diagram provided as a data URI.
 * - SolveVisualProblemInput - The input type for the function.
 * - SolveVisualProblemOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SolveVisualProblemInputSchema = z.object({
  imageDataUri: z.string().describe("A PNG image of the user's selection, as a data URI."),
});
export type SolveVisualProblemInput = z.infer<typeof SolveVisualProblemInputSchema>;

const SolveVisualProblemOutputSchema = z.object({
  explanation: z.string().describe('A clear and concise step-by-step solution to the problem.'),
});
export type SolveVisualProblemOutput = z.infer<typeof SolveVisualProblemOutputSchema>;

export async function solveVisualProblem(
  input: SolveVisualProblemInput
): Promise<SolveVisualProblemOutput> {
  return solveVisualProblemFlow(input);
}

const prompt = ai.definePrompt({
  name: 'solveVisualProblemPrompt',
  input: {schema: SolveVisualProblemInputSchema},
  output: {schema: SolveVisualProblemOutputSchema},
  prompt: `You are an expert math tutor. Your task is to analyze the provided image of a math problem and provide a clear, step-by-step solution.

**Instructions:**
1.  **Analyze the Image:** Carefully examine the image to understand the question being asked. Identify all given values and the geometric shape.
2.  **Provide a Step-by-Step Solution:** Structure your answer with clear, numbered steps. Use bold text for headings (e.g., "**1. Identify the sides**").
3.  **Use Plain Text for Formulas:** Do NOT use LaTeX or any special formatting for equations. Write them out in plain text (e.g., "P = 2l + 2w", "P = 2 * 5 cm + 2 * 4 cm").
4.  **Be Clear and Concise:** Explain each step simply.

**Example of desired output format:**

**1. Identify the sides**
The length (l) is 5 cm.
The width (w) is 4 cm.

**2. State the formula**
The formula for the perimeter of a rectangle is P = 2l + 2w.

**3. Plug in the values**
P = 2 * 5 cm + 2 * 4 cm

**4. Calculate**
P = 10 cm + 8 cm
P = 18 cm

**Final Answer:** The perimeter of the rectangle is 18 cm.

---
**Problem to Solve:**
{{media url=imageDataUri}}

Respond with the solution in a single block of formatted plain text.
`,
});

const solveVisualProblemFlow = ai.defineFlow(
  {
    name: 'solveVisualProblemFlow',
    inputSchema: SolveVisualProblemInputSchema,
    outputSchema: SolveVisualProblemOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('The AI was unable to generate a solution for the selection.');
    }
    return output;
  }
);
