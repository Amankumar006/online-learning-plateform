import { aiService, AIService } from './core/ai-provider';
import { ai as flowHelpers, defineFlow, definePrompt, defineTool, renderTemplate, generateWithSchema } from './core/flow-helpers';

export const ai = {
  generate: aiService.generate.bind(aiService),
  generateStructured: aiService.generateStructured.bind(aiService),
  setDefaultProvider: aiService.setDefaultProvider.bind(aiService),
  getDefaultProvider: aiService.getDefaultProvider.bind(aiService),
  defineFlow: flowHelpers.defineFlow,
  definePrompt: flowHelpers.definePrompt,
  defineTool: flowHelpers.defineTool,
};

export { AIService, aiService };
export { generate, generateWith, generateStructured } from './core/ai-provider';
export { defineFlow, definePrompt, defineTool, renderTemplate, generateWithSchema } from './core/flow-helpers';
export type { FlowConfig, PromptConfig, ToolConfig, Tool } from './core/flow-helpers';
export type { AIProvider, AIMessage, AIGenerateOptions, AIGenerateResult, AITool, PromptTemplate } from './core/ai-provider';
