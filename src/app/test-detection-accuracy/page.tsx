/**
 * Language Detection Accuracy Test
 * Tests the language detection system with various code samples
 */

"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TestTube, CheckCircle, XCircle, Brain } from 'lucide-react';
import { languageDetector } from '@/lib/sandbox/language-detector';

const TEST_CASES = [
  {
    name: 'TypeScript Function with Types',
    code: `function sumArray(numbers: number[]): number {
    return numbers.reduce((sum, num) => sum + num, 0);
}

const result: number = sumArray([1, 2, 3, 4, 5]);
console.log("Sum:", result);`,
    expectedLanguage: 'typescript',
    description: 'TypeScript with type annotations'
  },
  {
    name: 'JavaScript Function',
    code: `function sumArray(numbers) {
    return numbers.reduce((sum, num) => sum + num, 0);
}

const result = sumArray([1, 2, 3, 4, 5]);
console.log("Sum:", result);`,
    expectedLanguage: 'javascript',
    description: 'Plain JavaScript without types'
  },
  {
    name: 'Python Function',
    code: `def sum_array(numbers):
    return sum(numbers)

result = sum_array([1, 2, 3, 4, 5])
print("Sum:", result)`,
    expectedLanguage: 'python',
    description: 'Python with def and print'
  },
  {
    name: 'Java Class',
    code: `public class Calculator {
    public static void main(String[] args) {
        int[] numbers = {1, 2, 3, 4, 5};
        int sum = 0;
        for (int num : numbers) {
            sum += num;
        }
        System.out.println("Sum: " + sum);
    }
}`,
    expectedLanguage: 'java',
    description: 'Java with public class and main method'
  },
  {
    name: 'C++ with STL',
    code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers = {1, 2, 3, 4, 5};
    int sum = 0;
    for (int num : numbers) {
        sum += num;
    }
    std::cout << "Sum: " << sum << std::endl;
    return 0;
}`,
    expectedLanguage: 'cpp',
    description: 'C++ with includes and std namespace'
  },
  {
    name: 'C with printf',
    code: `#include <stdio.h>

int main() {
    int numbers[] = {1, 2, 3, 4, 5};
    int sum = 0;
    int size = sizeof(numbers) / sizeof(numbers[0]);
    
    for (int i = 0; i < size; i++) {
        sum += numbers[i];
    }
    
    printf("Sum: %d\\n", sum);
    return 0;
}`,
    expectedLanguage: 'c',
    description: 'C with printf and traditional syntax'
  },
  {
    name: 'Tricky Case: JS with function keyword',
    code: `function greet(name) {
    return "Hello, " + name + "!";
}

console.log(greet("World"));`,
    expectedLanguage: 'javascript',
    description: 'Should detect as JavaScript, not Python'
  },
  {
    name: 'Tricky Case: TS Interface',
    code: `interface User {
    id: number;
    name: string;
    email: string;
}

function createUser(data: User): User {
    return { ...data };
}`,
    expectedLanguage: 'typescript',
    description: 'Should detect TypeScript due to interface'
  }
];

interface TestResult {
  testCase: typeof TEST_CASES[0];
  detectedLanguage: string;
  confidence: number;
  passed: boolean;
  reasons: string[];
}

export default function TestDetectionAccuracyPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<number>(-1);

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setCurrentTest(0);

    const results: TestResult[] = [];

    for (let i = 0; i < TEST_CASES.length; i++) {
      setCurrentTest(i);
      const testCase = TEST_CASES[i];
      
      // Add small delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const detection = languageDetector.detectLanguage(testCase.code);
      const passed = detection.language === testCase.expectedLanguage;
      
      results.push({
        testCase,
        detectedLanguage: detection.language,
        confidence: detection.confidence,
        passed,
        reasons: detection.reasons
      });
    }

    setTestResults(results);
    setCurrentTest(-1);
    setIsRunning(false);
  };

  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;
  const accuracy = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Language Detection Accuracy Test</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Comprehensive testing of the automatic language detection system
          </p>
          
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            size="lg"
            className="mb-6"
          >
            {isRunning ? (
              <>
                <TestTube className="mr-2 h-5 w-5 animate-pulse" />
                Running Tests... ({currentTest + 1}/{TEST_CASES.length})
              </>
            ) : (
              <>
                <TestTube className="mr-2 h-5 w-5" />
                Run All Tests
              </>
            )}
          </Button>

          {/* Progress */}
          {isRunning && (
            <div className="max-w-md mx-auto mb-6">
              <Progress value={((currentTest + 1) / TEST_CASES.length) * 100} />
              <p className="text-sm text-muted-foreground mt-2">
                Testing: {TEST_CASES[currentTest]?.name}
              </p>
            </div>
          )}
        </div>

        {/* Results Summary */}
        {testResults.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Test Results Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{accuracy.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Overall Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{passedTests}</div>
                  <div className="text-sm text-muted-foreground">Tests Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{totalTests - passedTests}</div>
                  <div className="text-sm text-muted-foreground">Tests Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Results */}
        <div className="space-y-4">
          {testResults.map((result, index) => (
            <Card key={index} className={result.passed ? "border-green-200" : "border-red-200"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {result.passed ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    {result.testCase.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      Expected: {result.testCase.expectedLanguage}
                    </Badge>
                    <Badge variant={result.passed ? "default" : "destructive"}>
                      Detected: {result.detectedLanguage}
                    </Badge>
                    <Badge variant="secondary">
                      {Math.round(result.confidence * 100)}% confidence
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Code Sample:</h4>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {result.testCase.code}
                    </pre>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Detection Details:</h4>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <strong>Description:</strong> {result.testCase.description}
                      </div>
                      <div className="text-sm">
                        <strong>Detection Reasons:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {result.reasons.map((reason, i) => (
                            <li key={i} className="text-muted-foreground">{reason}</li>
                          ))}
                        </ul>
                      </div>
                      {!result.passed && (
                        <div className="text-sm text-red-600">
                          <strong>Issue:</strong> Expected {result.testCase.expectedLanguage} but detected {result.detectedLanguage}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Test Cases Preview */}
        {testResults.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {TEST_CASES.map((testCase, index) => (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">{testCase.name}</h4>
                      <Badge variant="outline">{testCase.expectedLanguage}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{testCase.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}