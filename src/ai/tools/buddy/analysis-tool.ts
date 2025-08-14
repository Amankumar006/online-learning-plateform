import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { simulateCodeExecution } from '../../flows/simulate-code-execution';

export const analyzeCodeComplexityTool = ai.defineTool(
    {
        name: 'analyzeCodeComplexity',
        description: "Analyzes a given code snippet for its time and space complexity (Big O notation) and provides a brief explanation. Use this when a user's code could be analyzed for performance.",
        inputSchema: z.object({ 
            code: z.string().describe("The code snippet to analyze."),
            language: z.string().describe("The programming language of the code, e.g., 'python' or 'javascript'.")
        }),
        outputSchema: z.string().describe("A summary of the complexity analysis, e.g., 'Time Complexity: O(n), Space Complexity: O(1). This is because...'")
    },
    async (input) => {
        try {
            const result = await simulateCodeExecution({ code: input.code, language: input.language });
            return `
Time Complexity: **${result.complexity.time}**
Space Complexity: **${result.complexity.space}**

Summary: ${result.analysis.summary}
            `.trim();
        } catch (e) {
            console.error('Error in analyzeCodeComplexityTool:', e);
            return "I was unable to analyze the complexity of that code snippet.";
        }
    }
);