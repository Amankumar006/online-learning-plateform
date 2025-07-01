
'use server';
/**
 * @fileOverview A Genkit flow to generate a single custom exercise from a user's prompt.
 *
 * - generateCustomExercise - A function that generates a single exercise.
 * - GenerateCustomExerciseInput - The input type for the function.
 * - GeneratedExercise - The output type (reused from generate-exercise flow).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { GeneratedExercise, GenerateExerciseOutputSchema } from './generate-exercise';

const GenerateCustomExerciseInputSchema = z.object({
  prompt: z.string().describe("The user's request for a custom exercise, e.g., 'a python question about lists'"),
});
export type GenerateCustomExerciseInput = z.infer<typeof GenerateCustomExerciseInputSchema>;

// We expect the AI to generate a single exercise, so we'll grab the first from the array.
const GenerateCustomExerciseOutputSchema = GenerateExerciseOutputSchema.transform(output => output.exercises[0]);

export async function generateCustomExercise(input: GenerateCustomExerciseInput): Promise<GeneratedExercise> {
  const result = await generateCustomExerciseFlow(input);
  return result;
}

const prompt = ai.definePrompt({
  name: 'generateCustomExercisePrompt',
  input: {schema: GenerateCustomExerciseInputSchema},
  output: {schema: GenerateCustomExerciseOutputSchema},
  prompt: `You are an expert curriculum developer. A user wants you to create a custom exercise for them.
Based on the user's request, generate a single, high-quality exercise.

**Instructions:**
1.  **Analyze the Request:** Understand the core topic, desired difficulty, and programming language (if any) from the user's prompt.
2.  **Choose the Best Type:** Decide if the question is best suited as a Multiple-Choice ('mcq'), True/False ('true_false'), or Long-Form ('long_form') question.
3.  **Generate Full Content:** Create all the necessary fields for the chosen type (question, options, answer, explanation, criteria, hint, etc.).
4.  **Categorize:** Assign a category: 'code', 'math', or 'general'.
5.  **Set Difficulty:** Assign a difficulty from 1 (easy) to 3 (hard).
6.  **Add Tags:** Generate 3-4 relevant string tags (e.g., 'python', 'arrays', 'loops').

**User's Request:**
"{{{prompt}}}"

Return your response as a JSON object containing an 'exercises' array with exactly one exercise object inside.
`,
});

const generateCustomExerciseFlow = ai.defineFlow(
  {
    name: 'generateCustomExerciseFlow',
    inputSchema: GenerateCustomExerciseInputSchema,
    outputSchema: GenerateCustomExerciseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
     if (output && output.type === 'mcq' && !output.options.includes(output.correctAnswer)) {
        output.correctAnswer = output.options[0];
     }
    return output!;
  }
);
