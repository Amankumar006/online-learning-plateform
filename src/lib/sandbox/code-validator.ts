/**
 * Code Exercise Validator
 * Validates student code against expected outputs and test cases
 */

import { executeCode } from './client';
import { ExecutionResult, ExecutionStatus } from './types';

export interface TestCase {
  id: string;
  input?: string;
  expectedOutput: string;
  description: string;
  points: number;
}

export interface CodeExercise {
  id: string;
  title: string;
  description: string;
  language: string;
  starterCode?: string;
  testCases: TestCase[];
  totalPoints: number;
  timeLimit?: number;
  memoryLimit?: number;
}

export interface ValidationResult {
  isCorrect: boolean;
  score: number;
  totalPoints: number;
  passedTests: number;
  totalTests: number;
  testResults: TestCaseResult[];
  executionError?: string;
  feedback: string;
}

export interface TestCaseResult {
  testCase: TestCase;
  passed: boolean;
  actualOutput: string;
  executionTime: number;
  error?: string;
}

export class CodeValidator {
  async validateCode(
    studentCode: string,
    exercise: CodeExercise,
    userId?: string
  ): Promise<ValidationResult> {
    const testResults: TestCaseResult[] = [];
    let totalScore = 0;
    let passedTests = 0;

    // Run each test case
    for (const testCase of exercise.testCases) {
      try {
        const result = await executeCode({
          code: studentCode,
          language: exercise.language,
          input: testCase.input,
          timeLimit: exercise.timeLimit || 10,
          memoryLimit: exercise.memoryLimit || 256,
          userId
        });

        const passed = this.compareOutputs(result.stdout, testCase.expectedOutput);
        
        if (passed) {
          totalScore += testCase.points;
          passedTests++;
        }

        testResults.push({
          testCase,
          passed,
          actualOutput: result.stdout,
          executionTime: result.executionTime,
          error: result.stderr || undefined
        });

      } catch (error) {
        testResults.push({
          testCase,
          passed: false,
          actualOutput: '',
          executionTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const isCorrect = passedTests === exercise.testCases.length;
    const feedback = this.generateFeedback(testResults, isCorrect, passedTests, exercise.testCases.length);

    return {
      isCorrect,
      score: totalScore,
      totalPoints: exercise.totalPoints,
      passedTests,
      totalTests: exercise.testCases.length,
      testResults,
      feedback
    };
  }

  private compareOutputs(actual: string, expected: string): boolean {
    // Normalize whitespace and line endings
    const normalizeOutput = (output: string) => 
      output.trim().replace(/\r\n/g, '\n').replace(/\s+/g, ' ');
    
    return normalizeOutput(actual) === normalizeOutput(expected);
  }

  private generateFeedback(
    testResults: TestCaseResult[],
    isCorrect: boolean,
    passedTests: number,
    totalTests: number
  ): string {
    if (isCorrect) {
      return `🎉 Excellent! All ${totalTests} test cases passed. Your solution is correct!`;
    }

    const failedTests = testResults.filter(r => !r.passed);
    let feedback = `✅ ${passedTests}/${totalTests} test cases passed.\n\n`;

    if (failedTests.length > 0) {
      feedback += "❌ Failed test cases:\n";
      failedTests.slice(0, 3).forEach((result, index) => {
        feedback += `\n${index + 1}. ${result.testCase.description}\n`;
        feedback += `   Expected: "${result.testCase.expectedOutput}"\n`;
        feedback += `   Got: "${result.actualOutput}"\n`;
        if (result.error) {
          feedback += `   Error: ${result.error}\n`;
        }
      });

      if (failedTests.length > 3) {
        feedback += `\n... and ${failedTests.length - 3} more test cases failed.`;
      }
    }

    return feedback;
  }

  // Helper method to create simple test cases
  static createTestCase(
    input: string | undefined,
    expectedOutput: string,
    description: string,
    points: number = 10
  ): TestCase {
    return {
      id: Math.random().toString(36).substr(2, 9),
      input,
      expectedOutput,
      description,
      points
    };
  }
}