/**
 * Language Detection System
 * Automatically detects programming language from code content
 */

export interface LanguagePattern {
  language: string;
  confidence: number;
  patterns: {
    keywords?: RegExp[];
    syntax?: RegExp[];
    imports?: RegExp[];
    functions?: RegExp[];
    comments?: RegExp[];
    fileExtensions?: string[];
  };
}

export interface DetectionResult {
  language: string;
  confidence: number;
  reasons: string[];
  alternatives?: Array<{ language: string; confidence: number }>;
}

const LANGUAGE_PATTERNS: LanguagePattern[] = [
  // JavaScript/TypeScript
  {
    language: 'javascript',
    confidence: 0,
    patterns: {
      keywords: [
        /\b(const|let|var)\s+\w+/g,
        /\b(function|arrow|=>)\b/g,
        /\bconsole\.log\(/g,
        /\b(async|await)\b/g,
        /\b(import|export)\s+/g
      ],
      syntax: [
        /\$\{.*\}/g, // Template literals
        /\.\w+\(/g, // Method calls
        /\[\s*\]/g, // Array syntax
        /\{[\s\S]*\}/g // Object syntax
      ],
      functions: [
        /function\s+\w+\s*\(/g,
        /\w+\s*=>\s*/g,
        /\w+\s*:\s*function/g
      ],
      comments: [
        /\/\/.*$/gm,
        /\/\*[\s\S]*?\*\//g
      ]
    }
  },
  
  // TypeScript (extends JavaScript)
  {
    language: 'typescript',
    confidence: 0,
    patterns: {
      keywords: [
        /\b(interface|type|enum)\s+\w+/g,
        /\b(public|private|protected)\b/g,
        /\b(implements|extends)\b/g
      ],
      syntax: [
        /:\s*\w+(\[\])?(\s*\|\s*\w+)*(?=\s*[=,;)\n])/g, // Type annotations
        /<[^>]+>/g, // Generic types
        /\bas\s+\w+/g, // Type assertions
        /\?\s*:/g // Optional properties
      ],
      imports: [
        /import\s+type\s+/g,
        /export\s+type\s+/g
      ]
    }
  },

  // Python
  {
    language: 'python',
    confidence: 0,
    patterns: {
      keywords: [
        /\b(def|class|import|from|if|elif|else|for|while|try|except|finally|with|as)\b/g,
        /\b(print|input|len|range|str|int|float|list|dict|set|tuple)\b/g,
        /\b(True|False|None)\b/g
      ],
      syntax: [
        /^\s*def\s+\w+\s*\(/gm,
        /^\s*class\s+\w+/gm,
        /^\s*if\s+.*:/gm,
        /^\s*for\s+\w+\s+in\s+/gm,
        /print\s*\(/g,
        /:\s*$/gm, // Colon at end of line
        /^\s{4,}/gm // Python indentation (4+ spaces)
      ],
      imports: [
        /^import\s+\w+/gm,
        /^from\s+\w+\s+import/gm
      ],
      comments: [
        /#.*$/gm,
        /"""[\s\S]*?"""/g,
        /'''[\s\S]*?'''/g
      ]
    }
  },

  // Java
  {
    language: 'java',
    confidence: 0,
    patterns: {
      keywords: [
        /\b(public|private|protected|static|final|abstract|class|interface|extends|implements)\b/g,
        /\b(int|double|float|boolean|char|String|void)\b/g,
        /\b(if|else|for|while|do|switch|case|break|continue|return)\b/g
      ],
      syntax: [
        /public\s+class\s+\w+/g,
        /public\s+static\s+void\s+main/g,
        /System\.out\.print/g,
        /\w+\s+\w+\s*=\s*new\s+\w+/g,
        /\w+\[\]\s+\w+/g // Array declarations
      ],
      imports: [
        /^import\s+[\w.]+;/gm
      ],
      comments: [
        /\/\/.*$/gm,
        /\/\*[\s\S]*?\*\//g
      ]
    }
  },

  // C++
  {
    language: 'cpp',
    confidence: 0,
    patterns: {
      keywords: [
        /\b(int|double|float|char|bool|void|string|vector|map|set)\b/g,
        /\b(if|else|for|while|do|switch|case|break|continue|return)\b/g,
        /\b(class|struct|namespace|template|typename)\b/g,
        /\b(public|private|protected|virtual|static|const)\b/g
      ],
      syntax: [
        /#include\s*<.*>/g,
        /std::/g,
        /cout\s*<<|cin\s*>>/g,
        /\w+::\w+/g,
        /template\s*<.*>/g
      ],
      imports: [
        /#include\s*[<"].*[>"]/g
      ],
      comments: [
        /\/\/.*$/gm,
        /\/\*[\s\S]*?\*\//g
      ]
    }
  },

  // C
  {
    language: 'c',
    confidence: 0,
    patterns: {
      keywords: [
        /\b(int|double|float|char|void|struct|union|enum)\b/g,
        /\b(if|else|for|while|do|switch|case|break|continue|return)\b/g,
        /\b(printf|scanf|malloc|free|sizeof)\b/g
      ],
      syntax: [
        /#include\s*<.*\.h>/g,
        /printf\s*\(/g,
        /scanf\s*\(/g,
        /int\s+main\s*\(/g,
        /\w+\s*\*\s*\w+/g // Pointer syntax
      ],
      imports: [
        /#include\s*<.*\.h>/g
      ],
      comments: [
        /\/\/.*$/gm,
        /\/\*[\s\S]*?\*\//g
      ]
    }
  }
];

export class LanguageDetector {
  detectLanguage(code: string): DetectionResult {
    if (!code || code.trim().length === 0) {
      return {
        language: 'javascript', // Default fallback
        confidence: 0,
        reasons: ['Empty code - defaulting to JavaScript']
      };
    }

    // First, try quick detection for obvious patterns
    const quickResult = this.quickDetect(code);
    if (quickResult !== 'javascript' || this.hasStrongLanguageIndicators(code, quickResult)) {
      const confidence = this.calculateQuickConfidence(code, quickResult);
      return {
        language: quickResult,
        confidence,
        reasons: [`Strong ${quickResult} patterns detected`],
        alternatives: []
      };
    }

    const results: Array<{ language: string; confidence: number; reasons: string[] }> = [];

    // Analyze each language pattern
    for (const pattern of LANGUAGE_PATTERNS) {
      const analysis = this.analyzeCodeForLanguage(code, pattern);
      if (analysis.confidence > 0) {
        results.push(analysis);
      }
    }

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);

    // Handle special cases
    const topResult = results[0];
    if (!topResult) {
      return {
        language: 'javascript',
        confidence: 0,
        reasons: ['No clear language patterns detected - defaulting to JavaScript']
      };
    }

    // Apply disambiguation rules
    const finalResult = this.applyDisambiguationRules(code, results);

    return {
      language: finalResult.language,
      confidence: finalResult.confidence,
      reasons: finalResult.reasons,
      alternatives: results.slice(1, 3).map(r => ({ language: r.language, confidence: r.confidence }))
    };
  }

  private analyzeCodeForLanguage(code: string, pattern: LanguagePattern): { language: string; confidence: number; reasons: string[] } {
    let confidence = 0;
    const reasons: string[] = [];
    const maxConfidence = 1.0;

    // Apply negative patterns first (reduce confidence for conflicting languages)
    const negativeAdjustment = this.applyNegativePatterns(code, pattern.language);
    
    // Check keywords
    if (pattern.patterns.keywords) {
      for (const keywordPattern of pattern.patterns.keywords) {
        const matches = code.match(keywordPattern);
        if (matches) {
          const weight = Math.min(matches.length * 0.1, 0.3);
          confidence += weight;
          reasons.push(`Found ${matches.length} keyword matches`);
        }
      }
    }

    // Check syntax patterns
    if (pattern.patterns.syntax) {
      for (const syntaxPattern of pattern.patterns.syntax) {
        const matches = code.match(syntaxPattern);
        if (matches) {
          const weight = Math.min(matches.length * 0.15, 0.4);
          confidence += weight;
          reasons.push(`Found ${matches.length} syntax patterns`);
        }
      }
    }

    // Check imports
    if (pattern.patterns.imports) {
      for (const importPattern of pattern.patterns.imports) {
        const matches = code.match(importPattern);
        if (matches) {
          const weight = Math.min(matches.length * 0.2, 0.3);
          confidence += weight;
          reasons.push(`Found ${matches.length} import statements`);
        }
      }
    }

    // Check function patterns
    if (pattern.patterns.functions) {
      for (const funcPattern of pattern.patterns.functions) {
        const matches = code.match(funcPattern);
        if (matches) {
          const weight = Math.min(matches.length * 0.1, 0.2);
          confidence += weight;
          reasons.push(`Found ${matches.length} function patterns`);
        }
      }
    }

    // Apply negative adjustment
    confidence = Math.max(0, confidence + negativeAdjustment);

    // Normalize confidence
    confidence = Math.min(confidence, maxConfidence);

    return {
      language: pattern.language,
      confidence: Math.round(confidence * 100) / 100,
      reasons: reasons.slice(0, 3) // Limit reasons
    };
  }

  // Apply negative patterns to reduce false positives
  private applyNegativePatterns(code: string, language: string): number {
    let adjustment = 0;

    switch (language) {
      case 'python':
        // Reduce Python confidence if we see JavaScript/TypeScript patterns
        if (code.includes('function') || code.includes('=>') || code.includes('console.')) {
          adjustment -= 0.3;
        }
        // Reduce if we see type annotations (more likely TypeScript)
        if (/:\s*\w+(\[\])?(\s*\|\s*\w+)*(?=\s*[=,){\n])/g.test(code)) {
          adjustment -= 0.4;
        }
        // Reduce if we see curly braces (not common in Python)
        if (code.includes('{') && code.includes('}')) {
          adjustment -= 0.2;
        }
        break;

      case 'javascript':
        // Reduce JavaScript confidence if we see Python-specific patterns
        if (/def\s+\w+\s*\(/.test(code) || /^\s*import\s+\w+$/gm.test(code)) {
          adjustment -= 0.3;
        }
        // Reduce if we see Java patterns
        if (code.includes('System.out.print') || /public\s+class/.test(code)) {
          adjustment -= 0.4;
        }
        break;

      case 'typescript':
        // TypeScript should have type annotations
        if (!/:\s*\w+(\[\])?(\s*\|\s*\w+)*(?=\s*[=,){\n])/g.test(code) && 
            !code.includes('interface') && !code.includes('type ')) {
          adjustment -= 0.2;
        }
        break;
    }

    return adjustment;
  }

  // Quick detection for common cases
  quickDetect(code: string): string {
    const trimmed = code.trim();
    
    // Strong indicators first (most specific to least specific)
    
    // Java - very distinctive
    if (trimmed.includes('System.out.print') || 
        trimmed.includes('public class') || 
        trimmed.includes('public static void main') ||
        /public\s+class\s+\w+/.test(trimmed)) {
      return 'java';
    }
    
    // C++ - distinctive includes and std namespace
    if (trimmed.includes('#include') && (trimmed.includes('std::') || trimmed.includes('cout') || trimmed.includes('cin'))) {
      return 'cpp';
    }
    
    // C - distinctive includes without C++ features
    if (trimmed.includes('#include') && (trimmed.includes('printf') || trimmed.includes('scanf')) && !trimmed.includes('std::')) {
      return 'c';
    }
    
    // TypeScript - type annotations are very distinctive
    if ((/:\s*\w+(\[\])?(\s*\|\s*\w+)*(?=\s*[=,){\n])/g.test(trimmed) || 
         trimmed.includes('interface ') || 
         trimmed.includes('type ') ||
         /<[^>]+>/g.test(trimmed)) &&
        (trimmed.includes('function') || trimmed.includes('=>') || trimmed.includes('console.'))) {
      return 'typescript';
    }
    
    // Python - def and print are very distinctive
    if (trimmed.includes('def ') || 
        (trimmed.includes('print(') && !trimmed.includes('System.out.print')) ||
        /^\s*import\s+\w+/m.test(trimmed) ||
        /^\s*from\s+\w+\s+import/m.test(trimmed)) {
      return 'python';
    }
    
    // JavaScript - console.log, function, arrow functions
    if (trimmed.includes('console.log') || 
        trimmed.includes('console.') ||
        /function\s+\w+\s*\(/g.test(trimmed) ||
        /\w+\s*=>\s*/g.test(trimmed) ||
        trimmed.includes('const ') ||
        trimmed.includes('let ')) {
      return 'javascript';
    }

    return 'javascript'; // Default fallback
  }

  // Check if code has strong indicators for a specific language
  private hasStrongLanguageIndicators(code: string, language: string): boolean {
    const strongIndicators: Record<string, RegExp[]> = {
      java: [
        /public\s+class\s+\w+/,
        /System\.out\.print/,
        /public\s+static\s+void\s+main/
      ],
      python: [
        /def\s+\w+\s*\(/,
        /print\s*\(/,
        /^\s*import\s+\w+/m,
        /^\s*from\s+\w+\s+import/m
      ],
      typescript: [
        /:\s*\w+(\[\])?(\s*\|\s*\w+)*(?=\s*[=,){\n])/,
        /interface\s+\w+/,
        /type\s+\w+\s*=/
      ],
      cpp: [
        /#include\s*<.*>/,
        /std::/,
        /cout\s*<</,
        /cin\s*>>/
      ],
      c: [
        /#include\s*<.*\.h>/,
        /printf\s*\(/,
        /scanf\s*\(/
      ]
    };

    const indicators = strongIndicators[language] || [];
    return indicators.some(pattern => pattern.test(code));
  }

  // Calculate confidence for quick detection
  private calculateQuickConfidence(code: string, language: string): number {
    if (this.hasStrongLanguageIndicators(code, language)) {
      return 0.9; // Very confident
    }
    return 0.7; // Moderately confident
  }

  // Apply disambiguation rules to resolve conflicts
  private applyDisambiguationRules(
    code: string, 
    results: Array<{ language: string; confidence: number; reasons: string[] }>
  ): { language: string; confidence: number; reasons: string[] } {
    
    if (results.length === 0) {
      return { language: 'javascript', confidence: 0, reasons: ['No patterns detected'] };
    }

    const topResult = results[0];
    
    // Rule 1: If TypeScript has type annotations and JavaScript doesn't, prefer TypeScript
    const jsResult = results.find(r => r.language === 'javascript');
    const tsResult = results.find(r => r.language === 'typescript');
    
    if (jsResult && tsResult && tsResult.confidence > 0.3) {
      if (/:\s*\w+(\[\])?(\s*\|\s*\w+)*(?=\s*[=,){\n])/g.test(code)) {
        return tsResult;
      }
    }
    
    // Rule 2: If Python and JavaScript are close, check for Python-specific syntax
    const pyResult = results.find(r => r.language === 'python');
    if (pyResult && jsResult && Math.abs(pyResult.confidence - jsResult.confidence) < 0.2) {
      if (/def\s+\w+\s*\(/.test(code) || /print\s*\(/.test(code)) {
        return pyResult;
      }
    }
    
    // Rule 3: Strong confidence threshold
    if (topResult.confidence > 0.6) {
      return topResult;
    }
    
    // Rule 4: Default to JavaScript if confidence is low
    if (topResult.confidence < 0.3) {
      return { language: 'javascript', confidence: 0.2, reasons: ['Low confidence - defaulting to JavaScript'] };
    }
    
    return topResult;
  }

  // Get confidence explanation
  getConfidenceExplanation(confidence: number): string {
    if (confidence >= 0.8) return 'Very confident';
    if (confidence >= 0.6) return 'Confident';
    if (confidence >= 0.4) return 'Moderately confident';
    if (confidence >= 0.2) return 'Low confidence';
    return 'Guessing';
  }
}

// Singleton instance
export const languageDetector = new LanguageDetector();