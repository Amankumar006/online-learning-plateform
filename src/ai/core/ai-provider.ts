/**
 * Multi-Provider AI Service
 * Supports Google Gemini, Inception Labs Mercury, and OpenAI
 * No Genkit dependency - pure API integration
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ==================== Types ====================

export type AIProvider = 'gemini' | 'mercury' | 'openai';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIGenerateOptions {
  provider?: AIProvider;
  model?: string;
  messages?: AIMessage[];
  prompt?: string;
  tools?: AITool[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  systemPrompt?: string;
  media?: Array<{ url: string; mimeType?: string }>;
  responseFormat?: 'text' | 'json';
  safetySettings?: any[];
}

export interface AIGenerateResult {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
  provider: AIProvider;
  model: string;
}

export interface AITool {
  name: string;
  description: string;
  parameters: any; // Zod schema or JSON schema
  execute: (args: any) => Promise<any>;
}

export interface PromptTemplate<T = any> {
  name: string;
  template: string | ((input: T) => string);
  inputSchema?: any;
  outputSchema?: any;
}

// ==================== Provider Configurations ====================

const DEFAULT_MODELS = {
  gemini: 'gemini-2.0-flash-exp',
  mercury: 'mercury-coder',
  openai: 'gpt-4-turbo-preview'
};

// ==================== Main AI Service ====================

export class AIService {
  private geminiClient: GoogleGenerativeAI | null = null;
  private defaultProvider: AIProvider = 'gemini';

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize Gemini
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiKey) {
      this.geminiClient = new GoogleGenerativeAI(geminiKey);
    }
  }

  /**
   * Generate AI response with automatic provider selection
   */
  async generate(options: AIGenerateOptions): Promise<AIGenerateResult> {
    const provider = options.provider || this.defaultProvider;
    const model = options.model || DEFAULT_MODELS[provider];

    try {
      switch (provider) {
        case 'gemini':
          return await this.generateWithGemini(model, options);
        case 'mercury':
          return await this.generateWithMercury(model, options);
        case 'openai':
          return await this.generateWithOpenAI(model, options);
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error) {
      console.error(`AI generation failed with ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Generate with Google Gemini
   */
  private async generateWithGemini(
    model: string,
    options: AIGenerateOptions
  ): Promise<AIGenerateResult> {
    if (!this.geminiClient) {
      throw new Error('Gemini client not initialized. Check GEMINI_API_KEY');
    }

    const geminiModel = this.geminiClient.getGenerativeModel({
      model: model,
      generationConfig: {
        temperature: options.temperature ?? 0.9,
        maxOutputTokens: options.maxTokens ?? 8192,
        topP: options.topP ?? 0.95,
        topK: options.topK ?? 40,
      },
      safetySettings: options.safetySettings,
    });

    // Build prompt
    let prompt = '';
    if (options.systemPrompt) {
      prompt += `${options.systemPrompt}\n\n`;
    }

    if (options.messages && options.messages.length > 0) {
      // Convert messages to Gemini format
      const history = options.messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const lastMessage = options.messages[options.messages.length - 1];
      
      if (history.length > 0) {
        const chat = geminiModel.startChat({ history });
        
        // Handle media if present
        if (options.media && options.media.length > 0) {
          const parts = [
            { text: lastMessage.content },
            ...options.media.map(m => ({ 
              inlineData: { 
                data: m.url.split(',')[1], 
                mimeType: m.mimeType || 'image/png' 
              } 
            }))
          ];
          const result = await chat.sendMessage(parts);
          const response = result.response;
          
          return {
            text: response.text(),
            provider: 'gemini',
            model,
            usage: {
              promptTokens: response.usageMetadata?.promptTokenCount || 0,
              completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
              totalTokens: response.usageMetadata?.totalTokenCount || 0,
            }
          };
        }
        
        const result = await chat.sendMessage(lastMessage.content);
        const response = result.response;
        
        return {
          text: response.text(),
          provider: 'gemini',
          model,
          usage: {
            promptTokens: response.usageMetadata?.promptTokenCount || 0,
            completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata?.totalTokenCount || 0,
          }
        };
      } else {
        prompt += lastMessage.content;
      }
    } else if (options.prompt) {
      prompt += options.prompt;
    }

    // Handle media for single prompt
    if (options.media && options.media.length > 0) {
      const parts = [
        { text: prompt },
        ...options.media.map(m => ({ 
          inlineData: { 
            data: m.url.split(',')[1], 
            mimeType: m.mimeType || 'image/png' 
          } 
        }))
      ];
      const result = await geminiModel.generateContent(parts);
      const response = result.response;
      
      return {
        text: response.text(),
        provider: 'gemini',
        model,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0,
        }
      };
    }

    // Simple text generation
    const result = await geminiModel.generateContent(prompt);
    const response = result.response;

    return {
      text: response.text(),
      provider: 'gemini',
      model,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
      }
    };
  }

  /**
   * Generate with Inception Labs Mercury
   */
  private async generateWithMercury(
    model: string,
    options: AIGenerateOptions
  ): Promise<AIGenerateResult> {
    const apiKey = process.env.INCEPTION_API_KEY;
    if (!apiKey) {
      throw new Error('INCEPTION_API_KEY not found in environment variables');
    }

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [];
    
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    if (options.messages && options.messages.length > 0) {
      messages.push(...options.messages);
    } else if (options.prompt) {
      messages.push({ role: 'user', content: options.prompt });
    }

    const response = await fetch('https://api.inceptionlabs.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 0.9,
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mercury API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      text: data.choices[0].message.content,
      provider: 'mercury',
      model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
      finishReason: data.choices[0].finish_reason
    };
  }

  /**
   * Generate with OpenAI (future support)
   */
  private async generateWithOpenAI(
    model: string,
    options: AIGenerateOptions
  ): Promise<AIGenerateResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [];
    
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    if (options.messages && options.messages.length > 0) {
      messages.push(...options.messages);
    } else if (options.prompt) {
      messages.push({ role: 'user', content: options.prompt });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 0.9,
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      text: data.choices[0].message.content,
      provider: 'openai',
      model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
      finishReason: data.choices[0].finish_reason
    };
  }

  /**
   * Create a prompt template
   */
  createPrompt<T = any>(config: PromptTemplate<T>) {
    return async (input: T): Promise<string> => {
      if (typeof config.template === 'function') {
        return config.template(input);
      }
      
      // Simple variable replacement
      let result = config.template;
      for (const [key, value] of Object.entries(input as any)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }
      return result;
    };
  }

  /**
   * Generate with structured output (JSON mode)
   */
  async generateStructured<T = any>(
    options: AIGenerateOptions,
    schema?: any
  ): Promise<T> {
    const result = await this.generate({
      ...options,
      responseFormat: 'json',
      prompt: options.prompt ? 
        `${options.prompt}\n\nRespond with valid JSON only.` : 
        options.prompt
    });

    try {
      const parsed = JSON.parse(result.text);
      
      // Validate with schema if provided
      if (schema && schema.parse) {
        return schema.parse(parsed);
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to parse structured output:', error);
      throw new Error(`Invalid JSON response: ${result.text.substring(0, 200)}`);
    }
  }

  /**
   * Set default provider
   */
  setDefaultProvider(provider: AIProvider) {
    this.defaultProvider = provider;
  }

  /**
   * Get current default provider
   */
  getDefaultProvider(): AIProvider {
    return this.defaultProvider;
  }
}

// ==================== Singleton Instance ====================

export const aiService = new AIService();

// ==================== Helper Functions ====================

/**
 * Quick generate function for simple use cases
 */
export async function generate(
  prompt: string,
  options?: Partial<AIGenerateOptions>
): Promise<string> {
  const result = await aiService.generate({
    prompt,
    ...options
  });
  return result.text;
}

/**
 * Generate with specific provider
 */
export async function generateWith(
  provider: AIProvider,
  prompt: string,
  options?: Partial<AIGenerateOptions>
): Promise<string> {
  const result = await aiService.generate({
    provider,
    prompt,
    ...options
  });
  return result.text;
}

/**
 * Generate structured output
 */
export async function generateStructured<T = any>(
  prompt: string,
  schema?: any,
  options?: Partial<AIGenerateOptions>
): Promise<T> {
  return await aiService.generateStructured<T>(
    { prompt, ...options },
    schema
  );
}
