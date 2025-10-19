import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { codeAnalysisService, type CodeAnalysisRequest } from '@/ai/services/code-analysis';

export const analyzeCodeComplexityTool = ai.defineTool(
    {
        name: 'analyzeCodeComplexity',
        description: "Comprehensively analyzes code for complexity, quality, security, and performance. Use this when a user wants detailed code analysis including Big O notation, code quality metrics, and improvement suggestions.",
        inputSchema: z.object({ 
            code: z.string().describe("The code snippet to analyze."),
            language: z.string().describe("The programming language of the code, e.g., 'python', 'javascript', 'java', etc."),
            analysisType: z.enum(['complexity', 'quality', 'security', 'performance', 'comprehensive']).optional().describe("Type of analysis to perform"),
            context: z.string().optional().describe("Additional context about the code's purpose")
        }),
        outputSchema: z.string()
    },
    async ({ code, language, analysisType = 'comprehensive', context }) => {
        try {
            console.log(`🔍 Analyzing ${language} code (${analysisType} analysis)`);
            
            const request: CodeAnalysisRequest = {
                code,
                language,
                analysisType,
                context
            };

            const result = await codeAnalysisService.analyzeCode(request);
            
            let response = `🔍 **Code Analysis Results**\n\n`;
            response += `**Language:** ${result.language}\n`;
            response += `**Lines of Code:** ${result.linesOfCode}\n`;
            response += `**Overall Score:** ${result.overallScore}/100\n`;
            response += `**Summary:** ${result.summary}\n\n`;

            // Complexity Analysis
            if (result.complexity) {
                response += `## ⏱️ Complexity Analysis\n\n`;
                response += `**Time Complexity:** ${result.complexity.timeComplexity.bigO}\n`;
                response += `*${result.complexity.timeComplexity.explanation}*\n\n`;
                response += `**Space Complexity:** ${result.complexity.spaceComplexity.bigO}\n`;
                response += `*${result.complexity.spaceComplexity.explanation}*\n\n`;
                response += `**Cyclomatic Complexity:** ${result.complexity.cyclomaticComplexity.score} (${result.complexity.cyclomaticComplexity.rating})\n`;
                response += `*${result.complexity.cyclomaticComplexity.explanation}*\n\n`;
            }

            // Quality Analysis
            if (result.quality) {
                response += `## 📊 Quality Metrics\n\n`;
                response += `**Readability:** ${result.quality.readability.score}/100\n`;
                if (result.quality.readability.issues.length > 0) {
                    response += `- Issues: ${result.quality.readability.issues.join(', ')}\n`;
                }
                response += `**Maintainability:** ${result.quality.maintainability.score}/100\n`;
                if (result.quality.maintainability.issues.length > 0) {
                    response += `- Issues: ${result.quality.maintainability.issues.join(', ')}\n`;
                }
                response += `**Testability:** ${result.quality.testability.score}/100\n`;
                if (result.quality.testability.issues.length > 0) {
                    response += `- Issues: ${result.quality.testability.issues.join(', ')}\n`;
                }
                response += `\n`;
            }

            // Security Analysis
            if (result.security && result.security.vulnerabilities.length > 0) {
                response += `## 🔒 Security Analysis\n\n`;
                response += `**Security Score:** ${result.security.securityScore}/100\n\n`;
                response += `**Vulnerabilities Found:**\n`;
                result.security.vulnerabilities.forEach((vuln, index) => {
                    const severityIcon = {
                        'Critical': '🚨',
                        'High': '⚠️',
                        'Medium': '⚡',
                        'Low': '💡'
                    }[vuln.severity];
                    
                    response += `${index + 1}. ${severityIcon} **${vuln.type}** (${vuln.severity})\n`;
                    response += `   - ${vuln.description}\n`;
                    response += `   - *Suggestion: ${vuln.suggestion}*\n\n`;
                });
            }

            // Performance Analysis
            if (result.performance && result.performance.bottlenecks.length > 0) {
                response += `## ⚡ Performance Analysis\n\n`;
                response += `**Performance Score:** ${result.performance.performanceScore}/100\n\n`;
                response += `**Bottlenecks:**\n`;
                result.performance.bottlenecks.forEach((bottleneck, index) => {
                    const impactIcon = {
                        'High': '🔴',
                        'Medium': '🟡',
                        'Low': '🟢'
                    }[bottleneck.impact];
                    
                    response += `${index + 1}. ${impactIcon} **${bottleneck.type}** (${bottleneck.impact} Impact)\n`;
                    response += `   - ${bottleneck.description}\n`;
                    response += `   - *Suggestion: ${bottleneck.suggestion}*\n\n`;
                });

                if (result.performance.optimizations.length > 0) {
                    response += `**Optimization Suggestions:**\n`;
                    result.performance.optimizations.forEach((opt, index) => {
                        response += `${index + 1}. ${opt}\n`;
                    });
                    response += `\n`;
                }
            }

            // Recommendations
            if (result.recommendations.length > 0) {
                response += `## 💡 Recommendations\n\n`;
                result.recommendations.forEach((rec, index) => {
                    response += `${index + 1}. ${rec}\n`;
                });
                response += `\n`;
            }

            // Analysis metadata
            response += `---\n`;
            response += `*Analysis completed in ${result.metadata.processingTime}ms*\n`;
            response += `*Analysis type: ${result.metadata.analysisType}*`;

            return response;

        } catch (error) {
            console.error('Code analysis error:', error);
            
            // Provide helpful fallback analysis
            return `🔍 **Code Analysis - Processing Issue**

I encountered an issue while analyzing your ${language} code, but I can still provide some guidance:

## 📝 Manual Analysis Approach

**For ${language.toUpperCase()} code complexity analysis:**

1. **Time Complexity:**
   - Count nested loops (each level multiplies complexity)
   - Look for recursive calls (often exponential)
   - Check for sorting/searching operations

2. **Space Complexity:**
   - Identify data structures created
   - Check for recursive call stack usage
   - Look for auxiliary arrays or objects

3. **Code Quality:**
   - Function length (aim for <50 lines)
   - Variable naming (descriptive names)
   - Comment density (10-20% of lines)
   - Cyclomatic complexity (decision points)

## 🛠️ Quick Analysis Tips

- **Single loop:** Usually O(n) time
- **Nested loops:** Usually O(n²) time  
- **Divide & conquer:** Often O(n log n)
- **Recursive with branching:** Often O(2ⁿ)

**Error:** ${error instanceof Error ? error.message : 'Unknown analysis error'}

Would you like me to walk through analyzing specific aspects of your code manually?`;
        }
    }
);