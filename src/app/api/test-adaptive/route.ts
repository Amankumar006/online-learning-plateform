// src/app/api/test-adaptive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { testAdaptiveLearning } from '@/lib/test-adaptive-learning';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const result = await testAdaptiveLearning(userId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Test adaptive learning API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to test adaptive learning system'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Adaptive Learning Test API',
    usage: 'POST with { "userId": "your-user-id" } to test the system',
    endpoints: {
      test: 'POST /api/test-adaptive',
      validate: 'GET /api/test-adaptive/validate'
    }
  });
}