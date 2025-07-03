
'use server';
/**
 * @fileOverview A Genkit flow to grade a student's step-by-step math solution.
 *
 * - gradeMathSolution - A function that evaluates a student's LaTeX solution.
 * - GradeMathSolutionInput - The input type for the function.
 * - GradeMathSolutionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GradeMathSolutionInputSchema = z.object({
  question: z.string().describe("The original math question that was asked."),
  studentSolutionLatex: z.string().describe("The student's full, multi-step solution, written in LaTeX format."),
});
export type GradeMathSolutionInput = z.infer<typeof GradeMathSolutionInputSchema>;

const StepEvaluationSchema = z.object({
    step: z.string().describe("The specific LaTeX step being evaluated."),
    isCorrect: z.boolean().describe("Whether this specific step is mathematically and logically correct."),
    feedback: z.string().describe("Feedback on this specific step, explaining any errors or confirming correctness."),
});

const GradeMathSolutionOutputSchema = z.object({
    isSolutionCorrect: z.boolean().describe("Whether the student's final answer is correct."),
    overallScore: z.number().min(0).max(100).describe("A score for the entire solution, from 0 to 100, based on the number of correct steps and the final answer."),
    overallFeedback: z.string().describe("Constructive, personalized feedback for the student on their overall approach."),
    stepEvaluations: z.array(StepEvaluationSchema).describe("An array of evaluations for each step of the solution."),
});
export type GradeMathSolutionOutput = z.infer<typeof GradeMathSolutionOutputSchema>;


export async function gradeMathSolution(input: GradeMathSolutionInput): Promise<GradeMathSolutionOutput> {
  return gradeMathSolutionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gradeMathSolutionPrompt',
  input: {schema: GradeMathSolutionInputSchema},
  output: {schema: GradeMathSolutionOutputSchema},
  prompt: `You are an expert AI Math Tutor. Your task is to evaluate a student's step-by-step solution to a math problem. The solution is provided in LaTeX.

**Instructions:**
1.  **Analyze the Entire Solution:** First, review the entire solution to understand the student's overall method and determine if the final answer is correct.
2.  **Evaluate Each Step:** The student's LaTeX solution may have multiple lines, each representing a step. Go through each line (\`step\`) and evaluate it individually.
    - Determine if the logic and calculation in that specific step are correct (\`isCorrect\`).
    - Provide concise feedback for each step (\`feedback\`). If the step is correct, confirm it. If it's incorrect, clearly explain the error.
3.  **Provide Overall Feedback:** Write a summary of the student's performance (\`overallFeedback\`). Be encouraging. Point out what they did well and where they can improve.
4.  **Calculate a Score:** Assign an \`overallScore\` from 0 to 100 based on the correctness of the steps and the final answer.

**Original Question:**
"{{{question}}}"

**Student's LaTeX Solution:**
\`\`\`latex
{{{studentSolutionLatex}}}
\`\`\`

Please provide your full evaluation in the specified JSON format.
`,
});

const gradeMathSolutionFlow = ai.defineFlow(
  {
    name: 'gradeMathSolutionFlow',
    inputSchema: GradeMathSolutionInputSchema,
    outputSchema: GradeMathSolutionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error('The AI was unable to grade your answer. Please try submitting again.');
    }
    return output;
  }
);
