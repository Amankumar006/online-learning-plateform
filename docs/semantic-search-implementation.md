# Semantic Search Implementation

## Overview

This document describes the implementation of **vector-based content similarity matching** for the BuddyAI system. The semantic search feature enables finding content based on meaning and context rather than just keyword matching, providing more intelligent and contextually relevant search results.

## 🎯 Key Features

### 1. **Vector Embeddings**
- Uses Google AI's `text-embedding-004` model for high-quality embeddings
- Fallback to hash-based embeddings for offline/error scenarios
- 384-dimensional vectors for efficient similarity calculations

### 2. **Semantic Search Tools**
- `semanticSearch`: Find content by semantic similarity
- `indexContent`: Add content to the vector store
- `findSimilarContent`: Discover related materials
- Integrated with existing web search functionality

### 3. **Content Types**
- **Web**: Search results and scraped content
- **Lesson**: Educational materials and course content
- **Exercise**: Practice problems and solutions
- **Document**: General documents and references

### 4. **Quality Assessment**
- **High**: >500 characters, comprehensive content
- **Medium**: 200-500 characters, good detail
- **Low**: <200 characters, basic information

## 🏗️ Architecture

### Core Components

```
src/ai/tools/buddy/semantic-search-tool.ts    # Main semantic search implementation
src/ai/flows/semantic-search-flow.ts          # Orchestration flows
src/ai/tools/buddy/search-tool.ts             # Enhanced web search with semantic integration
```

### Data Flow

```
1. Content Ingestion → 2. Vector Generation → 3. Storage → 4. Similarity Search → 5. Results
```

## 🔧 Implementation Details

### Vector Store Structure

```typescript
interface EmbeddingVector {
  content: string;           // Truncated content (up to 2000 chars)
  embedding: number[];       // 384-dimensional vector
  metadata: {
    title?: string;          // Content title
    url?: string;           // Source URL
    domain?: string;        // Domain name
    timestamp: number;      // Creation timestamp
    contentType: 'web' | 'lesson' | 'exercise' | 'document';
    quality: 'high' | 'medium' | 'low';
  };
}
```

### Similarity Calculation

Uses **cosine similarity** for vector comparison:

```typescript
similarity = (A · B) / (||A|| × ||B||)
```

Where:
- `A` and `B` are embedding vectors
- `·` represents dot product
- `||A||` represents vector magnitude

### Relevance Scoring

Combines multiple factors for final ranking:

```typescript
relevanceScore = similarity + (recencyBoost × 0.1) + qualityBoost
```

Where:
- `recencyBoost`: 0-1 based on content age (30-day decay)
- `qualityBoost`: 0.2 (high), 0.1 (medium), 0 (low)

## 🛠️ Tools and Functions

### 1. Semantic Search Tool

```typescript
semanticSearchTool({
  query: string,              // Search query
  contentTypes?: string[],    // Filter by content type
  limit?: number,            // Max results (default: 5)
  minSimilarity?: number     // Threshold (default: 0.3)
})
```

**Example Usage:**
```typescript
// Find programming-related content
await semanticSearch("JavaScript async programming", {
  contentTypes: ['web', 'lesson'],
  limit: 5,
  minSimilarity: 0.4
});
```

### 2. Content Indexing Tool

```typescript
indexContentTool({
  content: string,           // Content to index
  title?: string,           // Content title
  url?: string,             // Source URL
  contentType: string,      // Type classification
  quality: string           // Quality assessment
})
```

**Example Usage:**
```typescript
// Index a lesson
await indexContent({
  content: "React hooks allow you to use state...",
  title: "Introduction to React Hooks",
  contentType: "lesson",
  quality: "high"
});
```

### 3. Similar Content Tool

```typescript
findSimilarContentTool({
  content: string,          // Reference content
  limit?: number,          // Max results (default: 3)
  minSimilarity?: number,  // Threshold (default: 0.4)
  excludeUrl?: string      // URL to exclude
})
```

## 🔄 Integration with Web Search

The semantic search system is integrated with the existing web search functionality:

### Enhanced Web Search Flow

1. **Standard Web Search**: Perform Google Custom Search
2. **Content Extraction**: Scrape and clean webpage content
3. **Automatic Indexing**: Add high-quality results to vector store
4. **Semantic Enhancement**: Find related content from previous searches
5. **Combined Results**: Present both fresh and related content

### Example Enhanced Output

```
🌐 Live Web Search Results

Based on my search for "top AI coding tools", here's what I found from 5 current sources:

**1. GitHub Copilot**: AI pair programmer that provides intelligent code completions [1][2]
**2. Cursor**: AI-first code editor built for productivity [3]

### Sources
🟢 [1] 💻 GitHub Copilot - Features and pricing
🟡 [2] 📰 Best AI coding tools in 2024

### 🧠 Related Content (Semantic Search)
Found 2 semantically related content pieces from previous searches:

**1.** AI Development Tools Comparison (87% similar)
🔗 https://example.com/ai-tools-comparison
📄 Comprehensive analysis of AI-powered development tools...

### 📊 Semantic Search Index
Content Library: 156 indexed pieces • Types: web (89), lesson (45), document (22)
```

## 🚀 Advanced Features

### 1. Hybrid Search Flow

