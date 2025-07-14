
'use server';
/**
 * @fileOverview A Genkit flow to generate a set of ideas as sticky notes.
 *
 * - generateStickyNotes - A function that generates an array of strings for notes.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStickyNotesInputSchema = z.object({
  topic: z.string().describe('The central topic for brainstorming.'),
});
export type GenerateStickyNotesInput = z.infer<typeof GenerateStickyNotesInputSchema>;

const GenerateStickyNotesOutputSchema = z.object({
  notes: z.array(z.string()).describe("An array of 5-7 short, actionable ideas related to the topic, each suitable for a sticky note."),
});
export type GenerateStickyNotesOutput = z.infer<typeof GenerateStickyNotesOutputSchema>;

export async function generateStickyNotes(input: GenerateStickyNotesInput): Promise<GenerateStickyNotesOutput> {
  const result = await generateStickyNotesFlow(input);
  if (!result || !result.notes || result.notes.length === 0) {
    throw new Error('The AI was unable to generate any ideas for this topic.');
  }
  return result;
}

const prompt = ai.definePrompt({
  name: 'generateStickyNotesPrompt',
  input: {schema: GenerateStickyNotesInputSchema},
  output: {schema: GenerateStickyNotesOutputSchema},
  prompt: `You are a brainstorming assistant. Based on the following topic, generate 5 to 7 concise ideas or key points.
Each idea should be short enough to fit on a sticky note.

Topic: "{{{topic}}}"

Return the ideas as a JSON object with a single key "notes" containing an array of strings.
`,
});

const generateStickyNotesFlow = ai.defineFlow(
  {
    name: 'generateStickyNotesFlow',
    inputSchema: GenerateStickyNotesInputSchema,
    outputSchema: GenerateStickyNotesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output;
  }
);
