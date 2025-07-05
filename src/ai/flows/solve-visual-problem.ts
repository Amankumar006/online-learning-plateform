
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
  imageDataUris: z.array(z.string()).describe("A list of PNG images of the user's selection, as data URIs."),
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
  prompt: `You are a multi-disciplinary expert assistant who analyzes and explains visual selections from a student's canvas. Your job is to understand any type of academic or technical content and provide clear, structured help.

**Instructions:**

1. **Identify the Content Type:**
   - Analyze the provided image(s). There may be one or more images for a single problem.
   - Determine the content type: Math problem (geometry, algebra, calculus, statistics, graphs, etc.), Science diagram (biology, physics, chemistry), Code diagram (flowchart, logic), Technical diagram (circuits, mechanical parts), or General drawing.

2. **Provide a Tailored Solution:**
   - **Math problems:** Break down the problem step by step. Clearly list given values, formulas, intermediate steps, and the final answer. Support not just perimeter or area but also algebraic solutions, graph interpretations, calculus steps, and statistical analysis.
   - **Science diagrams:** Identify key components or labeled parts. Describe the scientific or natural process illustrated. Highlight important functions or interactions.
   - **Code or logic diagrams:** Explain the logic and flow. Describe what the system or algorithm does. Suggest improvements or edge cases to consider.
   - **General drawings:** Provide a concise, objective description of what is shown.

3. **Formatting Rules:**
   - Use plain text only (no LaTeX, no complex markdown).
   - Use **bold headings** for each section (e.g., **"Given,"** **"Formula,"** **"Explanation,"** **"Final Answer"**).
   - Use bullet points where helpful for clarity.
   - Keep language simple and student-friendly.

---
**Image(s) to Analyze:**
{{#each imageDataUris}}
{{media url=this}}
{{/each}}

Respond with a single, fully formatted text block.
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