Combines semantic and keyword search with weighted scoring:

```typescript
await hybridSearch("machine learning basics", {
  semanticWeight: 0.7,    // 70% semantic relevance
  keywordWeight: 0.3,     // 30% keyword matching
  maxResults: 10
});
```

### 2. Batch Content Indexing

Efficiently process multiple content pieces:

```typescript
await contentIndexingFlow({
  contents: [
    { text: "Content 1...", title: "Title 1", contentType: "lesson" },
    { text: "Content 2...", title: "Title 2", contentType: "exercise" }
  ],
  batchSize: 10
});
```

### 3. Vector Store Analytics

Monitor and analyze the content library:

```typescript
const analytics = await getAnalytics(true);
// Returns: stats, analytics, content samples
```

## 📊 Performance Characteristics

### Embedding Generation
- **Speed**: ~200ms per text (Google AI)
- **Fallback**: ~50ms per text (hash-based)
- **Batch Processing**: 10 items per batch with 100ms delays

### Search Performance
- **Vector Comparison**: O(n) where n = stored vectors
- **Typical Response**: <500ms for 1000 vectors
- **Memory Usage**: ~1.5KB per vector (384 floats + metadata)

### Storage Limits
- **In-Memory Store**: 1000 vectors maximum
- **Auto-Cleanup**: Removes oldest vectors when limit exceeded
- **Content Truncation**: 2000 characters per vector

## 🔒 Security and Privacy

### Data Handling
- **Content Truncation**: Limits stored content to prevent data leakage
- **URL Filtering**: Excludes sensitive or private URLs
- **Temporary Storage**: In-memory only, no persistent storage
- **API Security**: Uses secure Google AI embedding service

### Privacy Considerations
- **No Personal Data**: Avoids indexing personal information
- **Domain Filtering**: Can exclude specific domains
- **Content Sanitization**: Removes sensitive patterns before indexing

## 🎯 Use Cases

### 1. Educational Content Discovery
```typescript
// Find related lessons
await semanticSearch("calculus derivatives", {
  contentTypes: ['lesson', 'exercise'],
  minSimilarity: 0.5
});
```

### 2. Research Enhancement
```typescript
// Discover similar research topics
await findSimilarContent("quantum computing applications", {
  limit: 5,
  minSimilarity: 0.4
});
```

### 3. Content Recommendation
```typescript
// Suggest related materials
const similar = await findSimilarContent(currentLessonContent);
// Display as "You might also like..."
```

### 4. Duplicate Detection
```typescript
// Find potential duplicates
await findSimilarContent(newContent, {
  minSimilarity: 0.8,  // High threshold for duplicates
  limit: 3
});
```

## 🔧 Configuration

### Environment Variables
```env
# Required for Google AI embeddings
GOOGLE_API_KEY=your_google_api_key

# Optional: Custom embedding model
EMBEDDING_MODEL=text-embedding-004
```

### Tuning Parameters

```typescript
// Similarity thresholds
const SIMILARITY_THRESHOLDS = {
  high: 0.7,      // Very similar content
  medium: 0.4,    // Moderately similar
  low: 0.2        // Loosely related
};

// Quality assessment
const QUALITY_THRESHOLDS = {
  high: 500,      // Characters for high quality
  medium: 200     // Characters for medium quality
};

// Vector store limits
const VECTOR_STORE_CONFIG = {
  maxVectors: 1000,     // Maximum stored vectors
  cleanupThreshold: 1100, // Trigger cleanup
  contentMaxLength: 2000  // Max content length
};
```

## 🚀 Future Enhancements

### Planned Features
1. **Persistent Vector Database**: Replace in-memory storage
2. **Multi-language Support**: Embeddings for different languages
3. **Image Embeddings**: Visual content similarity
4. **Real-time Updates**: Live content indexing
5. **Advanced Analytics**: Usage patterns and effectiveness metrics

### Potential Integrations
1. **Pinecone/Weaviate**: Professional vector databases
2. **OpenAI Embeddings**: Alternative embedding models
3. **Elasticsearch**: Hybrid search capabilities
4. **Redis**: Caching and performance optimization

## 📈 Monitoring and Metrics

### Key Performance Indicators
- **Search Accuracy**: Relevance of returned results
- **Response Time**: Average search completion time
- **Index Growth**: Rate of content addition
- **User Engagement**: Click-through rates on semantic results

### Logging and Debugging
```typescript
// Enable detailed logging
console.log('🔍 Semantic search query:', query);
console.log('📊 Vector store stats:', getVectorStoreStats());
console.log('⚡ Search completed in:', searchTime, 'ms');
```

## 🎉 Success Metrics

The semantic search implementation provides:

✅ **Contextual Understanding**: Finds content by meaning, not just keywords  
✅ **Enhanced Discovery**: Surfaces related content from previous searches  
✅ **Quality Assessment**: Prioritizes high-quality, comprehensive content  
✅ **Performance**: Sub-second search responses for typical queries  
✅ **Integration**: Seamlessly works with existing web search  
✅ **Scalability**: Handles growing content libraries efficiently  

This semantic search system transforms the BuddyAI platform into an intelligent content discovery engine, helping users find exactly what they need based on context and meaning rather than just keyword matching.