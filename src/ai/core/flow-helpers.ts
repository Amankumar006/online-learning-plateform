/**
 * Flow Helpers - Compatibility layer for migrating from Genkit
 * Provides defineFlow and definePrompt helpers
 */

import { aiService, AIGenerateOptions } from './ai-provider';
import { z } from 'zod';

// ==================== Types ====================

export interface FlowConfig<TInput = any, TOutput = any> {
  name: string;
  inputSchema?: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;
}

export interface PromptConfig<TInput = any, TOutput = any> {
  name: string;
  input?: { schema: z.ZodType<TInput> };
  output?: { schema: z.ZodType<TOutput> };
  prompt: string | ((input: TInput) => string);
  model?: string;
  config?: Partial<AIGenerateOptions>;
}

export interface ToolConfig<TInput = any, TOutput = any> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
}

export interface Tool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  fn: (input: TInput) => Promise<TOutput>;
}

// ==================== defineFlow ====================

/**
 * Create a flow (replaces ai.defineFlow from Genkit)
 * 
 * @example
 * const myFlow = defineFlow({
 *   name: 'myFlow',
 *   inputSchema: MyInputSchema,
 *   outputSchema: MyOutputSchema
 * }, async (input) => {
 *   // Flow logic
 *   return output;
 * });
 */
export function defineFlow<TInput = any, TOutput = any>(
  config: FlowConfig<TInput, TOutput>,
  handler: (input: TInput) => Promise<TOutput>
) {
  return async (input: TInput): Promise<TOutput> => {
    try {
      // Validate input if schema provided
      if (config.inputSchema) {
        const validatedInput = config.inputSchema.parse(input);
        return await handler(validatedInput);
      }
      
      return await handler(input);
    } catch (error: any) {
      console.error(`Flow ${config.name} error:`, error);
      throw new Error(`Flow ${config.name} failed: ${error.message}`);
    }
  };
}

// ==================== defineTool ====================

/**
 * Create a tool (replaces ai.defineTool from Genkit)
 * 
 * @example
 * const myTool = defineTool({
 *   name: 'myTool',
 *   description: 'Does something useful',
 *   inputSchema: MyInputSchema,
 *   outputSchema: MyOutputSchema
 * }, async (input) => {
 *   // Tool logic
 *   return output;
 * });
 */
export function defineTool<TInput = any, TOutput = any>(
  config: ToolConfig<TInput, TOutput>,
  handler: (input: TInput) => Promise<TOutput>
): Tool<TInput, TOutput> {
  return {
    name: config.name,
    description: config.description,
    inputSchema: config.inputSchema,
    outputSchema: config.outputSchema,
    fn: async (input: TInput): Promise<TOutput> => {
      try {
        // Validate input
        const validatedInput = config.inputSchema.parse(input);
        return await handler(validatedInput);
      } catch (error: any) {
        console.error(`Tool ${config.name} error:`, error);
        throw new Error(`Tool ${config.name} failed: ${error.message}`);
      }
    }
  };
}

// ==================== definePrompt ====================

/**
 * Create a prompt template (replaces ai.definePrompt from Genkit)
 * 
 * @example
 * const myPrompt = definePrompt({
 *   name: 'myPrompt',
 *   input: { schema: MyInputSchema },
 *   output: { schema: MyOutputSchema },
 *   prompt: 'Generate content about {{topic}}'
 * });
 * 
 * const result = await myPrompt({ topic: 'AI' });
 */
export function definePrompt<TInput = any, TOutput = any>(
  config: PromptConfig<TInput, TOutput>
) {
  return async (input: TInput): Promise<{ output: TOutput | null }> => {
    try {
      // Validate input if schema provided
      let validatedInput = input;
      if (config.input?.schema) {
        validatedInput = config.input.schema.parse(input);
      }

      // Build prompt
      let promptText: string;
      if (typeof config.prompt === 'function') {
        promptText = config.prompt(validatedInput);
      } else {
        // Replace template variables (Handlebars-style)
        promptText = config.prompt;
        
        // Support {{variable}} syntax
        for (const [key, value] of Object.entries(validatedInput as any)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          promptText = promptText.replace(regex, String(value));
          
          // Support {{#if variable}} conditionals (basic)
          const ifRegex = new RegExp(`{{#if ${key}}}([\\s\\S]*?){{/if}}`, 'g');
          if (value) {
            promptText = promptText.replace(ifRegex, '$1');
          } else {
            promptText = promptText.replace(ifRegex, '');
          }
        }
        
        // Support {{{variable}}} (unescaped) - treat same as {{variable}}
        for (const [key, value] of Object.entries(validatedInput as any)) {
          const regex = new RegExp(`{{{${key}}}}`, 'g');
          promptText = promptText.replace(regex, String(value));
        }
      }

      // Generate with AI
      const result = await aiService.generate({
        prompt: promptText,
        model: config.model,
        responseFormat: config.output?.schema ? 'json' : 'text',
        ...config.config
      });

      // Parse and validate output if schema provided
      if (config.output?.schema) {
        try {
          const parsed = JSON.parse(result.text);
          const validated = config.output.schema.parse(parsed);
          return { output: validated };
        } catch (parseError) {
          console.error(`Failed to parse output for prompt ${config.name}:`, parseError);
          console.error('Raw output:', result.text.substring(0, 500));
          
          // Try to extract JSON from markdown code blocks
          const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[1]);
              const validated = config.output.schema.parse(parsed);
              return { output: validated };
            } catch {
              // Fall through to return null
            }
          }
          
          return { output: null };
        }
      }

      // Return raw text as output
      return { output: result.text as any };
    } catch (error: any) {
      console.error(`Prompt ${config.name} error:`, error);
      return { output: null };
    }
  };
}

// ==================== Helper Functions ====================

/**
 * Render a Handlebars-style template with variables
 */
export function renderTemplate(template: string, variables: Record<string, any>): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    // Replace {{variable}}
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value));
    
    // Replace {{{variable}}}
    const unescapedRegex = new RegExp(`{{{${key}}}}`, 'g');
    result = result.replace(unescapedRegex, String(value));
    
    // Handle {{#if variable}}...{{/if}}
    const ifRegex = new RegExp(`{{#if ${key}}}([\\s\\S]*?){{/if}}`, 'g');
    if (value) {
      result = result.replace(ifRegex, '$1');
    } else {
      result = result.replace(ifRegex, '');
    }
  }
  
  return result;
}

/**
 * Generate with structured output (JSON + schema validation)
 */
export async function generateWithSchema<T = any>(
  prompt: string,
  schema: z.ZodType<T>,
  options?: Partial<AIGenerateOptions>
): Promise<T> {
  const result = await aiService.generate({
    prompt: `${prompt}\n\nRespond with valid JSON only.`,
    responseFormat: 'json',
    ...options
  });

  try {
    const parsed = JSON.parse(result.text);
    return schema.parse(parsed);
  } catch (parseError) {
    // Try to extract JSON from markdown
    const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return schema.parse(parsed);
    }
    throw new Error(`Failed to parse structured output: ${parseError}`);
  }
}

// ==================== Export for backward compatibility ====================

export const ai = {
  defineFlow,
  definePrompt,
  defineTool,
  generate: aiService.generate.bind(aiService),
  generateStructured: aiService.generateStructured.bind(aiService),
  setDefaultProvider: aiService.setDefaultProvider.bind(aiService),
  getDefaultProvider: aiService.getDefaultProvider.bind(aiService)
};
