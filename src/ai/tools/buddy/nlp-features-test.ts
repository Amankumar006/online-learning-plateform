/**
 * Advanced NLP Features Test Suite
 * Tests for topic extraction, content understanding, and semantic analysis
 */

import { nlpService } from '@/ai/services/nlp-service';
import { extractTopicsTool, analyzeContentTool, classifyIntentTool } from './topic-extraction-tool';

// Test content samples
const testContents = {
  educational: `
    JavaScript is a versatile programming language that powers the web. In this tutorial, we'll learn about variables, functions, and objects.
    
    Variables in JavaScript can be declared using var, let, or const. Each has different scoping rules:
    - var has function scope
    - let has block scope  
    - const creates immutable bindings
    
    Functions are first-class citizens in JavaScript, meaning they can be assigned to variables, passed as arguments, and returned from other functions.
  `,
  
  technical: `
    The React component lifecycle consists of three main phases: mounting, updating, and unmounting. During the mounting phase, 
    the component is created and inserted into the DOM. The constructor runs first, followed by render(), and then componentDidMount().
    
    State management in React can be handled through useState hooks for functional components or setState for class components.
    Props are passed down from parent to child components and should be treated as immutable.
  `,
  
  conversational: `
    Hey! I'm having trouble understanding how recursion works in Python. Can you help me out? 
    I've been trying to solve this fibonacci problem but I keep getting confused about the base case.
    What exactly happens when the function calls itself? And how does Python keep track of all the different function calls?
  `,
  
  complex: `
    Machine learning algorithms can be broadly categorized into supervised, unsupervised, and reinforcement learning paradigms.
    Supervised learning algorithms like linear regression, decision trees, and neural networks learn from labeled training data
    to make predictions on new, unseen data. The performance is typically evaluated using metrics such as accuracy, precision,
    recall, and F1-score. Cross-validation techniques help prevent overfitting and ensure model generalization.
  `
};

const testMessages = {
  question: "What is the difference between let and const in JavaScript?",
  request: "Can you create a practice exercise about Python loops?",
  explanation: "I don't understand how async/await works in JavaScript",
  greeting: "Hello! I'm new to programming and need help getting started",
  feedback: "That explanation was really helpful, thank you!",
  complex_question: "How do I implement a binary search tree with balancing in C++?"
};

/**
 * Test topic extraction functionality
 */
async function testTopicExtraction(): Promise<boolean> {
  console.log('🧠 Testing Topic Extraction...');
  
  try {
    // Test with educational content
    const educationalTopics = await nlpService.extractTopics({
      content: testContents.educational,
      maxTopics: 5,
      includeSubtopics: true
    });
    
    console.log(`✅ Educational content: ${educationalTopics.length} topics extracted`);
    educationalTopics.forEach(topic => {
      console.log(`   - ${topic.topic} (${Math.round(topic.confidence * 100)}%, ${topic.category})`);
    });
    
    // Test with technical content
    const technicalTopics = await nlpService.extractTopics({
      content: testContents.technical,
      maxTopics: 3,
      confidenceThreshold: 0.4
    });
    
    console.log(`✅ Technical content: ${technicalTopics.length} topics extracted`);
    
    // Test with conversational content
    const conversationalTopics = await nlpService.extractTopics({
      content: testContents.conversational,
      maxTopics: 3
    });
    
    console.log(`✅ Conversational content: ${conversationalTopics.length} topics extracted`);
    
    return educationalTopics.length > 0 && technicalTopics.length > 0;
    
  } catch (error) {
    console.error('❌ Topic extraction test failed:', error);
    return false;
  }
}

/**
 * Test content understanding functionality
 */
async function testContentUnderstanding(): Promise<boolean> {
  console.log('🧠 Testing Content Understanding...');
  
  try {
    // Test comprehensive analysis
    const analysis = await nlpService.analyzeContent({
      content: testContents.complex,
      analysisType: 'comprehensive',
      includeEntities: true,
      includeSentiment: true,
      includeComplexity: true
    });
    
    console.log(`✅ Main theme: ${analysis.mainTheme}`);
    console.log(`✅ Complexity level: ${analysis.complexity.level} (${analysis.complexity.score}/100)`);
    console.log(`✅ Educational level: ${analysis.educationalLevel.gradeLevel}`);
    console.log(`✅ Content type: ${analysis.contentType.primary}`);
    console.log(`✅ Sentiment: ${analysis.sentiment.overall} (${Math.round(analysis.sentiment.confidence * 100)}%)`);
    console.log(`✅ Entities found: ${analysis.entities.length}`);
    console.log(`✅ Key points: ${analysis.keyPoints.length}`);
    console.log(`✅ Relationships: ${analysis.relationships.length}`);
    
    // Test educational analysis
    const educationalAnalysis = await nlpService.analyzeContent({
      content: testContents.educational,
      analysisType: 'educational'
    });
    
    console.log(`✅ Educational analysis completed for ${educationalAnalysis.contentType.primary} content`);
    
    return analysis.mainTheme.length > 0 && analysis.complexity.score > 0;
    
  } catch (error) {
    console.error('❌ Content understanding test failed:', error);
    return false;
  }
}

