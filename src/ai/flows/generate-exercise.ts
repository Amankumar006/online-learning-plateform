'use server';
/**
 * @fileOverview A Genkit flow to generate a multiple-choice exercise from lesson content.
 *
 * - generateExercise - A function that generates an exercise.
 * - GenerateExerciseInput - The input type for the generateExercise function.
 * - GenerateExerciseOutput - The return type for the generateExercise function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateExerciseInputSchema = z.object({
  lessonContent: z.string().describe('The content of the lesson to generate an exercise from.'),
});
export type GenerateExerciseInput = z.infer<typeof GenerateExerciseInputSchema>;

const GenerateExerciseOutputSchema = z.object({
  question: z.string().describe('The generated multiple-choice question.'),
  options: z.array(z.string()).length(4).describe('An array of exactly 4 possible answers for the question.'),
  correctAnswer: z.string().describe('The correct answer from the provided options.'),
  explanation: z.string().describe('A brief explanation of why the correct answer is right.'),
  hint: z.string().describe('A helpful hint for the student that does not give away the answer.'),
});
export type GenerateExerciseOutput = z.infer<typeof GenerateExerciseOutputSchema>;

export async function generateExercise(input: GenerateExerciseInput): Promise<GenerateExerciseOutput> {
  return generateExerciseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateExercisePrompt',
  input: {schema: GenerateExerciseInputSchema},
  output: {schema: GenerateExerciseOutputSchema},
  prompt: `You are an expert curriculum developer. Based on the following lesson content, generate a single, relevant multiple-choice question.

The question should test understanding of a key concept from the lesson.
Provide exactly four answer options. One of these options must be the correct answer.
Specify which of the options is the correct answer.
Provide a brief explanation for why the answer is correct.
Also, provide a helpful hint for the student that helps them think about the problem without giving away the answer.

Lesson Content:
{{{lessonContent}}}
`,
});

const generateExerciseFlow = ai.defineFlow(
  {
    name: 'generateExerciseFlow',
    inputSchema: GenerateExerciseInputSchema,
    outputSchema: GenerateExerciseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (output && !output.options.includes(output.correctAnswer)) {
      output.correctAnswer = output.options[0];
    }
    return output!;
  }
);
