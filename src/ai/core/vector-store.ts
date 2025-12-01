/**
 * Core Vector Store Module
 * Handles vector storage, similarity calculations, and embeddings
 */

import { ai } from '@/ai/ai';

// Core types
export interface EmbeddingVector {
  id: string;
  content: string;
  embedding: number[];
  metadata: VectorMetadata;
}

export interface VectorMetadata {
  title?: string;
  url?: string;
  domain?: string;
  timestamp: number;
  contentType: ContentType;
  quality: QualityLevel;
  tags?: string[];
}

export type ContentType = 'web' | 'lesson' | 'exercise' | 'document';
export type QualityLevel = 'high' | 'medium' | 'low';

export interface SearchOptions {
  limit?: number;
  minSimilarity?: number;
  contentTypes?: ContentType[];
  qualityFilter?: QualityLevel[];
  tags?: string[];
}

export interface SearchResult {
  vector: EmbeddingVector;
  similarity: number;
  relevanceScore: number;
}

export interface VectorStoreStats {
  totalVectors: number;
  contentTypes: Record<ContentType, number>;
  qualityDistribution: Record<QualityLevel, number>;
  lastUpdated: string;
  averageContentLength: number;
}

// Configuration
const VECTOR_STORE_CONFIG = {
  maxVectors: 1000,
  cleanupThreshold: 1100,
  contentMaxLength: 2000,
  embeddingDimensions: 384,
  recencyDecayDays: 30
};

// In-memory vector store
class VectorStore {
  private vectors: Map<string, EmbeddingVector> = new Map();
  private lastUpdated: number = Date.now();

  async addVector(
    content: string,
    metadata: Partial<VectorMetadata>
  ): Promise<string> {
    const id = this.generateId();
    const embedding = await this.generateEmbedding(content);

    const vector: EmbeddingVector = {
      id,
      content: content.substring(0, VECTOR_STORE_CONFIG.contentMaxLength),
      embedding,
      metadata: {
        timestamp: Date.now(),
        contentType: 'document',
        quality: 'medium',
        ...metadata
      } as VectorMetadata
    };

    this.vectors.set(id, vector);
    this.lastUpdated = Date.now();

    // Cleanup if needed
    if (this.vectors.size > VECTOR_STORE_CONFIG.cleanupThreshold) {
      await this.cleanup();
    }

    return id;
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const {
      limit = 5,
      minSimilarity = 0.3,
      contentTypes = ['web', 'lesson', 'exercise', 'document'],
      qualityFilter = ['high', 'medium', 'low'],
      tags = []
    } = options;

    const queryEmbedding = await this.generateEmbedding(query);
    const results: SearchResult[] = [];

    for (const vector of this.vectors.values()) {
      // Apply filters
      if (!contentTypes.includes(vector.metadata.contentType) ||
        !qualityFilter.includes(vector.metadata.quality)) {
        continue;
      }

      if (tags.length > 0 && !this.hasMatchingTags(vector.metadata.tags || [], tags)) {
        continue;
      }

      const similarity = this.cosineSimilarity(queryEmbedding, vector.embedding);

      if (similarity >= minSimilarity) {
        const relevanceScore = this.calculateRelevanceScore(vector, similarity);
        results.push({ vector, similarity, relevanceScore });
      }
    }

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  async findSimilar(
    content: string,
    options: SearchOptions & { excludeId?: string } = {}
  ): Promise<SearchResult[]> {
    const { excludeId, ...searchOptions } = options;
    const contentEmbedding = await this.generateEmbedding(content);
    const results: SearchResult[] = [];

    for (const vector of this.vectors.values()) {
      if (excludeId && vector.id === excludeId) continue;

      // Apply filters
      if (searchOptions.contentTypes &&
        !searchOptions.contentTypes.includes(vector.metadata.contentType)) {
        continue;
      }

      const similarity = this.cosineSimilarity(contentEmbedding, vector.embedding);

      if (similarity >= (searchOptions.minSimilarity || 0.4)) {
        results.push({
          vector,
          similarity,
          relevanceScore: similarity
        });
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, searchOptions.limit || 3);
  }

  getStats(): VectorStoreStats {
    const contentTypes: Record<ContentType, number> = {
      web: 0, lesson: 0, exercise: 0, document: 0
    };
    const qualityDistribution: Record<QualityLevel, number> = {
      high: 0, medium: 0, low: 0
    };

    let totalContentLength = 0;

    for (const vector of this.vectors.values()) {
      contentTypes[vector.metadata.contentType]++;
      qualityDistribution[vector.metadata.quality]++;
      totalContentLength += vector.content.length;
    }

    return {
      totalVectors: this.vectors.size,
      contentTypes,
      qualityDistribution,
      lastUpdated: new Date(this.lastUpdated).toISOString(),
      averageContentLength: this.vectors.size > 0 ?
        Math.round(totalContentLength / this.vectors.size) : 0
    };
  }

  removeVector(id: string): boolean {
    return this.vectors.delete(id);
  }

  clear(): void {
    this.vectors.clear();
    this.lastUpdated = Date.now();
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const cleanText = this.cleanText(text);
      const response = await ai.embed({
        embedder: 'googleai/text-embedding-004',
        content: cleanText,
      });

      // Handle different response formats from Google AI
      if (Array.isArray(response)) {
        // If response is array of embedding objects
        if (response.length > 0 && typeof response[0] === 'object' && 'embedding' in response[0]) {
          const embedding = (response[0] as any).embedding;
          if (Array.isArray(embedding) && embedding.every(n => typeof n === 'number')) {
            return embedding;
          }
        }
        // If response is already array of numbers
        if (response.every(n => typeof n === 'number')) {
          return response as number[];
        }
      }

      // Handle single embedding object
      if (typeof response === 'object' && response !== null && 'embedding' in response) {
        const embedding = (response as any).embedding;
        if (Array.isArray(embedding) && embedding.every(n => typeof n === 'number')) {
          return embedding;
        }
      }

      throw new Error('Invalid embedding response format');
    } catch (error) {
      console.warn('Embedding generation failed, using fallback:', error);
      return this.createFallbackEmbedding(text);
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?-]/g, '')
      .trim()
      .substring(0, 8000);
  }

