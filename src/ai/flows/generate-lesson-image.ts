
'use server';
/**
 * @fileOverview Ultra-fast "Nano Banana" image generation using native Gemini API
 * Based on the official Gemini co-drawing demo implementation
 *
 * - generateLessonImage - Ultra-fast image generation function using native API
 * - GenerateLessonImageInput - Input schema with enhanced options
 * - GenerateLessonImageOutput - Output with generation metadata
 */

import { GoogleGenAI, Modality, Content } from '@google/genai';
import { z } from 'zod';

// Initialize Gemini AI with API key (following demo pattern)
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || ''
});

// Error parsing function from demo
function parseError(error: string): string {
  const regex = /{"error":(.*)}/gm;
  const m = regex.exec(error);
  try {
    if (m && m[1]) {
      const e = m[1];
      const err = JSON.parse(e);
      return err.message || error;
    }
    return error;
  } catch (e) {
    return error;
  }
}

const GenerateLessonImageInputSchema = z.object({
  prompt: z.string().describe('A descriptive prompt for the image to be generated.'),
  style: z.enum(['educational', 'diagram', 'illustration', 'photo-realistic', 'minimalist']).default('educational').describe('Image style preference'),
  speed: z.enum(['nano-banana', 'balanced', 'quality']).default('nano-banana').describe('Generation speed vs quality trade-off'),
  context: z.string().optional().describe('Additional context for better image generation'),
});
export type GenerateLessonImageInput = z.infer<typeof GenerateLessonImageInputSchema>;

const GenerateLessonImageOutputSchema = z.object({
  imageUrl: z.string().describe("The data URI of the generated image."),
  generationTime: z.number().describe("Generation time in milliseconds"),
  style: z.string().describe("Applied style"),
  model: z.string().describe("Model used for generation"),
});
export type GenerateLessonImageOutput = z.infer<typeof GenerateLessonImageOutputSchema>;

export async function generateLessonImage(input: GenerateLessonImageInput): Promise<GenerateLessonImageOutput> {
  const startTime = Date.now();

  // Log the request for debugging (following demo pattern)
  console.log('Image generation request:', {
    prompt: input.prompt.substring(0, 100) + '...',
    style: input.style,
    speed: input.speed,
    context: input.context ? input.context.substring(0, 50) + '...' : null
  });

  try {
    const result = await nanoBananaImageGeneration(input);
    const generationTime = Date.now() - startTime;

    console.log('🍌 Nano-banana success:', {
      model: result.model,
      generationTime: generationTime + 'ms',
      imageLength: result.imageUrl.length
    });

    return {
      ...result,
      generationTime
    };
  } catch (error) {
    // Fallback to standard generation if nano-banana fails
    console.warn('Image generation failed, falling back to standard mode:', (error as Error).message);

    try {
      const result = await standardImageGeneration(input);
      const generationTime = Date.now() - startTime;

      console.log('Fallback generation success:', {
        model: result.model,
        generationTime: generationTime + 'ms',
        imageLength: result.imageUrl.length
      });

      return {
        ...result,
        generationTime
      };
    } catch (fallbackError) {
      console.error('Both nano-banana and fallback generation failed:', fallbackError);
      throw new Error(`Image generation failed: ${parseError((fallbackError as Error).message)}`);
    }
  }
}

