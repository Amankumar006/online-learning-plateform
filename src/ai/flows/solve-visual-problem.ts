
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
  context: z.string().optional().describe("Optional text input describing what the user wants help with."),
});
export type SolveVisualProblemInput = z.infer<typeof SolveVisualProblemInputSchema>;

const SolveVisualProblemOutputSchema = z.object({
  identifiedType: z.string().optional().describe("The type of content identified by the AI (e.g., 'geometry', 'physics diagram')."),
  explanation: z.string().describe('A clear and concise step-by-step solution or explanation of the problem.'),
  steps: z.array(z.string()).optional().describe("A list of steps for the solution."),
  finalAnswer: z.string().optional().describe("The final answer to the problem, if applicable."),
  tags: z.array(z.string()).optional().describe("A list of 2-4 short keywords that summarize the core topics in this problem."),
});
export type SolveVisualProblemOutput = z.infer<typeof SolveVisualProblemOutputSchema>;

export async function solveVisualProblem(
  input: SolveVisualProblemInput
): Promise<SolveVisualProblemOutput> {
  const result = await solveVisualProblemFlow(input);
  if (!result || !result.explanation) {
    throw new Error('The AI was unable to generate a solution for the selection.');
  }
  return result;
}

const prompt = ai.definePrompt({
  name: 'solveVisualProblemPrompt',
  input: {schema: SolveVisualProblemInputSchema},
  output: {schema: SolveVisualProblemOutputSchema},
  prompt: `You are a multi-disciplinary expert assistant who analyzes and explains visual selections from a student's canvas. Your job is to understand any type of academic or technical content and provide clear, structured help.

**Instructions:**

1. **Identify the Content Type:**
   - Analyze the provided image(s) to determine the content type: Math problem (geometry, algebra, calculus, statistics, graphs, etc.), Science diagram (biology, physics, chemistry), Code diagram (flowchart, logic), Technical diagram (circuits, mechanical parts), or General drawing. Populate the 'identifiedType' field with your finding.

2. **Provide a Tailored Solution:**
   - If a user-provided context is given, use it to understand what they specifically want to know or solve: "{{{context}}}"
   - **Math problems:** Break down the problem step by step into the 'steps' array. Clearly list given values, formulas, intermediate steps. Put the final answer in the 'finalAnswer' field.
   - **Science diagrams:** Identify key components or labeled parts. Describe the scientific or natural process illustrated. Highlight important functions or interactions.
   - **Code or logic diagrams:** Explain the logic and flow. Describe what the system or algorithm does. Suggest improvements or edge cases to consider.
   - **General drawings:** Provide a concise, objective description of what is shown.
   - Populate the 'explanation' field with your main response.

3. **Explanation Style (Whiteboard Feel):**
   - The main 'explanation' field should feel as if it was explained step-by-step on a whiteboard in a classroom.
   - Use a casual, student-friendly tone with simple words and short sentences.
   - Add natural transition phrases like "so," "next," "here we get," "therefore," "let's find," etc., to make it sound conversational.
   - **Crucially, avoid long continuous paragraphs.** Use frequent line breaks to mimic how a person writes on a board. A new line for each thought or step is ideal.
   - Keep numbers, equations, and formulas on their own lines to make them stand out visually.

4. **Generate Tags:**
   - List a few short keywords (tags) that summarize the core topics in this problem. Populate the 'tags' field.

5. **Formatting Rules:**
   - Use plain text only (no LaTeX, no complex markdown).

---
**Image to Analyze:**
{{media url=imageDataUris.[0]}}

Respond with a single JSON object that conforms to the output schema.
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
      // Fallback in case the AI returns nothing.
      return {
          explanation: "The AI was unable to generate a solution. Please try rephrasing or a different selection."
      } as SolveVisualProblemOutput;
    }
    return output;
  }
);
