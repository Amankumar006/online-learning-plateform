'use server';
/**
 * @fileOverview Semantic Search Flow - Vector-based content similarity matching
 * 
 * This flow provides advanced semantic search capabilities using vector embeddings
 * to find content based on meaning and context rather than just keyword matching.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
    semanticSearchService,
    type SemanticSearchRequest,
    type SimilarContentRequest,
    type BatchIndexRequest
} from '@/ai/services/semantic-search';

const SemanticSearchInputSchema = z.object({
    query: z.string().describe('The search query to find semantically similar content'),
    options: z.object({
        limit: z.number().optional().default(5).describe('Maximum number of results'),
        minSimilarity: z.number().optional().default(0.3).describe('Minimum similarity threshold (0-1)'),
        contentTypes: z.array(z.enum(['web', 'lesson', 'exercise', 'document'])).optional().describe('Content types to search'),
        includeStats: z.boolean().optional().default(false).describe('Include vector store statistics')
    }).optional().default({})
});

const ContentIndexingInputSchema = z.object({
    contents: z.array(z.object({
        content: z.string().describe('Content text to index'),
        title: z.string().optional().describe('Content title'),
        url: z.string().optional().describe('Content URL'),
        contentType: z.enum(['web', 'lesson', 'exercise', 'document']).default('document'),
        quality: z.enum(['high', 'medium', 'low']).optional().describe('Quality (auto-assessed if not provided)')
    })).describe('Array of content to index'),
    batchSize: z.number().optional().default(10).describe('Number of items to process in each batch')
});

const SimilarContentInputSchema = z.object({
    content: z.string().describe('Content to find similar matches for'),
    options: z.object({
        limit: z.number().optional().default(3),
        minSimilarity: z.number().optional().default(0.4),
        excludeUrl: z.string().optional()
    }).optional().default({})
});

export type SemanticSearchInput = z.infer<typeof SemanticSearchInputSchema>;
export type ContentIndexingInput = z.infer<typeof ContentIndexingInputSchema>;
export type SimilarContentInput = z.infer<typeof SimilarContentInputSchema>;

/**
 * Main semantic search flow
 */
export const semanticSearchFlow = ai.defineFlow(
    {
        name: 'semanticSearchFlow',
        inputSchema: SemanticSearchInputSchema,
        outputSchema: z.object({
            results: z.array(z.object({
                content: z.string(),
                similarity: z.number(),
                relevanceScore: z.number(),
                metadata: z.object({
                    title: z.string().optional(),
                    url: z.string().optional(),
                    domain: z.string().optional(),
                    contentType: z.enum(['web', 'lesson', 'exercise', 'document']),
                    quality: z.enum(['high', 'medium', 'low']),
                    timestamp: z.number()
                })
            })),
            stats: z.object({
                totalVectors: z.number(),
                contentTypes: z.record(z.number()),
                qualityDistribution: z.record(z.number()),
                lastUpdated: z.string()
            }).optional(),
            query: z.string(),
            searchTime: z.number()
        })
    },
    async (input) => {
        try {
            const request: SemanticSearchRequest = {
                query: input.query,
                options: {
                    limit: input.options.limit,
                    minSimilarity: input.options.minSimilarity,
                    contentTypes: input.options.contentTypes
                }
            };

            const searchResults = await semanticSearchService.search(request);
            const searchTime = Date.now() - startTime;

            // Transform SearchResult[] to match the expected schema
            const results = searchResults.map(result => ({
                content: result.vector.content,
                similarity: result.similarity,
                relevanceScore: result.relevanceScore,
                metadata: {
                    title: result.vector.metadata.title,
                    url: result.vector.metadata.url,
                    domain: result.vector.metadata.domain,
                    contentType: result.vector.metadata.contentType,
                    quality: result.vector.metadata.quality,
                    timestamp: result.vector.metadata.timestamp
                }
            }));

            const response: any = {
                results,
                query: input.query,
                searchTime
            };

            if (input.options.includeStats) {
                response.stats = semanticSearchService.getStats();
            }

            return response;

        } catch (error) {
            console.error('Error in semantic search flow:', error);
            throw new Error(`Semantic search failed: ${error}`);
        }
    }
);