// Ultra-fast Nano Banana mode using native Gemini API (following demo pattern)
async function nanoBananaImageGeneration(input: GenerateLessonImageInput): Promise<GenerateLessonImageOutput> {
  const enhancedPrompt = createNanoBananaPrompt(input);

  // Use the fastest model for nano-banana mode (gemini-2.5-flash-image is fastest)
  const modelName = input.speed === 'nano-banana' ? 'gemini-2.5-flash-image' : 'gemini-2.0-flash-preview-image-generation';

  try {
    // Create contents array following demo pattern
    const contents: Content[] = [{
      role: 'USER',
      parts: [{
        text: enhancedPrompt
      }]
    }];

    // Generate content using native API (exactly like demo)
    const response = await genAI.models.generateContent({
      model: modelName,
      contents,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
        // Nano-banana optimizations for speed
        temperature: input.speed === 'nano-banana' ? 0.6 : 0.9,
        maxOutputTokens: input.speed === 'nano-banana' ? 50 : 200,
        topK: input.speed === 'nano-banana' ? 10 : 40,
        topP: input.speed === 'nano-banana' ? 0.7 : 0.9,
      },
    });

    // Extract image data from response (following demo pattern)
    const data = {
      success: true,
      message: '',
      imageData: null as string | null,
      error: undefined,
    };

    if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        // Based on the part type, either get the text or image data
        if (part.text) {
          data.message = part.text;
          console.log('Received text response:', part.text);
        } else if (part.inlineData && part.inlineData.data) {
          const imageData = part.inlineData.data;
          console.log('Received image data, length:', imageData.length);
          // Include the base64 data in the response
          data.imageData = imageData;
        }
      }
    }

    if (!data.imageData) {
      throw new Error("Image generation failed to produce an image.");
    }

    // Convert to data URL (following demo pattern)
    const imageUrl = `data:image/png;base64,${data.imageData}`;

    return {
      imageUrl,
      style: input.style,
      generationTime: 0, // Will be set by parent function
      model: `${modelName}-nano-banana`
    };

  } catch (error) {
    console.error('Nano-banana generation error:', error);
    throw new Error(parseError((error as Error).message || 'Nano-banana generation failed'));
  }
}

// Fallback to standard generation if needed (following demo pattern)
async function standardImageGeneration(input: GenerateLessonImageInput): Promise<GenerateLessonImageOutput> {
  try {
    const contents: Content[] = [{
      role: 'USER',
      parts: [{
        text: input.prompt
      }]
    }];

    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash-preview-image-generation',
      contents,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    // Extract image data from response (following demo pattern)
    const data = {
      success: true,
      message: '',
      imageData: null as string | null,
      error: undefined,
    };

    if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          data.message = part.text;
        } else if (part.inlineData && part.inlineData.data) {
          data.imageData = part.inlineData.data;
        }
      }
    }

    if (!data.imageData) {
      throw new Error("Standard image generation failed to produce an image.");
    }

    // Convert to data URL
    const imageUrl = `data:image/png;base64,${data.imageData}`;

    return {
      imageUrl,
      style: input.style,
      generationTime: 0,
      model: 'gemini-2.0-flash-fallback'
    };

  } catch (error) {
    console.error('Standard generation error:', error);
    throw new Error(parseError((error as Error).message || 'Standard generation failed'));
  }
}

function createNanoBananaPrompt(input: GenerateLessonImageInput): string {
  // Nano-banana mode: Ultra-concise prompts for maximum speed (following demo optimization)
  if (input.speed === 'nano-banana') {
    // Keep prompts very short for gemini-2.5-flash-image speed
    const basePrompt = input.prompt.length > 80 ? input.prompt.substring(0, 80) + '...' : input.prompt;

    // Style-specific nano-banana prompts
    const nanoStyles = {
      educational: 'Simple educational diagram.',
      diagram: 'Clean technical diagram.',
      illustration: 'Minimal illustration.',
      'photo-realistic': 'Simple realistic image.',
      minimalist: 'Very simple design.'
    };

    return `${basePrompt} ${nanoStyles[input.style]} No text. Clean style.`;
  }

  // Standard mode: More detailed prompts for better quality
  const styleInstructions = {
    educational: 'Clean, modern educational illustration with clear visual hierarchy',
    diagram: 'Technical diagram with labeled components and clear structure',
    illustration: 'Artistic illustration with engaging visual elements',
    'photo-realistic': 'Photorealistic image with natural lighting and composition',
    minimalist: 'Minimalist design with simple shapes and limited color palette'
  };

  let enhancedPrompt = `${input.prompt}

Style: ${styleInstructions[input.style]}

Requirements:
- Educational and professional appearance
- No text or words in the image
- Clear, engaging visual composition
- Suitable for students and learning materials`;

  // Add context for standard mode only
  if (input.context && (input.speed === 'balanced' || input.speed === 'quality')) {
    const limitedContext = input.context.length > 200 ? input.context.substring(0, 200) + '...' : input.context;
    enhancedPrompt += `\n\nContext: ${limitedContext}`;
  }

  return enhancedPrompt;
}
