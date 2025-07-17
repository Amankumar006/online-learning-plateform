
'use server';
/**
 * @fileOverview A Genkit flow to generate a set of exercises from lesson content.
 *
 * - generateExercise - A function that generates an array of exercises.
 * - GenerateExerciseInput - The input type for the generateExercise function.
 * - GeneratedExercise - The output type for a single generated exercise (imported from schemas).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
    GeneratedExercise,
    GenerateExerciseOutputSchema
} from '@/ai/schemas/exercise-schemas';

const GenerateExerciseInputSchema = z.object({
  lessonContent: z.string().describe('The content of the lesson to generate an exercise from.'),
  mcqCount: z.number().min(0).default(0).describe('Number of Multiple-Choice questions to generate.'),
  trueFalseCount: z.number().min(0).default(0).describe('Number of True/False questions to generate.'),
  longFormCount: z.number().min(0).default(0).describe('Number of Long-Form questions to generate.'),
  fillInTheBlanksCount: z.number().min(0).default(0).describe('Number of Fill-in-the-Blanks questions to generate.'),
  gradeLevel: z.string().optional().describe('The grade level of the students.'),
  ageGroup: z.string().optional().describe('The age group of the students.'),
  curriculumBoard: z.string().optional().describe('The curriculum board of the students.'),
  topicDepth: z.string().optional().describe('The depth of the source lesson.'),
});
export type GenerateExerciseInput = z.infer<typeof GenerateExerciseInputSchema>;

export type { GeneratedExercise };


export async function generateExercise(input: GenerateExerciseInput): Promise<GeneratedExercise[]> {
  const result = await generateExerciseFlow(input);
  // If the flow returns an empty or nullish result, return an empty array to the caller.
  if (!result || !result.exercises) {
    return [];
  }
  return result.exercises;
}

const prompt = ai.definePrompt({
  name: 'generateExercisePrompt',
  input: {schema: GenerateExerciseInputSchema},
  output: {schema: GenerateExerciseOutputSchema},
  prompt: `You are an expert curriculum developer creating adaptive exercises for an AI learning platform.
Based on the following lesson content, generate a precise set of exercises based on these requirements:
{{#if mcqCount}}
- **{{mcqCount}}** Multiple-Choice ('mcq') questions. Each with: a question, 4 options, the correct answer, an explanation, a hint, and 3-4 relevant string tags.
{{/if}}
{{#if trueFalseCount}}
- **{{trueFalseCount}}** True/False ('true_false') questions. Each with: a statement, the correct boolean answer, an explanation, a hint, and 3-4 relevant string tags.
{{/if}}
{{#if longFormCount}}
- **{{longFormCount}}** Long-Form ('long_form') questions. Each with: a question that requires a detailed, multi-step answer, evaluation criteria for an AI to grade it later, a hint, and 3-4 relevant string tags. If the category is 'code', also provide the programming 'language'.
{{/if}}
{{#if fillInTheBlanksCount}}
- **{{fillInTheBlanksCount}}** Fill-in-the-Blanks ('fill_in_the_blanks') questions. Each with: an array of 'questionParts' (the text surrounding the blanks), an array of 'correctAnswers' for those blanks, an explanation, a hint, and 3-4 relevant string tags.
{{/if}}

The exercises should be tailored for the following student profile, based on the context of the lesson they were generated from:
{{#if gradeLevel}}- **Grade Level:** {{gradeLevel}}{{/if}}
{{#if ageGroup}}- **Age Group:** {{ageGroup}}{{/if}}
{{#if curriculumBoard}}- **Curriculum Board:** {{curriculumBoard}} (Ensure questions align with this board's standards and terminology.){{/if}}
{{#if topicDepth}}- **Lesson Depth:** {{topicDepth}}{{/if}}

Assign a difficulty from 1 (easy) to 3 (hard) for each exercise.
Also, assign a category for each question: 'code' for programming questions, 'math' for mathematical questions, or 'general' for all other types.

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
    if (output && output.exercises) {
      // Ensure MCQ correct answers are one of the options.
      output.exercises.forEach(ex => {
        if (ex.type === 'mcq' && !ex.options.includes(ex.correctAnswer)) {
          // If the AI hallucinates an answer, default to the first option as correct.
          ex.correctAnswer = ex.options[0];
        }
      });
      return output;
    }
    // If the output is null or doesn't contain exercises, return a valid empty structure.
    // This prevents crashes and allows the UI to handle the "no results" case gracefully.
    return { exercises: [] };
  }
);
