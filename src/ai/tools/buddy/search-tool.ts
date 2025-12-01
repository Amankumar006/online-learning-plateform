import { ai } from '@/ai/ai';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import { semanticSearchService } from '@/ai/services/semantic-search';

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  domain: string;
  index: number;
  scrapedContent?: string;
  contentLength?: number;
  lastModified?: string;
}

interface GoogleSearchResponse {
  items?: any[];
  searchInformation?: {
    totalResults?: string;
    searchTime?: string;
  };
}

interface ScrapedContent {
  content: string;
  contentLength: number;
  lastModified?: string;
  title?: string;
}

// Scrape content from a webpage with improved error handling
async function scrapePageContent(url: string): Promise<ScrapedContent | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BuddyAI/1.0; Educational Assistant)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new Error('Not an HTML page');
    }

    const html = await response.text();
    const lastModified = response.headers.get('last-modified');
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads, .sidebar, .menu, .navigation, .breadcrumb, .social-share, .comments, .related-posts, iframe, .popup, .modal').remove();

    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim();

    // Extract main content with priority selectors
    let textContent = '';
    const contentSelectors = [
      'main article',
      'main .content',
      'main',
      'article .content',
      'article',
      '[role="main"]',
      '.main-content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.content-body',
      '.markdown-body',
      '.post-body',
      '.content'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0 && element.text().trim().length > 100) {
        textContent = element.text();
        break;
      }
    }

    // Fallback to paragraphs if no main content found
    if (!textContent || textContent.length < 100) {
      const paragraphs = $('p').map((i, el) => $(el).text().trim()).get();
      textContent = paragraphs.filter((p: string) => p.length > 20).slice(0, 10).join(' ');
    }

    // Clean up text content
    textContent = textContent
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .replace(/\t+/g, ' ')
      .trim()
      .replace(/Skip to main content/gi, '')
      .replace(/Cookie policy/gi, '')
      .replace(/Privacy policy/gi, '')
      .replace(/Terms of service/gi, '')
      .replace(/Subscribe to newsletter/gi, '')
      .replace(/Follow us on/gi, '');

    // Limit content length but try to end at sentence boundaries
    const maxLength = 3000;
    if (textContent.length > maxLength) {
      const truncated = textContent.substring(0, maxLength);
      const lastSentence = truncated.lastIndexOf('.');
      if (lastSentence > maxLength * 0.8) {
        textContent = truncated.substring(0, lastSentence + 1);
      } else {
        textContent = truncated + '...';
      }
    }

    return {
      content: textContent,
      contentLength: textContent.length,
      lastModified: lastModified || undefined,
      title: title
    };

  } catch (error) {
    console.warn(`Failed to scrape ${url}:`, error);
    return null;
  }
}

// Create synthesized answer from search results
function createSynthesizedAnswer(query: string, results: SearchResult[]): string {
  const header = `Based on my search for "${query}", here's what I found from **${results.length} current sources**:\n\n`;
  
  // Extract key information from all sources
  const allContent = results.map((r: SearchResult) => ({
    content: r.scrapedContent || r.snippet,
    index: r.index,
    domain: r.domain,
    title: r.title
  }));

  const synthesizedContent = synthesizeContentDynamically(allContent);
  return header + synthesizedContent;
}

// Dynamic content synthesis
function synthesizeContentDynamically(sources: any[]): string {
  let synthesis = '';
  
  // Extract key entities and information
  const entities = extractKeyEntities(sources);
  const insights = extractKeyInsights(sources);
  
  if (entities.length > 0) {
    synthesis += `Here are the key findings:\n\n`;
    
    entities.forEach((entity, index) => {
      const citations = entity.sources.map((i: number) => `[${i}]`).join('');
      synthesis += `**${index + 1}. ${entity.name}**: ${entity.description} ${citations}\n\n`;
    });
  }
  
  // Add synthesized insights
  if (insights.length > 0) {
    synthesis += insights.map((insight, index) => {
      const citations = insight.sources.map((i: number) => `[${i}]`).join('');
      return `${insight.text} ${citations}`;
    }).join(' ') + '\n\n';
  }
  
  return synthesis;
}

