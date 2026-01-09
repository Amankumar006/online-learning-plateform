/**
 * AI Provider Service - Multi-provider support for Gemini, Mercury, and OpenAI
 * With automatic fallback when primary provider fails
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// ==================== Types ====================

export type AIProvider = 'gemini' | 'mercury' | 'openai';

export interface AIMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

export interface AITool {
  name: string;
  description: string;
  inputSchema: any;
  outputSchema: any;
  fn: (input: any) => Promise<any>;
}

export interface AIGenerateOptions {
  prompt: string | Array<{ text?: string; media?: { url: string } }>;
  model?: string;
  provider?: AIProvider;
  systemPrompt?: string;
  history?: AIMessage[];
  tools?: AITool[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  disableFallback?: boolean; // Set to true to disable automatic fallback
}

export interface AIGenerateResult {
  text: string;
  provider?: AIProvider; // Which provider actually handled the request
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AIEmbedOptions {
  content: string;
  model?: string; // e.g. 'text-embedding-004'
  embedder?: string; // Legacy support
}

export interface AIEmbedResult {
  embedding: number[];
}

export interface PromptTemplate {
  name: string;
  template: string;
  variables: string[];
}

// ==================== Default Models ====================

const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: 'gemini-2.0-flash',
  mercury: 'mercury',  // Updated to use main Mercury model
  openai: 'gpt-4o-mini'
};

// ==================== Fallback Order ====================
// Define the order in which providers should be tried
const FALLBACK_ORDER: AIProvider[] = ['gemini', 'mercury', 'openai'];

// ==================== AI Service Class ====================

export class AIService {
  private geminiClient: GoogleGenerativeAI | null = null;
  private defaultProvider: AIProvider = 'gemini';
  private enableFallback: boolean = true;

  constructor() {
    console.log('🚀 AIService: Constructor called');
    this.initializeClients();
  }

  private initializeClients() {
    console.log('🚀 AIService: initializeClients called');
    // Initialize Gemini
    const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    console.log('🚀 AIService: Checking API keys:', {
      GOOGLE_API_KEY_EXISTS: !!process.env.GOOGLE_API_KEY,
      GEMINI_API_KEY_EXISTS: !!process.env.GEMINI_API_KEY
    });

    if (googleApiKey) {
      if (process.env.GOOGLE_API_KEY && process.env.GEMINI_API_KEY) {
        console.log('Both GOOGLE_API_KEY and GEMINI_API_KEY are set. Using GOOGLE_API_KEY.');
      }
      try {
        this.geminiClient = new GoogleGenerativeAI(googleApiKey);
        console.log('🚀 AIService: Gemini client initialized successfully');
      } catch (e: any) {
        console.error('❌ AIService: Failed to initialize Gemini client:', e);
      }
    } else {
      console.warn('⚠️ AIService: No Google API key found');
    }
  }

  setDefaultProvider(provider: AIProvider) {
    this.defaultProvider = provider;
  }

  getDefaultProvider(): AIProvider {
    return this.defaultProvider;
  }

  setFallbackEnabled(enabled: boolean) {
    this.enableFallback = enabled;
  }

  // Check if a provider is available (has API key configured)
  isProviderAvailable(provider: AIProvider): boolean {
    switch (provider) {
      case 'gemini':
        return !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
      case 'mercury':
        return !!process.env.INCEPTION_API_KEY && process.env.INCEPTION_API_KEY !== 'your_inception_api_key_here';
      case 'openai':
        return !!process.env.OPENAI_API_KEY;
      default:
        return false;
    }
  }

  // Get list of available fallback providers (excluding the failed one)
  private getAvailableFallbacks(excludeProvider: AIProvider): AIProvider[] {
    return FALLBACK_ORDER.filter(p => p !== excludeProvider && this.isProviderAvailable(p));
  }

  // ==================== Main Generate Method with Fallback ====================

  async generate(options: AIGenerateOptions): Promise<AIGenerateResult> {
    const provider = options.provider || this.defaultProvider;
    const shouldFallback = this.enableFallback && !options.disableFallback;

    try {
      const result = await this.generateWithProvider(provider, options);
      return { ...result, provider };
    } catch (error: any) {
      console.error(`❌ ${provider} failed:`, error.message);

      // If fallback is disabled, throw the error
      if (!shouldFallback) {
        throw error;
      }

      // Try fallback providers
      const fallbacks = this.getAvailableFallbacks(provider);

      if (fallbacks.length === 0) {
        console.error('❌ No fallback providers available');
        throw error;
      }

      for (const fallbackProvider of fallbacks) {
        try {
          console.log(`🔄 Falling back to ${fallbackProvider}...`);
          const result = await this.generateWithProvider(fallbackProvider, {
            ...options,
            model: undefined // Use default model for fallback provider
          });
          console.log(`✅ Fallback to ${fallbackProvider} successful`);
          return { ...result, provider: fallbackProvider };
        } catch (fallbackError: any) {
          console.error(`❌ Fallback ${fallbackProvider} also failed:`, fallbackError.message);
          continue;
        }
      }

      // All providers failed
      throw new Error(`All AI providers failed. Last error: ${error.message}`);
    }
  }

  // Route to specific provider
  private async generateWithProvider(provider: AIProvider, options: AIGenerateOptions): Promise<AIGenerateResult> {
    switch (provider) {
      case 'gemini':
        return this.generateWithGemini(options);
      case 'mercury':
        return this.generateWithMercury(options);
      case 'openai':
        return this.generateWithOpenAI(options);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  // ==================== Gemini Implementation ====================

  private async generateWithGemini(options: AIGenerateOptions): Promise<AIGenerateResult> {
    console.log('🚀 generateWithGemini: called with model', options.model);
    if (!this.geminiClient) {
      console.error('❌ generateWithGemini: Gemini client is null');
      throw new Error('Gemini client not initialized. Set GOOGLE_API_KEY or GEMINI_API_KEY.');
    }

    const modelName = options.model || DEFAULT_MODELS.gemini;
    console.log('🚀 generateWithGemini: getting generative model', modelName);
    const model = this.geminiClient.getGenerativeModel({ model: modelName });

    // Build content parts
    const parts: any[] = [];
    console.log('🚀 generateWithGemini: building prompt parts');

    if (typeof options.prompt === 'string') {
      parts.push({ text: options.prompt });
    } else if (Array.isArray(options.prompt)) {
      for (const part of options.prompt) {
        if (part.text) {
          parts.push({ text: part.text });
        }
        if (part.media?.url) {
          // Handle media URLs (images)
          if (part.media.url.startsWith('data:')) {
            const [header, base64Data] = part.media.url.split(',');
            const mimeType = header.split(':')[1].split(';')[0];
            parts.push({
              inlineData: {
                mimeType,
                data: base64Data
              }
            });
          } else {
            // For regular URLs, we need to fetch and convert
            parts.push({ text: `[Image: ${part.media.url}]` });
          }
        }
      }
    }

    // Build generation config
    const generationConfig: any = {};
    if (options.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }
    if (options.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = options.maxTokens;
    }
    if (options.responseFormat === 'json') {
      generationConfig.responseMimeType = 'application/json';
    }

    // Add system prompt if provided
    let systemInstruction: string | undefined;
    if (options.systemPrompt) {
      systemInstruction = options.systemPrompt;
    }

    console.log('🚀 generateWithGemini: ready to call API');

    // Start chat if history is provided
    if (options.history && options.history.length > 0) {
      console.log('🚀 generateWithGemini: using startChat');
      const chat = model.startChat({
        history: options.history.map(msg => ({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
        generationConfig,
        systemInstruction
      });

      console.log('🚀 generateWithGemini: sending message');
      const result = await chat.sendMessage(parts);
      console.log('🚀 generateWithGemini: message sent, receiving response');
      const response = result.response;

      return {
        text: response.text(),
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount || 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount || 0
        }
      };
    }

    // Simple generation without history
    console.log('🚀 generateWithGemini: using generateContent');
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig,
        systemInstruction
      });

      console.log('🚀 generateWithGemini: content generated');
      const response = result.response;
      console.log('🚀 generateWithGemini: response received');

      return {
        text: response.text(),
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount || 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount || 0
        }
      };
    } catch (err: any) {
      console.error('❌ generateWithGemini: generateContent failed:', err);
      throw err;
    }
  }

  // ==================== Mercury Implementation ====================

  private async generateWithMercury(options: AIGenerateOptions): Promise<AIGenerateResult> {
    const apiKey = process.env.INCEPTION_API_KEY;
    if (!apiKey) {
      throw new Error('Mercury API key not set. Set INCEPTION_API_KEY environment variable.');
    }

    const modelName = options.model || DEFAULT_MODELS.mercury;

    const messages: any[] = [];

    // Add system message if provided
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    // Add history
    if (options.history) {
      for (const msg of options.history) {
        messages.push({
          role: msg.role === 'model' ? 'assistant' : msg.role,
          content: msg.content
        });
      }
    }

    // Add current prompt
    if (typeof options.prompt === 'string') {
      messages.push({ role: 'user', content: options.prompt });
    } else {
      // For multi-part prompts, concatenate text parts
      const textContent = options.prompt
        .filter(p => p.text)
        .map(p => p.text)
        .join('\n');
      messages.push({ role: 'user', content: textContent });
    }

    const response = await fetch('https://api.inceptionlabs.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096
      })
    });

    if (!response.ok) {
      throw new Error(`Mercury API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      text: data.choices[0]?.message?.content || '',
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0
      }
    };
  }

  // ==================== OpenAI Implementation ====================

  private async generateWithOpenAI(options: AIGenerateOptions): Promise<AIGenerateResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not set. Set OPENAI_API_KEY environment variable.');
    }

    const modelName = options.model || DEFAULT_MODELS.openai;

    const messages: any[] = [];

    // Add system message if provided
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    // Add history
    if (options.history) {
      for (const msg of options.history) {
        messages.push({
          role: msg.role === 'model' ? 'assistant' : msg.role,
          content: msg.content
        });
      }
    }

    // Add current prompt
    if (typeof options.prompt === 'string') {
      messages.push({ role: 'user', content: options.prompt });
    } else {
      // For multi-part prompts with images
      const content: any[] = [];
      for (const part of options.prompt) {
        if (part.text) {
          content.push({ type: 'text', text: part.text });
        }
        if (part.media?.url) {
          content.push({
            type: 'image_url',
            image_url: { url: part.media.url }
          });
        }
      }
      messages.push({ role: 'user', content });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      text: data.choices[0]?.message?.content || '',
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0
      }
    };
  }

  // ==================== Structured Output ====================

  async generateStructured<T>(
    options: AIGenerateOptions & { schema: any }
  ): Promise<T> {
    const result = await this.generate({
      ...options,
      responseFormat: 'json',
      prompt: typeof options.prompt === 'string'
        ? `${options.prompt}\n\nRespond with valid JSON only.`
        : options.prompt
    });

    try {
      return JSON.parse(result.text);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error(`Failed to parse JSON response: ${result.text.substring(0, 200)}`);
    }
  }

  // ==================== Embedding ====================

  async embed(options: AIEmbedOptions): Promise<AIEmbedResult> {
    const modelName = options.model || options.embedder?.split('/')[1] || 'text-embedding-004';

    if (!this.geminiClient) {
      throw new Error('Gemini client not initialized for embedding');
    }

    const model = this.geminiClient.getGenerativeModel({ model: modelName });
    const result = await model.embedContent(options.content);

    if (!result.embedding || !result.embedding.values) {
      throw new Error('Failed to generate embedding');
    }

    return {
      embedding: result.embedding.values as number[]
    };
  }
}

// ==================== Singleton Export ====================

export const aiService = new AIService();

// ==================== Convenience Functions ====================

export async function generate(options: AIGenerateOptions): Promise<AIGenerateResult> {
  return aiService.generate(options);
}

export async function generateWith(
  provider: AIProvider,
  options: Omit<AIGenerateOptions, 'provider'>
): Promise<AIGenerateResult> {
  return aiService.generate({ ...options, provider });
}

export async function generateStructured<T>(
  options: AIGenerateOptions & { schema: any }
): Promise<T> {
  return aiService.generateStructured(options);
}
