/**
 * Factory for creating code executors
 * Allows easy switching between Judge0 and Docker implementations
 */

import { CodeExecutor } from './types';
import { Judge0Executor } from './judge0-executor';

export type ExecutorType = 'judge0' | 'docker';

export class ExecutorFactory {
  private static instance: ExecutorFactory;
  private currentExecutor: CodeExecutor;
  private executorType: ExecutorType;

  private constructor() {
    // Start with Judge0 by default
    this.executorType = 'judge0';
    this.currentExecutor = new Judge0Executor();
  }

  static getInstance(): ExecutorFactory {
    if (!ExecutorFactory.instance) {
      ExecutorFactory.instance = new ExecutorFactory();
    }
    return ExecutorFactory.instance;
  }

  getExecutor(): CodeExecutor {
    return this.currentExecutor;
  }

  getCurrentExecutorType(): ExecutorType {
    return this.executorType;
  }

  // Future: Switch to Docker executor
  switchToDocker(): void {
    // TODO: Implement when Docker executor is ready
    // this.executorType = 'docker';
    // this.currentExecutor = new DockerExecutor();
    console.log('Docker executor not yet implemented. Staying with Judge0.');
  }

  switchToJudge0(): void {
    this.executorType = 'judge0';
    this.currentExecutor = new Judge0Executor();
  }
}

// Convenience function for getting the current executor
export function getCodeExecutor(): CodeExecutor {
  return ExecutorFactory.getInstance().getExecutor();
}

// Convenience function for getting executor type
export function getExecutorType(): ExecutorType {
  return ExecutorFactory.getInstance().getCurrentExecutorType();
}