  private createFallbackEmbedding(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const vector = new Array(VECTOR_STORE_CONFIG.embeddingDimensions).fill(0);

    words.forEach((word, index) => {
      const hash = this.simpleHash(word);
      const position = Math.abs(hash) % vector.length;
      vector[position] += 1 / (index + 1);
    });

    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  private calculateRelevanceScore(vector: EmbeddingVector, similarity: number): number {
    const recencyBoost = Math.max(0, 1 -
      (Date.now() - vector.metadata.timestamp) /
      (VECTOR_STORE_CONFIG.recencyDecayDays * 24 * 60 * 60 * 1000)
    );

    const qualityBoost = {
      high: 0.2,
      medium: 0.1,
      low: 0
    }[vector.metadata.quality];

    return similarity + (recencyBoost * 0.1) + qualityBoost;
  }

  private hasMatchingTags(vectorTags: string[], searchTags: string[]): boolean {
    return searchTags.some(tag =>
      vectorTags.some(vTag => vTag.toLowerCase().includes(tag.toLowerCase()))
    );
  }

  private generateId(): string {
    return `vec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private async cleanup(): Promise<void> {
    const vectors = Array.from(this.vectors.values());

    // Sort by timestamp (newest first) and keep only the most recent ones
    vectors.sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);

    this.vectors.clear();
    vectors.slice(0, VECTOR_STORE_CONFIG.maxVectors).forEach(vector => {
      this.vectors.set(vector.id, vector);
    });

    this.lastUpdated = Date.now();
  }
}

// Singleton instance
export const vectorStore = new VectorStore();

// Utility functions
export const VectorUtils = {
  assessContentQuality: (content: string): QualityLevel => {
    if (content.length > 500) return 'high';
    if (content.length > 200) return 'medium';
    return 'low';
  },

  extractTags: (content: string, title?: string): string[] => {
    const text = `${title || ''} ${content}`.toLowerCase();
    const tags: string[] = [];

    // Programming languages
    const languages = ['javascript', 'python', 'java', 'typescript', 'react', 'node', 'css', 'html'];
    languages.forEach(lang => {
      if (text.includes(lang)) tags.push(lang);
    });

    // Topics
    const topics = ['tutorial', 'guide', 'documentation', 'api', 'framework', 'library'];
    topics.forEach(topic => {
      if (text.includes(topic)) tags.push(topic);
    });

    return [...new Set(tags)];
  },

  formatSearchResults: (results: SearchResult[]): string => {
    if (results.length === 0) {
      return 'No results found.';
    }

    let output = `Found ${results.length} relevant results:\n\n`;

    results.forEach((result, index) => {
      const { vector, similarity } = result;
      const similarityPercent = Math.round(similarity * 100);
      const qualityIcon = vector.metadata.quality === 'high' ? '🟢' :
        vector.metadata.quality === 'medium' ? '🟡' : '🟠';
      const typeIcon = {
        web: '🌐',
        lesson: '📚',
        exercise: '💪',
        document: '📄'
      }[vector.metadata.contentType];

      output += `**${index + 1}. ${vector.metadata.title || 'Untitled'}**\n`;
      output += `${qualityIcon} ${typeIcon} Similarity: ${similarityPercent}%\n`;

      if (vector.metadata.url) {
        output += `🔗 ${vector.metadata.url}\n`;
      }

      output += `📝 ${vector.content.substring(0, 150)}${vector.content.length > 150 ? '...' : ''}\n\n`;
    });

    return output;
  }
};