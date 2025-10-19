/**
 * Code Exercise Component
 * Handles code exercises with validation and auto-grading
 */

"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  TestTube, 
  Trophy,
  AlertCircle,
  Code
} from 'lucide-react';
import CodeEditor from '@/components/lessons/code-editor';
import ExecutionPanel from '@/components/sandbox/ExecutionPanel';
import { CodeValidator, CodeExercise, ValidationResult } from '@/lib/sandbox/code-validator';
import { ExecutionResult } from '@/lib/sandbox/types';
import { cn } from '@/lib/utils';

interface CodeExerciseComponentProps {
  exercise: CodeExercise;
  userId: string;
  onComplete?: (result: ValidationResult) => void;
  onProgress?: (score: number, totalPoints: number) => void;
  initialCode?: string;
  disabled?: boolean;
}

export default function CodeExerciseComponent({
  exercise,
  userId,
  onComplete,
  onProgress,
  initialCode,
  disabled = false
}: CodeExerciseComponentProps) {
  const [code, setCode] = useState(initialCode || exercise.starterCode || '');
  const [isRunning, setIsRunning] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [activeTab, setActiveTab] = useState('description');

  const validator = new CodeValidator();

  const handleRunCode = async () => {
    setIsRunning(true);
    setExecutionResult(null);
    
    try {
      const { executeCode } = await import('@/lib/sandbox/client');
      const result = await executeCode({
        code,
        language: exercise.language,
        userId
      });
      
      setExecutionResult(result);
      setActiveTab('output');
    } catch (error) {
      console.error('Code execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitSolution = async () => {
    setIsValidating(true);
    setValidationResult(null);
    
    try {
      const result = await validator.validateCode(code, exercise, userId);
      setValidationResult(result);
      setActiveTab('results');
      
      // Notify parent components
      onComplete?.(result);
      onProgress?.(result.score, result.totalPoints);
      
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const getStatusIcon = () => {
    if (!validationResult) return <Code className="h-5 w-5" />;
    return validationResult.isCorrect 
      ? <CheckCircle className="h-5 w-5 text-green-500" />
      : <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusBadge = () => {
    if (isValidating) return <Badge variant="secondary">Validating...</Badge>;
    if (!validationResult) return <Badge variant="outline">Not Submitted</Badge>;
    
    if (validationResult.isCorrect) {
      return <Badge variant="default" className="bg-green-500">Completed</Badge>;
    } else {
      return <Badge variant="destructive">
        {validationResult.passedTests}/{validationResult.totalTests} Passed
      </Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Exercise Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon()}
              {exercise.title}
            </CardTitle>
            {getStatusBadge()}
          </div>
          
          {validationResult && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                Score: {validationResult.score}/{validationResult.totalPoints}
              </div>
              <div className="flex items-center gap-1">
                <TestTube className="h-4 w-4" />
                Tests: {validationResult.passedTests}/{validationResult.totalTests}
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Code Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Solution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CodeEditor
            value={code}
            onValueChange={setCode}
            language={exercise.language}
            placeholder={`Write your ${exercise.language} solution here...`}
            disabled={disabled}
            onRunCode={handleRunCode}
            isExecuting={isRunning}
            showRunButton={true}
          />
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleRunCode} 
              variant="outline" 
              disabled={isRunning || disabled || !code.trim()}
            >
              {isRunning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Run Code
            </Button>
            
            <Button 
              onClick={handleSubmitSolution} 
              disabled={isValidating || disabled || !code.trim()}
            >
              {isValidating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="mr-2 h-4 w-4" />
              )}
              Submit Solution
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Description, Output, and Results */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="output">Output</TabsTrigger>
          <TabsTrigger value="results">
            Results
            {validationResult && (
              <Badge variant="secondary" className="ml-2 h-4 px-1 text-xs">
                {validationResult.passedTests}/{validationResult.totalTests}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Problem Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{exercise.description}</p>
              
              {/* Test Cases Preview */}
              <div>
                <h4 className="font-semibold mb-2">Test Cases:</h4>
                <div className="space-y-2">
                  {exercise.testCases.slice(0, 2).map((testCase, index) => (
                    <div key={testCase.id} className="bg-muted p-3 rounded text-sm">
                      <div className="font-medium">Test {index + 1}: {testCase.description}</div>
                      {testCase.input && (
                        <div className="text-muted-foreground">Input: {testCase.input}</div>
                      )}
                      <div className="text-muted-foreground">Expected Output: {testCase.expectedOutput}</div>
                    </div>
                  ))}
                  {exercise.testCases.length > 2 && (
                    <div className="text-sm text-muted-foreground">
                      ... and {exercise.testCases.length - 2} more test cases
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="output">
          <ExecutionPanel result={executionResult} isLoading={isRunning} />
        </TabsContent>

        <TabsContent value="results">
          {validationResult ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {validationResult.isCorrect ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  Validation Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Score Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Score</span>
                    <span>{validationResult.score}/{validationResult.totalPoints} points</span>
                  </div>
                  <Progress 
                    value={(validationResult.score / validationResult.totalPoints) * 100} 
                    className="h-2"
                  />
                </div>

                {/* Test Results */}
                <div>
                  <h4 className="font-semibold mb-3">Test Case Results:</h4>
                  <div className="space-y-2">
                    {validationResult.testResults.map((result, index) => (
                      <div 
                        key={result.testCase.id}
                        className={cn(
                          "p-3 rounded border",
                          result.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            Test {index + 1}: {result.testCase.description}
                          </span>
                          {result.passed ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        
                        {!result.passed && (
                          <div className="text-sm space-y-1">
                            <div>Expected: <code className="bg-muted px-1 rounded">{result.testCase.expectedOutput}</code></div>
                            <div>Got: <code className="bg-muted px-1 rounded">{result.actualOutput}</code></div>
                            {result.error && (
                              <div className="text-red-600">Error: {result.error}</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feedback */}
                <div className="bg-muted p-4 rounded">
                  <h4 className="font-semibold mb-2">Feedback:</h4>
                  <pre className="whitespace-pre-wrap text-sm">{validationResult.feedback}</pre>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <TestTube className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Submit your solution to see validation results</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}