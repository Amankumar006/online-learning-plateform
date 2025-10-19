/**
 * Advanced NLP Service
 * Provides intelligent topic extraction, content understanding, and semantic analysis
 */

import { ai } from '@/ai/genkit';

export interface TopicExtractionRequest {
  content: string;
  context?: string;
  maxTopics?: number;
  includeSubtopics?: boolean;
  confidenceThreshold?: number;
}

export interface ExtractedTopic {
  topic: string;
  confidence: number;
  category: 'primary' | 'secondary' | 'tertiary';
  subtopics?: string[];
  keywords: string[];
  relevanceScore: number;
  context?: string;
}

export interface ContentUnderstandingRequest {
  content: string;
  analysisType?: 'educational' | 'technical' | 'conversational' | 'comprehensive';
  includeEntities?: boolean;
  includeSentiment?: boolean;
  includeComplexity?: boolean;
}

export interface ContentUnderstanding {
  mainTheme: string;
  keyPoints: string[];
  entities: NamedEntity[];
  sentiment: SentimentAnalysis;
  complexity: ComplexityAnalysis;
  educationalLevel: EducationalLevel;
  contentType: ContentType;
  structure: ContentStructure;
  relationships: ConceptRelationship[];
}

export interface NamedEntity {
  text: string;
  type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'CONCEPT' | 'TECHNOLOGY' | 'LANGUAGE' | 'FRAMEWORK' | 'TOOL';
  confidence: number;
  context?: string;
  aliases?: string[];
}

export interface SentimentAnalysis {
  overall: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions: Array<{
    emotion: 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'curiosity' | 'confusion';
    intensity: number;
  }>;
  tone: 'formal' | 'informal' | 'technical' | 'educational' | 'conversational';
}

export interface ComplexityAnalysis {
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  score: number; // 0-100
  factors: {
    vocabularyComplexity: number;
    sentenceComplexity: number;
    conceptualDepth: number;
    technicalDensity: number;
  };
  readabilityMetrics: {
    fleschKincaidGrade: number;
    averageWordsPerSentence: number;
    averageSyllablesPerWord: number;
  };
}

export interface EducationalLevel {
  gradeLevel: string;
  ageRange: string;
  prerequisites: string[];
  learningObjectives: string[];
  suggestedFollowUp: string[];
}

export interface ContentType {
  primary: 'tutorial' | 'explanation' | 'reference' | 'example' | 'exercise' | 'discussion';
  secondary?: string[];
  format: 'text' | 'code' | 'mixed' | 'structured';
  interactivity: 'passive' | 'interactive' | 'hands-on';
}

export interface ContentStructure {
  hasIntroduction: boolean;
  hasConclusion: boolean;
  hasExamples: boolean;
  hasCodeBlocks: boolean;
  hasList: boolean;
  hasSteps: boolean;
  sections: Array<{
    title: string;
    type: 'introduction' | 'explanation' | 'example' | 'exercise' | 'conclusion';
    importance: number;
  }>;
}

export interface ConceptRelationship {
  concept1: string;
  concept2: string;
  relationship: 'prerequisite' | 'builds_on' | 'related_to' | 'contrasts_with' | 'example_of';
  strength: number;
  explanation?: string;
}

export interface SemanticSimilarityRequest {
  text1: string;
  text2: string;
  analysisType?: 'semantic' | 'syntactic' | 'conceptual' | 'comprehensive';
}

export interface SemanticSimilarityResult {
  similarity: number;
  analysisType: string;
  breakdown: {
    semantic: number;
    syntactic: number;
    conceptual: number;
  };
  commonConcepts: string[];
  differences: string[];
  explanation: string;
}

export interface IntentClassificationRequest {
  text: string;
  context?: string;
  domain?: 'educational' | 'technical' | 'general';
}

export interface IntentClassification {
  intent: string;
  confidence: number;
  category: 'question' | 'request' | 'explanation' | 'feedback' | 'greeting' | 'other';
  parameters: Record<string, any>;
  suggestedResponse: string;
}

