/**
 * API route for code execution
 * Handles requests from the frontend and delegates to the appropriate executor
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCodeExecutor } from '@/lib/sandbox/executor-factory';
import { ExecutionRequest } from '@/lib/sandbox/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    if (!body.code || !body.language) {
      return NextResponse.json(
        { error: 'Missing required fields: code and language' },
        { status: 400 }
      );
    }

    // Create execution request
    const executionRequest: ExecutionRequest = {
      code: body.code,
      language: body.language,
      input: body.input,
      timeLimit: body.timeLimit,
      memoryLimit: body.memoryLimit
    };

    // Get the current executor (Judge0 initially, Docker later)
    const executor = getCodeExecutor();
    
    // Check if language is supported
    if (!executor.isLanguageSupported(executionRequest.language)) {
      return NextResponse.json(
        { error: `Unsupported language: ${executionRequest.language}` },
        { status: 400 }
      );
    }

    // Execute the code
    const result = await executor.execute(executionRequest);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Code execution API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}