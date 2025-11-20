/**
 * AI Module - Central Export
 * Unified access to all AI services, flows, and utilities
 */

// Main AI service
export { ai, aiService } from './ai';

// Provider types and functions
export type {
  AIProvider,
  AIMessage,
  AIGenerateOptions,
  AIGenerateResult,
  AITool,
  PromptTemplate
} from './core/ai-provider';

export {
  generate,
  generateWith,
  generateStructured
} from './core/ai-provider';

// Flow helpers
export {
  defineFlow,
  definePrompt,
  renderTemplate,
  generateWithSchema
} from './core/flow-helpers';

// Schemas
export { PersonaSchema } from './schemas/buddy-schemas';
export type { Persona } from './schemas/buddy-schemas';

export {
  GeneratedExerciseSchema,
  GenerateExerciseOutputSchema
} from './schemas/exercise-schemas';
export type { GeneratedExercise } from './schemas/exercise-schemas';

// Services
export { codeAnalysisService, analyzeCodeSnippet } from './services/code-analysis';
export type { CodeAnalysisRequest, CodeAnalysisResult } from './services/code-analysis';

export { nlpService } from './services/nlp-service';
export type {
  TopicExtractionRequest,
  ExtractedTopic,
  ContentUnderstanding,
  IntentClassification
} from './services/nlp-service';

export { semanticSearchService } from './services/semantic-search';

// Vector stores
export { vectorStore } from './core/vector-store';
export { persistentVectorStore } from './core/persistent-vector-store';
export type {
  EmbeddingVector,
  VectorMetadata,
  SearchOptions,
  SearchResult
} from './core/vector-store';

// Flows (commonly used)
export { buddyChatStream } from './flows/buddy-chat';
export type { BuddyChatInput, StreamedOutput } from './flows/buddy-chat';

export { generateExercise } from './flows/generate-exercise';
export type { GenerateExerciseInput } from './flows/generate-exercise';

export { generateLessonContent } from './flows/generate-lesson-content';
export type {
  GenerateLessonContentInput,
  GenerateLessonContentOutput
} from './flows/generate-lesson-content';

export { generateLessonImage } from './flows/generate-lesson-image';
export type {
  GenerateLessonImageInput,
  GenerateLessonImageOutput
} from './flows/generate-lesson-image';

export { gradeLongFormAnswer } from './flows/grade-long-form-answer';
export type {
  GradeLongFormAnswerInput,
  GradeLongFormAnswerOutput
} from './flows/grade-long-form-answer';

export { generateCustomExercise } from './flows/generate-custom-exercise';
export type { GenerateCustomExerciseInput } from './flows/generate-custom-exercise';

export { quickChat } from './flows/quick-chat';
export type { QuickChatInput, QuickChatOutput } from './flows/quick-chat';

export { generateFollowUpSuggestions } from './flows/generate-follow-up-suggestions';
export type {
  GenerateFollowUpSuggestionsInput,
  GenerateFollowUpSuggestionsOutput
} from './flows/generate-follow-up-suggestions';

export { generateAudioFromText } from './flows/generate-audio-from-text';
