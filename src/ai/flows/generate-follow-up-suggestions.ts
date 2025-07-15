
'use server';
/**
 * @fileOverview A Genkit flow to generate conversational follow-up suggestions.
 *
 * - generateFollowUpSuggestions - A function that suggests prompts based on the last turn of a conversation.
 * - GenerateFollowUpSuggestionsInput - The input type for the function.
 * - GenerateFollowUpSuggestionsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFollowUpSuggestionsInputSchema = z.object({
  lastUserMessage: z.string().describe("The user's most recent message."),
  aiResponse: z.string().describe("The AI's immediate response to the user's message."),
});
export type GenerateFollowUpSuggestionsInput = z.infer<typeof GenerateFollowUpSuggestionsInputSchema>;

const GenerateFollowUpSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe("An array of 2-4 short, relevant follow-up prompts a user might ask."),
});
export type GenerateFollowUpSuggestionsOutput = z.infer<typeof GenerateFollowUpSuggestionsOutputSchema>;

export async function generateFollowUpSuggestions(
  input: GenerateFollowUpSuggestionsInput
): Promise<GenerateFollowUpSuggestionsOutput> {
  const result = await generateFollowUpSuggestionsFlow(input);
  if (!result) {
    return { suggestions: [] };
  }
  return result;
}

const prompt = ai.definePrompt({
  name: 'generateFollowUpSuggestionsPrompt',
  input: {schema: GenerateFollowUpSuggestionsInputSchema},
  output: {schema: GenerateFollowUpSuggestionsOutputSchema},
  prompt: `You are an expert at anticipating a user's needs in a conversation or after completing a learning module. Based on the last user message and the AI's response (or the content of a completed lesson), generate 2-4 short, relevant follow-up prompts that the user might want to ask or learn about next.

These prompts should be phrased as if the user is saying them.

**Conversation Turn:**
User: "{{{lastUserMessage}}}"
AI Response / Lesson Content: "{{{aiResponse}}}"

**Examples of Good Follow-up Prompts:**
- "Explain that in simpler terms."
- "Give me a practice problem on this."
- "How does this relate to [previous topic]?"
- "What's the next logical topic to learn?"

Keep the prompts concise and directly related to the conversation.
`,
});

const generateFollowUpSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateFollowUpSuggestionsFlow',
    inputSchema: GenerateFollowUpSuggestionsInputSchema,
    outputSchema: GenerateFollowUpSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output;
  }
);
