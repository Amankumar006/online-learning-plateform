/**
 * Enhanced Code Analysis Service
 * Provides comprehensive code analysis including complexity, quality, and suggestions
 */

import { ai } from '@/ai/ai';

export interface CodeAnalysisRequest {
  code: string;
  language: string;
  analysisType?: 'complexity' | 'quality' | 'security' | 'performance' | 'comprehensive';
  context?: string;
}

export interface ComplexityAnalysis {
  timeComplexity: {
    bigO: string;
    explanation: string;
    confidence: number;
  };
  spaceComplexity: {
    bigO: string;
    explanation: string;
    confidence: number;
  };
  cyclomaticComplexity: {
    score: number;
    rating: 'Low' | 'Moderate' | 'High' | 'Very High';
    explanation: string;
  };
}

export interface QualityAnalysis {
  readability: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
  maintainability: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
  testability: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
}

export interface SecurityAnalysis {
  vulnerabilities: Array<{
    type: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    description: string;
    line?: number;
    suggestion: string;
  }>;
  securityScore: number;
}

export interface PerformanceAnalysis {
  bottlenecks: Array<{
    type: string;
    description: string;
    line?: number;
    impact: 'Low' | 'Medium' | 'High';
    suggestion: string;
  }>;
  optimizations: string[];
  performanceScore: number;
}

export interface CodeAnalysisResult {
  language: string;
  linesOfCode: number;
  complexity?: ComplexityAnalysis;
  quality?: QualityAnalysis;
  security?: SecurityAnalysis;
  performance?: PerformanceAnalysis;
  overallScore: number;
  summary: string;
  recommendations: string[];
  metadata: {
    analyzedAt: string;
    analysisType: string;
    processingTime: number;
  };
}

export class CodeAnalysisService {
  /**
   * Analyze code comprehensively
   */
  async analyzeCode(request: CodeAnalysisRequest): Promise<CodeAnalysisResult> {
    const startTime = Date.now();
    const { code, language, analysisType = 'comprehensive', context } = request;

    // Basic code metrics
    const linesOfCode = this.countLinesOfCode(code);
    const cleanCode = this.cleanCode(code);

    let result: Partial<CodeAnalysisResult> = {
      language,
      linesOfCode,
      metadata: {
        analyzedAt: new Date().toISOString(),
        analysisType,
        processingTime: 0
      }
    };

    try {
      // Perform different types of analysis based on request
      switch (analysisType) {
        case 'complexity':
          result.complexity = await this.analyzeComplexity(cleanCode, language);
          break;
        case 'quality':
          result.quality = await this.analyzeQuality(cleanCode, language);
          break;
        case 'security':
          result.security = await this.analyzeSecurity(cleanCode, language);
          break;
        case 'performance':
          result.performance = await this.analyzePerformance(cleanCode, language);
          break;
        case 'comprehensive':
        default:
          result.complexity = await this.analyzeComplexity(cleanCode, language);
          result.quality = await this.analyzeQuality(cleanCode, language);
          result.security = await this.analyzeSecurity(cleanCode, language);
          result.performance = await this.analyzePerformance(cleanCode, language);
          break;
      }

      // Calculate overall score and generate summary
      result.overallScore = this.calculateOverallScore(result);
      result.summary = this.generateSummary(result);
      result.recommendations = this.generateRecommendations(result);

    } catch (error) {
      console.error('Code analysis error:', error);
      // Provide fallback analysis
      result = await this.fallbackAnalysis(cleanCode, language);
    }

    result.metadata!.processingTime = Date.now() - startTime;
    return result as CodeAnalysisResult;
  }

  /**
   * Analyze time and space complexity
   */
  private async analyzeComplexity(code: string, language: string): Promise<ComplexityAnalysis> {
    try {
      // Use AI to analyze complexity
      const prompt = `Analyze the time and space complexity of this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. Time complexity in Big O notation with explanation
2. Space complexity in Big O notation with explanation
3. Cyclomatic complexity assessment

Format as JSON with timeComplexity, spaceComplexity, and cyclomaticComplexity objects.`;

      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt,
        config: { temperature: 0.1 }
      });

