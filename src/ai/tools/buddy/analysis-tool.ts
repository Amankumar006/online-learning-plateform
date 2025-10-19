import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
        // Note: Code execution simulation has been removed
        // This tool now provides basic complexity analysis guidance
        return `I can help you understand code complexity concepts, but the automated code analysis feature has been removed. 

For **${input.language}** code analysis, I recommend:
- Analyzing loops and nested structures for time complexity
- Checking data structure usage for space complexity
- Looking for recursive calls and their depth

Would you like me to explain complexity analysis concepts or help you manually analyze your code?`;
    }
);