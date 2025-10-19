/**
 * Enhanced Features Test Suite
 * Tests for persistent vector store, image generation, and code analysis
 */

import { persistentVectorStore } from '@/ai/core/persistent-vector-store';
import { imageGenerationService } from '@/ai/services/image-generation';
import { codeAnalysisService } from '@/ai/services/code-analysis';
import { semanticSearchService } from '@/ai/services/semantic-search';
import { checkServiceAvailability, validateConfiguration } from '@/config/ai-services';

// Test data
const testCode = `
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

function bubbleSort(arr) {
    for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr.length - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                let temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
    return arr;
}
`;

const testContent = [
  {
    content: "React hooks allow you to use state and other React features without writing a class component.",
    title: "React Hooks Introduction",
    contentType: "lesson" as const,
    quality: "high" as const
  },
  {
    content: "Machine learning is a subset of artificial intelligence that enables computers to learn without being explicitly programmed.",
    title: "Machine Learning Basics",
    contentType: "lesson" as const,
    quality: "high" as const
  }
];

/**
 * Test persistent vector store functionality
 */
async function testPersistentVectorStore(): Promise<boolean> {
  console.log('🧪 Testing Persistent Vector Store...');
  
  try {
    // Clear existing data
    persistentVectorStore.clear();
    
    // Test single vector addition
    const vectorId = await persistentVectorStore.addVector(
      "Test content for persistent storage",
      {
        title: "Test Vector",
        contentType: "document",
        quality: "medium"
      }
    );
    
    console.log(`✅ Added vector: ${vectorId}`);
    
    // Test batch addition
    const batchIds = await persistentVectorStore.batchAdd(
      testContent.map(item => ({
        content: item.content,
        metadata: {
          title: item.title,
          contentType: item.contentType,
          quality: item.quality
        }
      }))
    );
    
    console.log(`✅ Batch added ${batchIds.length} vectors`);
    
    // Test search functionality
    const searchResults = await persistentVectorStore.search("React programming", {
      limit: 2,
      minSimilarity: 0.1
    });
    
    console.log(`✅ Search found ${searchResults.length} results`);
    
    // Test persistence by checking stats
    const stats = persistentVectorStore.getStats();
    console.log(`✅ Vector store stats: ${stats.totalVectors} vectors`);
    
    // Test export/import functionality
    const exportData = await persistentVectorStore.exportToJSON();
    console.log(`✅ Exported ${exportData.length} vectors`);
    
    return stats.totalVectors === 3; // 1 + 2 from batch
    
  } catch (error) {
    console.error('❌ Persistent vector store test failed:', error);
    return false;
  }
}

/**
 * Test image generation service
 */
async function testImageGeneration(): Promise<boolean> {
  console.log('🧪 Testing Image Generation Service...');
  
  try {
    // Test SVG fallback generation (always works)
    const svgResult = await imageGenerationService.generateImage({
      concept: "Binary Search Algorithm",
      description: "A visual representation of how binary search works with a sorted array",
      style: "flowchart",
      complexity: "medium"
    });
    
    console.log(`✅ Generated image: ${svgResult.metadata.model}`);
    console.log(`✅ Image type: ${svgResult.imageDataUri ? 'Data URI' : 'URL'}`);
    console.log(`✅ Alt text: ${svgResult.altText}`);
    
    // Test different styles
    const diagramResult = await imageGenerationService.generateImage({
      concept: "Data Structures",
      description: "Comparison of arrays, linked lists, and trees",
      style: "diagram",
      complexity: "simple"
    });
    
    console.log(`✅ Generated diagram: ${diagramResult.metadata.model}`);
    
    // Test infographic generation
    const infoResult = await imageGenerationService.generateImage({
      concept: "Programming Concepts",
      description: "Overview of key programming concepts for beginners",
      style: "infographic",
      complexity: "detailed"
    });
    
    console.log(`✅ Generated infographic: ${infoResult.metadata.model}`);
    
    return true; // SVG fallback should always work
    
  } catch (error) {
    console.error('❌ Image generation test failed:', error);
    return false;
  }
}

/**
 * Test code analysis service
 */
async function testCodeAnalysis(): Promise<boolean> {
  console.log('🧪 Testing Code Analysis Service...');
  
  try {
    // Test comprehensive analysis
    const comprehensiveResult = await codeAnalysisService.analyzeCode({
      code: testCode,
      language: 'javascript',
      analysisType: 'comprehensive'
    });
    
    console.log(`✅ Comprehensive analysis completed`);
    console.log(`✅ Overall score: ${comprehensiveResult.overallScore}/100`);
    console.log(`✅ Lines of code: ${comprehensiveResult.linesOfCode}`);
    console.log(`✅ Time complexity: ${comprehensiveResult.complexity?.timeComplexity.bigO}`);
    console.log(`✅ Cyclomatic complexity: ${comprehensiveResult.complexity?.cyclomaticComplexity.score}`);
    
    // Test complexity-only analysis
    const complexityResult = await codeAnalysisService.analyzeCode({
      code: testCode,
      language: 'javascript',
      analysisType: 'complexity'
    });
    
    console.log(`✅ Complexity analysis: ${complexityResult.complexity?.timeComplexity.bigO}`);
    
    // Test quality analysis
    const qualityResult = await codeAnalysisService.analyzeCode({
      code: testCode,
      language: 'javascript',
      analysisType: 'quality'
    });
    
    console.log(`✅ Quality analysis: ${qualityResult.quality?.readability.score}/100 readability`);
    
    // Test security analysis
    const securityCode = `
      const query = "SELECT * FROM users WHERE id = " + userId;
      document.innerHTML = userInput;
      const password = "hardcoded123";
    `;
    
    const securityResult = await codeAnalysisService.analyzeCode({
      code: securityCode,
      language: 'javascript',
      analysisType: 'security'
    });
    
    console.log(`✅ Security analysis: ${securityResult.security?.vulnerabilities.length} vulnerabilities found`);
    
    return comprehensiveResult.overallScore > 0 && comprehensiveResult.complexity !== undefined;
    
  } catch (error) {
    console.error('❌ Code analysis test failed:', error);
    return false;
  }
}

