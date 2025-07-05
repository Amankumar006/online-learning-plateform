
'use server'
/**
 * @fileOverview A flow for various text manipulation tasks.
 */
import { ai } from '@/ai/genkit'
import { z } from 'genkit'

export const TextManipulationActionSchema = z.enum(['improve', 'summarize', 'explain', 'fix_grammar']);
export type TextManipulationAction = z.infer<typeof TextManipulationActionSchema>;

const TextManipulationInputSchema = z.object({
    text: z.string().describe('The text to be manipulated.'),
    action: TextManipulationActionSchema.describe('The action to perform on the text.'),
});
export type TextManipulationInput = z.infer<typeof TextManipulationInputSchema>;

const TextManipulationOutputSchema = z.object({
    result: z.string().describe('The resulting text after manipulation.'),
});
export type TextManipulationOutput = z.infer<typeof TextManipulationOutputSchema>;

export async function textManipulationFlow(input: TextManipulationInput): Promise<TextManipulationOutput> {
    return textManipulationGenkitFlow(input);
}

const prompt = ai.definePrompt({
    name: 'textManipulationPrompt',
    input: { schema: TextManipulationInputSchema },
    output: { schema: TextManipulationOutputSchema },
    prompt: `You are an expert editor and teacher. Perform the requested action on the following text.

Action: {{{action}}}

- improve: Rewrite the text to be more clear, concise, and engaging.
- summarize: Provide a short, bulleted summary of the key points.
- explain: Explain the concept in simple terms, as if for a beginner.
- fix_grammar: Correct any spelling and grammar mistakes.

Return only the resulting text, without any additional commentary.

Text:
"{{{text}}}"
`
});

const textManipulationGenkitFlow = ai.defineFlow(
    {
        name: 'textManipulationFlow',
        inputSchema: TextManipulationInputSchema,
        outputSchema: TextManipulationOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        if (!output) {
            throw new Error('The AI was unable to process your request.');
        }
        return output;
    }
);
