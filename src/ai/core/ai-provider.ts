/**
 * AI Provider Service - Multi-provider support for Gemini, Mercury, and OpenAI
 * With automatic fallback when primary provider fails
 */

// import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'; // Removed to reduce bundle size and fix serverless/edge compatibility

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
  gemini: 'gemini-2.5-flash', // Use 2.5-flash for speed/cost balance
  mercury: 'mercury',  // Updated to use main Mercury model
  openai: 'gpt-4o-mini'
};

// ==================== Fallback Order ====================
// Define the order in which providers should be tried
const FALLBACK_ORDER: AIProvider[] = ['gemini', 'mercury', 'openai'];

// ==================== AI Service Class ====================

export class AIService {
  // private geminiClient: GoogleGenerativeAI | null = null; // Removed SDK client
  private defaultProvider: AIProvider = 'gemini';
  private enableFallback: boolean = true;

  constructor() {
    console.log('🚀 AIService: Constructor called');
    this.initializeClients();
  }

  private initializeClients() {
    console.log('🚀 AIService: initializeClients called');
    // Check for keys
    const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    console.log('🚀 AIService: Checking API keys:', {
      GOOGLE_API_KEY_EXISTS: !!process.env.GOOGLE_API_KEY,
      GEMINI_API_KEY_EXISTS: !!process.env.GEMINI_API_KEY
    });

    if (!googleApiKey) {
      console.warn('⚠️ AIService: No Google API key found');
    } else {
      console.log('🚀 AIService: Google API key detected');
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
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    console.log('🚀 generateWithGemini: called with model', options.model);

    if (!apiKey) {
      console.error('❌ generateWithGemini: No API Key found');
      throw new Error('Gemini API key not found. Set GOOGLE_API_KEY or GEMINI_API_KEY.');
    }

    const modelName = options.model || DEFAULT_MODELS.gemini;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    console.log('🚀 generateWithGemini: calling URL', url.split('?')[0]); // Log URL without key

    // Build contents
    const contents: any[] = [];

    // Add history first if exists
    if (options.history && options.history.length > 0) {
      options.history.forEach(msg => {
        contents.push({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      });
    }

    // Build current turn parts
    const currentParts: any[] = [];
    if (typeof options.prompt === 'string') {
      currentParts.push({ text: options.prompt });
    } else if (Array.isArray(options.prompt)) {
      for (const part of options.prompt) {
        if (part.text) {
          currentParts.push({ text: part.text });
        }
        if (part.media?.url) {
          if (part.media.url.startsWith('data:')) {
            const [header, base64Data] = part.media.url.split(',');
            const mimeType = header.split(':')[1].split(';')[0];
            currentParts.push({
              inlineData: {
                mimeType,
                data: base64Data
              }
            });
          } else {
            // URL not supported directly in inlineData usually, but for now fallback to text
            currentParts.push({ text: `[Image: ${part.media.url}]` });
          }
        }
      }
    }

    contents.push({ role: 'user', parts: currentParts });

    // Build generation config
    const generationConfig: any = {};
    if (options.temperature !== undefined) generationConfig.temperature = options.temperature;
    if (options.maxTokens !== undefined) generationConfig.maxOutputTokens = options.maxTokens;
    if (options.responseFormat === 'json') generationConfig.responseMimeType = 'application/json';

    // Build system instruction
    let systemInstructionObj: any = undefined;
    if (options.systemPrompt) {
      systemInstructionObj = {
        parts: [{ text: options.systemPrompt }]
      };
    }

    try {
      console.log('🚀 generateWithGemini: sending fetch request');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents,
          generationConfig,
          systemInstruction: systemInstructionObj
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Gemini API Error (${response.status}):`, errorText);
        throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('🚀 generateWithGemini: response received');

      // Extract text
      let text = '';
      const candidate = data.candidates?.[0];
      if (candidate?.content?.parts) {
        text = candidate.content.parts.map((p: any) => p.text).join('');
      }

      return {
        text,
        usage: {
          inputTokens: data.usageMetadata?.promptTokenCount || 0,
          outputTokens: data.usageMetadata?.candidatesTokenCount || 0
        }
      };

    } catch (err: any) {
      console.error('❌ generateWithGemini: fetch failed:', err);
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
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not found');
    }

    const modelName = options.model || options.embedder?.split('/')[1] || 'text-embedding-004';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: options.content }] }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini Embedding Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const embedding = data.embedding?.values;

      if (!embedding) {
        throw new Error('Failed to generate embedding: No values returned');
      }

      return {
        embedding: embedding as number[]
      };

    } catch (error: any) {
      console.error("❌ Embedding failed:", error);
      throw error;
    }
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
