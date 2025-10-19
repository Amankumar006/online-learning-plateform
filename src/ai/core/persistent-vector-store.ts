/**
 * Persistent Vector Store with Database Integration
 * Replaces in-memory storage with persistent database storage
 */

import { ai } from '@/ai/genkit';
import {
    EmbeddingVector,
    VectorMetadata,
    SearchOptions,
    SearchResult,
    VectorStoreStats,
    ContentType,
    QualityLevel
} from './vector-store';

// Database interface for vector storage
interface VectorRecord {
    id: string;
    content: string;
    embedding: number[];
    metadata: VectorMetadata;
    created_at: Date;
    updated_at: Date;
}

// Simple file-based storage for development (can be replaced with actual DB)
class FileVectorStore {
    private storageFile: string;
    private cache: Map<string, EmbeddingVector> = new Map();
    private isLoaded = false;

    constructor(storageFile = 'vector-store.json') {
        this.storageFile = storageFile;
    }

    private async ensureLoaded(): Promise<void> {
        if (this.isLoaded) return;

        try {
            // In a real implementation, this would connect to PostgreSQL/MongoDB
            const fs = await import('fs/promises');
            const path = await import('path');

            const dataDir = path.join(process.cwd(), 'data');
            const filePath = path.join(dataDir, this.storageFile);

            try {
                await fs.access(dataDir);
            } catch {
                await fs.mkdir(dataDir, { recursive: true });
            }

            try {
                const data = await fs.readFile(filePath, 'utf-8');
                const vectors: VectorRecord[] = JSON.parse(data);

                this.cache.clear();
                vectors.forEach(record => {
                    this.cache.set(record.id, {
                        id: record.id,
                        content: record.content,
                        embedding: record.embedding,
                        metadata: record.metadata
                    });
                });
            } catch (error) {
                // File doesn't exist or is corrupted, start fresh
                console.log('Starting with empty vector store');
            }

            this.isLoaded = true;
        } catch (error) {
            console.error('Failed to load vector store:', error);
            this.isLoaded = true; // Continue with empty cache
        }
    }

