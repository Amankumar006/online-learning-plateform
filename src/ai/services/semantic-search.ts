/**
 * Semantic Search Service
 * High-level service for semantic search operations
 */

import {
  vectorStore,
  VectorUtils,
  type SearchOptions,
  type SearchResult,
  type ContentType,
  type QualityLevel,
  type VectorStoreStats
} from '@/ai/core/vector-store';
import { persistentVectorStore } from '@/ai/core/persistent-vector-store';

export interface IndexContentRequest {
  content: string;
  title?: string;
  url?: string;
  contentType?: ContentType;
  quality?: QualityLevel;
  tags?: string[];
}

export interface SemanticSearchRequest {
  query: string;
  options?: SearchOptions;
}

export interface SimilarContentRequest {
  content: string;
  excludeUrl?: string;
  limit?: number;
  minSimilarity?: number;
}

export interface BatchIndexRequest {
  items: IndexContentRequest[];
  batchSize?: number;
}

export interface BatchIndexResult {
  indexed: number;
  failed: number;
  totalTime: number;
  errors: string[];
}

export class SemanticSearchService {
  private usePeristentStore: boolean;

  constructor(usePersistentStore = true) {
    this.usePeristentStore = usePersistentStore;
  }

  private get store() {
    return this.usePeristentStore ? persistentVectorStore : vectorStore;
  }

  /**
   * Index content for semantic search
   */
  async indexContent(request: IndexContentRequest): Promise<string> {
    const {
      content,
      title,
      url,
      contentType = 'document',
      quality,
      tags
    } = request;

    // Auto-assess quality if not provided
    const finalQuality = quality || VectorUtils.assessContentQuality(content);

    // Auto-extract tags if not provided
    const finalTags = tags || VectorUtils.extractTags(content, title);

    const vectorId = await this.store.addVector(content, {
      title,
      url,
      contentType,
      quality: finalQuality,
      tags: finalTags
    });

    return vectorId;
  }

  /**
   * Perform semantic search
   */
  async search(request: SemanticSearchRequest): Promise<SearchResult[]> {
    const { query, options = {} } = request;
    return await this.store.search(query, options);
  }

  /**
   * Find similar content
   */
  async findSimilar(request: SimilarContentRequest): Promise<SearchResult[]> {
    const { content, excludeUrl, limit = 3, minSimilarity = 0.4 } = request;

    // Find vector ID by URL if excludeUrl is provided
    let excludeId: string | undefined;
    if (excludeUrl) {
      // This is a simplified approach - in a real implementation,
      // we'd maintain a URL-to-ID mapping
      excludeId = undefined; // Would need to implement URL lookup
    }

    return await this.store.findSimilar(content, {
      excludeId,
      limit,
      minSimilarity
    });
  }

