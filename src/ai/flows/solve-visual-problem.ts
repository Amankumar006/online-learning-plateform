
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
  explanation: z.string().describe('A clear and concise step-by-step solution or explanation of the problem.'),
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
  prompt: `You are a multi-disciplinary AI assistant with expertise in math, science, and computer science. Your task is to analyze an image from a user's canvas and provide a helpful, structured response based on its content.

**Instructions:**
1.  **Identify the Content Type:** First, determine if the image contains a math problem, a science diagram, a code diagram/flowchart, or a general drawing.

2.  **Provide a Tailored Response:** Based on the content type, provide the following:
    *   **For Math Problems (e.g., geometry, algebra):** Provide a clear, step-by-step solution. Use plain text for all formulas (e.g., "A = l * w"). Structure your answer with headings like **"Given,"** **"Formula,"** **"Solution,"** and **"Final Answer."**
    *   **For Science Diagrams (e.g., a plant cell, water cycle):** Identify the key components in the diagram. Then, provide a brief, clear explanation of the biological or scientific process being illustrated. Use headings and bullet points for clarity.
    *   **For Code Diagrams (e.g., flowcharts, pseudocode):** Explain the logic of the diagram. Describe what the algorithm or process is designed to do. If applicable, you can also suggest a potential improvement or an edge case to consider.
    *   **For General Drawings or Uncategorized Content:** Provide a concise, objective description of what you see in the image.

3.  **Formatting:** Use simple, clean formatting. Use bold text for headings. Do NOT use LaTeX or complex markdown.

---
**Image to Analyze:**
{{media url=imageDataUri}}

Respond with your analysis in a single block of formatted plain text.
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
