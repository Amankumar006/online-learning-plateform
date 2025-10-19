/**
 * Complete Exercise Flow Demo
 * Shows the full integration: Code → Execution → Validation → Completion
 */

"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Trophy, 
  Code, 
  TestTube,
  BookOpen,
  Target
} from 'lucide-react';
import CodeExerciseComponent from '@/components/exercises/CodeExerciseComponent';
import { CodeExercise } from '@/lib/types';
import { ValidationResult } from '@/lib/sandbox/code-validator';

// Sample exercises that demonstrate the complete flow
const DEMO_EXERCISES: CodeExercise[] = [
  {
    id: 'demo-hello-world',
    type: 'code',
    title: 'Hello World Challenge',
    description: 'Write a program that prints "Hello, World!" to the console. This tests basic output functionality.',
    language: 'javascript', // Will be auto-detected
    category: 'basic',
    difficulty: 1,
    tags: ['basics', 'output'],
    lessonId: 'demo-lesson',
    starterCode: '// Write your code here\n',
    testCases: [
      {
        id: 'test-1',
        input: undefined,
        expectedOutput: 'Hello, World!',
        description: 'Print Hello, World!',
        points: 100
      }
    ],
    totalPoints: 100,
    timeLimit: 5,
    memoryLimit: 128
  },
  {
    id: 'demo-fibonacci',
    type: 'code',
    title: 'Fibonacci Function',
    description: 'Write a function that calculates the nth Fibonacci number. Test your algorithm with multiple inputs.',
    language: 'python', // Will be auto-detected
    category: 'algorithms',
    difficulty: 2,
    tags: ['recursion', 'math'],
    lessonId: 'demo-lesson',
    starterCode: `def fibonacci(n):
    # Write your implementation here
    pass

# Test cases will call your function
print(fibonacci(0))
print(fibonacci(1))
print(fibonacci(5))
print(fibonacci(10))`,
    testCases: [
      {
        id: 'test-1',
        input: undefined,
        expectedOutput: '0\n1\n5\n55',
        description: 'Fibonacci sequence: F(0)=0, F(1)=1, F(5)=5, F(10)=55',
        points: 100
      }
    ],
    totalPoints: 100,
    timeLimit: 10,
    memoryLimit: 256
  },
  {
    id: 'demo-array-sum',
    type: 'code',
    title: 'Array Sum Calculator',
    description: 'Create a function that takes an array of numbers and returns their sum. Handle edge cases like empty arrays.',
    language: 'javascript', // Will be auto-detected
    category: 'arrays',
    difficulty: 1,
    tags: ['arrays', 'loops'],
    lessonId: 'demo-lesson',
    starterCode: `function sumArray(numbers) {
    // Your implementation here
}

// Test cases
console.log(sumArray([1, 2, 3, 4, 5]));
console.log(sumArray([]));
console.log(sumArray([10, -5, 3]));`,
    testCases: [
      {
        id: 'test-1',
        input: undefined,
        expectedOutput: '15\n0\n8',
        description: 'Sum arrays: [1,2,3,4,5]=15, []=0, [10,-5,3]=8',
        points: 100
      }
    ],
    totalPoints: 100,
    timeLimit: 5,
    memoryLimit: 128
  }
];

