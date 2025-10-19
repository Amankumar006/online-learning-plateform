/**
 * Execution Panel Component
 * Displays code execution results with tabs for output and errors
 */

"use client";

import React from 'react';
import { ExecutionResult, ExecutionStatus } from '@/lib/sandbox/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Clock, MemoryStick, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import ErrorHelper from './ErrorHelper';

interface ExecutionPanelProps {
  result?: ExecutionResult | null;
  isLoading?: boolean;
  className?: string;
  language?: string;
  code?: string;
}

export default function ExecutionPanel({ result, isLoading, className, language, code }: ExecutionPanelProps) {
  const hasOutput = result?.stdout && result.stdout.length > 0;
  const hasError = result?.stderr && result.stderr.length > 0;
  const hasCompileError = result?.status === ExecutionStatus.COMPILATION_ERROR;

  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (!result) return null;
    
    switch (result.status) {
      case ExecutionStatus.SUCCESS:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case ExecutionStatus.COMPILATION_ERROR:
      case ExecutionStatus.RUNTIME_ERROR:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case ExecutionStatus.TIME_LIMIT_EXCEEDED:
      case ExecutionStatus.MEMORY_LIMIT_EXCEEDED:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = () => {
    if (isLoading) {
      return <Badge variant="secondary">Running...</Badge>;
    }
    
    if (!result) {
      return <Badge variant="outline">Ready</Badge>;
    }

    switch (result.status) {
      case ExecutionStatus.SUCCESS:
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case ExecutionStatus.COMPILATION_ERROR:
        return <Badge variant="destructive">Compilation Error</Badge>;
      case ExecutionStatus.RUNTIME_ERROR:
        return <Badge variant="destructive">Runtime Error</Badge>;
      case ExecutionStatus.TIME_LIMIT_EXCEEDED:
        return <Badge variant="secondary" className="bg-yellow-500">Time Limit</Badge>;
      case ExecutionStatus.MEMORY_LIMIT_EXCEEDED:
        return <Badge variant="secondary" className="bg-yellow-500">Memory Limit</Badge>;
      default:
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  return (
    <Card className={cn("w-full transition-all duration-300 animate-in fade-in-0 slide-in-from-top-2", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {getStatusIcon()}
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Execution Result
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
          </div>
        </div>
        
        {result && !isLoading && (
          <div className="flex items-center gap-6 text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2 mt-2">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-mono">{result.executionTime.toFixed(0)}ms</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MemoryStick className="h-3.5 w-3.5 text-purple-500" />
              <span className="font-mono">{(result.memoryUsed / 1024).toFixed(1)}MB</span>
            </div>
            {result.exitCode !== undefined && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs">Exit:</span>
                <Badge variant={result.exitCode === 0 ? "default" : "destructive"} className="h-4 px-1.5 text-xs font-mono">
                  {result.exitCode}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 text-muted-foreground space-y-3">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-primary/20 animate-pulse"></div>
            </div>
            <div className="text-center space-y-1">
              <div className="font-medium">Executing code...</div>
              <div className="text-xs text-muted-foreground">Running in secure sandbox environment</div>
            </div>
          </div>
        ) : result ? (
          <Tabs defaultValue="output" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="output" className="flex items-center gap-2">
                Output
                {hasOutput && <Badge variant="secondary" className="h-4 px-1 text-xs">!</Badge>}
              </TabsTrigger>
              <TabsTrigger value="errors" className="flex items-center gap-2">
                Errors
                {hasError && <Badge variant="destructive" className="h-4 px-1 text-xs">!</Badge>}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="output" className="mt-4">
              <div className="bg-gradient-to-br from-muted/30 to-muted/60 rounded-lg p-4 font-mono text-sm min-h-[120px] max-h-[300px] overflow-auto border border-border/50">
                {hasOutput ? (
                  <pre className="whitespace-pre-wrap text-foreground leading-relaxed">{result.stdout}</pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground italic">
                    <div className="text-center space-y-2">
                      <div className="text-2xl">📝</div>
                      <div>No output generated</div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="errors" className="mt-4">
              {hasError ? (
                <ErrorHelper 
                  error={result.stderr} 
                  language={language || 'javascript'} 
                  code={code}
                />
              ) : (
                <div className="bg-muted/50 rounded-md p-4 min-h-[120px] flex items-center justify-center">
                  <div className="text-muted-foreground italic">No errors</div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center text-muted-foreground p-8 space-y-3">
            <div className="text-4xl">🚀</div>
            <div className="space-y-1">
              <div className="font-medium">Ready to Execute</div>
              <div className="text-sm">Click "Run Code" to execute your program in a secure sandbox</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}