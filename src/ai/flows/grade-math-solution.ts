'use server';
/**
 * @fileOverview A Genkit flow to grade mathematical solutions and provide feedback.
 *
 * - gradeMathSolution - A function that grades a mathematical solution.
 * - GradeMathSolutionInput - The input type for the function.
 * - GradeMathSolutionOutput - The output type for the function.
 */

import { ai } from '@/ai/ai';
import { z } from 'zod';

const GradeMathSolutionInputSchema = z.object({
  problem: z.string().describe("The original math problem statement."),
  solution: z.string().describe("The student's solution to grade."),
  correctAnswer: z.string().optional().describe("The correct answer if known."),
  rubric: z.string().optional().describe("Specific grading criteria."),
});
export type GradeMathSolutionInput = z.infer<typeof GradeMathSolutionInputSchema>;

const GradeMathSolutionOutputSchema = z.object({
  score: z.number().min(0).max(100).describe("The score out of 100."),
  feedback: z.string().describe("Detailed feedback on the solution."),
  isCorrect: z.boolean().describe("Whether the solution is correct."),
  strengths: z.array(z.string()).describe("What the student did well."),
  improvements: z.array(z.string()).describe("Areas for improvement."),
  hints: z.array(z.string()).optional().describe("Hints for solving similar problems."),
});
export type GradeMathSolutionOutput = z.infer<typeof GradeMathSolutionOutputSchema>;

export async function gradeMathSolution(
  input: GradeMathSolutionInput
): Promise<GradeMathSolutionOutput> {
  const result = await gradeMathSolutionFlow(input);
  return result;
}

const prompt = ai.definePrompt({
  name: 'gradeMathSolutionPrompt',
  input: { schema: GradeMathSolutionInputSchema },
  output: { schema: GradeMathSolutionOutputSchema },
  prompt: `You are an expert mathematics instructor. Grade the student's solution to the given math problem.

**Problem:**
{{{problem}}}

**Student's Solution:**
{{{solution}}}

{{#if correctAnswer}}
**Correct Answer:**
{{{correctAnswer}}}
{{/if}}

{{#if rubric}}
**Grading Rubric:**
{{{rubric}}}
{{/if}}

**Instructions:**
1. Evaluate the mathematical accuracy of the solution
2. Check the reasoning and methodology used
3. Assess the clarity and organization of the work
4. Provide constructive feedback that helps the student learn
5. Give a score out of 100 based on correctness, method, and presentation
6. Highlight both strengths and areas for improvement
7. Provide hints for solving similar problems in the future

Be encouraging and educational in your feedback. Focus on helping the student understand concepts better.`,
});

const gradeMathSolutionFlow = ai.defineFlow(
  {
    name: 'gradeMathSolutionFlow',
    inputSchema: GradeMathSolutionInputSchema,
    outputSchema: GradeMathSolutionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    
    if (!output) {
      // Fallback grading if AI fails
      return {
        score: 0,
        feedback: "Unable to grade this solution. Please try again or ask for help.",
        isCorrect: false,
        strengths: [],
        improvements: ["Please provide a clearer solution"],
        hints: ["Break down the problem into smaller steps", "Show your work clearly"]
      };
    }
    
    return output;
  }
);