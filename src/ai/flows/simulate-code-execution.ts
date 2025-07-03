
'use server';
/**
 * @fileOverview A Genkit flow to simulate code execution and provide analysis.
 *
 * - simulateCodeExecution - A function that simulates running code and returns its output and analysis.
 * - SimulateCodeExecutionInput - The input type for the function.
 * - SimulateCodeExecutionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SimulateCodeExecutionInputSchema = z.object({
  language: z.string().describe("The programming language of the code."),
  code: z.string().describe("The code snippet to execute."),
});
export type SimulateCodeExecutionInput = z.infer<typeof SimulateCodeExecutionInputSchema>;

const SimulateCodeExecutionOutputSchema = z.object({
  stdout: z.string().describe("The standard output (stdout) of the code execution. If the code produces no output, this should be an empty string."),
  stderr: z.string().describe("The standard error (stderr) of the code execution. If there are no errors, this should be an empty string."),
  analysis: z.string().describe("A brief, constructive analysis of the code, commenting on its correctness, style, and potential improvements."),
  complexity: z.object({
    time: z.string().describe("The estimated time complexity, e.g., 'O(n)', 'O(log n)'. Use 'N/A' if not applicable."),
    space: z.string().describe("The estimated space complexity, e.g., 'O(1)', 'O(n)'. Use 'N/A' if not applicable."),
  }).describe("The estimated computational complexity of the code."),
});
export type SimulateCodeExecutionOutput = z.infer<typeof SimulateCodeExecutionOutputSchema>;

export async function simulateCodeExecution(input: SimulateCodeExecutionInput): Promise<SimulateCodeExecutionOutput> {
  return simulateCodeExecutionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'simulateCodeExecutionPrompt',
  input: {schema: SimulateCodeExecutionInputSchema},
  output: {schema: SimulateCodeExecutionOutputSchema},
  prompt: `You are an expert code analysis engine. Your task is to analyze the provided code snippet and predict its output and performance characteristics as if it were run in a real compiler or interpreter.

**Language:** {{{language}}}

**Code:**
\`\`\`
{{{code}}}
\`\`\`

**Instructions:**
1.  **Simulate Execution:** Determine what the code will print to stdout and stderr.
2.  **Analyze Complexity:** Estimate the time and space complexity of the provided algorithm. Use Big O notation. If complexity analysis is not applicable (e.g., for a single line of code), use 'N/A'.
3.  **Provide Analysis:** Write a brief, constructive analysis of the code (2-3 sentences). Comment on its correctness based on typical problem constraints, mention any style improvements (e.g., variable naming), and suggest potential optimizations.
4.  **Format Output:**
    *   If the code runs successfully, populate 'stdout' and leave 'stderr' empty.
    *   If the code has an error, populate 'stderr' and leave 'stdout' empty. In this case, the analysis should focus on the cause of the error.
    *   Always populate the 'analysis' and 'complexity' fields.

Return your full analysis as a single JSON object.
`,
});

const simulateCodeExecutionFlow = ai.defineFlow(
  {
    name: 'simulateCodeExecutionFlow',
    inputSchema: SimulateCodeExecutionInputSchema,
    outputSchema: SimulateCodeExecutionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
