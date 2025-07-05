
/**
 * @fileOverview Shared Zod schemas and TypeScript types for the Buddy AI.
 */
import { z } from 'genkit';

export const PersonaSchema = z.enum(['buddy', 'mentor']).describe("The AI's persona, which determines its personality and expertise.");
export type Persona = z.infer<typeof PersonaSchema>;
