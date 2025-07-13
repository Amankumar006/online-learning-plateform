
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
  gradeLevel: z.string().optional().describe('The grade level for the students (e.g., "10th", "12th").'),
  ageGroup: z.string().optional().describe('The age group of the students (e.g., "15-17 years old").'),
  curriculumBoard: z.string().optional().describe('The curriculum board (e.g., "CBSE", "ICSE", "NCERT", "State Board").'),
  difficulty: z.number().min(1).max(3).optional().describe('The desired difficulty from 1 (easy) to 3 (hard).'),
  questionType: z.enum(['mcq', 'true_false', 'long_form', 'fill_in_the_blanks', 'any']).optional().describe("The preferred question type. 'any' lets the AI decide."),
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
  prompt: `You are an expert curriculum developer. An admin wants you to create a single custom exercise based on their prompt and structured context.

**Admin's Request:**
"{{{prompt}}}"

**Structured Context:**
{{#if gradeLevel}}- Grade Level: {{gradeLevel}}{{/if}}
{{#if ageGroup}}- Age Group: {{ageGroup}}{{/if}}
{{#if curriculumBoard}}- Curriculum Board: {{curriculumBoard}} (You MUST align the question style, terminology, and complexity with this board's standards.){{/if}}
{{#if difficulty}}- Difficulty: {{difficulty}} (1=easy, 2=medium, 3=hard){{/if}}
{{#if questionType}}- Preferred Question Type: {{questionType}} (if 'any', choose the best fit for the prompt){{/if}}


**Instructions:**
1.  **Analyze Request and Context:** Understand the core topic, desired difficulty, grade level, and curriculum standards from all provided information.
2.  **Choose the Best Type:** If a 'questionType' is specified and is not 'any', you MUST generate that type. If it's 'any' or not provided, choose the most suitable type based on the prompt.
3.  **Generate Full Content:** Create all the necessary fields for the chosen type (question, options, answer, explanation, criteria, hint, etc.). Ensure the content is age-appropriate and aligns with the specified curriculum.
4.  **Set Difficulty:** If a difficulty level is provided in the context, use it. Otherwise, infer a difficulty level (1-3) from the prompt.
5.  **Categorize:** Assign a category: 'code', 'math', or 'general'.
6.  **Add Tags:** Generate 3-4 relevant string tags (e.g., 'python', 'arrays', 'loops').

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
     if (!output) {
      throw new Error("The AI failed to generate an exercise. Please try rephrasing your prompt.");
    }
     if (output.type === 'mcq' && !output.options.includes(output.correctAnswer)) {
        // Fallback: if the AI hallucinates a correct answer not in the options, default to the first option.
        output.correctAnswer = output.options[0];
     }
    return output;
  }
);
