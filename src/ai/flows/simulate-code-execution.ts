
'use server';
/**
 * @fileOverview A Genkit flow to simulate code execution.
 *
 * - simulateCodeExecution - A function that simulates running code and returns its output.
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
});
export type SimulateCodeExecutionOutput = z.infer<typeof SimulateCodeExecutionOutputSchema>;

export async function simulateCodeExecution(input: SimulateCodeExecutionInput): Promise<SimulateCodeExecutionOutput> {
  return simulateCodeExecutionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'simulateCodeExecutionPrompt',
  input: {schema: SimulateCodeExecutionInputSchema},
  output: {schema: SimulateCodeExecutionOutputSchema},
  prompt: `You are a code execution simulator. Your task is to analyze the provided code snippet and predict its output as if it were run in a real compiler or interpreter for the specified language.

**Language:** {{{language}}}

**Code:**
\`\`\`
{{{code}}}
\`\`\`

**Instructions:**
1.  **Analyze Execution:** Determine what the code will print to the standard output.
2.  **Identify Errors:** Check for syntax errors, runtime errors, or logical errors that would prevent the code from running or cause it to crash.
3.  **Format Output:**
    *   If the code runs successfully, populate the 'stdout' field with its exact output and leave 'stderr' empty.
    *   If the code produces an error, populate the 'stderr' field with a descriptive error message (like a real compiler would produce) and leave 'stdout' empty.
    *   If the code runs without errors but produces no output, both 'stdout' and 'stderr' should be empty strings.

Return the result as a single JSON object.
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
