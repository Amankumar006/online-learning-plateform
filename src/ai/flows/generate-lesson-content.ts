'use server';
/**
 * @fileOverview A Genkit flow to generate a full lesson from a topic.
 *
 * - generateLessonContent - A function that generates lesson content.
 * - GenerateLessonContentInput - The input type for the generateLessonContent function.
 * - GenerateLessonContentOutput - The return type for the generateLessonContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const GenerateLessonContentInputSchema = z.object({
  topic: z.string().describe('The topic for the lesson to be generated.'),
  subject: z.string().describe('The subject the lesson topic belongs to.'),
});
export type GenerateLessonContentInput = z.infer<typeof GenerateLessonContentInputSchema>;

const ContentBlockSchema = z.object({
    type: z.enum(['paragraph', 'video']),
    value: z.string(),
});

export const GenerateLessonContentOutputSchema = z.object({
  title: z.string().describe('A concise and engaging title for the lesson.'),
  description: z.string().describe('A short, one-sentence description of what the lesson covers.'),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).describe('The difficulty level of the lesson.'),
  content: z.array(ContentBlockSchema).describe("An array of content blocks. Include a mix of paragraphs. For mathematical subjects, include at least one paragraph formatted with '**Example:**' and one with '**Question:**', and use LaTeX for equations (e.g., $ax^2 + bx + c = 0$)."),
  tags: z.array(z.string()).describe('A list of 2-3 relevant tags for the lesson.'),
});
export type GenerateLessonContentOutput = z.infer<typeof GenerateLessonContentOutputSchema>;

export async function generateLessonContent(input: GenerateLessonContentInput): Promise<GenerateLessonContentOutput> {
  return generateLessonContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLessonContentPrompt',
  input: {schema: GenerateLessonContentInputSchema},
  output: {schema: GenerateLessonContentOutputSchema},
  prompt: `You are an expert curriculum developer and instructional designer. Your task is to create a complete lesson based on the provided topic and subject.

The lesson should be structured, engaging, and suitable for the target difficulty level.

Generate the following fields:
- title: A clear and engaging title for the lesson.
- description: A concise, one-sentence summary of the lesson.
- difficulty: Assess the topic and choose between 'Beginner', 'Intermediate', or 'Advanced'.
- tags: Provide 2-3 relevant keyword tags.
- content: Create a series of content blocks to form the lesson.
    - The content should be broken into multiple paragraphs.
    - If the subject is technical or mathematical, you MUST include at least one paragraph starting with '**Example:**' to provide a concrete example.
    - You MUST also include a paragraph starting with '**Question:**' to pose a thought-provoking question to the student.
    - For mathematical subjects, use LaTeX syntax for all equations, enclosed in single ($...$) or double ($$...$$) dollar signs.

Topic: {{{topic}}}
Subject: {{{subject}}}
`,
});

const generateLessonContentFlow = ai.defineFlow(
  {
    name: 'generateLessonContentFlow',
    inputSchema: GenerateLessonContentInputSchema,
    outputSchema: GenerateLessonContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
