/**
 * AI Service - Main export (replaces Genkit)
 * Now supports multiple providers: Gemini, Mercury, OpenAI
 */

import { aiService, AIService } from './core/ai-provider';
import { ai as flowHelpers } from './core/flow-helpers';

// Create unified AI object with all methods
export const ai = {
  // Provider methods
  generate: aiService.generate.bind(aiService),
  generateStructured: aiService.generateStructured.bind(aiService),
  setDefaultProvider: aiService.setDefaultProvider.bind(aiService),
  getDefaultProvider: aiService.getDefaultProvider.bind(aiService),
  
  // Flow helpers (backward compatibility with Genkit)
  defineFlow: flowHelpers.defineFlow,
  definePrompt: flowHelpers.definePrompt,
  defineTool: flowHelpers.defineTool,
};

// Export for backward compatibility and easier migration
export { AIService, aiService };

// Re-export commonly used functions
export { 
  generate, 
  generateWith, 
  generateStructured 
} from './core/ai-provider';

// Re-export flow helpers
export { 
  defineFlow, 
  definePrompt,
  defineTool,
  renderTemplate, 
  generateWithSchema 
} from './core/flow-helpers';

// Re-export types
export type {
  FlowConfig,
  PromptConfig,
  ToolConfig,
  Tool
} from './core/flow-helpers';

export type {
  AIProvider,
  AIMessage,
  AIGenerateOptions,
  AIGenerateResult,
  AITool,
  PromptTemplate
} from './core/ai-provider';
