
'use server';
/**
 * @fileOverview A Genkit flow to generate a visual diagram from a concept.
 *
 * - visualExplainerFlow - The main flow function.
 * - VisualExplainerInput - The input type.
 * - VisualExplainerOutput - The output type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getUser, User } from '@/lib/data';

// --- Input Schema ---
const VisualExplainerInputSchema = z.object({
  concept: z.string().describe('The concept or term the user wants to be explained visually.'),
});
export type VisualExplainerInput = z.infer<typeof VisualExplainerInputSchema>;

// --- Output Schema (for the diagram structure) ---
const NodeSchema = z.object({
  id: z.string().describe("A unique identifier for the node within this diagram (e.g., 'node_1')."),
  x: z.number().describe('The x-coordinate of the node.'),
  y: z.number().describe('The y-coordinate of the node.'),
  text: z.string().describe("The concise text content of the node."),
});

const EdgeSchema = z.object({
  fromId: z.string().describe('The ID of the starting node for the arrow.'),
  toId: z.string().describe('The ID of the ending node for the arrow.'),
});

const VisualExplainerOutputSchema = z.object({
  nodes: z.array(NodeSchema).describe('An array of node objects representing the shapes in the diagram.'),
  edges: z.array(EdgeSchema).describe('An array of edge objects representing the arrows connecting the nodes.'),
});
export type VisualExplainerOutput = z.infer<typeof VisualExplainerOutputSchema>;

// --- Main Exported Function ---
export async function visualExplainerFlow(input: VisualExplainerInput): Promise<VisualExplainerOutput> {
  return await visualExplainerGenkitFlow(input);
}

// --- Genkit Prompt Definition ---
const visualExplainerPrompt = ai.definePrompt({
  name: 'visualExplainerPrompt',
  input: { schema: z.object({ concept: z.string(), user: z.custom<User>() }) },
  output: { schema: VisualExplainerOutputSchema },
  prompt: `You are an AI that creates simple, educational diagrams to explain concepts.
A user wants a visual explanation for the concept: "{{{concept}}}"

The user's profile is as follows:
{{#if user.gradeLevel}}- Grade Level: {{user.gradeLevel}}{{/if}}
{{#if user.ageGroup}}- Age Group: {{user.ageGroup}}{{/if}}
{{#if user.learningStyle}}- Preferred Learning Style: {{user.learningStyle}}{{/if}}
{{#if user.interests}}- Interests: {{#each user.interests}}{{{this}}}{{/each}}{{/if}}

Your task is to generate a diagram structure as a JSON object. The complexity and style of the diagram should be adapted to the user's profile. For example, a diagram for a 9th-grader should be much simpler than one for a university student.

The JSON output MUST contain two keys: "nodes" and "edges".

1.  **"nodes"**: An array of node objects.
    *   Each node needs a unique "id" (e.g., "node1", "node_evaporation").
    *   Each node needs "x" and "y" coordinates. Arrange them in a logical layout (e.g., left-to-right flow, top-to-bottom hierarchy, or a circular pattern). Start the layout near (0, 0).
    *   Each node needs concise "text".

2.  **"edges"**: An array of edge objects.
    *   Each edge connects two nodes using "fromId" and "toId", which must match the "id" of a node in your "nodes" array.

Example for "The Water Cycle" for a middle schooler:
{
  "nodes": [
    { "id": "sun", "x": 150, "y": 0, "text": "Sun Heats Water" },
    { "id": "evaporation", "x": 0, "y": 100, "text": "Evaporation" },
    { "id": "condensation", "x": 150, "y": 200, "text": "Condensation (Clouds)" },
    { "id": "precipitation", "x": 300, "y": 100, "text": "Precipitation (Rain)" }
  ],
  "edges": [
    { "fromId": "sun", "toId": "evaporation" },
    { "fromId": "evaporation", "toId": "condensation" },
    { "fromId": "condensation", "toId": "precipitation" },
    { "fromId": "precipitation", "toId": "evaporation" }
  ]
}
`,
});

// --- Genkit Flow Definition ---
const visualExplainerGenkitFlow = ai.defineFlow(
  {
    name: 'visualExplainerGenkitFlow',
    inputSchema: VisualExplainerInputSchema,
    outputSchema: VisualExplainerOutputSchema,
    authPolicy: (auth) => {
        if (!auth) {
            throw new Error("You must be logged in to use this feature.");
        }
    }
  },
  async (input, {auth}) => {
    const user = await getUser(auth!.uid);
    if (!user) {
      throw new Error("User profile not found, cannot create personalized diagram.");
    }

    const { output } = await visualExplainerPrompt({ concept: input.concept, user });
    if (!output) {
      throw new Error("The AI was unable to generate a visual explanation.");
    }

    return output;
  }
);
