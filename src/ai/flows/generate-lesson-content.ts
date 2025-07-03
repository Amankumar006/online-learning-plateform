
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

const GenerateLessonContentInputSchema = z.object({
  topic: z.string().describe('The topic for the lesson to be generated.'),
  gradeLevel: z.string().optional().describe('The grade level for the students (e.g., "10th", "12th").'),
  ageGroup: z.string().optional().describe('The age group of the students (e.g., "15-17 years old").'),
  curriculumBoard: z.string().optional().describe('The curriculum board (e.g., "CBSE", "ICSE", "NCERT", "State Board").'),
  topicDepth: z.string().optional().describe('The desired depth of the topic (e.g., "Introductory", "Detailed", "Comprehensive").'),
});
export type GenerateLessonContentInput = z.infer<typeof GenerateLessonContentInputSchema>;

const TextBlockSchema = z.object({
  type: z.enum(['text']),
  content: z.string().describe("Markdown formatted text. Use LaTeX for equations, e.g., $ax^2+bx+c=0$."),
});

const CodeBlockSchema = z.object({
    type: z.enum(['code']),
    language: z.string().describe("The programming language of the code snippet, e.g., 'javascript'."),
    code: z.string().describe("The code snippet."),
});

const BlockSchema = z.discriminatedUnion("type", [
    TextBlockSchema,
    CodeBlockSchema,
]);

const SectionSchema = z.object({
    title: z.string().describe("The title for this section of the lesson."),
    blocks: z.array(BlockSchema).describe("An array of content blocks for this section."),
});


const GenerateLessonContentOutputSchema = z.object({
  title: z.string().describe('A concise and engaging title for the lesson.'),
  subject: z.string().describe('The subject the lesson topic belongs to (e.g., "Mathematics", "Web Development").'),
  description: z.string().describe('A short, one-sentence description of what the lesson covers.'),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).describe('The difficulty level of the lesson.'),
  tags: z.array(z.string()).describe('A list of 2-3 relevant tags for the lesson.'),
  sections: z.array(SectionSchema).describe("An array of lesson sections, each containing various content blocks."),
});
export type GenerateLessonContentOutput = z.infer<typeof GenerateLessonContentOutputSchema>;

export async function generateLessonContent(input: GenerateLessonContentInput): Promise<GenerateLessonContentOutput> {
  return generateLessonContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLessonContentPrompt',
  input: {schema: GenerateLessonContentInputSchema},
  output: {schema: GenerateLessonContentOutputSchema},
  prompt: `You are an expert educator and curriculum designer creating a hyper-personalized, interactive lesson for an advanced AI-powered learning platform (AdaptEd).

Your task is to generate a complete, detailed lesson on the topic: "{{topic}}".

The lesson MUST be tailored to the following student profile:
{{#if gradeLevel}}- **Grade Level:** {{gradeLevel}}{{/if}}
{{#if ageGroup}}- **Age Group:** {{ageGroup}}{{/if}}
{{#if curriculumBoard}}- **Curriculum Board:** {{curriculumBoard}} (Align content, examples, and terminology with this board's standards.){{/if}}
{{#if topicDepth}}- **Topic Depth:** {{topicDepth}}{{/if}}


**Format your response as a JSON object.**

**JSON Structure Instructions:**
- **title**: A concise and engaging title for the lesson.
- **subject**: The subject the lesson topic belongs to (e.g., "Mathematics", "Web Development"). Determine this from the topic.
- **description**: A short, one-sentence description of what the lesson covers.
- **difficulty**: "Beginner", "Intermediate", or "Advanced". Infer this from the topic and context.
- **tags**: An array of 2-3 relevant string tags.
- **sections**: An array of section objects.
    - Each section must have a **title** and an array of **blocks**.
    - Each block must have a **type** and its corresponding data.
    - Supported block types are:
        1.  \`{ "type": "text", "content": "..." }\`: For paragraphs. Use Markdown for formatting and LaTeX for equations (e.g., $ax^2+bx+c=0$). Start a text block's content with '**Example:**' or '**Question:**' to have it be specially highlighted.
        2.  \`{ "type": "code", "language": "...", "code": "..." }\`: For code snippets.

**Content Guidelines:**
- Begin with a warm, friendly introduction.
- Break the lesson into multiple clear sections, each focusing on a subtopic.
- Add rich explanations and practical real-world examples that are appropriate for the specified grade level and curriculum.
- For coding topics, include at least one code block.
- For mathematical topics, include examples with LaTeX.
- Ensure the overall tone is supportive, clear, and inspiring.
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
    if (!output) {
      throw new Error('The AI failed to generate lesson content. Please try a different topic or adjust the parameters.');
    }
    return output;
  }
);
