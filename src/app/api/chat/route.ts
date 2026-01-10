import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { scrapePageContent, createSynthesizedAnswer, createSourcesSection, SearchResult, GoogleSearchResponse } from '@/lib/search-utils';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { messages, data } = await req.json();
        const userId = data?.userId;
        const webSearchEnabled = data?.webSearchEnabled ?? false;

        console.log('[API/chat] Received request, messages:', messages.length);

        const systemPrompt = `You are "Study Buddy", an advanced AI learning assistant for the AdaptEd platform.
  
  GOAL: Help students learn effectively by explaining concepts, solving problems, and providing analogies.
  
  CAPABILITIES:
  - If the user asks for current events, news, or specific up-to-date information, USE the "searchTheWeb" tool.
  - If the user asks about a topic you don't know, USE the "searchTheWeb" tool.
  
  GUIDELINES:
  - Be encouraging and patient.
  - Use Markdown for formatting (bold, lists, code blocks).
  - When using the search tool, analyze the results and provide a comprehensive answer with citations.
  
  SAFETY:
  - Do not answer questions related to violence, hate speech, or illicit activities.`;

        // Create Google provider with explicit API key
        const google = createGoogleGenerativeAI({
            apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        });

        // Convert UIMessage format (parts) to ModelMessage format (content)
        const convertedMessages = messages.map((msg: any) => {
            // Extract text content from parts array if present
            let content = msg.content;
            if (!content && msg.parts) {
                content = msg.parts
                    .filter((p: any) => p.type === 'text')
                    .map((p: any) => p.text)
                    .join('');
            }
            return {
                role: msg.role,
                content: content || '',
            };
        });

        const result = streamText({
            model: google('gemini-2.5-flash'),
            system: systemPrompt,
            messages: convertedMessages,
            tools: webSearchEnabled ? {
                searchTheWeb: tool({
                    description: 'Search the web for current information, rankings, or specific data.',
                    inputSchema: z.object({
                        query: z.string().describe("The search query"),
                    }),
                    execute: async ({ query }: { query: string }) => {
                        console.log("Searching web for:", query);
                        const apiKey = process.env.GOOGLE_API_KEY;
                        const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

                        if (!apiKey || !searchEngineId) {
                            return "Config Error: Missing Google Search Keys.";
                        }

                        try {
                            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`;
                            const res = await fetch(url);
                            if (!res.ok) throw new Error(`Google Search API Error: ${res.statusText}`);

                            const data: GoogleSearchResponse = await res.json();
                            if (!data.items?.length) return "No results found.";

                            // Process first 4 results
                            const searchResults: SearchResult[] = await Promise.all(
                                data.items.slice(0, 4).map(async (item: any, index: number) => {
                                    let scraped = null;
                                    try { scraped = await scrapePageContent(item.link); } catch (e) { console.error("Scrape error", e); }

                                    return {
                                        title: item.title,
                                        link: item.link,
                                        snippet: item.snippet,
                                        domain: new URL(item.link).hostname,
                                        index: index + 1,
                                        scrapedContent: scraped?.content,
                                        contentLength: scraped?.contentLength
                                    };
                                })
                            );

                            const synthesis = createSynthesizedAnswer(query, searchResults);
                            const sources = createSourcesSection(searchResults);
                            return synthesis + sources;

                        } catch (error: any) {
                            return `Search failed: ${error.message}`;
                        }
                    },
                }),
            } : {},
        });

        console.log('[API/chat] Streaming response...');
        return result.toUIMessageStreamResponse();
    } catch (error: any) {
        console.error('[API/chat] Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
