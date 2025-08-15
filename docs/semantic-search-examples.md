# Semantic Search Examples

This document provides practical examples of using the semantic search functionality in BuddyAI.

## 🚀 Quick Start Examples

### 1. Basic Semantic Search

```typescript
// Search for programming concepts
const results = await semanticSearch("JavaScript async programming", {
  limit: 5,
  minSimilarity: 0.3,
  contentTypes: ['web', 'lesson']
});

// Results will include:
// - Promise-based tutorials
// - Async/await explanations  
// - Callback pattern discussions
// - Related Node.js content
```

### 2. Content Indexing

```typescript
// Index a lesson for future discovery
await indexContent({
  content: `
    React Hooks are functions that let you use state and other React features 
    without writing a class. They were introduced in React 16.8 and provide 
    a more direct API to the React concepts you already know.
  `,
  title: "Introduction to React Hooks",
  contentType: "lesson",
  quality: "high"
});

// Index web search results automatically
const webResults = await searchTheWeb("React hooks tutorial");
// Web results are automatically indexed for semantic search
```

### 3. Finding Similar Content

```typescript
// Find content similar to current lesson
const currentLesson = "Understanding closures in JavaScript...";
const similar = await findSimilarContent(currentLesson, {
  limit: 3,
  minSimilarity: 0.4
});

// Use for "Related Topics" or "You might also like" sections
```

## 🎯 Real-World Use Cases

### Educational Content Discovery

```typescript
// Student asks: "I'm struggling with calculus derivatives"
const semanticResults = await semanticSearch("calculus derivatives difficulty", {
  contentTypes: ['lesson', 'exercise'],
  minSimilarity: 0.4
});

// Returns:
// - Derivative rules explanations
// - Practice problems with solutions
// - Step-by-step tutorials
// - Common mistakes guides
```

### Research Enhancement

```typescript
// Researcher exploring: "machine learning applications in healthcare"
const results = await semanticSearch("machine learning healthcare applications", {
  contentTypes: ['web', 'document'],
  limit: 10,
  minSimilarity: 0.3
});

// Discovers:
// - Medical imaging AI papers
// - Drug discovery algorithms
// - Patient diagnosis systems
// - Healthcare data analysis tools
```

### Content Recommendation System

```typescript
// After user reads an article about "Python data structures"
const currentContent = "Python lists, dictionaries, and sets...";
const recommendations = await findSimilarContent(currentContent, {
  limit: 5,
  minSimilarity: 0.5
});

// Suggests:
// - Advanced Python collections
// - Algorithm implementations
// - Data structure performance comparisons
// - Related programming concepts
```

## 🔧 Advanced Usage Patterns

### Hybrid Search Strategy

```typescript
// Combine fresh web search with semantic discovery
async function comprehensiveSearch(query: string) {
  // 1. Get fresh web results
  const webResults = await searchTheWeb(query);
  
  // 2. Find related content from knowledge base
  const semanticResults = await semanticSearch(query, {
    limit: 3,
    minSimilarity: 0.4
  });
  
  // 3. Combine and present both
  return {
    fresh: webResults,
    related: semanticResults,
    combined: true
  };
}
```

### Content Quality Assessment

```typescript
// Index content with quality assessment
const assessAndIndex = async (content: string, source: string) => {
  const quality = content.length > 500 ? 'high' : 
                 content.length > 200 ? 'medium' : 'low';
  
  await indexContent({
    content,
    title: extractTitle(content),
    url: source,
    contentType: 'web',
    quality
  });
};
```

### Batch Content Processing

```typescript
// Process multiple lessons at once
const lessons = [
  { title: "Intro to Python", content: "Python is a programming language..." },
  { title: "Python Variables", content: "Variables in Python are created..." },
  { title: "Python Functions", content: "Functions are reusable blocks..." }
];

await contentIndexingFlow({
  contents: lessons.map(lesson => ({
    text: lesson.content,
    title: lesson.title,
    contentType: 'lesson' as const,
    quality: 'high' as const
  })),
  batchSize: 5
});
```

## 📊 Monitoring and Analytics

### Vector Store Statistics

```typescript
// Get current index status
const stats = getVectorStoreStats();
console.log(`
📊 Vector Store Status:
- Total Content: ${stats.totalVectors} pieces
- Content Types: ${Object.entries(stats.contentTypes).map(([type, count]) => `${type}(${count})`).join(', ')}
- Quality Distribution: ${Object.entries(stats.qualityDistribution).map(([quality, count]) => `${quality}(${count})`).join(', ')}
- Last Updated: ${new Date(stats.lastUpdated).toLocaleString()}
`);
```

