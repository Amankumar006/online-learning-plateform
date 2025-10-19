/**
 * Error Helper Component
 * Provides helpful error messages and suggestions for common coding errors
 */

"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Lightbulb, Code, Zap } from 'lucide-react';

interface ErrorHelperProps {
  error: string;
  language: string;
  code?: string;
}

interface ErrorSuggestion {
  pattern: RegExp;
  title: string;
  description: string;
  suggestion: string;
  example?: string;
}

const ERROR_PATTERNS: Record<string, ErrorSuggestion[]> = {
  javascript: [
    {
      pattern: /Unexpected token ':'/,
      title: 'TypeScript Syntax in JavaScript',
      description: 'You\'re using TypeScript syntax in a JavaScript environment.',
      suggestion: 'Remove type annotations or switch to TypeScript mode.',
      example: 'Change `function greet(): void` to `function greet()`'
    },
    {
      pattern: /ReferenceError.*is not defined/,
      title: 'Undefined Variable/Function',
      description: 'You\'re trying to use a variable or function that hasn\'t been declared.',
      suggestion: 'Make sure to declare variables with let/const and define functions before using them.'
    },
    {
      pattern: /SyntaxError.*Unexpected token/,
      title: 'Syntax Error',
      description: 'There\'s a syntax error in your code.',
      suggestion: 'Check for missing brackets, semicolons, or incorrect syntax.'
    }
  ],
  python: [
    {
      pattern: /IndentationError/,
      title: 'Indentation Error',
      description: 'Python requires consistent indentation.',
      suggestion: 'Use 4 spaces for each indentation level and be consistent.'
    },
    {
      pattern: /NameError.*is not defined/,
      title: 'Undefined Variable',
      description: 'You\'re using a variable that hasn\'t been defined.',
      suggestion: 'Make sure to define variables before using them.'
    },
    {
      pattern: /SyntaxError.*invalid syntax/,
      title: 'Syntax Error',
      description: 'There\'s a syntax error in your Python code.',
      suggestion: 'Check for missing colons, parentheses, or incorrect syntax.'
    }
  ],
  java: [
    {
      pattern: /class.*is public, should be declared in a file named/,
      title: 'Class Name Mismatch',
      description: 'Java class name doesn\'t match the expected filename.',
      suggestion: 'Use "Main" as your class name or match the filename.'
    },
    {
      pattern: /cannot find symbol/,
      title: 'Undefined Symbol',
      description: 'You\'re using a variable, method, or class that hasn\'t been declared.',
      suggestion: 'Check spelling and make sure all variables and methods are properly declared.'
    }
  ]
};

export default function ErrorHelper({ error, language, code }: ErrorHelperProps) {
  const suggestions = ERROR_PATTERNS[language] || [];
  const matchedSuggestion = suggestions.find(s => s.pattern.test(error));

  if (!matchedSuggestion) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <div className="font-medium">Execution Error</div>
            <pre className="text-sm bg-muted p-2 rounded whitespace-pre-wrap">{error}</pre>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
          <Lightbulb className="h-4 w-4" />
          {matchedSuggestion.title}
          <Badge variant="outline" className="ml-auto">
            {language}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium text-sm mb-1">What happened:</h4>
          <p className="text-sm text-muted-foreground">{matchedSuggestion.description}</p>
        </div>

        <div>
          <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
            <Zap className="h-3 w-3" />
            How to fix:
          </h4>
          <p className="text-sm">{matchedSuggestion.suggestion}</p>
        </div>

        {matchedSuggestion.example && (
          <div>
            <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
              <Code className="h-3 w-3" />
              Example:
            </h4>
            <code className="text-sm bg-muted px-2 py-1 rounded">
              {matchedSuggestion.example}
            </code>
          </div>
        )}

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium text-sm mb-1">Original Error:</div>
            <pre className="text-xs whitespace-pre-wrap">{error}</pre>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}