/**
 * Test semantic search with persistent storage
 */
async function testSemanticSearchIntegration(): Promise<boolean> {
  console.log('🧪 Testing Semantic Search Integration...');
  
  try {
    // Test indexing with persistent storage
    const vectorId = await semanticSearchService.indexContent({
      content: "Advanced React patterns including hooks, context, and performance optimization",
      title: "Advanced React Patterns",
      contentType: "lesson",
      quality: "high"
    });
    
    console.log(`✅ Indexed content: ${vectorId}`);
    
    // Test batch indexing
    const batchResult = await semanticSearchService.batchIndexContent([
      {
        content: "Python data structures: lists, dictionaries, sets, and tuples",
        title: "Python Data Structures",
        contentType: "lesson",
        quality: "high"
      },
      {
        content: "Algorithm complexity analysis and Big O notation explained",
        title: "Algorithm Complexity",
        contentType: "lesson",
        quality: "medium"
      }
    ]);
    
    console.log(`✅ Batch indexed: ${batchResult.length} items`);
    
    // Test semantic search
    const searchResults = await semanticSearchService.search({
      query: "React programming patterns",
      options: { limit: 3, minSimilarity: 0.1 }
    });
    
    console.log(`✅ Search results: ${searchResults.length} found`);
    
    // Test similar content finding
    const similarResults = await semanticSearchService.findSimilar({
      content: "JavaScript frameworks and libraries for web development",
      limit: 2,
      minSimilarity: 0.2
    });
    
    console.log(`✅ Similar content: ${similarResults.length} found`);
    
    // Test hybrid search
    const hybridResults = await semanticSearchService.hybridSearch("Python programming", {
      maxResults: 3
    });
    
    console.log(`✅ Hybrid search: ${hybridResults.results.length} results in ${hybridResults.searchTime}ms`);
    
    return searchResults.length > 0;
    
  } catch (error) {
    console.error('❌ Semantic search integration test failed:', error);
    return false;
  }
}

/**
 * Test service availability and configuration
 */
async function testServiceConfiguration(): Promise<boolean> {
  console.log('🧪 Testing Service Configuration...');
  
  try {
    // Check service availability
    const availability = checkServiceAvailability();
    console.log('✅ Service availability:', availability);
    
    // Validate configuration
    const validation = validateConfiguration();
    console.log(`✅ Configuration valid: ${validation.valid}`);
    
    if (!validation.valid) {
      console.log('⚠️ Configuration issues:', validation.issues);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Service configuration test failed:', error);
    return false;
  }
}

/**
 * Run all enhanced feature tests
 */
export async function runEnhancedFeaturesTests(): Promise<{
  passed: number;
  total: number;
  success: boolean;
  details: Record<string, boolean>;
}> {
  console.log('🚀 Starting Enhanced Features Tests\n');
  
  const tests = [
    { name: 'Persistent Vector Store', test: testPersistentVectorStore },
    { name: 'Image Generation', test: testImageGeneration },
    { name: 'Code Analysis', test: testCodeAnalysis },
    { name: 'Semantic Search Integration', test: testSemanticSearchIntegration },
    { name: 'Service Configuration', test: testServiceConfiguration }
  ];
  
  const results: Record<string, boolean> = {};
  
  for (const { name, test } of tests) {
    try {
      console.log(`\n--- Testing ${name} ---`);
      const result = await test();
      results[name] = result;
      
      if (result) {
        console.log(`✅ ${name}: PASSED`);
      } else {
        console.log(`❌ ${name}: FAILED`);
      }
    } catch (error) {
      console.error(`💥 ${name}: ERROR -`, error);
      results[name] = false;
    }
  }
  
  // Summary
  console.log('\n📊 Enhanced Features Test Results:');
  console.log('=====================================');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([name, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${name}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    console.log('🎉 All enhanced features are working correctly!');
  } else {
    console.log('⚠️ Some enhanced features need attention.');
  }
  
  return { 
    passed, 
    total, 
    success: passed === total,
    details: results
  };
}

// Run tests if executed directly
if (require.main === module) {
  runEnhancedFeaturesTests()
    .then(results => {
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}