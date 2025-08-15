/**
 * Web Search Detection Service
 * Analyzes user queries to determine when automatic web search should be triggered
 */

export interface WebSearchTrigger {
  shouldTrigger: boolean;
  confidence: number;
  reasons: string[];
  suggestedQuery?: string;
  triggerType: 'manual' | 'automatic';
}

export interface DetectionSignals {
  timeSensitive: string[];
  recentYears: string[];
  trendingEvents: string[];
  unknownEntities: string[];
  comparativeQueries: string[];
  currentDataRequests: string[];
}

export class WebSearchDetectionService {
  private readonly timeSensitiveTerms = [
    'today', 'latest', 'current', 'breaking', 'this week', 'this month', 'this year',
    'recent', 'recently', 'now', 'currently', 'up to date', 'updated', 'new',
    'trending', 'popular', 'hot', 'viral', 'live', 'real-time', 'fresh'
  ];

  private readonly comparativeTerms = [
    'best', 'top', 'vs', 'versus', 'compare', 'comparison', 'better', 'worse',
    'ranking', 'ranked', 'list', 'alternatives', 'options', 'choices'
  ];

  private readonly currentDataIndicators = [
    'price', 'cost', 'stock', 'availability', 'release date', 'version',
    'update', 'changelog', 'news', 'announcement', 'launch', 'beta'
  ];

  private readonly trendingEventPatterns = [
    /\b(conference|summit|event|expo|meetup)\s+\d{4}\b/i,
    /\b(election|vote|voting|poll)\b/i,
    /\b(weather|temperature|forecast|storm|hurricane)\b/i,
    /\b(sports|game|match|tournament|championship|score)\b/i,
    /\b(stock|market|trading|crypto|bitcoin|ethereum)\b/i,
    /\b(covid|pandemic|vaccine|outbreak)\b/i
  ];

  /**
   * Analyze a user query to determine if web search should be triggered
   */
  analyzeQuery(query: string, context?: {
    conversationHistory?: string[];
    userLocation?: string;
    previousSearches?: string[];
  }): WebSearchTrigger {
    const signals = this.extractSignals(query);
    const confidence = this.calculateConfidence(signals, query);
    const reasons = this.generateReasons(signals);
    
    const shouldTrigger = confidence >= 0.6; // 60% confidence threshold
    
    return {
      shouldTrigger,
      confidence,
      reasons,
      suggestedQuery: shouldTrigger ? this.optimizeQuery(query, signals) : undefined,
      triggerType: 'automatic'
    };
  }

  /**
   * Extract detection signals from the query
   */
  private extractSignals(query: string): DetectionSignals {
    const lowerQuery = query.toLowerCase();
    
    return {
      timeSensitive: this.timeSensitiveTerms.filter(term => 
        lowerQuery.includes(term.toLowerCase())
      ),
      recentYears: this.extractRecentYears(query),
      trendingEvents: this.extractTrendingEvents(query),
      unknownEntities: this.extractUnknownEntities(query),
      comparativeQueries: this.comparativeTerms.filter(term => 
        lowerQuery.includes(term.toLowerCase())
      ),
      currentDataRequests: this.currentDataIndicators.filter(term => 
        lowerQuery.includes(term.toLowerCase())
      )
    };
  }

  /**
   * Extract recent years from the query (2020-2025)
   */
  private extractRecentYears(query: string): string[] {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];
    
    for (let year = 2020; year <= currentYear + 1; year++) {
      if (query.includes(year.toString())) {
        years.push(year.toString());
      }
    }
    
