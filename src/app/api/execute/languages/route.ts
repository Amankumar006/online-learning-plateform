/**
 * API route for getting supported languages
 */

import { NextResponse } from 'next/server';
import { getCodeExecutor } from '@/lib/sandbox/executor-factory';

export async function GET() {
  try {
    const executor = getCodeExecutor();
    const languages = executor.getSupportedLanguages();
    
    // Return just the language names for simplicity
    const languageNames = languages.map(lang => lang.name);
    
    return NextResponse.json(languageNames);
  } catch (error) {
    console.error('Failed to get supported languages:', error);
    
    return NextResponse.json(
      { error: 'Failed to get supported languages' },
      { status: 500 }
    );
  }
}