/**
 * Content indexing flow for batch processing
 */
export const contentIndexingFlow = ai.defineFlow(
    {
        name: 'contentIndexingFlow',
        inputSchema: ContentIndexingInputSchema,
        outputSchema: z.object({
            indexed: z.number(),
            failed: z.number(),
            totalTime: z.number(),
            stats: z.object({
                totalVectors: z.number(),
                contentTypes: z.record(z.number()),
                qualityDistribution: z.record(z.number()),
                lastUpdated: z.string()
            })
        })
    },
    async (input) => {
        try {
            const request: BatchIndexRequest = {
                items: input.contents.map(content => ({
                    content: content.content,
                    title: content.title,
                    url: content.url,
                    contentType: content.contentType,
                    quality: content.quality
                })),
                batchSize: input.batchSize
            };

            const result = await semanticSearchService.batchIndex(request);
            const stats = semanticSearchService.getStats();

            return {
                indexed: result.indexed,
                failed: result.failed,
                totalTime: result.totalTime,
                stats
            };

        } catch (error) {
            console.error('Error in content indexing flow:', error);
            throw new Error(`Content indexing failed: ${error}`);
        }
    }
);

/**
 * Similar content discovery flow
 */
export const similarContentFlow = ai.defineFlow(
    {
        name: 'similarContentFlow',
        inputSchema: SimilarContentInputSchema,
        outputSchema: z.object({
            results: z.array(z.object({
                content: z.string(),
                similarity: z.number(),
                relevanceScore: z.number(),
                metadata: z.object({
                    title: z.string().optional(),
                    url: z.string().optional(),
                    domain: z.string().optional(),
                    contentType: z.enum(['web', 'lesson', 'exercise', 'document']),
                    quality: z.enum(['high', 'medium', 'low']),
                    timestamp: z.number()
                })
            })),
            searchTime: z.number(),
            inputContentLength: z.number()
        })
    },
    async (input) => {
        try {
            const startTime = Date.now();
            const searchResults = await semanticSearchService.findSimilar({
                content: input.content,
                excludeUrl: input.options.excludeUrl,
                limit: input.options.limit,
                minSimilarity: input.options.minSimilarity
            });
            const searchTime = Date.now() - startTime;

            // Transform SearchResult[] to match the expected schema
            const results = searchResults.map(result => ({
                content: result.vector.content,
                similarity: result.similarity,
                relevanceScore: result.relevanceScore,
                metadata: {
                    title: result.vector.metadata.title,
                    url: result.vector.metadata.url,
                    domain: result.vector.metadata.domain,
                    contentType: result.vector.metadata.contentType,
                    quality: result.vector.metadata.quality,
                    timestamp: result.vector.metadata.timestamp
                }
            }));

            return {
                results,
                searchTime,
                inputContentLength: input.content.length
            };

        } catch (error) {
            console.error('Error in similar content flow:', error);
            throw new Error(`Similar content search failed: ${error}`);
        }
    }
);

/**
 * Vector store analytics flow
 */