      // Try to parse AI response as JSON
      try {
        const parsed = JSON.parse(response.text);
        return {
          timeComplexity: {
            bigO: parsed.timeComplexity?.bigO || 'O(?)',
            explanation: parsed.timeComplexity?.explanation || 'Unable to determine',
            confidence: parsed.timeComplexity?.confidence || 0.5
          },
          spaceComplexity: {
            bigO: parsed.spaceComplexity?.bigO || 'O(?)',
            explanation: parsed.spaceComplexity?.explanation || 'Unable to determine',
            confidence: parsed.spaceComplexity?.confidence || 0.5
          },
          cyclomaticComplexity: {
            score: parsed.cyclomaticComplexity?.score || this.calculateCyclomaticComplexity(code),
            rating: this.getCyclomaticRating(parsed.cyclomaticComplexity?.score || 1),
            explanation: parsed.cyclomaticComplexity?.explanation || 'Basic complexity assessment'
          }
        };
      } catch {
        // Fallback to rule-based analysis
        return this.ruleBasedComplexityAnalysis(code, language);
      }

    } catch (error) {
      console.error('Complexity analysis error:', error);
      return this.ruleBasedComplexityAnalysis(code, language);
    }
  }

  /**
   * Analyze code quality
   */
  private async analyzeQuality(code: string, language: string): Promise<QualityAnalysis> {
    const readabilityScore = this.assessReadability(code, language);
    const maintainabilityScore = this.assessMaintainability(code, language);
    const testabilityScore = this.assessTestability(code, language);

    return {
      readability: {
        score: readabilityScore.score,
        issues: readabilityScore.issues,
        suggestions: readabilityScore.suggestions
      },
      maintainability: {
        score: maintainabilityScore.score,
        issues: maintainabilityScore.issues,
        suggestions: maintainabilityScore.suggestions
      },
      testability: {
        score: testabilityScore.score,
        issues: testabilityScore.issues,
        suggestions: testabilityScore.suggestions
      }
    };
  }

  /**
   * Analyze security vulnerabilities
   */
  private async analyzeSecurity(code: string, language: string): Promise<SecurityAnalysis> {
    const vulnerabilities = this.detectSecurityIssues(code, language);
    const securityScore = Math.max(0, 100 - (vulnerabilities.length * 10));

    return {
      vulnerabilities,
      securityScore
    };
  }

  /**
   * Analyze performance bottlenecks
   */
  private async analyzePerformance(code: string, language: string): Promise<PerformanceAnalysis> {
    const bottlenecks = this.detectPerformanceIssues(code, language);
    const optimizations = this.suggestOptimizations(code, language);
    const performanceScore = Math.max(0, 100 - (bottlenecks.length * 15));

    return {
      bottlenecks,
      optimizations,
      performanceScore
    };
  }

  /**
   * Rule-based complexity analysis fallback
   */
  private ruleBasedComplexityAnalysis(code: string, language: string): ComplexityAnalysis {
    const cyclomaticScore = this.calculateCyclomaticComplexity(code);
    const { timeComplexity, spaceComplexity } = this.estimateComplexity(code, language);

    return {
      timeComplexity: {
        bigO: timeComplexity,
        explanation: this.explainTimeComplexity(code, timeComplexity),
        confidence: 0.7
      },
      spaceComplexity: {
        bigO: spaceComplexity,
        explanation: this.explainSpaceComplexity(code, spaceComplexity),
        confidence: 0.7
      },
      cyclomaticComplexity: {
        score: cyclomaticScore,
        rating: this.getCyclomaticRating(cyclomaticScore),
        explanation: `Cyclomatic complexity of ${cyclomaticScore} indicates ${this.getCyclomaticRating(cyclomaticScore).toLowerCase()} complexity`
      }
    };
  }

  /**
   * Calculate cyclomatic complexity
   */
  private calculateCyclomaticComplexity(code: string): number {
    // Count decision points
    const patterns = [
      /\bif\b/g, /\belse\s+if\b/g, /\bwhile\b/g, /\bfor\b/g,
      /\bswitch\b/g, /\bcase\b/g, /\bcatch\b/g, /\b&&\b/g, /\b\|\|\b/g,
      /\?\s*:/g, /\bdo\b/g
    ];

    let complexity = 1; // Base complexity
    patterns.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) complexity += matches.length;
    });

    return complexity;
  }

  /**
   * Get cyclomatic complexity rating
   */
  private getCyclomaticRating(score: number): 'Low' | 'Moderate' | 'High' | 'Very High' {
    if (score <= 10) return 'Low';
    if (score <= 20) return 'Moderate';
    if (score <= 50) return 'High';
    return 'Very High';
  }

  /**
   * Estimate time and space complexity
   */
  private estimateComplexity(code: string, language: string): { timeComplexity: string; spaceComplexity: string } {
    // Simple heuristic-based complexity estimation
    let timeComplexity = 'O(1)';
    let spaceComplexity = 'O(1)';

    // Check for nested loops
    const nestedLoops = (code.match(/for|while/g) || []).length;
    if (nestedLoops >= 3) timeComplexity = 'O(n³)';
    else if (nestedLoops >= 2) timeComplexity = 'O(n²)';
    else if (nestedLoops >= 1) timeComplexity = 'O(n)';

    // Check for recursive patterns
    if (code.includes('return') && (code.includes('function') || code.includes('def'))) {
      const functionName = this.extractFunctionName(code);
      if (functionName && code.includes(functionName)) {
        timeComplexity = 'O(2ⁿ)'; // Assume exponential for recursive
      }
    }

    // Check for sorting or searching algorithms
    if (code.includes('sort') || code.includes('binary')) {
      timeComplexity = 'O(n log n)';
    }

    // Space complexity estimation
    if (code.includes('new Array') || code.includes('[]') || code.includes('list(')) {
      spaceComplexity = 'O(n)';
    }

    return { timeComplexity, spaceComplexity };
  }

  /**
   * Assess code readability
   */
  private assessReadability(code: string, language: string): { score: number; issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check line length
    const lines = code.split('\n');
    const longLines = lines.filter(line => line.length > 120);
    if (longLines.length > 0) {
      issues.push(`${longLines.length} lines exceed 120 characters`);
      suggestions.push('Break long lines into multiple shorter lines');
      score -= longLines.length * 2;
    }

    // Check for comments
    const commentRatio = this.calculateCommentRatio(code, language);
    if (commentRatio < 0.1) {
      issues.push('Low comment density');
      suggestions.push('Add more explanatory comments');
      score -= 15;
    }

    // Check naming conventions
    const namingIssues = this.checkNamingConventions(code, language);
    if (namingIssues.length > 0) {
      issues.push(...namingIssues);
      suggestions.push('Use descriptive variable and function names');
      score -= namingIssues.length * 5;
    }

    return { score: Math.max(0, score), issues, suggestions };
  }

  /**
   * Assess maintainability
   */
  private assessMaintainability(code: string, language: string): { score: number; issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check function length
    const functions = this.extractFunctions(code, language);
    const longFunctions = functions.filter(f => f.lines > 50);
    if (longFunctions.length > 0) {
      issues.push(`${longFunctions.length} functions are too long (>50 lines)`);
      suggestions.push('Break large functions into smaller, focused functions');
      score -= longFunctions.length * 10;
    }

    // Check for code duplication
    const duplicationScore = this.detectCodeDuplication(code);
    if (duplicationScore > 0.3) {
      issues.push('High code duplication detected');
      suggestions.push('Extract common code into reusable functions');
      score -= 20;
    }

    return { score: Math.max(0, score), issues, suggestions };
  }

  /**
   * Assess testability
   */
  private assessTestability(code: string, language: string): { score: number; issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check for global variables
    const globalVars = this.detectGlobalVariables(code, language);
    if (globalVars.length > 0) {
      issues.push(`${globalVars.length} global variables detected`);
      suggestions.push('Minimize global state for better testability');
      score -= globalVars.length * 5;
    }

    // Check for side effects
    const sideEffects = this.detectSideEffects(code, language);
    if (sideEffects.length > 0) {
      issues.push('Functions with side effects detected');
      suggestions.push('Separate pure functions from side effects');
      score -= sideEffects.length * 8;
    }

    return { score: Math.max(0, score), issues, suggestions };
  }

  /**
   * Detect security issues
   */
  private detectSecurityIssues(code: string, language: string): SecurityAnalysis['vulnerabilities'] {
    const vulnerabilities: SecurityAnalysis['vulnerabilities'] = [];

    // SQL Injection patterns
    if (code.includes('SELECT') && (code.includes('+') || code.includes('${') || code.includes('%s'))) {
      vulnerabilities.push({
        type: 'SQL Injection',
        severity: 'High',
        description: 'Potential SQL injection vulnerability detected',
        suggestion: 'Use parameterized queries or prepared statements'
      });
    }

    // XSS patterns
    if (code.includes('innerHTML') || code.includes('document.write')) {
      vulnerabilities.push({
        type: 'Cross-Site Scripting (XSS)',
        severity: 'Medium',
        description: 'Potential XSS vulnerability with DOM manipulation',
        suggestion: 'Sanitize user input and use safe DOM methods'
      });
    }

    // Hardcoded credentials
    const credentialPatterns = [/password\s*=\s*["'][^"']+["']/i, /api_key\s*=\s*["'][^"']+["']/i];
    credentialPatterns.forEach(pattern => {
      if (pattern.test(code)) {
        vulnerabilities.push({
          type: 'Hardcoded Credentials',
          severity: 'Critical',
          description: 'Hardcoded credentials found in code',
          suggestion: 'Use environment variables or secure credential storage'
        });
      }
    });

    return vulnerabilities;
  }

  /**
   * Detect performance issues
   */
  private detectPerformanceIssues(code: string, language: string): PerformanceAnalysis['bottlenecks'] {
    const bottlenecks: PerformanceAnalysis['bottlenecks'] = [];

    // Nested loops
    const nestedLoopCount = (code.match(/for.*for|while.*while|for.*while|while.*for/g) || []).length;
    if (nestedLoopCount > 0) {
      bottlenecks.push({
        type: 'Nested Loops',
        description: `${nestedLoopCount} nested loop(s) detected`,
        impact: 'High',
        suggestion: 'Consider algorithmic optimizations or data structure changes'
      });
    }

    // Inefficient string concatenation
    if (language.toLowerCase() === 'java' && code.includes('+ "')) {
      bottlenecks.push({
        type: 'String Concatenation',
        description: 'Inefficient string concatenation in loops',
        impact: 'Medium',
        suggestion: 'Use StringBuilder for multiple string concatenations'
      });
    }

    return bottlenecks;
  }

  /**
   * Suggest optimizations
   */
  private suggestOptimizations(code: string, language: string): string[] {
    const optimizations: string[] = [];

    if (code.includes('for') && code.includes('length')) {
      optimizations.push('Cache array length in loop conditions');
    }

    if (code.includes('getElementById') && code.match(/getElementById.*getElementById/)) {
      optimizations.push('Cache DOM element references');
    }

    if (language.toLowerCase() === 'python' && code.includes('append')) {
      optimizations.push('Consider list comprehensions for better performance');
    }

    return optimizations;
  }

  // Helper methods
  private cleanCode(code: string): string {
    return code.trim().replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  }

  private countLinesOfCode(code: string): number {
    return code.split('\n').filter(line => line.trim().length > 0).length;
  }

  private calculateCommentRatio(code: string, language: string): number {
    const totalLines = code.split('\n').length;
    const commentPatterns = {
      javascript: /\/\/|\/\*|\*\//g,
      python: /#|"""|'''/g,
      java: /\/\/|\/\*|\*\//g,
      default: /\/\/|#|\/\*|\*\//g
    };

    const pattern = commentPatterns[language.toLowerCase() as keyof typeof commentPatterns] || commentPatterns.default;
    const commentLines = (code.match(pattern) || []).length;
    
    return commentLines / totalLines;
  }

  private checkNamingConventions(code: string, language: string): string[] {
    const issues: string[] = [];
    
    // Check for single letter variables (except common ones like i, j, k)
    const singleLetterVars = code.match(/\b[a-h,l-z]\b/g) || [];
    if (singleLetterVars.length > 3) {
      issues.push('Too many single-letter variable names');
    }

    return issues;
  }

  private extractFunctions(code: string, language: string): Array<{ name: string; lines: number }> {
    const functions: Array<{ name: string; lines: number }> = [];
    
    // Simple function extraction (can be enhanced)
    const functionPattern = /function\s+(\w+)|def\s+(\w+)|(\w+)\s*\(/g;
    let match;
    
    while ((match = functionPattern.exec(code)) !== null) {
      const name = match[1] || match[2] || match[3];
      // Estimate function length (simplified)
      const lines = 10; // Placeholder
      functions.push({ name, lines });
    }

    return functions;
  }

  private detectCodeDuplication(code: string): number {
    // Simplified duplication detection
    const lines = code.split('\n').map(line => line.trim()).filter(line => line.length > 10);
    const uniqueLines = new Set(lines);
    
    return 1 - (uniqueLines.size / lines.length);
  }

  private detectGlobalVariables(code: string, language: string): string[] {
    // Simplified global variable detection
    const globalVars: string[] = [];
    
    if (language.toLowerCase() === 'javascript') {
      const varMatches = code.match(/var\s+(\w+)/g) || [];
      globalVars.push(...varMatches.map(match => match.replace('var ', '')));
    }

    return globalVars;
  }

  private detectSideEffects(code: string, language: string): string[] {
    const sideEffects: string[] = [];
    
    // Look for common side effect patterns
    if (code.includes('console.log') || code.includes('print(')) {
      sideEffects.push('Console output');
    }
    
    if (code.includes('fetch') || code.includes('XMLHttpRequest')) {
      sideEffects.push('Network requests');
    }

    return sideEffects;
  }

  private extractFunctionName(code: string): string | null {
    const match = code.match(/function\s+(\w+)|def\s+(\w+)/);
    return match ? (match[1] || match[2]) : null;
  }

  private explainTimeComplexity(code: string, complexity: string): string {
    const explanations = {
      'O(1)': 'Constant time - execution time does not depend on input size',
      'O(n)': 'Linear time - execution time grows linearly with input size',
      'O(n²)': 'Quadratic time - execution time grows quadratically, often due to nested loops',
      'O(n³)': 'Cubic time - execution time grows cubically, typically from triple-nested loops',
      'O(log n)': 'Logarithmic time - execution time grows logarithmically, common in binary search',
      'O(n log n)': 'Linearithmic time - common in efficient sorting algorithms',
      'O(2ⁿ)': 'Exponential time - execution time doubles with each additional input'
    };

    return explanations[complexity as keyof typeof explanations] || 'Time complexity analysis based on code structure';
  }

  private explainSpaceComplexity(code: string, complexity: string): string {
    const explanations = {
      'O(1)': 'Constant space - memory usage does not depend on input size',
      'O(n)': 'Linear space - memory usage grows linearly with input size',
      'O(n²)': 'Quadratic space - memory usage grows quadratically with input size'
    };

    return explanations[complexity as keyof typeof explanations] || 'Space complexity analysis based on data structures used';
  }

  private calculateOverallScore(result: Partial<CodeAnalysisResult>): number {
    let totalScore = 0;
    let components = 0;

    if (result.quality) {
      totalScore += (result.quality.readability.score + result.quality.maintainability.score + result.quality.testability.score) / 3;
      components++;
    }

    if (result.security) {
      totalScore += result.security.securityScore;
      components++;
    }

    if (result.performance) {
      totalScore += result.performance.performanceScore;
      components++;
    }

    return components > 0 ? Math.round(totalScore / components) : 75;
  }

  private generateSummary(result: Partial<CodeAnalysisResult>): string {
    const score = result.overallScore || 75;
    
    if (score >= 90) return 'Excellent code quality with minimal issues';
    if (score >= 80) return 'Good code quality with minor improvements needed';
    if (score >= 70) return 'Acceptable code quality with some areas for improvement';
    if (score >= 60) return 'Below average code quality requiring attention';
    return 'Poor code quality requiring significant improvements';
  }

  private generateRecommendations(result: Partial<CodeAnalysisResult>): string[] {
    const recommendations: string[] = [];

    if (result.complexity?.cyclomaticComplexity.score && result.complexity.cyclomaticComplexity.score > 10) {
      recommendations.push('Reduce cyclomatic complexity by breaking down complex functions');
    }

    if (result.quality?.readability.score && result.quality.readability.score < 80) {
      recommendations.push('Improve code readability with better naming and comments');
    }

    if (result.security?.vulnerabilities.length && result.security.vulnerabilities.length > 0) {
      recommendations.push('Address security vulnerabilities before deployment');
    }

    if (result.performance?.bottlenecks.length && result.performance.bottlenecks.length > 0) {
      recommendations.push('Optimize performance bottlenecks for better efficiency');
    }

    if (recommendations.length === 0) {
      recommendations.push('Code quality is good - consider adding more comprehensive tests');
    }

    return recommendations;
  }

  private async fallbackAnalysis(code: string, language: string): Promise<Partial<CodeAnalysisResult>> {
    return {
      complexity: this.ruleBasedComplexityAnalysis(code, language),
      overallScore: 75,
      summary: 'Basic analysis completed using fallback methods',
      recommendations: ['Consider using more advanced analysis tools for detailed insights']
    };
  }
}

// Singleton instance
export const codeAnalysisService = new CodeAnalysisService();

// Helper function for easy integration
export async function analyzeCodeSnippet(
  code: string,
  language: string,
  analysisType?: CodeAnalysisRequest['analysisType']
): Promise<CodeAnalysisResult> {
  return await codeAnalysisService.analyzeCode({
    code,
    language,
    analysisType
  });
}