    return years;
  }

  /**
   * Extract trending event patterns
   */
  private extractTrendingEvents(query: string): string[] {
    const events: string[] = [];
    
    this.trendingEventPatterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        events.push(matches[0]);
      }
    });
    
    return events;
  }

  /**
   * Detect potentially unknown entities that might need current data
   */
  private extractUnknownEntities(query: string): string[] {
    const entities: string[] = [];
    
    // Look for proper nouns that might be new products, companies, or technologies
    const properNounPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const matches = query.match(properNounPattern) || [];
    
    // Filter out common words and focus on potential tech/product names
    const techIndicators = ['AI', 'API', 'SDK', 'Framework', 'Library', 'Tool', 'App', 'Platform'];
    
    matches.forEach(match => {
      if (match.length > 3 && !this.isCommonWord(match)) {
        entities.push(match);
      }
    });
    
    // Check if query contains tech indicators
    if (techIndicators.some(indicator => query.includes(indicator))) {
      entities.push('tech_product');
    }
    
    return entities;
  }

  /**
   * Check if a word is a common English word (simplified check)
   */
  private isCommonWord(word: string): boolean {
    const commonWords = [
      'The', 'This', 'That', 'What', 'How', 'Why', 'When', 'Where', 'Who',
      'Can', 'Will', 'Should', 'Would', 'Could', 'May', 'Might', 'Must',
      'And', 'But', 'Or', 'So', 'Because', 'If', 'Then', 'Than', 'As'
    ];
    
    return commonWords.includes(word);
  }

  /**
   * Calculate confidence score based on detected signals
   */
  private calculateConfidence(signals: DetectionSignals, query: string): number {
    let score = 0;
    
    // Time-sensitive terms (high weight)
    score += signals.timeSensitive.length * 0.3;
    
    // Recent years (high weight)
    score += signals.recentYears.length * 0.25;
    
    // Trending events (high weight)
    score += signals.trendingEvents.length * 0.25;
    
    // Comparative queries (medium weight)
    score += signals.comparativeQueries.length * 0.15;
    
    // Current data requests (medium weight)
    score += signals.currentDataRequests.length * 0.15;
    
    // Unknown entities (low weight, but additive)
    score += Math.min(signals.unknownEntities.length * 0.1, 0.2);
    
    // Question patterns that often need current data
    if (query.match(/^(what are|what is|which|how many|when did|where can)/i)) {
      score += 0.1;
    }
    
    // Superlative patterns (best, worst, fastest, etc.)
    if (query.match(/\b(best|worst|fastest|slowest|cheapest|most|least)\b/i)) {
      score += 0.2;
    }
    
    // Cap at 1.0
    return Math.min(score, 1.0);
  }

  /**
   * Generate human-readable reasons for the trigger decision
   */
  private generateReasons(signals: DetectionSignals): string[] {
    const reasons: string[] = [];
    
    if (signals.timeSensitive.length > 0) {
      reasons.push(`Contains time-sensitive terms: ${signals.timeSensitive.join(', ')}`);
    }
    
    if (signals.recentYears.length > 0) {
      reasons.push(`References recent years: ${signals.recentYears.join(', ')}`);
    }
    
    if (signals.trendingEvents.length > 0) {
      reasons.push(`Mentions trending events: ${signals.trendingEvents.join(', ')}`);
    }
    
    if (signals.comparativeQueries.length > 0) {
      reasons.push(`Requests comparisons: ${signals.comparativeQueries.join(', ')}`);
    }
    
    if (signals.currentDataRequests.length > 0) {
      reasons.push(`Needs current data: ${signals.currentDataRequests.join(', ')}`);
    }
    
    if (signals.unknownEntities.length > 0) {
      reasons.push(`Contains potentially new entities: ${signals.unknownEntities.slice(0, 3).join(', ')}`);
    }
    
    return reasons;
  }

  /**
   * Optimize the query for better web search results
   */
  private optimizeQuery(originalQuery: string, signals: DetectionSignals): string {
    let optimizedQuery = originalQuery;
    
    // Add current year if not present but query seems time-sensitive
    const currentYear = new Date().getFullYear();
    if (signals.timeSensitive.length > 0 && signals.recentYears.length === 0) {
      optimizedQuery += ` ${currentYear}`;
    }
    
    // Add "latest" for comparative queries without time indicators
    if (signals.comparativeQueries.length > 0 && signals.timeSensitive.length === 0) {
      optimizedQuery = `latest ${optimizedQuery}`;
    }
    
    return optimizedQuery;
  }

  /**
   * Check if a query explicitly requests web search to be disabled
   */
  isWebSearchExplicitlyDisabled(query: string): boolean {
    const disablePatterns = [
      /don't search/i,
      /no web search/i,
      /offline only/i,
      /without searching/i,
      /from your knowledge/i,
      /what do you know about/i
    ];
    
    return disablePatterns.some(pattern => pattern.test(query));
  }

  /**
   * Get a user-friendly explanation of why web search was triggered
   */
  getSearchExplanation(trigger: WebSearchTrigger): string {
    if (!trigger.shouldTrigger) {
      return '';
    }
    
    const confidencePercent = Math.round(trigger.confidence * 100);
    const primaryReason = trigger.reasons[0] || 'Query appears to need current information';
    
    return `Web search triggered automatically (${confidencePercent}% confidence) - ${primaryReason}`;
  }
}

// Singleton instance
export const webSearchDetectionService = new WebSearchDetectionService();