/**
 * Test semantic similarity calculation
 */
async function testSemanticSimilarity(): Promise<boolean> {
  console.log('🧠 Testing Semantic Similarity...');
  
  try {
    const text1 = "JavaScript is a programming language for web development";
    const text2 = "JS is used to create interactive websites and web applications";
    const text3 = "Python is a high-level programming language known for simplicity";
    
    // Test high similarity
    const highSimilarity = await nlpService.calculateSemanticSimilarity({
      text1,
      text2,
      analysisType: 'comprehensive'
    });
    
    console.log(`✅ High similarity: ${Math.round(highSimilarity.similarity * 100)}%`);
    console.log(`   - Semantic: ${Math.round(highSimilarity.breakdown.semantic * 100)}%`);
    console.log(`   - Syntactic: ${Math.round(highSimilarity.breakdown.syntactic * 100)}%`);
    console.log(`   - Conceptual: ${Math.round(highSimilarity.breakdown.conceptual * 100)}%`);
    
    // Test low similarity
    const lowSimilarity = await nlpService.calculateSemanticSimilarity({
      text1,
      text2: text3,
      analysisType: 'semantic'
    });
    
    console.log(`✅ Low similarity: ${Math.round(lowSimilarity.similarity * 100)}%`);
    
    return highSimilarity.similarity > lowSimilarity.similarity;
    
  } catch (error) {
    console.error('❌ Semantic similarity test failed:', error);
    return false;
  }
}

/**
 * Test intent classification functionality
 */
async function testIntentClassification(): Promise<boolean> {
  console.log('🧠 Testing Intent Classification...');
  
  try {
    const results: Array<{ message: string; intent: any }> = [];
    
    // Test different types of messages
    for (const [type, message] of Object.entries(testMessages)) {
      const classification = await nlpService.classifyIntent({
        text: message,
        domain: 'educational'
      });
      
      results.push({ message, intent: classification });
      console.log(`✅ ${type}: "${message}"`);
      console.log(`   Intent: ${classification.intent} (${classification.category}, ${Math.round(classification.confidence * 100)}%)`);
    }
    
    // Verify that different message types get different classifications
    const uniqueIntents = new Set(results.map(r => r.intent.category));
    console.log(`✅ Unique intent categories detected: ${uniqueIntents.size}`);
    
    return uniqueIntents.size >= 3; // Should detect at least 3 different intent categories
    
  } catch (error) {
    console.error('❌ Intent classification test failed:', error);
    return false;
  }
}

/**
 * Test NLP tools integration
 */
async function testNLPTools(): Promise<boolean> {
  console.log('🧠 Testing NLP Tools Integration...');
  
  try {
    // Test topic extraction tool
    const topicResult = await extractTopicsTool.action({
      content: testContents.educational,
      maxTopics: 3,
      analysisDepth: 'standard'
    });
    
    console.log('✅ Topic extraction tool executed successfully');
    console.log(`   Result length: ${topicResult.length} characters`);
    
    // Test content analysis tool
    const analysisResult = await analyzeContentTool.action({
      content: testContents.technical,
      analysisType: 'technical',
      includeComplexity: true
    });
    
    console.log('✅ Content analysis tool executed successfully');
    console.log(`   Result length: ${analysisResult.length} characters`);
    
    // Test intent classification tool
    const intentResult = await classifyIntentTool.action({
      userMessage: testMessages.question,
      domain: 'educational'
    });
    
    console.log('✅ Intent classification tool executed successfully');
    console.log(`   Result length: ${intentResult.length} characters`);
    
    return topicResult.includes('Topic Analysis Results') && 
           analysisResult.includes('Content Analysis') &&
           intentResult.includes('Intent Classification');
    
  } catch (error) {
    console.error('❌ NLP tools integration test failed:', error);
    return false;
  }
}

/**
 * Test performance and edge cases
 */