    private async persist(): Promise<void> {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');

            const dataDir = path.join(process.cwd(), 'data');
            const filePath = path.join(dataDir, this.storageFile);

            const records: VectorRecord[] = Array.from(this.cache.values()).map(vector => ({
                id: vector.id,
                content: vector.content,
                embedding: vector.embedding,
                metadata: vector.metadata,
                created_at: new Date(vector.metadata.timestamp),
                updated_at: new Date()
            }));

            await fs.writeFile(filePath, JSON.stringify(records, null, 2));
        } catch (error) {
            console.error('Failed to persist vector store:', error);
        }
    }

    async addVector(content: string, metadata: Partial<VectorMetadata>): Promise<string> {
        await this.ensureLoaded();

        const id = this.generateId();
        const embedding = await this.generateEmbedding(content);

        const vector: EmbeddingVector = {
            id,
            content: content.substring(0, 2000),
            embedding,
            metadata: {
                timestamp: Date.now(),
                contentType: 'document',
                quality: 'medium',
                ...metadata
            } as VectorMetadata
        };

        this.cache.set(id, vector);

        // Persist asynchronously
        this.persist().catch(console.error);

        return id;
    }

    async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
        await this.ensureLoaded();

        const {
            limit = 5,
            minSimilarity = 0.3,
            contentTypes = ['web', 'lesson', 'exercise', 'document'],
            qualityFilter = ['high', 'medium', 'low'],
            tags = []
        } = options;

        const queryEmbedding = await this.generateEmbedding(query);
        const results: SearchResult[] = [];

        for (const vector of this.cache.values()) {
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
        await this.ensureLoaded();

        const { excludeId, ...searchOptions } = options;
        const contentEmbedding = await this.generateEmbedding(content);
        const results: SearchResult[] = [];

        for (const vector of this.cache.values()) {
            if (excludeId && vector.id === excludeId) continue;

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
        let lastUpdated = 0;

        for (const vector of this.cache.values()) {
            contentTypes[vector.metadata.contentType]++;
            qualityDistribution[vector.metadata.quality]++;
            totalContentLength += vector.content.length;
            lastUpdated = Math.max(lastUpdated, vector.metadata.timestamp);
        }

        return {
            totalVectors: this.cache.size,
            contentTypes,
            qualityDistribution,
            lastUpdated: new Date(lastUpdated).toISOString(),
            averageContentLength: this.cache.size > 0 ?
                Math.round(totalContentLength / this.cache.size) : 0
        };
    }

    removeVector(id: string): boolean {
        const deleted = this.cache.delete(id);
        if (deleted) {
            this.persist().catch(console.error);
        }
        return deleted;
    }

    clear(): void {
        this.cache.clear();
        this.persist().catch(console.error);
    }

    // Batch operations for better performance
    async batchAdd(vectors: Array<{ content: string; metadata: Partial<VectorMetadata> }>): Promise<string[]> {
        await this.ensureLoaded();

        const ids: string[] = [];
        const embeddings = await Promise.all(
            vectors.map(v => this.generateEmbedding(v.content))
        );

        vectors.forEach((vectorData, index) => {
            const id = this.generateId();
            const vector: EmbeddingVector = {
                id,
                content: vectorData.content.substring(0, 2000),
                embedding: embeddings[index],
                metadata: {
                    timestamp: Date.now(),
                    contentType: 'document',
                    quality: 'medium',
                    ...vectorData.metadata
                } as VectorMetadata
            };

            this.cache.set(id, vector);
            ids.push(id);
        });

        // Persist once after all additions
        await this.persist();
        return ids;
    }

    // Database migration utilities
    async exportToJSON(): Promise<VectorRecord[]> {
        await this.ensureLoaded();
        return Array.from(this.cache.values()).map(vector => ({
            id: vector.id,
            content: vector.content,
            embedding: vector.embedding,
            metadata: vector.metadata,
            created_at: new Date(vector.metadata.timestamp),
            updated_at: new Date()
        }));
    }

    async importFromJSON(records: VectorRecord[]): Promise<void> {
        await this.ensureLoaded();

        this.cache.clear();
        records.forEach(record => {
            this.cache.set(record.id, {
                id: record.id,
                content: record.content,
                embedding: record.embedding,
                metadata: record.metadata
            });
        });

        await this.persist();
    }

    // Helper methods (same as original implementation)
    private async generateEmbedding(text: string): Promise<number[]> {
        try {
            const cleanText = this.cleanText(text);
            const response = await ai.embed({
                embedder: 'googleai/text-embedding-004',
                content: cleanText,
            });

            if (Array.isArray(response)) {
                if (response.length > 0 && typeof response[0] === 'object' && 'embedding' in response[0]) {
                    const embedding = (response[0] as any).embedding;
                    if (Array.isArray(embedding) && embedding.every(n => typeof n === 'number')) {
                        return embedding;
                    }
                }
                if (response.every(n => typeof n === 'number')) {
                    return response as number[];
                }
            }

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
        const vector = new Array(384).fill(0);

        words.forEach((word, index) => {
            const hash = this.simpleHash(word);
            const position = Math.abs(hash) % vector.length;
            vector[position] += 1 / (index + 1);
        });

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
            (Date.now() - vector.metadata.timestamp) / (30 * 24 * 60 * 60 * 1000)
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
}

// Export the persistent vector store
export const persistentVectorStore = new FileVectorStore();

// Database schema for PostgreSQL (for future implementation)
export const VECTOR_STORE_SCHEMA = `
CREATE TABLE IF NOT EXISTS vectors (
  id VARCHAR(255) PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(384) NOT NULL,
  title VARCHAR(500),
  url TEXT,
  domain VARCHAR(255),
  content_type VARCHAR(50) NOT NULL,
  quality VARCHAR(20) NOT NULL,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vectors_embedding ON vectors USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_vectors_content_type ON vectors (content_type);
CREATE INDEX IF NOT EXISTS idx_vectors_quality ON vectors (quality);
CREATE INDEX IF NOT EXISTS idx_vectors_created_at ON vectors (created_at);
`;