export class NLPService {
  private readonly stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
  ]);

  private readonly technicalTerms = new Set([
    'algorithm', 'function', 'variable', 'array', 'object', 'class', 'method', 'loop', 'condition',
    'database', 'api', 'framework', 'library', 'module', 'component', 'interface', 'protocol',
    'javascript', 'python', 'java', 'react', 'node', 'html', 'css', 'sql', 'git', 'docker'
  ]);

  /**
   * Extract topics from content using advanced NLP techniques
   */
  async extractTopics(request: TopicExtractionRequest): Promise<ExtractedTopic[]> {
    const {
      content,
      context,
      maxTopics = 10,
      includeSubtopics = true,
      confidenceThreshold = 0.3
    } = request;

    try {
      // Try AI-powered topic extraction first
      const aiTopics = await this.extractTopicsWithAI(content, context, maxTopics);
      if (aiTopics.length > 0) {
        return aiTopics.filter(topic => topic.confidence >= confidenceThreshold);
      }
    } catch (error) {
      console.warn('AI topic extraction failed, using rule-based approach:', error);
    }

    // Fallback to rule-based topic extraction
    return this.extractTopicsRuleBased(content, maxTopics, includeSubtopics, confidenceThreshold);
  }

  /**
   * Analyze content for comprehensive understanding
   */
  async analyzeContent(request: ContentUnderstandingRequest): Promise<ContentUnderstanding> {
    const {
      content,
      analysisType = 'comprehensive',
      includeEntities = true,
      includeSentiment = true,
      includeComplexity = true
    } = request;

    try {
      // Try AI-powered analysis first
      const aiAnalysis = await this.analyzeContentWithAI(content, analysisType);
      if (aiAnalysis) {
        return aiAnalysis;
      }
    } catch (error) {
      console.warn('AI content analysis failed, using rule-based approach:', error);
    }

    // Fallback to rule-based analysis
    return this.analyzeContentRuleBased(content, {
      includeEntities,
      includeSentiment,
      includeComplexity
    });
  }

  /**
   * Calculate semantic similarity between two texts
   */
  async calculateSemanticSimilarity(request: SemanticSimilarityRequest): Promise<SemanticSimilarityResult> {
    const { text1, text2, analysisType = 'comprehensive' } = request;

    try {
      // Try AI-powered similarity calculation
      const aiSimilarity = await this.calculateSimilarityWithAI(text1, text2, analysisType);
      if (aiSimilarity) {
        return aiSimilarity;
      }
    } catch (error) {
      console.warn('AI similarity calculation failed, using rule-based approach:', error);
    }

    // Fallback to rule-based similarity
    return this.calculateSimilarityRuleBased(text1, text2, analysisType);
  }

  /**
   * Classify user intent from text
   */
  async classifyIntent(request: IntentClassificationRequest): Promise<IntentClassification> {
    const { text, context, domain = 'educational' } = request;

    try {
      // Try AI-powered intent classification
      const aiIntent = await this.classifyIntentWithAI(text, context, domain);
      if (aiIntent) {
        return aiIntent;
      }
    } catch (error) {
      console.warn('AI intent classification failed, using rule-based approach:', error);
    }

    // Fallback to rule-based classification
    return this.classifyIntentRuleBased(text, domain);
  }

  /**
   * AI-powered topic extraction
   */
  private async extractTopicsWithAI(content: string, context?: string, maxTopics = 10): Promise<ExtractedTopic[]> {
    const prompt = `Analyze the following content and extract the main topics. ${context ? `Context: ${context}` : ''}

Content: "${content}"

Extract up to ${maxTopics} topics and return them as JSON with this structure:
{
  "topics": [
    {
      "topic": "main topic name",
      "confidence": 0.95,
      "category": "primary|secondary|tertiary",
      "subtopics": ["subtopic1", "subtopic2"],
      "keywords": ["keyword1", "keyword2"],
      "relevanceScore": 0.9,
      "context": "brief explanation"
    }
  ]
}

Focus on educational and technical topics. Prioritize programming concepts, learning objectives, and key themes.`;

    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt,
      config: { temperature: 0.1 }
    });

    try {
      const parsed = JSON.parse(response.text);
      return parsed.topics || [];
    } catch {
      // If JSON parsing fails, extract topics from text response
      return this.parseTopicsFromText(response.text);
    }
  }

  /**
   * AI-powered content analysis
   */
  private async analyzeContentWithAI(content: string, analysisType: string): Promise<ContentUnderstanding | null> {
    const prompt = `Perform a comprehensive analysis of the following content:

Content: "${content}"

Analysis Type: ${analysisType}

Provide a detailed analysis in JSON format with:
- Main theme and key points
- Named entities (people, technologies, concepts)
- Sentiment and emotional tone
- Complexity level and readability
- Educational level and prerequisites
- Content structure and type
- Concept relationships

Return as valid JSON with the complete ContentUnderstanding structure.`;

    try {
      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt,
        config: { temperature: 0.2 }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error('AI content analysis parsing failed:', error);
      return null;
    }
  }

  /**
   * AI-powered semantic similarity
   */
  private async calculateSimilarityWithAI(text1: string, text2: string, analysisType: string): Promise<SemanticSimilarityResult | null> {
    const prompt = `Calculate the semantic similarity between these two texts:

Text 1: "${text1}"
Text 2: "${text2}"

Analysis Type: ${analysisType}

Provide similarity score (0-1), breakdown by semantic/syntactic/conceptual dimensions, common concepts, differences, and explanation.
Return as JSON with SemanticSimilarityResult structure.`;

    try {
      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt,
        config: { temperature: 0.1 }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error('AI similarity calculation failed:', error);
      return null;
    }
  }

  /**
   * AI-powered intent classification
   */
  private async classifyIntentWithAI(text: string, context?: string, domain = 'educational'): Promise<IntentClassification | null> {
    const prompt = `Classify the intent of this user message in the ${domain} domain:

Message: "${text}"
${context ? `Context: ${context}` : ''}

Determine:
- Primary intent (question, request, explanation, feedback, greeting, other)
- Confidence level (0-1)
- Intent category and parameters
- Suggested response approach

Return as JSON with IntentClassification structure.`;

    try {
      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt,
        config: { temperature: 0.2 }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error('AI intent classification failed:', error);
      return null;
    }
  }

  /**
   * Rule-based topic extraction fallback
   */
  private extractTopicsRuleBased(content: string, maxTopics: number, includeSubtopics: boolean, confidenceThreshold: number): ExtractedTopic[] {
    const words = this.tokenize(content);
    const phrases = this.extractPhrases(content);
    
    // Score words and phrases
    const topicCandidates = new Map<string, number>();
    
    // Score individual words
    words.forEach(word => {
      if (!this.stopWords.has(word.toLowerCase()) && word.length > 2) {
        const score = this.calculateWordScore(word, content);
        topicCandidates.set(word, score);
      }
    });
    
    // Score phrases (higher weight)
    phrases.forEach(phrase => {
      const score = this.calculatePhraseScore(phrase, content) * 1.5;
      topicCandidates.set(phrase, score);
    });
    
    // Convert to topics
    const topics: ExtractedTopic[] = Array.from(topicCandidates.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxTopics)
      .filter(([, score]) => score >= confidenceThreshold)
      .map(([topic, score], index) => ({
        topic,
        confidence: Math.min(score, 1.0),
        category: index < 3 ? 'primary' : index < 6 ? 'secondary' : 'tertiary',
        subtopics: includeSubtopics ? this.findSubtopics(topic, content) : undefined,
        keywords: this.extractKeywords(topic, content),
        relevanceScore: score,
        context: this.getTopicContext(topic, content)
      }));
    
    return topics;
  }

  /**
   * Rule-based content analysis fallback
   */
  private analyzeContentRuleBased(content: string, options: any): ContentUnderstanding {
    const sentences = this.splitIntoSentences(content);
    const words = this.tokenize(content);
    
    return {
      mainTheme: this.extractMainTheme(content),
      keyPoints: this.extractKeyPoints(sentences),
      entities: options.includeEntities ? this.extractEntities(content) : [],
      sentiment: options.includeSentiment ? this.analyzeSentiment(content) : this.getDefaultSentiment(),
      complexity: options.includeComplexity ? this.analyzeComplexity(content, words, sentences) : this.getDefaultComplexity(),
      educationalLevel: this.determineEducationalLevel(content, words),
      contentType: this.classifyContentType(content),
      structure: this.analyzeStructure(content),
      relationships: this.extractRelationships(content)
    };
  }

  /**
   * Rule-based semantic similarity fallback
   */
  private calculateSimilarityRuleBased(text1: string, text2: string, analysisType: string): SemanticSimilarityResult {
    const words1 = new Set(this.tokenize(text1.toLowerCase()));
    const words2 = new Set(this.tokenize(text2.toLowerCase()));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    const jaccardSimilarity = intersection.size / union.size;
    
    // Enhanced similarity with phrase matching
    const phrases1 = this.extractPhrases(text1);
    const phrases2 = this.extractPhrases(text2);
    const phraseIntersection = phrases1.filter(p1 => 
      phrases2.some(p2 => this.phraseSimilarity(p1, p2) > 0.8)
    );
    const phraseSimilarity = phraseIntersection.length / Math.max(phrases1.length, phrases2.length, 1);
    
    const semantic = (jaccardSimilarity + phraseSimilarity) / 2;
    const syntactic = this.calculateSyntacticSimilarity(text1, text2);
    const conceptual = this.calculateConceptualSimilarity(text1, text2);
    
    const overall = (semantic * 0.5 + syntactic * 0.2 + conceptual * 0.3);
    
    return {
      similarity: overall,
      analysisType,
      breakdown: { semantic, syntactic, conceptual },
      commonConcepts: Array.from(intersection).slice(0, 10),
      differences: this.findDifferences(words1, words2),
      explanation: this.generateSimilarityExplanation(overall, semantic, syntactic, conceptual)
    };
  }

  /**
   * Rule-based intent classification fallback
   */
  private classifyIntentRuleBased(text: string, domain: string): IntentClassification {
    const lowerText = text.toLowerCase();
    
    // Question patterns
    if (this.isQuestion(lowerText)) {
      return {
        intent: 'ask_question',
        confidence: 0.9,
        category: 'question',
        parameters: { questionType: this.getQuestionType(lowerText) },
        suggestedResponse: 'Provide a detailed explanation with examples'
      };
    }
    
    // Request patterns
    if (this.isRequest(lowerText)) {
      return {
        intent: 'make_request',
        confidence: 0.85,
        category: 'request',
        parameters: { requestType: this.getRequestType(lowerText) },
        suggestedResponse: 'Fulfill the request with appropriate content'
      };
    }
    
    // Greeting patterns
    if (this.isGreeting(lowerText)) {
      return {
        intent: 'greeting',
        confidence: 0.95,
        category: 'greeting',
        parameters: {},
        suggestedResponse: 'Respond with a friendly greeting and offer help'
      };
    }
    
    // Default to explanation request
    return {
      intent: 'seek_explanation',
      confidence: 0.6,
      category: 'explanation',
      parameters: { topic: this.extractMainTopic(text) },
      suggestedResponse: 'Provide educational content on the identified topic'
    };
  }

  // Helper methods for rule-based analysis
  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  private extractPhrases(text: string): string[] {
    const phrases: string[] = [];
    const words = text.split(/\s+/);
    
    // Extract 2-3 word phrases
    for (let i = 0; i < words.length - 1; i++) {
      const twoWord = `${words[i]} ${words[i + 1]}`.toLowerCase().replace(/[^\w\s]/g, '');
      if (twoWord.length > 3 && !this.stopWords.has(words[i].toLowerCase())) {
        phrases.push(twoWord);
      }
      
      if (i < words.length - 2) {
        const threeWord = `${words[i]} ${words[i + 1]} ${words[i + 2]}`.toLowerCase().replace(/[^\w\s]/g, '');
        if (threeWord.length > 5) {
          phrases.push(threeWord);
        }
      }
    }
    
    return [...new Set(phrases)];
  }

  private calculateWordScore(word: string, content: string): number {
    const frequency = (content.toLowerCase().match(new RegExp(word.toLowerCase(), 'g')) || []).length;
    const length = word.length;
    const isTechnical = this.technicalTerms.has(word.toLowerCase()) ? 1.5 : 1;
    const isCapitalized = /^[A-Z]/.test(word) ? 1.2 : 1;
    
    return (frequency * length * isTechnical * isCapitalized) / content.length;
  }

  private calculatePhraseScore(phrase: string, content: string): number {
    const frequency = (content.toLowerCase().match(new RegExp(phrase.toLowerCase(), 'g')) || []).length;
    const wordCount = phrase.split(' ').length;
    const hasTechnicalTerm = phrase.split(' ').some(word => this.technicalTerms.has(word.toLowerCase()));
    
    return (frequency * wordCount * (hasTechnicalTerm ? 2 : 1)) / content.length;
  }

  private findSubtopics(topic: string, content: string): string[] {
    const subtopics: string[] = [];
    const sentences = this.splitIntoSentences(content);
    
    sentences.forEach(sentence => {
      if (sentence.toLowerCase().includes(topic.toLowerCase())) {
        const words = this.tokenize(sentence);
        words.forEach(word => {
          if (word.length > 3 && !this.stopWords.has(word) && word !== topic.toLowerCase()) {
            subtopics.push(word);
          }
        });
      }
    });
    
    return [...new Set(subtopics)].slice(0, 5);
  }

  private extractKeywords(topic: string, content: string): string[] {
    const keywords: string[] = [];
    const words = this.tokenize(content);
    
    // Find words that frequently appear near the topic
    const topicIndex = words.findIndex(word => word.toLowerCase() === topic.toLowerCase());
    if (topicIndex !== -1) {
      const start = Math.max(0, topicIndex - 5);
      const end = Math.min(words.length, topicIndex + 5);
      
      for (let i = start; i < end; i++) {
        if (i !== topicIndex && !this.stopWords.has(words[i]) && words[i].length > 2) {
          keywords.push(words[i]);
        }
      }
    }
    
    return [...new Set(keywords)].slice(0, 5);
  }

  private getTopicContext(topic: string, content: string): string {
    const sentences = this.splitIntoSentences(content);
    const contextSentence = sentences.find(sentence => 
      sentence.toLowerCase().includes(topic.toLowerCase())
    );
    
    return contextSentence ? contextSentence.substring(0, 100) + '...' : '';
  }

  private splitIntoSentences(text: string): string[] {
    return text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
  }

  private extractMainTheme(content: string): string {
    const topics = this.extractTopicsRuleBased(content, 1, false, 0.1);
    return topics.length > 0 ? topics[0].topic : 'General Discussion';
  }

  private extractKeyPoints(sentences: string[]): string[] {
    return sentences
      .filter(sentence => sentence.length > 20 && sentence.length < 200)
      .slice(0, 5)
      .map(sentence => sentence.trim());
  }

  private extractEntities(content: string): NamedEntity[] {
    const entities: NamedEntity[] = [];
    
    // Simple pattern matching for common entities
    const patterns = {
      TECHNOLOGY: /\b(JavaScript|Python|React|Node\.js|HTML|CSS|SQL|Git|Docker|AWS|API)\b/gi,
      LANGUAGE: /\b(programming language|language|JavaScript|Python|Java|C\+\+|Ruby|PHP)\b/gi,
      FRAMEWORK: /\b(React|Angular|Vue|Express|Django|Flask|Spring|Laravel)\b/gi,
      CONCEPT: /\b(algorithm|function|variable|array|object|class|method|loop)\b/gi
    };
    
    Object.entries(patterns).forEach(([type, pattern]) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          entities.push({
            text: match,
            type: type as any,
            confidence: 0.8,
            context: this.getEntityContext(match, content)
          });
        });
      }
    });
    
    return entities.slice(0, 10);
  }

  private getEntityContext(entity: string, content: string): string {
    const sentences = this.splitIntoSentences(content);
    const contextSentence = sentences.find(sentence => 
      sentence.toLowerCase().includes(entity.toLowerCase())
    );
    return contextSentence ? contextSentence.substring(0, 100) + '...' : '';
  }

  private analyzeSentiment(content: string): SentimentAnalysis {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'helpful', 'useful', 'easy', 'simple'];
    const negativeWords = ['bad', 'terrible', 'difficult', 'hard', 'confusing', 'complex', 'error', 'problem'];
    
    const words = this.tokenize(content);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    let overall: 'positive' | 'negative' | 'neutral' = 'neutral';
    let confidence = 0.5;
    
    if (positiveCount > negativeCount) {
      overall = 'positive';
      confidence = Math.min(0.9, 0.5 + (positiveCount - negativeCount) * 0.1);
    } else if (negativeCount > positiveCount) {
      overall = 'negative';
      confidence = Math.min(0.9, 0.5 + (negativeCount - positiveCount) * 0.1);
    }
    
    return {
      overall,
      confidence,
      emotions: [{ emotion: 'curiosity', intensity: 0.7 }],
      tone: this.determineTone(content)
    };
  }

  private determineTone(content: string): 'formal' | 'informal' | 'technical' | 'educational' | 'conversational' {
    const technicalTermCount = this.tokenize(content).filter(word => 
      this.technicalTerms.has(word.toLowerCase())
    ).length;
    
    if (technicalTermCount > 3) return 'technical';
    if (content.includes('?') || content.includes('let\'s') || content.includes('we can')) return 'educational';
    if (content.includes('!') || content.includes('you')) return 'conversational';
    return 'formal';
  }

  private analyzeComplexity(content: string, words: string[], sentences: string[]): ComplexityAnalysis {
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = this.calculateAverageSyllables(words);
    const fleschKincaidGrade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
    
    const vocabularyComplexity = this.calculateVocabularyComplexity(words);
    const sentenceComplexity = avgWordsPerSentence > 20 ? 80 : (avgWordsPerSentence / 20) * 80;
    const conceptualDepth = this.calculateConceptualDepth(content);
    const technicalDensity = this.calculateTechnicalDensity(words);
    
    const overallScore = (vocabularyComplexity + sentenceComplexity + conceptualDepth + technicalDensity) / 4;
    
    let level: 'beginner' | 'intermediate' | 'advanced' | 'expert' = 'beginner';
    if (overallScore > 75) level = 'expert';
    else if (overallScore > 60) level = 'advanced';
    else if (overallScore > 40) level = 'intermediate';
    
    return {
      level,
      score: overallScore,
      factors: {
        vocabularyComplexity,
        sentenceComplexity,
        conceptualDepth,
        technicalDensity
      },
      readabilityMetrics: {
        fleschKincaidGrade: Math.max(1, fleschKincaidGrade),
        averageWordsPerSentence: avgWordsPerSentence,
        averageSyllablesPerWord: avgSyllablesPerWord
      }
    };
  }

  private calculateAverageSyllables(words: string[]): number {
    const syllableCount = words.reduce((total, word) => {
      return total + this.countSyllables(word);
    }, 0);
    return syllableCount / words.length;
  }

  private countSyllables(word: string): number {
    const vowels = 'aeiouy';
    let count = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i].toLowerCase());
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }
    
    // Handle silent e
    if (word.endsWith('e') && count > 1) {
      count--;
    }
    
    return Math.max(1, count);
  }

  private calculateVocabularyComplexity(words: string[]): number {
    const uniqueWords = new Set(words);
    const longWords = words.filter(word => word.length > 6).length;
    const technicalWords = words.filter(word => this.technicalTerms.has(word.toLowerCase())).length;
    
    const lexicalDiversity = uniqueWords.size / words.length;
    const longWordRatio = longWords / words.length;
    const technicalRatio = technicalWords / words.length;
    
    return (lexicalDiversity * 40 + longWordRatio * 30 + technicalRatio * 30);
  }

  private calculateConceptualDepth(content: string): number {
    const abstractConcepts = ['algorithm', 'paradigm', 'architecture', 'pattern', 'principle', 'methodology'];
    const conceptCount = abstractConcepts.filter(concept => 
      content.toLowerCase().includes(concept)
    ).length;
    
    return Math.min(100, conceptCount * 20);
  }

  private calculateTechnicalDensity(words: string[]): number {
    const technicalCount = words.filter(word => this.technicalTerms.has(word.toLowerCase())).length;
    return Math.min(100, (technicalCount / words.length) * 200);
  }

  private determineEducationalLevel(content: string, words: string[]): EducationalLevel {
    const complexity = this.analyzeComplexity(content, words, this.splitIntoSentences(content));
    
    const levelMap = {
      beginner: { grade: '6-8', age: '11-14 years' },
      intermediate: { grade: '9-12', age: '14-18 years' },
      advanced: { grade: 'College', age: '18+ years' },
      expert: { grade: 'Graduate', age: '22+ years' }
    };
    
    const level = levelMap[complexity.level];
    
    return {
      gradeLevel: level.grade,
      ageRange: level.age,
      prerequisites: this.extractPrerequisites(content),
      learningObjectives: this.extractLearningObjectives(content),
      suggestedFollowUp: this.suggestFollowUpTopics(content)
    };
  }

  private extractPrerequisites(content: string): string[] {
    const prerequisites: string[] = [];
    const technicalTerms = this.tokenize(content).filter(word => 
      this.technicalTerms.has(word.toLowerCase())
    );
    
    technicalTerms.forEach(term => {
      if (term.toLowerCase() === 'react') prerequisites.push('JavaScript basics');
      if (term.toLowerCase() === 'algorithm') prerequisites.push('Basic programming concepts');
      if (term.toLowerCase() === 'database') prerequisites.push('Data structures');
    });
    
    return [...new Set(prerequisites)].slice(0, 3);
  }

  private extractLearningObjectives(content: string): string[] {
    const objectives: string[] = [];
    const sentences = this.splitIntoSentences(content);
    
    sentences.forEach(sentence => {
      if (sentence.toLowerCase().includes('learn') || sentence.toLowerCase().includes('understand')) {
        objectives.push(sentence.trim());
      }
    });
    
    return objectives.slice(0, 3);
  }

  private suggestFollowUpTopics(content: string): string[] {
    const topics = this.extractTopicsRuleBased(content, 5, false, 0.2);
    return topics.map(topic => `Advanced ${topic.topic}`).slice(0, 3);
  }

  private classifyContentType(content: string): ContentType {
    const hasCode = /```|`/.test(content);
    const hasSteps = /\d+\.|step|first|second|then|next|finally/i.test(content);
    const hasQuestions = /\?/.test(content);
    const hasExamples = /example|for instance|such as/i.test(content);
    
    let primary: ContentType['primary'] = 'explanation';
    if (hasCode && hasSteps) primary = 'tutorial';
    else if (hasCode) primary = 'example';
    else if (hasQuestions) primary = 'exercise';
    else if (hasSteps) primary = 'tutorial';
    
    return {
      primary,
      secondary: [],
      format: hasCode ? 'mixed' : 'text',
      interactivity: hasQuestions ? 'interactive' : 'passive'
    };
  }

  private analyzeStructure(content: string): ContentStructure {
    const hasIntroduction = /introduction|overview|begin|start/i.test(content.substring(0, 200));
    const hasConclusion = /conclusion|summary|end|finally/i.test(content.substring(content.length - 200));
    const hasExamples = /example|for instance|such as/i.test(content);
    const hasCodeBlocks = /```|`/.test(content);
    const hasList = /\n\s*[-*•]|\n\s*\d+\./.test(content);
    const hasSteps = /step|first|second|then|next/i.test(content);
    
    return {
      hasIntroduction,
      hasConclusion,
      hasExamples,
      hasCodeBlocks,
      hasList,
      hasSteps,
      sections: this.extractSections(content)
    };
  }

  private extractSections(content: string): ContentStructure['sections'] {
    const sections: ContentStructure['sections'] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.startsWith('#') || line.match(/^[A-Z][^.]*:$/)) {
        const title = line.replace(/^#+\s*/, '').replace(/:$/, '');
        const type = this.determineSectionType(title, index, lines.length);
        sections.push({
          title,
          type,
          importance: type === 'introduction' || type === 'conclusion' ? 0.9 : 0.7
        });
      }
    });
    
    return sections;
  }

  private determineSectionType(title: string, index: number, totalLines: number): ContentStructure['sections'][0]['type'] {
    const lowerTitle = title.toLowerCase();
    
    if (index < totalLines * 0.2 && (lowerTitle.includes('intro') || lowerTitle.includes('overview'))) {
      return 'introduction';
    }
    if (index > totalLines * 0.8 && (lowerTitle.includes('conclu') || lowerTitle.includes('summary'))) {
      return 'conclusion';
    }
    if (lowerTitle.includes('example') || lowerTitle.includes('demo')) {
      return 'example';
    }
    if (lowerTitle.includes('exercise') || lowerTitle.includes('practice')) {
      return 'exercise';
    }
    
    return 'explanation';
  }

  private extractRelationships(content: string): ConceptRelationship[] {
    const relationships: ConceptRelationship[] = [];
    const topics = this.extractTopicsRuleBased(content, 10, false, 0.2);
    
    // Find relationships between topics
    for (let i = 0; i < topics.length; i++) {
      for (let j = i + 1; j < topics.length; j++) {
        const relationship = this.findRelationship(topics[i].topic, topics[j].topic, content);
        if (relationship) {
          relationships.push(relationship);
        }
      }
    }
    
    return relationships.slice(0, 5);
  }

  private findRelationship(concept1: string, concept2: string, content: string): ConceptRelationship | null {
    const sentences = this.splitIntoSentences(content);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      const hasConcept1 = lowerSentence.includes(concept1.toLowerCase());
      const hasConcept2 = lowerSentence.includes(concept2.toLowerCase());
      
      if (hasConcept1 && hasConcept2) {
        let relationship: ConceptRelationship['relationship'] = 'related_to';
        let strength = 0.5;
        
        if (lowerSentence.includes('before') || lowerSentence.includes('prerequisite')) {
          relationship = 'prerequisite';
          strength = 0.8;
        } else if (lowerSentence.includes('builds on') || lowerSentence.includes('extends')) {
          relationship = 'builds_on';
          strength = 0.7;
        } else if (lowerSentence.includes('example') || lowerSentence.includes('instance')) {
          relationship = 'example_of';
          strength = 0.6;
        }
        
        return {
          concept1,
          concept2,
          relationship,
          strength,
          explanation: sentence.trim()
        };
      }
    }
    
    return null;
  }

  private calculateSyntacticSimilarity(text1: string, text2: string): number {
    const sentences1 = this.splitIntoSentences(text1);
    const sentences2 = this.splitIntoSentences(text2);
    
    const avgLength1 = sentences1.reduce((sum, s) => sum + s.length, 0) / sentences1.length;
    const avgLength2 = sentences2.reduce((sum, s) => sum + s.length, 0) / sentences2.length;
    
    const lengthSimilarity = 1 - Math.abs(avgLength1 - avgLength2) / Math.max(avgLength1, avgLength2);
    
    return Math.max(0, lengthSimilarity);
  }

  private calculateConceptualSimilarity(text1: string, text2: string): number {
    const topics1 = this.extractTopicsRuleBased(text1, 5, false, 0.1);
    const topics2 = this.extractTopicsRuleBased(text2, 5, false, 0.1);
    
    const topicNames1 = new Set(topics1.map(t => t.topic.toLowerCase()));
    const topicNames2 = new Set(topics2.map(t => t.topic.toLowerCase()));
    
    const intersection = new Set([...topicNames1].filter(x => topicNames2.has(x)));
    const union = new Set([...topicNames1, ...topicNames2]);
    
    return intersection.size / union.size;
  }

  private findDifferences(words1: Set<string>, words2: Set<string>): string[] {
    const diff1 = [...words1].filter(w => !words2.has(w));
    const diff2 = [...words2].filter(w => !words1.has(w));
    
    return [...diff1, ...diff2].slice(0, 10);
  }

  private generateSimilarityExplanation(overall: number, semantic: number, syntactic: number, conceptual: number): string {
    if (overall > 0.8) return 'Very high similarity - texts are nearly identical in meaning and structure';
    if (overall > 0.6) return 'High similarity - texts share many concepts and similar structure';
    if (overall > 0.4) return 'Moderate similarity - texts have some common themes but differ in approach';
    if (overall > 0.2) return 'Low similarity - texts have few common elements';
    return 'Very low similarity - texts are quite different in content and structure';
  }

  private isQuestion(text: string): boolean {
    return text.includes('?') || 
           text.startsWith('what') || 
           text.startsWith('how') || 
           text.startsWith('why') || 
           text.startsWith('when') || 
           text.startsWith('where') ||
           text.startsWith('can you') ||
           text.startsWith('could you');
  }

  private isRequest(text: string): boolean {
    return text.includes('please') ||
           text.startsWith('create') ||
           text.startsWith('generate') ||
           text.startsWith('make') ||
           text.startsWith('build') ||
           text.startsWith('show me') ||
           text.startsWith('help me');
  }

  private isGreeting(text: string): boolean {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
    return greetings.some(greeting => text.includes(greeting));
  }

  private getQuestionType(text: string): string {
    if (text.startsWith('what')) return 'definition';
    if (text.startsWith('how')) return 'procedure';
    if (text.startsWith('why')) return 'explanation';
    if (text.startsWith('when')) return 'temporal';
    if (text.startsWith('where')) return 'location';
    return 'general';
  }

  private getRequestType(text: string): string {
    if (text.includes('create') || text.includes('generate')) return 'creation';
    if (text.includes('explain') || text.includes('show')) return 'explanation';
    if (text.includes('help')) return 'assistance';
    return 'general';
  }

  private extractMainTopic(text: string): string {
    const topics = this.extractTopicsRuleBased(text, 1, false, 0.1);
    return topics.length > 0 ? topics[0].topic : 'general';
  }

  private parseTopicsFromText(text: string): ExtractedTopic[] {
    // Simple parsing of topics from AI response text
    const lines = text.split('\n');
    const topics: ExtractedTopic[] = [];
    
    lines.forEach(line => {
      const match = line.match(/^\d+\.\s*(.+)/);
      if (match) {
        topics.push({
          topic: match[1].trim(),
          confidence: 0.8,
          category: 'primary',
          keywords: [],
          relevanceScore: 0.8
        });
      }
    });
    
    return topics;
  }

  private phraseSimilarity(phrase1: string, phrase2: string): number {
    const words1 = phrase1.split(' ');
    const words2 = phrase2.split(' ');
    
    const intersection = words1.filter(w => words2.includes(w));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  private getDefaultSentiment(): SentimentAnalysis {
    return {
      overall: 'neutral',
      confidence: 0.5,
      emotions: [{ emotion: 'curiosity', intensity: 0.5 }],
      tone: 'educational'
    };
  }

  private getDefaultComplexity(): ComplexityAnalysis {
    return {
      level: 'intermediate',
      score: 50,
      factors: {
        vocabularyComplexity: 50,
        sentenceComplexity: 50,
        conceptualDepth: 50,
        technicalDensity: 50
      },
      readabilityMetrics: {
        fleschKincaidGrade: 8,
        averageWordsPerSentence: 15,
        averageSyllablesPerWord: 1.5
      }
    };
  }
}

// Singleton instance
export const nlpService = new NLPService();

// Helper functions for easy integration
export async function extractTopicsFromContent(content: string, maxTopics = 5): Promise<ExtractedTopic[]> {
  return await nlpService.extractTopics({ content, maxTopics });
}

export async function analyzeContentComprehensively(content: string): Promise<ContentUnderstanding> {
  return await nlpService.analyzeContent({ content, analysisType: 'comprehensive' });
}

export async function calculateTextSimilarity(text1: string, text2: string): Promise<number> {
  const result = await nlpService.calculateSemanticSimilarity({ text1, text2 });
  return result.similarity;
}

export async function classifyUserIntent(text: string, context?: string): Promise<IntentClassification> {
  return await nlpService.classifyIntent({ text, context });
}