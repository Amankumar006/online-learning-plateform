import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const searchTheWebTool = ai.defineTool(
    {
        name: 'searchTheWeb',
        description: 'Searches the web for up-to-date information on a given topic. Use this for general knowledge questions, current events, or topics not covered in the user\'s study materials.',
        inputSchema: z.object({ query: z.string().describe("The user's question or topic to search for.") }),
        outputSchema: z.string(),
    },
    async ({ query }) => {
        try {
            const apiKey = process.env.GOOGLE_API_KEY;
            const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
            
            if (!apiKey || !searchEngineId) {
                 return "I am sorry, but the web search tool is not configured correctly. I cannot access real-time information right now.";
            }

            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`;
            
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Google Search API Error:", errorData);
                return `Sorry, I encountered an error while searching the web: ${errorData.error.message}`;
            }

            const data = await response.json();
            
            if (!data.items || data.items.length === 0) {
                return `I couldn't find any direct results for "${query}". You might want to try rephrasing your question.`;
            }

            const searchResults = data.items.slice(0, 3).map((item: any) => ({
                title: item.title,
                link: item.link,
                snippet: item.snippet
            }));
            
            const summary = searchResults.map((r: any) => `Title: ${r.title}\nSnippet: ${r.snippet}`).join('\n\n');
            return `Based on a web search for "${query}", here is a summary of the top results:\n\n${summary}`;

        } catch (error) {
            console.error("Error in searchTheWebTool:", error);
            return "I ran into a problem while trying to search the web. Please try again in a moment.";
        }
    }
);