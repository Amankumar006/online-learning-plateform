
'use server';
/**
 * @fileOverview A Genkit flow to generate an image for a lesson.
 *
 * - generateLessonImage - A function that generates an image from a prompt.
 * - GenerateLessonImageInput - The input type for the generateLessonImage function.
 * - GenerateLessonImageOutput - The return type for the generateLessonImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateLessonImageInputSchema = z.object({
  prompt: z.string().describe('A descriptive prompt for the image to be generated.'),
});
export type GenerateLessonImageInput = z.infer<typeof GenerateLessonImageInputSchema>;

const GenerateLessonImageOutputSchema = z.object({
  imageUrl: z.string().describe("The data URI of the generated image."),
});
export type GenerateLessonImageOutput = z.infer<typeof GenerateLessonImageOutputSchema>;

export async function generateLessonImage(input: GenerateLessonImageInput): Promise<GenerateLessonImageOutput> {
  return generateLessonImageFlow(input);
}

const generateLessonImageFlow = ai.defineFlow(
  {
    name: 'generateLessonImageFlow',
    inputSchema: GenerateLessonImageInputSchema,
    outputSchema: GenerateLessonImageOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: input.prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });
    
    if (!media || !media.url) {
        throw new Error("Image generation failed to produce an image.");
    }

    return { imageUrl: media.url };
  }
);
