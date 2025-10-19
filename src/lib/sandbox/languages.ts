/**
 * Language configurations for Judge0 API
 * Maps common language names to Judge0 language IDs
 */

import { LanguageConfig } from './types';

export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  javascript: {
    id: 63, // Node.js
    name: 'javascript',
    displayName: 'JavaScript (Node.js)',
    extension: 'js',
    defaultTimeLimit: 5,
    defaultMemoryLimit: 128,
    monacoLanguage: 'javascript'
  },
  python: {
    id: 71, // Python 3
    name: 'python',
    displayName: 'Python 3',
    extension: 'py',
    defaultTimeLimit: 10,
    defaultMemoryLimit: 256,
    monacoLanguage: 'python'
  },
  java: {
    id: 62, // Java
    name: 'java',
    displayName: 'Java',
    extension: 'java',
    defaultTimeLimit: 15,
    defaultMemoryLimit: 512,
    monacoLanguage: 'java'
  },
  cpp: {
    id: 54, // C++ (GCC 9.2.0)
    name: 'cpp',
    displayName: 'C++',
    extension: 'cpp',
    defaultTimeLimit: 10,
    defaultMemoryLimit: 256,
    monacoLanguage: 'cpp'
  },
  c: {
    id: 50, // C (GCC 9.2.0)
    name: 'c',
    displayName: 'C',
    extension: 'c',
    defaultTimeLimit: 10,
    defaultMemoryLimit: 256,
    monacoLanguage: 'c'
  },
  typescript: {
    id: 63, // Uses JavaScript engine with transpilation
    name: 'typescript',
    displayName: 'TypeScript (transpiled to JS)',
    extension: 'ts',
    defaultTimeLimit: 5,
    defaultMemoryLimit: 128,
    monacoLanguage: 'typescript'
  }
};

// Helper functions
export function getLanguageConfig(language: string): LanguageConfig | null {
  return SUPPORTED_LANGUAGES[language.toLowerCase()] || null;
}

export function getAllLanguages(): LanguageConfig[] {
  return Object.values(SUPPORTED_LANGUAGES);
}

export function isLanguageSupported(language: string): boolean {
  return language.toLowerCase() in SUPPORTED_LANGUAGES;
}

// Language aliases for flexibility
export const LANGUAGE_ALIASES: Record<string, string> = {
  'js': 'javascript',
  'node': 'javascript',
  'nodejs': 'javascript',
  'py': 'python',
  'python3': 'python',
  'ts': 'typescript',
  'c++': 'cpp',
  'cxx': 'cpp'
};

export function normalizeLanguage(language: string): string {
  const normalized = language.toLowerCase();
  return LANGUAGE_ALIASES[normalized] || normalized;
}