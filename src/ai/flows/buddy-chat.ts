
'use server';
/**
 * @fileOverview A conversational AI flow for the main Buddy AI page, with tools.
 *
 * - buddyChatStream - A function that handles the conversation.
 * - BuddyChatInput - The input type for the function.
 * - StreamedOutput - The output type for the function's stream.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { PersonaSchema } from '@/ai/schemas/buddy-schemas';
import { generateFollowUpSuggestions } from './generate-follow-up-suggestions';
import { getBuddyChatTools } from '@/ai/tools/buddy-tools';
import { getSystemPrompt } from '@/ai/prompts/buddy-prompts';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const BuddyChatInputSchema = z.object({
  userMessage: z.string().describe('The message sent by the user.'),
  userId: z.string().describe("The ID of the current user, used for context-aware actions."),
  history: z.array(MessageSchema).optional().describe('The conversation history.'),
  persona: PersonaSchema.optional().default('buddy').describe("The AI's persona, which determines its personality and expertise."),
});
export type BuddyChatInput = z.infer<typeof BuddyChatInputSchema>;

const StreamedOutputSchema = z.object({
    type: z.enum(['thought', 'response', 'error']),
    content: z.string(),
    suggestions: z.array(z.string()).optional(),
});
export type StreamedOutput = z.infer<typeof StreamedOutputSchema>;


const buddyChatFlow = ai.defineFlow(
  {
    name: 'buddyChatFlow',
    inputSchema: BuddyChatInputSchema,
    outputSchema: z.object({
        response: z.string(),
        suggestions: z.array(z.string()).optional()
    }),
    authPolicy: (auth, input) => {
        if (!auth) throw new Error("Authentication is required to chat with Buddy AI.");
        if (auth.uid !== input.userId) throw new Error("User ID does not match authenticated user.");
    }
  },
  async (input, {auth}) => {
    
    try {
        const MAX_HISTORY_MESSAGES = 10;

        const history = (input.history || []).slice(-MAX_HISTORY_MESSAGES).map(msg => ({
            role: msg.role as 'user' | 'model',
            parts: [{ text: msg.content }],
        }));
        
        const systemPrompt = getSystemPrompt(input.persona);
        const tools = await getBuddyChatTools();
        
        const llmResponse = await ai.generate({
            model: 'googleai/gemini-2.0-flash',
            tools,
            system: systemPrompt,
            history: history,
            prompt: input.userMessage,
            config: {
                safetySettings: [
                  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                ],
            },
        }, { auth });
        
        const aiResponseText = llmResponse.text;
        
        const followUpResult = await generateFollowUpSuggestions({
            lastUserMessage: input.userMessage,
            aiResponse: aiResponseText,
        });
        
        return {
            response: aiResponseText,
            suggestions: followUpResult.suggestions,
        };

    } catch (e: any) {
        console.error("Error in buddyChatFlow:", e);
        throw new Error(`I'm sorry, but an unexpected error occurred. Here are the details:\n\n> ${e.message || 'An unknown internal error happened.'}\n\nPlease try rephrasing your message or starting a new chat.`);
    }
  }
);


export async function buddyChatStream(input: BuddyChatInput): Promise<StreamedOutput> {
    try {
        const result = await buddyChatFlow(input);
        return {
            type: 'response',
            content: result.response,
            suggestions: result.suggestions,
        };
    } catch (e: any) {
        return {
            type: 'error',
            content: e.message,
        };
    }
}
