'use server';
/**
 * @fileOverview A Genkit flow to generate a set of exercises from lesson content.
 *
 * - generateExercise - A function that generates an array of exercises.
 * - GenerateExerciseInput - The input type for the generateExercise function.
 * - GeneratedExercise - The output type for a single generated exercise.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateExerciseInputSchema = z.object({
  lessonContent: z.string().describe('The content of the lesson to generate an exercise from.'),
  mcqCount: z.number().min(0).default(0).describe('Number of Multiple-Choice questions to generate.'),
  trueFalseCount: z.number().min(0).default(0).describe('Number of True/False questions to generate.'),
  longFormCount: z.number().min(0).default(0).describe('Number of Long-Form questions to generate.'),
});
export type GenerateExerciseInput = z.infer<typeof GenerateExerciseInputSchema>;

const McqQuestionSchema = z.object({
    type: z.literal('mcq'),
    difficulty: z.number().min(1).max(3),
    question: z.string().describe("The multiple-choice question."),
    options: z.array(z.string()).length(4).describe("An array of exactly 4 possible answers."),
    correctAnswer: z.string().describe("The correct answer from the options."),
    explanation: z.string().describe("An explanation of why the answer is correct."),
    hint: z.string().describe("A hint for the student."),
});

const TrueFalseQuestionSchema = z.object({
    type: z.literal('true_false'),
    difficulty: z.number().min(1).max(3),
    question: z.string().describe("The true/false statement."),
    correctAnswer: z.boolean().describe("Whether the statement is true or false."),
    explanation: z.string().describe("An explanation of why the answer is correct."),
    hint: z.string().describe("A hint for the student."),
});

const LongFormQuestionSchema = z.object({
    type: z.literal('long_form'),
    difficulty: z.number().min(1).max(3),
    question: z.string().describe("The open-ended question requiring a detailed answer."),
    evaluationCriteria: z.string().describe("The criteria the AI will use to evaluate the student's answer."),
    hint: z.string().describe("A hint for the student."),
});

const GeneratedExerciseSchema = z.discriminatedUnion("type", [McqQuestionSchema, TrueFalseQuestionSchema, LongFormQuestionSchema]);
export type GeneratedExercise = z.infer<typeof GeneratedExerciseSchema>;

const GenerateExerciseOutputSchema = z.object({
    exercises: z.array(GeneratedExerciseSchema).describe("An array of generated exercises based on the specified counts.")
});


export async function generateExercise(input: GenerateExerciseInput): Promise<GeneratedExercise[]> {
  const result = await generateExerciseFlow(input);
  return result.exercises;
}

const prompt = ai.definePrompt({
  name: 'generateExercisePrompt',
  input: {schema: GenerateExerciseInputSchema},
  output: {schema: GenerateExerciseOutputSchema},
  prompt: `You are an expert curriculum developer creating adaptive exercises for an AI learning platform.
Based on the following lesson content, generate a precise set of exercises based on these requirements:
{{#if mcqCount}}
- **{{mcqCount}}** Multiple-Choice ('mcq') questions. Each with: a question, 4 options, the correct answer, an explanation, and a hint.
{{/if}}
{{#if trueFalseCount}}
- **{{trueFalseCount}}** True/False ('true_false') questions. Each with: a statement, the correct boolean answer, an explanation, and a hint.
{{/if}}
{{#if longFormCount}}
- **{{longFormCount}}** Long-Form ('long_form') questions. Each with: a question that requires a detailed, multi-step answer, evaluation criteria for an AI to grade it later, and a hint.
{{/if}}

Assign a difficulty from 1 (easy) to 3 (hard) for each exercise.

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
    if (output) {
      // Ensure MCQ correct answers are one of the options.
      output.exercises.forEach(ex => {
        if (ex.type === 'mcq' && !ex.options.includes(ex.correctAnswer)) {
          ex.correctAnswer = ex.options[0];
        }
      });
    }
    return output!;
  }
);