### Search Performance Monitoring

```typescript
// Track search performance
const performanceTracker = async (query: string) => {
  const startTime = Date.now();
  
  const results = await semanticSearch(query);
  
  const searchTime = Date.now() - startTime;
  console.log(`🔍 Search "${query}" completed in ${searchTime}ms with ${results.length} results`);
  
  return { results, searchTime };
};
```

## 🎨 User Interface Integration

### Search Results Display

```typescript
// Format semantic search results for UI
const formatSemanticResults = (results: SemanticSearchResult[]) => {
  return results.map(result => ({
    title: result.metadata.title || 'Untitled Content',
    preview: result.content.substring(0, 150) + '...',
    similarity: Math.round(result.similarity * 100),
    quality: result.metadata.quality,
    type: result.metadata.contentType,
    url: result.metadata.url,
    icon: getContentTypeIcon(result.metadata.contentType)
  }));
};

const getContentTypeIcon = (type: string) => {
  const icons = {
    web: '🌐',
    lesson: '📚', 
    exercise: '💪',
    document: '📄'
  };
  return icons[type] || '📄';
};
```

### Related Content Widget

```tsx
// React component for related content
const RelatedContent = ({ currentContent }: { currentContent: string }) => {
  const [similar, setSimilar] = useState([]);
  
  useEffect(() => {
    findSimilarContent(currentContent, { limit: 3 })
      .then(setSimilar)
      .catch(console.error);
  }, [currentContent]);
  
  return (
    <div className="related-content">
      <h3>🔗 Related Topics</h3>
      {similar.map((item, index) => (
        <div key={index} className="related-item">
          <h4>{item.metadata.title}</h4>
          <p>{item.content.substring(0, 100)}...</p>
          <span className="similarity">
            {Math.round(item.similarity * 100)}% similar
          </span>
        </div>
      ))}
    </div>
  );
};
```

## 🔍 Debugging and Troubleshooting

### Common Issues and Solutions

```typescript
// Issue: Low similarity scores
// Solution: Lower the threshold or improve content quality
const results = await semanticSearch("query", {
  minSimilarity: 0.2  // Lower threshold
});

// Issue: No results found
// Solution: Check if content is indexed
const stats = getVectorStoreStats();
if (stats.totalVectors === 0) {
  console.log("No content indexed yet. Try indexing some content first.");
}

// Issue: Slow search performance
// Solution: Limit results and optimize queries
const results = await semanticSearch("query", {
  limit: 5,  // Reduce result count
  contentTypes: ['web']  // Filter by type
});
```

### Debug Logging

```typescript
// Enable detailed semantic search logging
const debugSemanticSearch = async (query: string) => {
  console.log('🔍 Starting semantic search for:', query);
  
  const startTime = Date.now();
  const results = await semanticSearch(query);
  const searchTime = Date.now() - startTime;
  
  console.log('📊 Search Results:');
  results.forEach((result, index) => {
    console.log(`  ${index + 1}. ${result.metadata.title} (${Math.round(result.similarity * 100)}% similar)`);
  });
  
  console.log(`⚡ Completed in ${searchTime}ms`);
  console.log('📈 Vector Store:', getVectorStoreStats());
  
  return results;
};
```

## 🎯 Best Practices

### Content Indexing Strategy

1. **Quality First**: Index high-quality, comprehensive content
2. **Diverse Sources**: Include various content types and domains
3. **Regular Updates**: Refresh content periodically
4. **Batch Processing**: Use batch indexing for multiple items

### Search Optimization

1. **Appropriate Thresholds**: Use 0.3-0.5 for general search, 0.6+ for precise matching
2. **Content Type Filtering**: Specify relevant content types
3. **Result Limiting**: Use reasonable limits (5-10 results)
4. **Fallback Strategies**: Handle cases with no results gracefully

### Performance Considerations

1. **Memory Management**: Monitor vector store size
2. **Embedding Caching**: Reuse embeddings when possible
3. **Async Processing**: Use non-blocking operations
4. **Error Handling**: Implement robust error recovery

This semantic search system provides powerful content discovery capabilities that enhance the user experience by finding relevant information based on meaning and context rather than just keyword matching.