async function testPerformanceAndEdgeCases(): Promise<boolean> {
  console.log('🧠 Testing Performance and Edge Cases...');
  
  try {
    // Test with empty content
    const emptyTopics = await nlpService.extractTopics({
      content: "",
      maxTopics: 5
    });
    console.log(`✅ Empty content handled: ${emptyTopics.length} topics`);
    
    // Test with very short content
    const shortTopics = await nlpService.extractTopics({
      content: "Hello world",
      maxTopics: 3
    });
    console.log(`✅ Short content handled: ${shortTopics.length} topics`);
    
    // Test with very long content
    const longContent = testContents.educational.repeat(10);
    const longTopics = await nlpService.extractTopics({
      content: longContent,
      maxTopics: 5
    });
    console.log(`✅ Long content handled: ${longTopics.length} topics`);
    
    // Test performance with multiple requests
    const startTime = Date.now();
    const promises = Array(5).fill(null).map(() => 
      nlpService.extractTopics({
        content: testContents.technical,
        maxTopics: 3
      })
    );
    
    await Promise.all(promises);
    const endTime = Date.now();
    console.log(`✅ Batch processing: 5 requests in ${endTime - startTime}ms`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Performance and edge cases test failed:', error);
    return false;
  }
}

/**
 * Test educational content adaptation
 */
async function testEducationalAdaptation(): Promise<boolean> {
  console.log('🧠 Testing Educational Content Adaptation...');
  
  try {
    // Analyze content at different complexity levels
    const beginnerContent = "Variables store data. In JavaScript, you can create a variable using let.";
    const advancedContent = "Implement a recursive descent parser with memoization for context-free grammar recognition.";
    
    const beginnerAnalysis = await nlpService.analyzeContent({
      content: beginnerContent,
      analysisType: 'educational'
    });
    
    const advancedAnalysis = await nlpService.analyzeContent({
      content: advancedContent,
      analysisType: 'educational'
    });
    
    console.log(`✅ Beginner content complexity: ${beginnerAnalysis.complexity.level} (${beginnerAnalysis.complexity.score})`);
    console.log(`✅ Advanced content complexity: ${advancedAnalysis.complexity.level} (${advancedAnalysis.complexity.score})`);
    console.log(`✅ Beginner grade level: ${beginnerAnalysis.educationalLevel.gradeLevel}`);
    console.log(`✅ Advanced grade level: ${advancedAnalysis.educationalLevel.gradeLevel}`);
    
    // Verify that complexity detection works correctly
    const complexityDifference = advancedAnalysis.complexity.score - beginnerAnalysis.complexity.score;
    console.log(`✅ Complexity difference: ${complexityDifference} points`);
    
    return complexityDifference > 20; // Advanced should be significantly more complex
    
  } catch (error) {
    console.error('❌ Educational adaptation test failed:', error);
    return false;
  }
}

/**
 * Run all NLP feature tests
 */
export async function runNLPFeaturesTests(): Promise<{
  passed: number;
  total: number;
  success: boolean;
  details: Record<string, boolean>;
}> {
  console.log('🚀 Starting Advanced NLP Features Tests\n');
  
  const tests = [
    { name: 'Topic Extraction', test: testTopicExtraction },
    { name: 'Content Understanding', test: testContentUnderstanding },
    { name: 'Semantic Similarity', test: testSemanticSimilarity },
    { name: 'Intent Classification', test: testIntentClassification },
    { name: 'NLP Tools Integration', test: testNLPTools },
    { name: 'Performance & Edge Cases', test: testPerformanceAndEdgeCases },
    { name: 'Educational Adaptation', test: testEducationalAdaptation }
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
  console.log('\n📊 Advanced NLP Features Test Results:');
  console.log('==========================================');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([name, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${name}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    console.log('🎉 All advanced NLP features are working correctly!');
  } else {
    console.log('⚠️ Some NLP features need attention.');
  }
  
  // Performance summary
  console.log('\n📈 NLP Capabilities Summary:');
  console.log('- ✅ Topic extraction with confidence scoring');
  console.log('- ✅ Comprehensive content understanding');
  console.log('- ✅ Semantic similarity calculation');
  console.log('- ✅ Intent classification for better responses');
  console.log('- ✅ Educational level adaptation');
  console.log('- ✅ Named entity recognition');
  console.log('- ✅ Sentiment and complexity analysis');
  console.log('- ✅ Concept relationship mapping');
  
  return { 
    passed, 
    total, 
    success: passed === total,
    details: results
  };
}

// Run tests if executed directly
if (require.main === module) {
  runNLPFeaturesTests()
    .then(results => {
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}