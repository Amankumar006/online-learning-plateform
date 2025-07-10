
/**
 * @fileOverview Zod schemas for generating diagrams compatible with tldraw.
 */

import { z } from 'genkit';

// Base shape schema
const TLBaseShape = z.object({
  id: z.string().describe("A unique identifier for the shape, e.g., 'shape:user'"),
  x: z.number().describe('The x-coordinate of the top-left corner.'),
  y: z.number().describe('The y-coordinate of the top-left corner.'),
  text: z.string().describe('The text content inside the shape.'),
});

// Box shape (for entities, classes, flowchart steps)
const TLBoxShape = TLBaseShape.extend({
  type: z.enum(['box']),
  w: z.number().describe('The width of the box.'),
  h: z.number().describe('The height of the box.'),
});

// Text shape (for labels, annotations)
const TLTextShape = TLBaseShape.extend({
  type: z.enum(['text']),
  w: z.number().describe('The width of the text area.'),
  h: z.number().describe('The height of the text area.'),
});

// Union of all supported shapes
const TLShape = z.discriminatedUnion('type', [TLBoxShape, TLTextShape]);

// Arrowhead types
const TLArrowhead = z.enum(['arrow', 'triangle', 'diamond', 'pipe', 'none']);

// Arrow shape
const TLArrowShape = z.object({
  id: z.string().describe("A unique identifier for the arrow, e.g., 'arrow:1'"),
  type: z.enum(['arrow']),
  start: z.object({
    id: z.string().describe('The ID of the shape where the arrow starts.'),
  }),
  end: z.object({
    id: z.string().describe('The ID of the shape where the arrow ends.'),
  }),
  start_arrowhead: TLArrowhead.describe('The style of the arrowhead at the start of the arrow.'),
  end_arrowhead: TLArrowhead.describe('The style of the arrowhead at the end of the arrow.'),
  text: z.string().optional().describe('An optional label for the arrow.'),
});

// Input schema for the diagram generation flow
export const GenerateDiagramInputSchema = z.object({
  prompt: z.string().describe("The user's text prompt describing the diagram."),
  diagramType: z.string().describe('The type of diagram to generate (e.g., "ER Diagram", "Flowchart").'),
});

// Output schema for the diagram generation flow
export const GenerateDiagramOutputSchema = z.object({
  shapes: z.array(TLShape).describe('An array of shape objects to be drawn on the canvas.'),
  arrows: z.array(TLArrowShape).describe('An array of arrow objects connecting the shapes.'),
});
