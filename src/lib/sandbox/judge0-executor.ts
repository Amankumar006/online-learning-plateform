/**
 * Judge0 API implementation of CodeExecutor
 * Uses the free Judge0 public API for code execution
 */

import { CodeExecutor, ExecutionRequest, ExecutionResult, ExecutionStatus, LanguageConfig } from './types';
import { getLanguageConfig, getAllLanguages, normalizeLanguage } from './languages';
import { handleTypeScriptExecution } from './typescript-handler';

interface Judge0SubmissionRequest {
  source_code: string;
  language_id: number;
  stdin?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
}

interface Judge0SubmissionResponse {
  token: string;
}

interface Judge0StatusResponse {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: {
    id: number;
    description: string;
  };
  time: string | null;
  memory: number | null;
  exit_code: number | null;
}

export class Judge0Executor implements CodeExecutor {
  private readonly baseUrl = 'https://ce.judge0.com';
  private readonly maxRetries = 10;
  private readonly retryDelay = 1000; // 1 second

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    let language = normalizeLanguage(request.language);
    let code = request.code;
    
    // Handle TypeScript by transpiling to JavaScript
    if (language === 'typescript' || language === 'ts') {
      const handled = handleTypeScriptExecution(code, language);
      code = handled.code;
      language = handled.language;
    }
    
    const config = getLanguageConfig(language);
    
    if (!config) {
      throw new Error(`Unsupported language: ${request.language}. Supported languages: ${this.getSupportedLanguages().map(l => l.name).join(', ')}`);
    }

    try {
      // Step 1: Submit code for execution (with potentially transpiled code)
      const modifiedRequest = { ...request, code, language };
      const token = await this.submitCode(modifiedRequest, config);
      
      // Step 2: Poll for results
      const result = await this.pollForResult(token);
      
      // Step 3: Transform Judge0 response to our format
      return this.transformResult(result);
    } catch (error) {
      console.error('Judge0 execution error:', error);
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

  private async submitCode(request: ExecutionRequest, config: LanguageConfig): Promise<string> {
    const submissionData: Judge0SubmissionRequest = {
      source_code: request.code,
      language_id: config.id,
      stdin: request.input || '',
      cpu_time_limit: request.timeLimit || config.defaultTimeLimit,
      memory_limit: (request.memoryLimit || config.defaultMemoryLimit) * 1024 // Convert MB to KB
    };

    const response = await fetch(`${this.baseUrl}/submissions?base64_encoded=false&wait=false`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(submissionData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to submit code: ${response.status} ${errorText}`);
    }

    const result: Judge0SubmissionResponse = await response.json();
    return result.token;
  }

  private async pollForResult(token: string): Promise<Judge0StatusResponse> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const response = await fetch(`${this.baseUrl}/submissions/${token}?base64_encoded=false&fields=*`);

      if (!response.ok) {
        throw new Error(`Failed to get submission status: ${response.status}`);
      }

      const result: Judge0StatusResponse = await response.json();
      
      // Check if execution is complete
      if (result.status.id > 2) { // Status > 2 means completed (success or error)
        return result;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
    }

    throw new Error('Execution timeout: Result not available after maximum retries');
  }

  private transformResult(judge0Result: Judge0StatusResponse): ExecutionResult {
    const status = this.mapStatus(judge0Result.status.id);
    
    return {
      stdout: judge0Result.stdout || '',
      stderr: judge0Result.stderr || judge0Result.compile_output || '',
      exitCode: judge0Result.exit_code || 0,
      executionTime: judge0Result.time ? parseFloat(judge0Result.time) * 1000 : 0, // Convert to ms
      memoryUsed: judge0Result.memory || 0,
      status,
      error: judge0Result.message || undefined
    };
  }

  private mapStatus(statusId: number): ExecutionStatus {
    switch (statusId) {
      case 3: return ExecutionStatus.SUCCESS;
      case 4: return ExecutionStatus.RUNTIME_ERROR;
      case 5: return ExecutionStatus.TIME_LIMIT_EXCEEDED;
      case 6: return ExecutionStatus.COMPILATION_ERROR;
      case 7: return ExecutionStatus.RUNTIME_ERROR;
      case 8: return ExecutionStatus.RUNTIME_ERROR;
      case 9: return ExecutionStatus.RUNTIME_ERROR;
      case 10: return ExecutionStatus.RUNTIME_ERROR;
      case 11: return ExecutionStatus.RUNTIME_ERROR;
      case 12: return ExecutionStatus.RUNTIME_ERROR;
      case 13: return ExecutionStatus.INTERNAL_ERROR;
      case 14: return ExecutionStatus.INTERNAL_ERROR;
      default: return ExecutionStatus.INTERNAL_ERROR;
    }
  }

  getSupportedLanguages(): LanguageConfig[] {
    return getAllLanguages();
  }

  isLanguageSupported(language: string): boolean {
    const normalized = normalizeLanguage(language);
    return getLanguageConfig(normalized) !== null;
  }
}

// Singleton instance for easy access
export const judge0Executor = new Judge0Executor();