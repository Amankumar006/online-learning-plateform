
'use server';
/**
 * @fileOverview A Genkit flow to grade a student's math solution provided in LaTeX.
 *
 * - gradeMathSolution - A function that evaluates a student's LaTeX math solution.
 * - GradeMathSolutionInput - The input type for the function.
 * - GradeMathSolutionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// --- Input Schema ---
const GradeMathSolutionInputSchema = z.object({
  question: z.string().describe("The original math question that was asked."),
  studentSolutionLatex: z.string().describe("The student's full solution, formatted in LaTeX."),
});
export type GradeMathSolutionInput = z.infer<typeof GradeMathSolutionInputSchema>;

// --- Output Schema ---
const StepEvaluationSchema = z.object({
    step: z.string().describe("A specific step or part of the student's solution, quoted or paraphrased."),
    isCorrect: z.boolean().describe("Whether this specific step is mathematically correct."),
    feedback: z.string().describe("Specific feedback for this step, explaining any errors or confirming correctness."),
});

const GradeMathSolutionOutputSchema = z.object({
    isSolutionCorrect: z.boolean().describe("Whether the student's final answer and overall method are correct. True if score is 85 or above."),
    overallScore: z.number().min(0).max(100).describe("A score for the solution, from 0 to 100."),
    overallFeedback: z.string().describe("Constructive, personalized feedback for the student, explaining the overall score and suggesting improvements."),
    stepEvaluations: z.array(StepEvaluationSchema).describe("A step-by-step breakdown of the solution's correctness."),
});
export type GradeMathSolutionOutput = z.infer<typeof GradeMathSolutionOutputSchema>;

// --- Main Exported Function ---
export async function gradeMathSolution(input: GradeMathSolutionInput): Promise<GradeMathSolutionOutput> {
  const result = await gradeMathSolutionFlow(input);
  if (!result) {
      throw new Error("The AI was unable to grade your math solution. Please try submitting again.");
  }
  return result;
}

// --- Genkit Prompt Definition ---
const prompt = ai.definePrompt({
  name: 'gradeMathSolutionPrompt',
  input: {schema: GradeMathSolutionInputSchema},
  output: {schema: GradeMathSolutionOutputSchema},
  prompt: `You are an expert AI Math Tutor. Your task is to evaluate a student's LaTeX solution to a math problem.

**Instructions:**
1.  **Analyze the Question and Solution:** Carefully compare the student's LaTeX solution to the original question.
2.  **Break Down the Solution:** Identify the key steps the student took.
3.  **Evaluate Each Step:** For each step, determine if it is correct and provide clear, concise feedback.
4.  **Calculate an Overall Score:** Based on the correctness of the steps and the final answer, provide a fair score from 0 to 100.
5.  **Write Overall Feedback:** Summarize the student's performance. Highlight what they did well and where they made mistakes. Provide constructive advice for improvement.
6.  **Determine Final Correctness:** Set \`isSolutionCorrect\` to \`true\` only if the overall score is 85 or higher and the final answer is correct.

**Original Question:**
"{{{question}}}"

**Student's LaTeX Solution:**
\`\`\`latex
{{{studentSolutionLatex}}}
\`\`\`

Please provide your full evaluation in the specified JSON format.
`,
});

// --- Genkit Flow Definition ---
const gradeMathSolutionFlow = ai.defineFlow(
  {
    name: 'gradeMathSolutionFlow',
    inputSchema: GradeMathSolutionInputSchema,
    outputSchema: GradeMathSolutionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output;
  }
);
