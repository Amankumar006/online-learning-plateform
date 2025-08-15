/**
 * Clean test suite for semantic search functionality
 */

import { semanticSearchService } from '@/ai/services/semantic-search';
import { vectorStore, VectorUtils } from '@/ai/core/vector-store';

// Test data
const testContent = [
  {
    content: "JavaScript is a programming language that enables interactive web pages and is an essential part of web applications.",
    title: "Introduction to JavaScript",
    contentType: "lesson" as const,
    quality: "high" as const
  },
  {
    content: "React is a JavaScript library for building user interfaces. It lets you compose complex UIs from small components.",
    title: "React Basics",
    contentType: "lesson" as const,
    quality: "high" as const
  },
  {
    content: "Python is a high-level programming language known for its simplicity and readability.",
    title: "Python Overview",
    contentType: "lesson" as const,
    quality: "medium" as const
  }
];

/**
 * Test basic vector store operations
 */
async function testVectorStore(): Promise<boolean> {
  console.log('🧪 Testing vector store...');
  
  try {
    vectorStore.clear();
    
    const vectorId = await vectorStore.addVector("Test content for vector operations", {
      title: "Test Vector",
      contentType: "document",
      quality: "medium"
    });
    
    const stats = vectorStore.getStats();
    console.log(`✅ Added vector ${vectorId}, store has ${stats.totalVectors} vectors`);
    
    return stats.totalVectors === 1;
  } catch (error) {
    console.error('❌ Vector store test failed:', error);
    return false;
  }
}

/**
 * Test content quality assessment
 */
async function testQualityAssessment(): Promise<boolean> {
  console.log('🧪 Testing quality assessment...');
  
  try {
    const shortContent = "Short text";
    const mediumContent = "This is a medium length content that should be assessed as medium quality based on its length.";
    const longContent = "This is a very long content piece that contains substantial information and should be assessed as high quality. It has multiple sentences, covers various aspects of a topic, and provides comprehensive information.";
    
    const shortQuality = VectorUtils.assessContentQuality(shortContent);
    const mediumQuality = VectorUtils.assessContentQuality(mediumContent);
    const longQuality = VectorUtils.assessContentQuality(longContent);
    
    console.log(`✅ Quality assessment: short(${shortQuality}), medium(${mediumQuality}), long(${longQuality})`);
    
    return shortQuality === 'low' && mediumQuality === 'medium' && longQuality === 'high';
  } catch (error) {
    console.error('❌ Quality assessment failed:', error);
    return false;
  }
}

/**
 * Test content indexing
 */
async function testIndexing(): Promise<boolean> {
  console.log('🧪 Testing content indexing...');
  
  try {
    semanticSearchService.clear();
    
    const batchResult = await semanticSearchService.batchIndex({
      items: testContent.map(content => ({
        content: content.content,
        title: content.title,
        contentType: content.contentType,
        quality: content.quality
      }))
    });
    
    console.log(`✅ Indexed ${batchResult.indexed} items, failed ${batchResult.failed}`);
    
    const stats = semanticSearchService.getStats();
    console.log(`📊 Vector store: ${stats.totalVectors} items`);
    
    return batchResult.indexed === testContent.length && batchResult.failed === 0;
  } catch (error) {
    console.error('❌ Indexing test failed:', error);
    return false;
  }
}

/**
 * Test semantic search
 */
async function testSemanticSearch(): Promise<boolean> {
  console.log('🧪 Testing semantic search...');
  
  try {
    const jsResults = await semanticSearchService.search({
      query: "JavaScript web development",
      options: { limit: 3, minSimilarity: 0.1 }
    });
    
    console.log(`✅ Found ${jsResults.length} JavaScript results`);
    jsResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.vector.metadata.title} (${(result.similarity * 100).toFixed(1)}%)`);
    });
    
    return jsResults.length > 0;
  } catch (error) {
    console.error('❌ Semantic search failed:', error);
    return false;
  }
}

/**
 * Test similar content finding
 */
async function testSimilarContent(): Promise<boolean> {
  console.log('🧪 Testing similar content...');
  
  try {
    const referenceContent = "React components and JavaScript libraries for building user interfaces";
    
    const similarResults = await semanticSearchService.findSimilar({
      content: referenceContent,
      limit: 3,
      minSimilarity: 0.1
    });
    
    console.log(`✅ Found ${similarResults.length} similar results`);
    similarResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.vector.metadata.title} (${(result.similarity * 100).toFixed(1)}%)`);
    });
    
    return similarResults.length > 0;
  } catch (error) {
    console.error('❌ Similar content test failed:', error);
    return false;
  }
}

/**
 * Run all tests
 */
export async function runSemanticSearchTests(): Promise<{ passed: number; total: number; success: boolean }> {
  console.log('🚀 Starting Semantic Search Tests\n');
  
  const tests = [
    { name: 'Vector Store', test: testVectorStore },
    { name: 'Quality Assessment', test: testQualityAssessment },
    { name: 'Content Indexing', test: testIndexing },
    { name: 'Semantic Search', test: testSemanticSearch },
    { name: 'Similar Content', test: testSimilarContent }
  ];
  
  const results = [];
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      results.push({ name, passed: result });
    } catch (error) {
      console.error(`❌ Test "${name}" threw an error:`, error);
      results.push({ name, passed: false });
    }
  }
  
  // Summary
  console.log('\n📊 Test Results:');
  console.log('================');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️ Some tests failed.');
  }
  
  return { passed, total, success: passed === total };
}

// Run tests if executed directly
if (require.main === module) {
  runSemanticSearchTests()
    .then(results => {
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}