// Extract key entities from content
function extractKeyEntities(sources: any[]): Array<{name: string, description: string, sources: number[]}> {
  const entities: Array<{name: string, description: string, sources: number[]}> = [];
  const entityMap = new Map<string, {description: string, sources: number[]}>();
  
  sources.forEach(source => {
    const content = source.content;
    const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 20);
    
    sentences.forEach((sentence: string) => {
      // Look for patterns like "X is a/an Y that Z"
      const patterns = [
        /([A-Z][a-zA-Z\s]+?)\s+is\s+(?:a|an)\s+([^.]+?)(?:that|which)\s+([^.]+)/gi,
        /([A-Z][a-zA-Z\s]+?):\s*([^.]+)/gi,
        /\*\*([^*]+)\*\*[:\s]*([^.]+)/gi,
        /(\d+\.\s*)?([A-Z][a-zA-Z\s]+?)(?:\s*-\s*|\s*:\s*)([^.]+)/gi
      ];
      
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(sentence)) !== null) {
          const name = match[2] || match[1];
          const description = match[3] || match[2];
          
          if (name && description && name.length < 50 && description.length < 200) {
            const cleanName = name.trim().replace(/^\d+\.\s*/, '');
            const cleanDescription = description.trim();
            
            if (cleanName.length > 2 && cleanDescription.length > 10) {
              const existing = entityMap.get(cleanName) || { description: '', sources: [] };
              if (!existing.description || cleanDescription.length > existing.description.length) {
                existing.description = cleanDescription;
              }
              if (!existing.sources.includes(source.index)) {
                existing.sources.push(source.index);
              }
              entityMap.set(cleanName, existing);
            }
          }
        }
      });
    });
  });
  
  // Convert map to array and sort by relevance
  for (const [name, info] of entityMap.entries()) {
    entities.push({
      name,
      description: info.description,
      sources: info.sources
    });
  }
  
  return entities
    .sort((a, b) => b.sources.length - a.sources.length)
    .slice(0, 8);
}

// Extract key insights from content
function extractKeyInsights(sources: any[]): Array<{text: string, sources: number[]}> {
  const insights: Array<{text: string, sources: number[]}> = [];
  
  sources.forEach(source => {
    const content = source.content;
    const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 30);
    
    const insightPatterns = [
      /(?:These|This|The|Most|Many|Some)\s+[^.]+?(?:provide|offer|help|enable|allow|transform|improve)[^.]+/gi,
      /(?:Key|Main|Primary|Important)\s+(?:features|benefits|advantages|considerations)[^.]+/gi,
      /(?:Popular|Leading|Top|Best)\s+(?:choices|options|tools|solutions)[^.]+/gi
    ];
    
    sentences.forEach((sentence: string) => {
      insightPatterns.forEach(pattern => {
        const matches = sentence.match(pattern);
        if (matches) {
          matches.forEach(match => {
            if (match.length > 50 && match.length < 300) {
              insights.push({
                text: match.trim(),
                sources: [source.index]
              });
            }
          });
        }
      });
    });
  });
  
  // Remove duplicates and limit
  const uniqueInsights = insights
    .filter((insight, index, self) => 
      index === self.findIndex(i => i.text.toLowerCase() === insight.text.toLowerCase())
    )
    .slice(0, 3);
  
  return uniqueInsights;
}

// Get domain-specific icons
function getDomainIcon(domain: string): string {
  const d = domain.toLowerCase();
  if (d.includes('github.com')) return '💻';
  if (d.includes('stackoverflow.com') || d.includes('stackexchange.com')) return '❓';
  if (d.includes('medium.com')) return '📰';
  if (d.includes('dev.to')) return '👨‍💻';
  if (d.includes('docs') || d.includes('documentation')) return '📋';
  if (d.includes('wikipedia.org')) return '📚';
  if (d.includes('reddit.com')) return '💬';
  if (d.includes('youtube.com')) return '📺';
  if (d.includes('blog')) return '✍️';
  return '🌐';
}

// Create sources section
function createSourcesSection(results: SearchResult[]): string {
  const sourcesHeader = `\n\n### Sources\n\n`;
  
  const sources = results.map((r: SearchResult, index: number) => {
    const domainIcon = getDomainIcon(r.domain);
    const qualityIcon = r.scrapedContent ? 
      (r.scrapedContent.length > 500 ? '🟢' : r.scrapedContent.length > 200 ? '🟡' : '🟠') : '🔴';
    
    return `${qualityIcon} **[${index + 1}]** ${domainIcon} [${r.title}](${r.link})`;
  }).join('\n');

  return sourcesHeader + sources;
}

