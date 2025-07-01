'use server';
/**
 * @fileOverview A Genkit flow to grade a student's long-form answer.
 *
 * - gradeLongFormAnswer - A function that evaluates a student's answer.
 * - GradeLongFormAnswerInput - The input type for the gradeLongFormAnswer function.
 * - GradeLongFormAnswerOutput - The return type for the gradeLongFormAnswer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GradeLongFormAnswerInputSchema = z.object({
  question: z.string().describe("The original long-form question that was asked."),
  evaluationCriteria: z.string().describe("The criteria the AI should use to evaluate the student's answer."),
  studentAnswer: z.string().describe("The answer provided by the student."),
});
export type GradeLongFormAnswerInput = z.infer<typeof GradeLongFormAnswerInputSchema>;

const GradeLongFormAnswerOutputSchema = z.object({
    isCorrect: z.boolean().describe("Whether the student's answer is fundamentally correct. True if the score is 70 or above."),
    score: z.number().min(0).max(100).describe("A score for the answer, from 0 to 100."),
    feedback: z.string().describe("Constructive, personalized feedback for the student, explaining the score and suggesting improvements."),
});
export type GradeLongFormAnswerOutput = z.infer<typeof GradeLongFormAnswerOutputSchema>;


export async function gradeLongFormAnswer(input: GradeLongFormAnswerInput): Promise<GradeLongFormAnswerOutput> {
  return gradeLongFormAnswerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gradeLongFormAnswerPrompt',
  input: {schema: GradeLongFormAnswerInputSchema},
  output: {schema: GradeLongFormAnswerOutputSchema},
  prompt: `You are an expert AI Teaching Assistant. Your task is to evaluate a student's answer to a long-form question.

Provide a fair score from 0 to 100, detailed feedback, and determine if the answer is fundamentally correct (score >= 70).

**Original Question:**
"{{{question}}}"

**Evaluation Criteria:**
"{{{evaluationCriteria}}}"

**Student's Answer:**
"{{{studentAnswer}}}"

Please provide your evaluation in the specified JSON format. The feedback should be encouraging and help the student understand their strengths and weaknesses.
`,
});

const gradeLongFormAnswerFlow = ai.defineFlow(
  {
    name: 'gradeLongFormAnswerFlow',
    inputSchema: GradeLongFormAnswerInputSchema,
    outputSchema: GradeLongFormAnswerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
