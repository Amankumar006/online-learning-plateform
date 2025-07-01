
/**
 * @fileOverview Tools for the AI Study Buddy.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define prompts that the tools can use
const summaryPrompt = ai.definePrompt({
    name: 'summarizeForToolPrompt',
    input: { schema: z.object({ lessonContent: z.string() }) },
    output: { schema: z.object({ summary: z.string() }) },
    prompt: `Summarize the following lesson content into key points:\n\n{{{lessonContent}}}`,
});

const startersPrompt = ai.definePrompt({
    name: 'startersForToolPrompt',
    input: { schema: z.object({ lessonContent: z.string() }) },
    output: { schema: z.object({ starters: z.array(z.string()) }) },
    prompt: `You are an AI study buddy. Generate three conversation starters related to the following lesson content so that the student can practice applying their knowledge. Return your answer as a JSON object with a "starters" key containing an array of strings.\n\nLesson Content: {{{lessonContent}}}`,
});

// Tool 1: Summarize Content
export const summarizeLessonContentTool = ai.defineTool(
  {
    name: 'summarizeLessonContent',
    description: 'Use this tool to summarize the lesson for the student.',
    inputSchema: z.object({
        lessonContent: z.string().describe('The full content of the lesson to be summarized.'),
    }),
    outputSchema: z.string().describe('The generated summary.'),
  },
  async ({lessonContent}) => {
    const { output } = await summaryPrompt({ lessonContent });
    return output!.summary;
  }
);

// Tool 2: Generate Starters
export const generateConversationStartersTool = ai.defineTool(
  {
    name: 'generateConversationStarters',
    description: 'Use this tool to generate a few conversation starters or discussion points for the student.',
    inputSchema: z.object({
        lessonContent: z.string().describe('The full content of the lesson.'),
    }),
    outputSchema: z.array(z.string()),
  },
  async ({lessonContent}) => {
    const { output } = await startersPrompt({ lessonContent });
    return output!.starters;
  }
);
