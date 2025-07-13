
'use server';
/**
 * @fileOverview A Genkit flow to generate a diagram from a text prompt.
 *
 * - generateDiagram - A function that generates diagram shapes and arrows.
 * - GenerateDiagramInput - The input type for the function.
 * - GenerateDiagramOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { GenerateDiagramOutputSchema, GenerateDiagramInputSchema, TLShape, TLArrowShape } from '@/ai/schemas/diagram-schemas';

export type GenerateDiagramInput = z.infer<typeof GenerateDiagramInputSchema>;
export type GenerateDiagramOutput = z.infer<typeof GenerateDiagramOutputSchema>;


export async function generateDiagram(input: GenerateDiagramInput): Promise<GenerateDiagramOutput> {
  const result = await generateDiagramFlow(input);
  if (!result || !result.shapes) {
    throw new Error('The AI was unable to generate a diagram from your prompt.');
  }
  return result;
}

const prompt = ai.definePrompt({
  name: 'generateDiagramPrompt',
  input: {schema: GenerateDiagramInputSchema},
  output: {schema: GenerateDiagramOutputSchema},
  prompt: `You are an expert diagramming AI. Your task is to convert a user's text prompt into a structured diagram format that can be rendered on a digital canvas. The canvas is 1200px wide and 800px high.

**Instructions:**
1.  **Analyze the Prompt:** Understand the user's request: "{{{prompt}}}".
2.  **Determine Diagram Type:** The user wants a "{{{diagramType}}}" diagram.
3.  **Generate Shapes:** Create an array of shape objects.
    *   Each shape MUST have an \`id\`, \`type\` ('geo' or 'text'), \`x\`, \`y\`, and a \`props\` object.
    *   For 'geo' shapes, the \`props\` object MUST include \`geo\` (e.g., 'rectangle'), \`w\`, \`h\`, and \`text\`.
    *   For 'text' shapes, the \`props\` object MUST include \`text\`, \`size\`, and \`align\`.
    *   Position the shapes logically within the 1200x800 canvas. Avoid overlaps. Use 'geo' with 'rectangle' for main entities, classes, or flowchart steps.
4.  **Generate Arrows:** Create an array of arrow objects to connect the shapes.
    *   Each arrow must have an \`id\`, \`type\` ('arrow'), and a \`start\` and \`end\` object.
    *   The \`start\` and \`end\` objects must specify the \`id\` of the shape they connect to.
    *   Set the arrow's \`start_arrowhead\` and \`end_arrowhead\` properties appropriately for the diagram type (e.g., 'arrow' for flowcharts, 'none' for basic ER diagrams, 'triangle' for UML inheritance).
    *   Optionally add a \`text\` label to the arrow (e.g., for relationship names in ER diagrams).
5.  **Layout Strategy:**
    *   For **flowcharts and process diagrams**, arrange shapes from top-to-bottom or left-to-right.
    *   For **ER diagrams or class diagrams**, spread entities out to give room for relationship labels and connections.
    *   For **system architecture diagrams**, use a hierarchical or layered layout (e.g., client, API, database layers).
6.  **Return JSON:** Your final output must be a single JSON object containing the 'shapes' and 'arrows' arrays.

**Example for a simple flowchart:**
\`\`\`json
{
  "shapes": [
    { "id": "shape:start", "type": "geo", "x": 500, "y": 50, "props": { "geo": "rectangle", "w": 100, "h": 50, "text": "Start" } },
    { "id": "shape:decision", "type": "geo", "x": 475, "y": 150, "props": { "geo": "diamond", "w": 150, "h": 60, "text": "Is it valid?" } },
    { "id": "shape:end_yes", "type": "geo", "x": 250, "y": 250, "props": { "geo": "rectangle", "w": 100, "h": 50, "text": "End (Yes)" } },
    { "id": "shape:end_no", "type": "geo", "x": 650, "y": 250, "props": { "geo": "rectangle", "w": 100, "h": 50, "text": "End (No)" } }
  ],
  "arrows": [
    { "id": "arrow:1", "type": "arrow", "start": { "id": "shape:start" }, "end": { "id": "shape:decision" }, "start_arrowhead": "none", "end_arrowhead": "arrow" },
    { "id": "arrow:2", "type": "arrow", "start": { "id": "shape:decision" }, "end": { "id": "shape:end_yes" }, "start_arrowhead": "none", "end_arrowhead": "arrow", "text": "Yes" },
    { "id": "arrow:3", "type": "arrow", "start": { "id": "shape:decision" }, "end": { "id": "shape:end_no" }, "start_arrowhead": "none", "end_arrowhead": "arrow", "text": "No" }
  ]
}
\`\`\`
`,
});

// Helper to validate if a shape has the minimum required properties for tldraw
function isValidShape(shape: any): shape is z.infer<typeof TLShape> {
  return shape && typeof shape === 'object' && shape.id && shape.type && shape.x !== undefined && shape.y !== undefined && shape.props;
}
function isValidArrow(arrow: any): arrow is z.infer<typeof TLArrowShape> {
    return arrow && typeof arrow === 'object' && arrow.id && arrow.type === 'arrow' && arrow.start && arrow.end;
}

const generateDiagramFlow = ai.defineFlow(
  {
    name: 'generateDiagramFlow',
    inputSchema: GenerateDiagramInputSchema,
    outputSchema: GenerateDiagramOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);

    if (!output) {
      // If AI returns null, return a valid empty structure.
      return { shapes: [], arrows: [] };
    }

    // Validate and filter the output from the AI to prevent crashes.
    const validShapes = (output.shapes || []).filter(isValidShape);
    const validArrows = (output.arrows || []).filter(isValidArrow);
    
    return {
        shapes: validShapes,
        arrows: validArrows,
    };
  }
);
