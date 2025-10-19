/**
 * Core types for code execution sandbox system
 * Designed to work with Judge0 initially, then migrate to Docker
 */

export interface ExecutionRequest {
  code: string;
  language: string;
  input?: string;
  timeLimit?: number; // seconds (default: 5)
  memoryLimit?: number; // MB (default: 128)
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number; // milliseconds
  memoryUsed: number; // KB
  status: ExecutionStatus;
  error?: string;
}

export enum ExecutionStatus {
  SUCCESS = 'success',
  COMPILATION_ERROR = 'compilation_error',
  RUNTIME_ERROR = 'runtime_error',
  TIME_LIMIT_EXCEEDED = 'time_limit_exceeded',
  MEMORY_LIMIT_EXCEEDED = 'memory_limit_exceeded',
  INTERNAL_ERROR = 'internal_error',
  PENDING = 'pending'
}

export interface LanguageConfig {
  id: number; // Judge0 language ID
  name: string;
  displayName: string;
  extension: string;
  defaultTimeLimit: number;
  defaultMemoryLimit: number;
  monacoLanguage: string; // Monaco editor language identifier
}

// Abstraction interface - allows easy swapping between Judge0 and Docker
export interface CodeExecutor {
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
  getSupportedLanguages(): LanguageConfig[];
  isLanguageSupported(language: string): boolean;
}

// Execution metrics for monitoring and analytics
export interface ExecutionMetrics {
  userId?: string;
  language: string;
  executionTime: number;
  memoryUsed: number;
  status: ExecutionStatus;
  timestamp: Date;
  executor: 'judge0' | 'docker'; // Track which executor was used
}