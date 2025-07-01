
/**
 * @fileOverview Shared Zod schemas and TypeScript types for exercises.
 */
import {z} from 'genkit';

export const QuestionCategorySchema = z.enum(['code', 'math', 'general']).describe("The category of the question, either 'code', 'math', or 'general'.");

export const McqQuestionSchema = z.object({
    type: z.enum(['mcq']),
    category: QuestionCategorySchema,
    difficulty: z.number().min(1).max(3),
    question: z.string().describe("The multiple-choice question."),
    options: z.array(z.string()).length(4).describe("An array of exactly 4 possible answers."),
    correctAnswer: z.string().describe("The correct answer from the options."),
    explanation: z.string().describe("An explanation of why the answer is correct."),
    hint: z.string().describe("A hint for the student."),
    tags: z.array(z.string()).describe("A list of 3-4 relevant string tags for the question (e.g., 'python', 'arrays', 'loops')."),
});

export const TrueFalseQuestionSchema = z.object({
    type: z.enum(['true_false']),
    category: QuestionCategorySchema,
    difficulty: z.number().min(1).max(3),
    question: z.string().describe("The true/false statement."),
    correctAnswer: z.boolean().describe("Whether the statement is true or false."),
    explanation: z.string().describe("An explanation of why the answer is correct."),
    hint: z.string().describe("A hint for the student."),
    tags: z.array(z.string()).describe("A list of 3-4 relevant string tags for the question (e.g., 'python', 'arrays', 'loops')."),
});

export const LongFormQuestionSchema = z.object({
    type: z.enum(['long_form']),
    category: QuestionCategorySchema,
    difficulty: z.number().min(1).max(3),
    question: z.string().describe("The open-ended question requiring a detailed answer."),
    language: z.string().optional().describe("The programming language for 'code' category questions, e.g., 'javascript'."),
    evaluationCriteria: z.string().describe("The criteria the AI will use to evaluate the student's answer."),
    hint: z.string().describe("A hint for the student."),
    tags: z.array(z.string()).describe("A list of 3-4 relevant string tags for the question (e.g., 'python', 'arrays', 'loops')."),
});

export const FillInTheBlanksQuestionSchema = z.object({
    type: z.enum(['fill_in_the_blanks']),
    category: QuestionCategorySchema,
    difficulty: z.number().min(1).max(3),
    questionParts: z.array(z.string()).describe("An array of text parts. The blanks go between these parts. e.g., ['The capital of France is ', '.'] would create one blank for the user to fill in."),
    correctAnswers: z.array(z.string()).describe("An array of correct answers for the blanks, in order."),
    explanation: z.string().describe("An explanation of why the answers are correct."),
    hint: z.string().describe("A hint for the student."),
    tags: z.array(z.string()).describe("A list of 3-4 relevant string tags for the question."),
});


export const GeneratedExerciseSchema = z.discriminatedUnion("type", [McqQuestionSchema, TrueFalseQuestionSchema, LongFormQuestionSchema, FillInTheBlanksQuestionSchema]);
export type GeneratedExercise = z.infer<typeof GeneratedExerciseSchema>;

export const GenerateExerciseOutputSchema = z.object({
    exercises: z.array(GeneratedExerciseSchema).describe("An array of generated exercises based on the specified counts.")
});
