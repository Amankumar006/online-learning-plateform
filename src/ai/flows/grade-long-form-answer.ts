'use server';
/**
 * @fileOverview A Genkit flow to grade a student's long-form answer, potentially with an image.
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
  studentAnswer: z.string().describe("The answer provided by the student in text form."),
  imageDataUri: z.string().optional().describe("An optional photo of handwritten work, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
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
  prompt: `You are an expert AI Teaching Assistant. Your task is to evaluate a student's answer to a long-form question. The student may have provided a typed answer, an image of handwritten work, or both. You must consider all provided materials.

Provide a fair score from 0 to 100, detailed feedback, and determine if the answer is fundamentally correct (score >= 70).

**Original Question:**
"{{{question}}}"

**Evaluation Criteria:**
"{{{evaluationCriteria}}}"

**Student's Typed Answer:**
"{{{studentAnswer}}}"

{{#if imageDataUri}}
**Student's Handwritten Work (Image):**
{{media url=imageDataUri}}
{{/if}}

Please provide your evaluation in the specified JSON format. The feedback should be encouraging and help the student understand their strengths and weaknesses, considering both typed and handwritten parts of their solution.
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