export default function DemoExerciseFlowPage() {
  const [selectedExercise, setSelectedExercise] = useState(DEMO_EXERCISES[0]);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [exerciseResults, setExerciseResults] = useState<Record<string, ValidationResult>>({});

  const handleExerciseComplete = (exerciseId: string, result: ValidationResult) => {
    setExerciseResults(prev => ({ ...prev, [exerciseId]: result }));
    
    if (result.isCorrect) {
      setCompletedExercises(prev => new Set([...prev, exerciseId]));
    }
  };

  const totalScore = Object.values(exerciseResults).reduce((sum, result) => sum + result.score, 0);
  const maxScore = DEMO_EXERCISES.reduce((sum, ex) => sum + ex.totalPoints, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Complete Exercise Flow Demo</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Experience the full integration: Code Writing → Auto-Detection → Execution → Validation → Completion
          </p>
          
          {/* Progress Stats */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{completedExercises.size}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{totalScore}</div>
              <div className="text-sm text-muted-foreground">Total Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Exercise Selection Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Exercises
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {DEMO_EXERCISES.map((exercise) => (
                  <Button
                    key={exercise.id}
                    variant={selectedExercise.id === exercise.id ? "default" : "outline"}
                    className="w-full text-left h-auto p-3"
                    onClick={() => setSelectedExercise(exercise)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        <span className="font-medium text-sm">{exercise.title}</span>
                        {completedExercises.has(exercise.id) && (
                          <Trophy className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {exercise.language}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {'★'.repeat(exercise.difficulty)}
                        </Badge>
                      </div>
                      
                      {exerciseResults[exercise.id] && (
                        <div className="text-xs">
                          <div className={`font-medium ${exerciseResults[exercise.id].isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                            {exerciseResults[exercise.id].isCorrect ? '✓ Completed' : '✗ Failed'}
                          </div>
                          <div className="text-muted-foreground">
                            Score: {exerciseResults[exercise.id].score}/{exerciseResults[exercise.id].totalPoints}
                          </div>
                          <div className="text-muted-foreground">
                            Tests: {exerciseResults[exercise.id].passedTests}/{exerciseResults[exercise.id].totalTests}
                          </div>
                        </div>
                      )}
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Exercise Area */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="exercise" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="exercise">Exercise</TabsTrigger>
                <TabsTrigger value="flow">How It Works</TabsTrigger>
              </TabsList>

              <TabsContent value="exercise">
                <CodeExerciseComponent
                  key={selectedExercise.id} // Force re-render when exercise changes
                  exercise={selectedExercise}
                  userId="demo-user"
                  onComplete={(result) => handleExerciseComplete(selectedExercise.id, result)}
                  disabled={completedExercises.has(selectedExercise.id)}
                />
              </TabsContent>

              <TabsContent value="flow">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Complete Exercise Flow
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Flow Steps */}
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="text-center p-4 border rounded">
                          <Code className="h-8 w-8 mx-auto mb-2 text-primary" />
                          <h4 className="font-semibold mb-1">1. Write Code</h4>
                          <p className="text-xs text-muted-foreground">
                            Student writes solution in Monaco editor with syntax highlighting
                          </p>
                        </div>
                        
                        <div className="text-center p-4 border rounded">
                          <TestTube className="h-8 w-8 mx-auto mb-2 text-primary" />
                          <h4 className="font-semibold mb-1">2. Auto-Detect</h4>
                          <p className="text-xs text-muted-foreground">
                            System automatically detects programming language from code patterns
                          </p>
                        </div>
                        
                        <div className="text-center p-4 border rounded">
                          <Play className="h-8 w-8 mx-auto mb-2 text-primary" />
                          <h4 className="font-semibold mb-1">3. Execute & Test</h4>
                          <p className="text-xs text-muted-foreground">
                            Code runs in sandbox, output compared against test cases
                          </p>
                        </div>
                        
                        <div className="text-center p-4 border rounded">
                          <Trophy className="h-8 w-8 mx-auto mb-2 text-primary" />
                          <h4 className="font-semibold mb-1">4. Auto-Grade</h4>
                          <p className="text-xs text-muted-foreground">
                            Automatic scoring, feedback, and progress tracking
                          </p>
                        </div>
                      </div>

                      {/* Technical Details */}
                      <div className="bg-muted p-4 rounded">
                        <h4 className="font-semibold mb-3">Technical Implementation:</h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                            <span><strong>Language Detection:</strong> AI-powered pattern matching with 90%+ accuracy</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                            <span><strong>Code Execution:</strong> Secure Judge0 sandbox with resource limits</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                            <span><strong>Test Validation:</strong> Output comparison with expected results</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                            <span><strong>Progress Tracking:</strong> Automatic scoring and completion status</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                            <span><strong>Error Handling:</strong> Helpful feedback for compilation and runtime errors</span>
                          </li>
                        </ul>
                      </div>

                      {/* Example Flow */}
                      <div className="bg-secondary/30 p-4 rounded">
                        <h4 className="font-semibold mb-3">Example: Hello World Exercise</h4>
                        <div className="space-y-2 text-sm font-mono">
                          <div>1. Student writes: <code>console.log("Hello, World!");</code></div>
                          <div>2. System detects: <Badge variant="outline" className="text-xs">JavaScript</Badge></div>
                          <div>3. Code executes → Output: <code>"Hello, World!"</code></div>
                          <div>4. Validation: Expected <code>"Hello, World!"</code> ✅ Match!</div>
                          <div>5. Result: <Badge variant="default" className="text-xs">100/100 points - Exercise Complete!</Badge></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}