
'use server';
/**
 * @fileOverview A Genkit flow to suggest follow-up lessons based on a previous lesson.
 *
 * - generateFollowUpSuggestions - A function that suggests topics for the next lesson.
 * - GenerateFollowUpSuggestionsInput - The input type for the function.
 * - GenerateFollowUpSuggestionsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getLesson, Lesson, Section, TextBlock } from '@/lib/data';

const GenerateFollowUpSuggestionsInputSchema = z.object({
  lessonId: z.string().describe('The ID of the lesson to generate follow-up suggestions for.'),
});
export type GenerateFollowUpSuggestionsInput = z.infer<typeof GenerateFollowUpSuggestionsInputSchema>;

const GenerateFollowUpSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('An array of 3-5 suggested topics for a follow-up lesson.'),
});
export type GenerateFollowUpSuggestionsOutput = z.infer<typeof GenerateFollowUpSuggestionsOutputSchema>;

// Helper function to extract text from lesson sections
const getLessonTextContent = (sections: Section[] | undefined): string => {
    if (!sections || sections.length === 0) {
        return "No textual content provided.";
    }
    return sections.map(section => {
        const sectionTitle = `## ${section.title}`;
        const sectionContent = section.blocks
            .filter(block => block.type === 'text')
            .map(block => (block as TextBlock).content)
            .join('\n\n');
        return `${sectionTitle}\n${sectionContent}`;
    }).join('\n\n---\n\n');
};


export async function generateFollowUpSuggestions(
  input: GenerateFollowUpSuggestionsInput
): Promise<GenerateFollowUpSuggestionsOutput> {
  const lesson = await getLesson(input.lessonId);
  if (!lesson) {
      throw new Error("Could not find the original lesson to base suggestions on.");
  }
  
  const lessonSummary = `
    Title: ${lesson.title}
    Subject: ${lesson.subject}
    Description: ${lesson.description}
    Difficulty: ${lesson.difficulty}
    Grade Level: ${lesson.gradeLevel || 'Not specified'}
    Curriculum Board: ${lesson.curriculumBoard || 'Not specified'}
    Topic Depth: ${lesson.topicDepth || 'Not specified'}
    Tags: ${lesson.tags?.join(', ') || 'None'}
    Content Summary: ${getLessonTextContent(lesson.sections).substring(0, 1500)}...
  `;
  
  return generateFollowUpSuggestionsFlow({ previousLessonSummary: lessonSummary });
}

const GenerateFollowUpPromptInputSchema = z.object({
    previousLessonSummary: z.string().describe("A summary of the previous lesson's content and context."),
});

const prompt = ai.definePrompt({
  name: 'generateFollowUpSuggestionsPrompt',
  input: { schema: GenerateFollowUpPromptInputSchema },
  output: { schema: GenerateFollowUpSuggestionsOutputSchema },
  prompt: `You are an expert curriculum designer for an adaptive learning platform. Your task is to suggest the next logical lesson topics based on a previously completed lesson.

Analyze the following summary of the previous lesson. Based on this context, suggest 3 to 5 distinct, engaging, and logical follow-up lesson titles. These topics should either build directly on the previous concepts, introduce a related new concept, or increase the complexity.

**Previous Lesson Summary:**
---
{{{previousLessonSummary}}}
---

Provide your suggestions as a JSON object with a single key "suggestions" containing an array of strings.
`,
});

const generateFollowUpSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateFollowUpSuggestionsFlow',
    inputSchema: GenerateFollowUpPromptInputSchema,
    outputSchema: GenerateFollowUpSuggestionsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      return { suggestions: [] };
    }
    return output;
  }
);