  /**
   * Batch index multiple content pieces
   */
  async batchIndex(request: BatchIndexRequest): Promise<BatchIndexResult> {
    const { items, batchSize = 10 } = request;
    const startTime = Date.now();

    let indexed = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(item => this.indexContent(item))
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          indexed++;
        } else {
          failed++;
          const item = batch[index];
          errors.push(`Failed to index "${item.title || 'Untitled'}": ${result.reason}`);
        }
      });

      // Small delay between batches
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      indexed,
      failed,
      totalTime: Date.now() - startTime,
      errors
    };
  }

  /**
   * Index web search results
   */
  async indexWebResults(results: Array<{
    title: string;
    content: string;
    url: string;
    domain: string;
    quality?: QualityLevel;
  }>): Promise<BatchIndexResult> {
    const items: IndexContentRequest[] = results.map(result => ({
      content: result.content,
      title: result.title,
      url: result.url,
      contentType: 'web' as ContentType,
      quality: result.quality || VectorUtils.assessContentQuality(result.content),
      tags: VectorUtils.extractTags(result.content, result.title)
    }));

    return await this.batchIndex({ items });
  }

  /**
   * Get vector store statistics
   */
  getStats(): VectorStoreStats {
    return this.store.getStats();
  }

  /**
   * Clear all vectors
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Remove specific vector
   */
  removeVector(id: string): boolean {
    return this.store.removeVector(id);
  }

  /**
   * Batch operations for better performance
   */
  async batchIndexContent(requests: IndexContentRequest[]): Promise<string[]> {
    if ('batchAdd' in this.store) {
      const vectors = requests.map(request => ({
        content: request.content,
        metadata: {
          title: request.title,
          url: request.url,
          contentType: request.contentType || 'document',
          quality: request.quality || VectorUtils.assessContentQuality(request.content),
          tags: request.tags || VectorUtils.extractTags(request.content, request.title)
        }
      }));
      
      return await (this.store as any).batchAdd(vectors);
    } else {
      // Fallback to individual additions
      const ids: string[] = [];
      for (const request of requests) {
        const id = await this.indexContent(request);
        ids.push(id);
      }
      return ids;
    }
  }

  /**
   * Export vector data for backup/migration
   */
  async exportVectors(): Promise<any[]> {
    if ('exportToJSON' in this.store) {
      return await (this.store as any).exportToJSON();
    }
    throw new Error('Export not supported by current vector store');
  }

  /**
   * Import vector data from backup/migration
   */
  async importVectors(data: any[]): Promise<void> {
    if ('importFromJSON' in this.store) {
      return await (this.store as any).importFromJSON(data);
    }
    throw new Error('Import not supported by current vector store');
  }

  /**
   * Hybrid search combining multiple strategies
   */
  async hybridSearch(
    query: string,
    options: {
      semanticWeight?: number;
      keywordWeight?: number;
      maxResults?: number;
    } = {}
  ): Promise<{
    results: Array<{
      content: string;
      score: number;
      source: 'semantic' | 'keyword' | 'both';
      metadata: {
        title?: string;
        url?: string;
        domain?: string;
        contentType: ContentType;
        quality: QualityLevel;
        timestamp: number;
        tags?: string[];
      };
    }>;
    searchTime: number;
  }> {
    const startTime = Date.now();
    const {
      semanticWeight = 0.7,
      keywordWeight = 0.3,
      maxResults = 10
    } = options;

    // Get semantic results
    const semanticResults = await this.search({
      query,
      options: {
        limit: Math.ceil(maxResults * 0.7),
        minSimilarity: 0.2
      }
    });

    // Simulate keyword search with lower similarity threshold
    const keywordResults = await this.search({
      query,
      options: {
        limit: Math.ceil(maxResults * 0.3),
        minSimilarity: 0.1
      }
    });

    // Combine results
    const combinedResults = [];
    const seenUrls = new Set<string>();

    // Add semantic results
    for (const result of semanticResults) {
      const url = result.vector.metadata.url || result.vector.id;
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        combinedResults.push({
          content: result.vector.content,
          score: result.similarity * semanticWeight,
          source: 'semantic' as const,
          metadata: result.vector.metadata
        });
      }
    }

    // Add keyword results (avoiding duplicates)
    for (const result of keywordResults) {
      const url = result.vector.metadata.url || result.vector.id;
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        combinedResults.push({
          content: result.vector.content,
          score: result.similarity * keywordWeight,
          source: 'keyword' as const,
          metadata: result.vector.metadata
        });
      } else {
        // Boost existing result
        const existingIndex = combinedResults.findIndex(r =>
          (r.metadata.url || 'unknown') === url
        );
        if (existingIndex !== -1) {
          combinedResults[existingIndex].score += result.similarity * keywordWeight;
          combinedResults[existingIndex].source = 'both' as const;
        }
      }
    }

    // Sort and limit
    const finalResults = combinedResults
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return {
      results: finalResults,
      searchTime: Date.now() - startTime
    };
  }

  /**
   * Get content recommendations based on user interaction
   */
  async getRecommendations(
    userContent: string,
    options: {
      contentTypes?: ContentType[];
      limit?: number;
      diversityThreshold?: number;
    } = {}
  ): Promise<SearchResult[]> {
    const {
      contentTypes = ['lesson', 'exercise', 'document'],
      limit = 5,
      diversityThreshold = 0.8
    } = options;

    const results = await this.findSimilar({
      content: userContent,
      limit: limit * 2, // Get more to allow for diversity filtering
      minSimilarity: 0.3
    });

    // Filter by content type
    const filtered = results.filter(result =>
      contentTypes.includes(result.vector.metadata.contentType)
    );

    // Apply diversity filtering to avoid too similar results
    const diverse: SearchResult[] = [];
    for (const result of filtered) {
      const isTooSimilar = diverse.some(existing =>
        this.calculateContentSimilarity(result.vector.content, existing.vector.content) > diversityThreshold
      );

      if (!isTooSimilar) {
        diverse.push(result);
      }

      if (diverse.length >= limit) break;
    }

    return diverse;
  }

  /**
   * Simple content similarity calculation for diversity filtering
   */
  private calculateContentSimilarity(content1: string, content2: string): number {
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size; // Jaccard similarity
  }
}

// Singleton instance with persistent storage
export const semanticSearchService = new SemanticSearchService(true);