/**
 * Sandbox module exports
 * Provides a clean API for code execution functionality
 */

// Core types
export type {
  ExecutionRequest,
  ExecutionResult,
  ExecutionStatus,
  LanguageConfig,
  CodeExecutor,
  ExecutionMetrics
} from './types';

// Client API
export { executeCode, codeExecutionClient } from './client';

// Auto-execution utilities
export { autoExecute, quickExecute, batchExecute } from './auto-execute';

// Language detection
export { languageDetector, type DetectionResult } from './language-detector';

// Language utilities
export { 
  getLanguageConfig, 
  getAllLanguages, 
  isLanguageSupported, 
  normalizeLanguage 
} from './languages';

// Executor factory (for future Docker migration)
export { 
  getCodeExecutor, 
  getExecutorType, 
  ExecutorFactory 
} from './executor-factory';

// Enums
export { ExecutionStatus } from './types';