export const vectorStoreAnalyticsFlow = ai.defineFlow(
    {
        name: 'vectorStoreAnalyticsFlow',
        inputSchema: z.object({
            includeContentSamples: z.boolean().optional().default(false).describe('Include sample content from each type')
        }),
        outputSchema: z.object({
            stats: z.object({
                totalVectors: z.number(),
                contentTypes: z.record(z.number()),
                qualityDistribution: z.record(z.number()),
                lastUpdated: z.string()
            }),
            analytics: z.object({
                averageContentLength: z.number(),
                oldestContent: z.string().optional(),
                newestContent: z.string().optional(),
                topDomains: z.array(z.object({
                    domain: z.string(),
                    count: z.number()
                })).optional()
            }),
            samples: z.record(z.array(z.object({
                title: z.string().optional(),
                preview: z.string(),
                quality: z.string()
            }))).optional()
        })
    },
    async (input) => {
        try {
            const stats = semanticSearchService.getStats();

            // Calculate additional analytics
            const analytics = {
                averageContentLength: stats.averageContentLength,
                oldestContent: undefined as string | undefined,
                newestContent: undefined as string | undefined,
                topDomains: undefined as Array<{ domain: string, count: number }> | undefined
            };

            const response: any = {
                stats,
                analytics
            };

            if (input.includeContentSamples) {
                response.samples = {
                    web: [],
                    lesson: [],
                    exercise: [],
                    document: []
                };
            }

            return response;

        } catch (error) {
            console.error('Error in vector store analytics flow:', error);
            throw new Error(`Vector store analytics failed: ${error}`);
        }
    }
);

/**
 * Hybrid search flow combining semantic and keyword search
 */
export const hybridSearchFlow = ai.defineFlow(
    {
        name: 'hybridSearchFlow',
        inputSchema: z.object({
            query: z.string().describe('Search query'),
            semanticWeight: z.number().optional().default(0.7).describe('Weight for semantic results (0-1)'),
            keywordWeight: z.number().optional().default(0.3).describe('Weight for keyword results (0-1)'),
            maxResults: z.number().optional().default(10).describe('Maximum combined results')
        }),
        outputSchema: z.object({
            results: z.array(z.object({
                content: z.string(),
                score: z.number(),
                source: z.enum(['semantic', 'keyword', 'both']),
                metadata: z.object({
                    title: z.string().optional(),
                    url: z.string().optional(),
                    contentType: z.enum(['web', 'lesson', 'exercise', 'document']),
                    quality: z.enum(['high', 'medium', 'low'])
                })
            })),
            searchTime: z.number(),
            semanticResults: z.number(),
            keywordResults: z.number()
        })
    },
    async (input) => {
        try {
            const result = await semanticSearchService.hybridSearch(input.query, {
                semanticWeight: input.semanticWeight,
                keywordWeight: input.keywordWeight,
                maxResults: input.maxResults
            });

            // Transform hybrid results to match schema
            const transformedResults = result.results.map(item => ({
                content: item.content,
                score: item.score,
                source: item.source as 'semantic' | 'keyword' | 'both',
                metadata: {
                    title: item.metadata.title,
                    url: item.metadata.url,
                    contentType: item.metadata.contentType,
                    quality: item.metadata.quality
                }
            }));

            return {
                results: transformedResults,
                searchTime: result.searchTime,
                semanticResults: Math.ceil(input.maxResults * (input.semanticWeight || 0.7)),
                keywordResults: Math.ceil(input.maxResults * (input.keywordWeight || 0.3))
            };

        } catch (error) {
            console.error('Error in hybrid search flow:', error);
            throw new Error(`Hybrid search failed: ${error}`);
        }
    }
);

// Export convenience functions for direct use
export async function performSemanticSearch(input: SemanticSearchInput) {
    return await semanticSearchFlow(input);
}

export async function indexContent(input: ContentIndexingInput) {
    return await contentIndexingFlow(input);
}

export async function findSimilar(input: SimilarContentInput) {
    return await similarContentFlow(input);
}

export async function getAnalytics(includeContentSamples: boolean = false) {
    return await vectorStoreAnalyticsFlow({ includeContentSamples });
}

export async function hybridSearch(
    query: string,
    options: {
        semanticWeight?: number;
        keywordWeight?: number;
        maxResults?: number;
    } = {}
) {
    return await hybridSearchFlow({
        query,
        semanticWeight: options.semanticWeight || 0.7,
        keywordWeight: options.keywordWeight || 0.3,
        maxResults: options.maxResults || 10
    });
}