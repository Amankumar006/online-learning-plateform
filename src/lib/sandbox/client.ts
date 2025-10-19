/**
 * Client-side API for code execution
 * Provides a clean interface for components to execute code
 */

import { ExecutionRequest, ExecutionResult, ExecutionMetrics, ExecutionStatus } from './types';
import { normalizeLanguage } from './languages';
import { languageDetector } from './language-detector';

export interface ExecuteCodeOptions {
  code: string;
  language?: string; // Optional - will auto-detect if not provided
  input?: string;
  timeLimit?: number;
  memoryLimit?: number;
  userId?: string; // For analytics
  autoDetect?: boolean; // Enable/disable auto-detection
}

export class CodeExecutionClient {
  private readonly apiEndpoint = '/api/execute';

  async executeCode(options: ExecuteCodeOptions): Promise<ExecutionResult> {
    // Auto-detect language if not provided or if auto-detect is enabled
    let language = options.language;
    if (!language || options.autoDetect) {
      const detection = languageDetector.detectLanguage(options.code);
      language = detection.language;
      
      // Log detection for debugging
      console.log('Language detection:', {
        detected: detection.language,
        confidence: detection.confidence,
        provided: options.language
      });
    }

    const request: ExecutionRequest = {
      code: options.code,
      language: normalizeLanguage(language),
      input: options.input,
      timeLimit: options.timeLimit,
      memoryLimit: options.memoryLimit
    };

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...request,
          userId: options.userId // Include for analytics
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ExecutionResult = await response.json();
      
      // Log execution metrics (optional)
      if (options.userId) {
        this.logExecutionMetrics({
          userId: options.userId,
          language: request.language,
          executionTime: result.executionTime,
          memoryUsed: result.memoryUsed,
          status: result.status,
          timestamp: new Date(),
          executor: 'judge0' // Will be dynamic later
        });
      }

      return result;
    } catch (error) {
      console.error('Code execution failed:', error);
      
      // Return a user-friendly error result
      return {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown execution error',
        exitCode: 1,
        executionTime: 0,
        memoryUsed: 0,
        status: ExecutionStatus.INTERNAL_ERROR,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async logExecutionMetrics(metrics: ExecutionMetrics): Promise<void> {
    try {
      // TODO: Implement analytics logging
      // Could send to Firebase Analytics, your own analytics service, etc.
      console.log('Execution metrics:', metrics);
    } catch (error) {
      // Don't fail execution if analytics fails
      console.warn('Failed to log execution metrics:', error);
    }
  }

  async getSupportedLanguages(): Promise<string[]> {
    try {
      const response = await fetch('/api/execute/languages');
      if (!response.ok) {
        throw new Error('Failed to fetch supported languages');
      }
      return response.json();
    } catch (error) {
      console.error('Failed to get supported languages:', error);
      // Return default languages as fallback
      return ['javascript', 'python', 'java', 'cpp', 'c'];
    }
  }
}

// Singleton instance for easy access
export const codeExecutionClient = new CodeExecutionClient();

// Convenience function
export async function executeCode(options: ExecuteCodeOptions): Promise<ExecutionResult> {
  return codeExecutionClient.executeCode(options);
}