import { aiService, AIGenerateOptions } from './ai-provider';
import { z } from 'zod';

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

export function defineFlow<TInput = any, TOutput = any>(
  config: FlowConfig<TInput, TOutput>,
  handler: (input: TInput) => Promise<TOutput>
) {
  return async (input: TInput): Promise<TOutput> => {
    try {
      if (config.inputSchema) {
        const validatedInput = config.inputSchema.parse(input);
        return await handler(validatedInput);
      }
      return await handler(input);
    } catch (error: any) {
      console.error(`Flow \${config.name} error:`, error);
      throw new Error(`Flow \${config.name} failed: \${error.message}`);
    }
  };
}

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
        const validatedInput = config.inputSchema.parse(input);
        return await handler(validatedInput);
      } catch (error: any) {
        console.error(`Tool \${config.name} error:`, error);
        throw new Error(`Tool \${config.name} failed: \${error.message}`);
      }
    }
  };
}

export function definePrompt<TInput = any, TOutput = any>(config: PromptConfig<TInput, TOutput>) {
  return async (input: TInput): Promise<{ output: TOutput | null }> => {
    try {
      let validatedInput = input;
      if (config.input?.schema) {
        validatedInput = config.input.schema.parse(input);
      }
      let promptText: string;
      if (typeof config.prompt === 'function') {
        promptText = config.prompt(validatedInput);
      } else {
        promptText = config.prompt;
        for (const [key, value] of Object.entries(validatedInput as any)) {
          promptText = promptText.replace(new RegExp(`{{\${key}}}`, 'g'), String(value));
        }
      }
      const result = await aiService.generate({
        prompt: promptText,
        model: config.model,
        responseFormat: config.output?.schema ? 'json' : 'text',
        ...config.config
      });
      if (config.output?.schema) {
        try {
          const parsed = JSON.parse(result.text);
          return { output: config.output.schema.parse(parsed) };
        } catch {
          const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            try {
              return { output: config.output.schema.parse(JSON.parse(jsonMatch[1])) };
            } catch { return { output: null }; }
          }
          return { output: null };
        }
      }
      return { output: result.text as any };
    } catch (error: any) {
      console.error(`Prompt \${config.name} error:`, error);
      return { output: null };
    }
  };
}

export function renderTemplate(template: string, variables: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{\${key}}}`, 'g'), String(value));
  }
  return result;
}

export async function generateWithSchema<T = any>(
  prompt: string, schema: z.ZodType<T>, options?: Partial<AIGenerateOptions>
): Promise<T> {
  const result = await aiService.generate({ prompt, responseFormat: 'json', ...options });
  return schema.parse(JSON.parse(result.text));
}

export const ai = {
  defineFlow,
  definePrompt,
  defineTool,
  generate: aiService.generate.bind(aiService),
  generateStructured: aiService.generateStructured.bind(aiService),
  setDefaultProvider: aiService.setDefaultProvider.bind(aiService),
  getDefaultProvider: aiService.getDefaultProvider.bind(aiService)
};
