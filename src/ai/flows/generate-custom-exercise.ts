
'use server';
/**
 * @fileOverview A Genkit flow to generate a single custom exercise from a user's prompt.
 *
 * - generateCustomExercise - A function that generates a single exercise.
 * - GenerateCustomExerciseInput - The input type for the function.
 * - GeneratedExercise - The output type (reused from schemas).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { GeneratedExercise, GeneratedExerciseSchema } from '@/ai/schemas/exercise-schemas';

const GenerateCustomExerciseInputSchema = z.object({
  prompt: z.string().describe("The user's request for a custom exercise, e.g., 'a python question about lists'"),
});
export type GenerateCustomExerciseInput = z.infer<typeof GenerateCustomExerciseInputSchema>;
export type { GeneratedExercise };


export async function generateCustomExercise(input: GenerateCustomExerciseInput): Promise<GeneratedExercise> {
  const result = await generateCustomExerciseFlow(input);
  if (!result) {
    throw new Error("The AI returned data in an unsupported format. Please try rephrasing your prompt.");
  }
  return result;
}

const prompt = ai.definePrompt({
  name: 'generateCustomExercisePrompt',
  input: {schema: GenerateCustomExerciseInputSchema},
  output: {schema: GeneratedExerciseSchema},
  prompt: `You are an expert curriculum developer. A user wants you to create a custom exercise for them.
Based on the user's request, generate a single, high-quality exercise.

**Instructions:**
1.  **Analyze the Request:** Understand the core topic, desired difficulty, and programming language (if any) from the user's prompt.
2.  **Choose the Best Type:** Decide if the question is best suited as a Multiple-Choice ('mcq'), True/False ('true_false'), Long-Form ('long_form'), or Fill-in-the-Blanks ('fill_in_the_blanks') question.
3.  **Generate Full Content:** Create all the necessary fields for the chosen type (question, options, answer, explanation, criteria, hint, etc.).
4.  **Categorize:** Assign a category: 'code', 'math', or 'general'.
5.  **Set Difficulty:** Assign a difficulty from 1 (easy) to 3 (hard).
6.  **Add Tags:** Generate 3-4 relevant string tags (e.g., 'python', 'arrays', 'loops').

**User's Request:**
"{{{prompt}}}"

Return your response as a single JSON object that conforms to the exercise schema. Do not wrap it in any other object or array.
`,
});

const generateCustomExerciseFlow = ai.defineFlow(
  {
    name: 'generateCustomExerciseFlow',
    inputSchema: GenerateCustomExerciseInputSchema,
    outputSchema: GeneratedExerciseSchema,
  },
  async input => {
    const {output} = await prompt(input);
     if (output && output.type === 'mcq' && !output.options.includes(output.correctAnswer)) {
        output.correctAnswer = output.options[0];
     }
    return output; // Return output directly, which can be null
  }
);
