
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

const CodeSuggestionSchema = z.object({
  lineNumber: z.number().describe("The line number where the suggestion applies."),
  suggestion: z.string().describe("A brief explanation of the suggested change (e.g., 'Fix syntax error', 'Optimize loop')."),
  code: z.string().describe("The full, corrected code snippet that the user can use to replace their existing code.")
});

const SimulateCodeExecutionOutputSchema = z.object({
  stdout: z.string().describe("The standard output (stdout) of the code execution. If the code produces no output, this should be an empty string."),
  stderr: z.string().describe("The standard error (stderr) of the code execution. If there are no errors, this should be an empty string."),
  analysis: z.object({
      summary: z.string().describe("A brief, high-level analysis of the code, commenting on its correctness, style, and potential improvements."),
      suggestions: z.array(CodeSuggestionSchema).optional().describe("A list of specific, actionable suggestions to fix or improve the code. Provide suggestions for errors or significant optimizations."),
  }).describe("A structured analysis of the code."),
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
  prompt: `You are an expert code analysis and debugging engine. Your task is to analyze the provided code snippet, predict its output, and provide structured feedback.

**Language:** {{{language}}}

**Code:**
\`\`\`
{{{code}}}
\`\`\`

**Instructions:**
1.  **Simulate Execution:** Determine what the code will print to stdout and stderr.
    *   If the code runs successfully, populate 'stdout' and leave 'stderr' empty.
    *   If the code has a syntax or runtime error, populate 'stderr' with the error message and leave 'stdout' empty.
2.  **Analyze Complexity:** Estimate the time and space complexity of the provided algorithm. Use Big O notation. If not applicable, use 'N/A'.
3.  **Provide Structured Analysis:**
    *   **summary:** Write a brief, high-level analysis of the code (2-3 sentences). Comment on its correctness, style, and potential improvements. If there is an error, the summary should explain the nature of the error.
    *   **suggestions:** If there is an error or a clear opportunity for optimization/improvement, provide a list of specific, actionable suggestions. For each suggestion, include the \`lineNumber\`, a brief \`suggestion\` description, and the full, corrected \`code\` that the user can copy-paste to replace their entire submission. If there are no errors or major issues, you can leave this array empty.

Return your full analysis as a single JSON object conforming to the output schema.
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
    if (!output) {
        throw new Error('The AI was unable to simulate your code. Please check for syntax errors or try again.');
    }
    return output;
  }
);