export const searchTheWebTool = ai.defineTool(
  {
    name: 'searchTheWeb',
    description: 'Search the web for current, up-to-date information. Use for current rankings, "top X" lists, latest versions, recent developments, current trends, or any question requiring real-time data.',
    inputSchema: z.object({ 
      query: z.string().describe("The user's question or topic to search for.") 
    }),
    outputSchema: z.string(),
  },
  async ({ query }) => {
    console.log('🔍 Web search tool invoked with query:', query);
    
    try {
      const apiKey = process.env.GOOGLE_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

      if (!apiKey || !searchEngineId) {
        return "🔧 **Web Search Configuration Issue**\n\nI'm unable to search the web right now because the search service isn't properly configured. I can still help you with general knowledge and study materials!";
      }

      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Google Search API Error:", errorData);
        return `🚫 **Web Search Error**\n\nI encountered an issue while searching: ${errorData.error?.message || 'Unknown error'}`;
      }

      const data: GoogleSearchResponse = await response.json();

      if (!data.items || data.items.length === 0) {
        return `🔍 **No Search Results Found**\n\nI couldn't find any current web results for "${query}". Try rephrasing your question with different keywords.`;
      }

      // Process search results and attempt to scrape content
      const searchResults: SearchResult[] = await Promise.all(
        data.items.slice(0, 5).map(async (item: any, index: number) => {
          const url = new URL(item.link);
          const result: SearchResult = {
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            domain: url.hostname,
            index: index + 1
          };

          // Attempt to scrape additional content
          try {
            const scrapedContent = await scrapePageContent(item.link);
            if (scrapedContent) {
              result.scrapedContent = scrapedContent.content;
              result.contentLength = scrapedContent.contentLength;
              result.lastModified = scrapedContent.lastModified;
            }
          } catch (error) {
            console.warn(`Failed to scrape content from ${item.link}:`, error);
          }

          return result;
        })
      );

      // Index the search results for future semantic search
      const indexableResults = searchResults
        .filter(r => r.scrapedContent && r.scrapedContent.length > 100)
        .map(r => ({
          title: r.title,
          content: r.scrapedContent!,
          url: r.link,
          domain: r.domain,
          quality: r.scrapedContent!.length > 500 ? 'high' as const : 
                  r.scrapedContent!.length > 200 ? 'medium' as const : 'low' as const
        }));
      
      // Index content asynchronously
      if (indexableResults.length > 0) {
        semanticSearchService.indexWebResults(indexableResults).catch(error => 
          console.warn('Failed to index web content:', error)
        );
      }
      
      // Create synthesized answer
      const synthesizedAnswer = createSynthesizedAnswer(query, searchResults);
      
      // Check for semantically similar content
      const similarContent = await semanticSearchService.search({
        query,
        options: {
          limit: 3,
          minSimilarity: 0.4,
          contentTypes: ['web']
        }
      }).catch(() => []);
      
      // Create sources section
      const sourcesSection = createSourcesSection(searchResults);
      
      // Add related content if found
      let relatedSection = '';
      if (similarContent.length > 0) {
        relatedSection = `\n\n### 🧠 Related Content (Semantic Search)\n\n`;
        relatedSection += `Found ${similarContent.length} semantically related content pieces:\n\n`;
        
        similarContent.forEach((result, index) => {
          const similarityPercent = Math.round(result.similarity * 100);
          relatedSection += `**${index + 1}.** ${result.vector.metadata.title || 'Untitled'} (${similarityPercent}% similar)\n`;
          if (result.vector.metadata.url) {
            relatedSection += `🔗 ${result.vector.metadata.url}\n`;
          }
          relatedSection += `📄 ${result.vector.content.substring(0, 100)}...\n\n`;
        });
      }
      
      // Create search metadata
      const scrapedCount = searchResults.filter(r => r.scrapedContent).length;
      const metadataSection = `\n\n---\n\n### 🔍 Search Report\n\n` +
        `**Query:** "${query}"\n` +
        `**Sources Analyzed:** ${searchResults.length} results\n` +
        `**Content Extracted:** ${scrapedCount}/${searchResults.length} pages\n` +
        `**Success Rate:** ${Math.round((scrapedCount / searchResults.length) * 100)}%\n`;
      
      return synthesizedAnswer + sourcesSection + relatedSection + metadataSection;
      
    } catch (error) {
      console.error('Error in web search tool:', error);
      return `❌ **Web Search Error**\n\nEncountered an unexpected issue: ${error}\n\nPlease try again with a different query.`;
    }
  }
);