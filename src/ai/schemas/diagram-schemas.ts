
/**
 * @fileOverview Zod schemas for generating diagrams compatible with tldraw.
 */

import { z } from 'genkit';

// Base properties common to many tldraw shapes
const TLBaseShapeProps = z.object({
  text: z.string().describe('The text content inside the shape.'),
});

// Props specific to geometric shapes like rectangles, ellipses, etc.
const TLGeoShapeProps = TLBaseShapeProps.extend({
    geo: z.enum(['rectangle', 'ellipse', 'triangle', 'diamond']),
    w: z.number().describe('The width of the shape.'),
    h: z.number().describe('The height of the shape.'),
});

// Props specific to text shapes
const TLTextShapeProps = TLBaseShapeProps.extend({
    size: z.enum(['s', 'm', 'l', 'xl']),
});

// A base schema for a shape on the canvas
const TLBaseShape = z.object({
  id: z.string().describe("A unique identifier for the shape, e.g., 'shape:user'"),
  typeName: z.literal('shape'),
  x: z.number().describe('The x-coordinate of the top-left corner.'),
  y: z.number().describe('The y-coordinate of the top-left corner.'),
});

// The final schema for a geometric shape
const TLGeoShape = TLBaseShape.extend({
  type: z.enum(['geo']),
  props: TLGeoShapeProps,
});

// The final schema for a text shape
const TLTextShape = TLBaseShape.extend({
  type: z.enum(['text']),
  props: TLTextShapeProps,
});


// Union of all supported shapes
export const TLShape = z.discriminatedUnion('type', [TLGeoShape, TLTextShape]);

// Arrowhead types
const TLArrowhead = z.enum(['arrow', 'triangle', 'diamond', 'pipe', 'none']);

// Arrow shape
export const TLArrowShape = z.object({
  id: z.string().describe("A unique identifier for the arrow, e.g., 'arrow:1'"),
  typeName: z.literal('shape'),
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
