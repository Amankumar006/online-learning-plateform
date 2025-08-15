/**
 * Quick validation script for the refactored semantic search system
 * This ensures all components work together correctly
 */

import { semanticSearchService } from '@/ai/services/semantic-search';
import { vectorStore } from '@/ai/core/vector-store';

/**
 * Quick validation of the refactored system
 */
export async function validateSemanticSearchSystem(): Promise<boolean> {
  try {
    console.log('🔍 Validating refactored semantic search system...');
    
    // Clear any existing data
    vectorStore.clear();
    
    // Test 1: Index some content
    console.log('📝 Testing content indexing...');
    const vectorId = await semanticSearchService.indexContent({
      content: "JavaScript is a programming language for web development",
      title: "JavaScript Basics",
      contentType: "lesson",
      quality: "high"
    });
    
    if (!vectorId) {
      console.error('❌ Content indexing failed');
      return false;
    }
    console.log('✅ Content indexed successfully');
    
    // Test 2: Search for content
    console.log('🔍 Testing semantic search...');
    const searchResults = await semanticSearchService.search({
      query: "web development programming",
      options: { limit: 1, minSimilarity: 0.1 }
    });
    
    if (searchResults.length === 0) {
      console.error('❌ Semantic search failed');
      return false;
    }
    console.log('✅ Semantic search working');
    
    // Test 3: Check stats
    console.log('📊 Testing stats...');
    const stats = semanticSearchService.getStats();
    
    if (stats.totalVectors !== 1) {
      console.error('❌ Stats not working correctly');
      return false;
    }
    console.log('✅ Stats working correctly');
    
    // Test 4: Similar content search
    console.log('🔗 Testing similar content search...');
    const similarResults = await semanticSearchService.findSimilar({
      content: "Programming languages for building websites",
      limit: 1,
      minSimilarity: 0.1
    });
    
    if (similarResults.length === 0) {
      console.error('❌ Similar content search failed');
      return false;
    }
    console.log('✅ Similar content search working');
    
    // Test 5: Hybrid search
    console.log('🔄 Testing hybrid search...');
    const hybridResults = await semanticSearchService.hybridSearch("JavaScript programming", {
      maxResults: 1
    });
    
    if (hybridResults.results.length === 0) {
      console.error('❌ Hybrid search failed');
      return false;
    }
    console.log('✅ Hybrid search working');
    
    console.log('🎉 All validation tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    return false;
  }
}

/**
 * Run validation if this file is executed directly
 */
if (require.main === module) {
  validateSemanticSearchSystem()
    .then(success => {
      if (success) {
        console.log('✅ Semantic search system validation completed successfully');
        process.exit(0);
      } else {
        console.log('❌ Semantic search system validation failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Validation crashed:', error);
      process.exit(1);
    });
}