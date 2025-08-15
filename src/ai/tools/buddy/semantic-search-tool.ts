import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { 
  semanticSearchService,
  type IndexContentRequest,
  type SemanticSearchRequest,
  type SimilarContentRequest 
} from '@/ai/services/semantic-search';

export const semanticSearchTool = ai.defineTool(
  {
    name: 'semanticSearch',
    description: 'Search for semantically similar content using vector embeddings. Finds content based on meaning and context rather than just keyword matching.',
    inputSchema: z.object({
      query: z.string().describe('The search query or concept to find similar content for'),
      contentTypes: z.array(z.enum(['web', 'lesson', 'exercise', 'document'])).optional().describe('Types of content to search in'),
      limit: z.number().optional().default(5).describe('Maximum number of results to return'),
      minSimilarity: z.number().optional().default(0.3).describe('Minimum similarity threshold (0-1)')
    }),
    outputSchema: z.string(),
  },
  async ({ query, contentTypes, limit, minSimilarity }) => {
    try {
      const results = await semanticSearchService.search({
        query,
        options: { limit, minSimilarity, contentTypes }
      });
      
      if (results.length === 0) {
        return `🔍 **No Results Found**\n\nNo semantically similar content found for "${query}". Try a broader query or lower the similarity threshold.`;
      }
      
      let response = `🧠 **Semantic Search Results for "${query}"**\n\n`;
      
      results.forEach((result, index) => {
        const similarityPercent = Math.round(result.similarity * 100);
        const qualityIcon = result.vector.metadata.quality === 'high' ? '🟢' : 
                           result.vector.metadata.quality === 'medium' ? '🟡' : '🟠';
        const typeIcon = result.vector.metadata.contentType === 'web' ? '🌐' : 
                        result.vector.metadata.contentType === 'lesson' ? '📚' : 
                        result.vector.metadata.contentType === 'exercise' ? '💪' : '📄';
        
        response += `**${index + 1}. ${result.vector.metadata.title || 'Untitled'}**\n`;
        response += `${qualityIcon} ${typeIcon} ${similarityPercent}% similar\n`;
        
        if (result.vector.metadata.url) {
          response += `🔗 ${result.vector.metadata.url}\n`;
        }
        
        response += `📝 ${result.vector.content.substring(0, 150)}${result.vector.content.length > 150 ? '...' : ''}\n\n`;
      });
      
      const stats = semanticSearchService.getStats();
      response += `---\n📊 Vector Store: ${stats.totalVectors} items | Last updated: ${new Date(stats.lastUpdated).toLocaleString()}`;
      
      return response;
      
    } catch (error) {
      console.error('Error in semantic search tool:', error);
      return `❌ **Semantic Search Error**: ${error}`;
    }
  }
);

export const indexContentTool = ai.defineTool(
  {
    name: 'indexContent',
    description: 'Index content for semantic search. Adds content to the vector store for future similarity matching.',
    inputSchema: z.object({
      content: z.string().describe('The content to index'),
      title: z.string().optional().describe('Title of the content'),
      url: z.string().optional().describe('URL of the content source'),
      contentType: z.enum(['web', 'lesson', 'exercise', 'document']).default('document').describe('Type of content being indexed'),
      quality: z.enum(['high', 'medium', 'low']).optional().describe('Quality assessment (auto-assessed if not provided)')
    }),
    outputSchema: z.string(),
  },
  async ({ content, title, url, contentType, quality }) => {
    try {
      const vectorId = await semanticSearchService.indexContent({
        content, title, url, contentType, quality
      });
      
      const stats = semanticSearchService.getStats();
      
      return `✅ **Content Indexed**\n\n` +
             `📝 "${title || 'Untitled'}" (${content.length} chars)\n` +
             `🏷️ Type: ${contentType} | Quality: ${quality || 'auto-assessed'}\n` +
             `🆔 ID: ${vectorId}\n` +
             `📊 Total indexed: ${stats.totalVectors} items`;
             
    } catch (error) {
      console.error('Error indexing content:', error);
      return `❌ **Indexing Failed**: ${error}`;
    }
  }
);

export const findSimilarContentTool = ai.defineTool(
  {
    name: 'findSimilarContent',
    description: 'Find content similar to a given piece of text. Useful for discovering related materials or identifying duplicate content.',
    inputSchema: z.object({
      content: z.string().describe('The content to find similar matches for'),
      limit: z.number().optional().default(3).describe('Maximum number of similar content pieces to return'),
      minSimilarity: z.number().optional().default(0.4).describe('Minimum similarity threshold (0-1)'),
      excludeUrl: z.string().optional().describe('URL to exclude from results')
    }),
    outputSchema: z.string(),
  },
  async ({ content, limit, minSimilarity, excludeUrl }) => {
    try {
      const results = await semanticSearchService.findSimilar({
        content, excludeUrl, limit, minSimilarity
      });
      
      if (results.length === 0) {
        return `🔍 **No Similar Content Found**\n\nTry lowering the similarity threshold or indexing more related content.`;
      }
      
      let response = `🔍 **Similar Content Found**\n\n`;
      
      results.forEach((result, index) => {
        const similarityPercent = Math.round(result.similarity * 100);
        const qualityIcon = result.vector.metadata.quality === 'high' ? '🟢' : 
                           result.vector.metadata.quality === 'medium' ? '🟡' : '🟠';
        const typeIcon = result.vector.metadata.contentType === 'web' ? '🌐' : 
                        result.vector.metadata.contentType === 'lesson' ? '📚' : 
                        result.vector.metadata.contentType === 'exercise' ? '💪' : '📄';
        
        response += `**${index + 1}. ${result.vector.metadata.title || 'Untitled'}**\n`;
        response += `${qualityIcon} ${typeIcon} ${similarityPercent}% similar\n`;
        
        if (result.vector.metadata.url) {
          response += `🔗 ${result.vector.metadata.url}\n`;
        }
        
        response += `📝 ${result.vector.content.substring(0, 150)}${result.vector.content.length > 150 ? '...' : ''}\n\n`;
      });
      
      return response;
      
    } catch (error) {
      console.error('Error finding similar content:', error);
      return `❌ **Similar Content Error**: ${error}`;
    }
  }
);

// These functions are deprecated - use semanticSearchService directly