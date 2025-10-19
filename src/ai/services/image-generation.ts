/**
 * AI Image Generation Service
 * Handles educational diagram and illustration generation
 */

import { ai } from '@/ai/genkit';

export interface ImageGenerationRequest {
  concept: string;
  description: string;
  style?: 'diagram' | 'illustration' | 'chart' | 'flowchart' | 'infographic';
  complexity?: 'simple' | 'medium' | 'detailed';
  colorScheme?: 'monochrome' | 'colorful' | 'professional' | 'educational';
  format?: 'square' | 'landscape' | 'portrait';
}

export interface ImageGenerationResult {
  imageUrl?: string;
  imageDataUri?: string;
  altText: string;
  description: string;
  fallbackSvg?: string;
  metadata: {
    concept: string;
    style: string;
    generatedAt: string;
    model: string;
  };
}

export class ImageGenerationService {
  private readonly fallbackEnabled = true;

  /**
   * Generate educational image/diagram
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const {
      concept,
      description,
      style = 'diagram',
      complexity = 'medium',
      colorScheme = 'educational',
      format = 'square'
    } = request;

    try {
      // Try Google AI image generation first
      const result = await this.generateWithGoogleAI(request);
      if (result) return result;
    } catch (error) {
      console.warn('Google AI image generation failed:', error);
    }

    try {
      // Fallback to OpenAI DALL-E if available
      const result = await this.generateWithOpenAI(request);
      if (result) return result;
    } catch (error) {
      console.warn('OpenAI image generation failed:', error);
    }

    // Generate SVG fallback
    return this.generateSVGFallback(request);
  }

  /**
   * Generate image using Google AI (Imagen)
   */
  private async generateWithGoogleAI(request: ImageGenerationRequest): Promise<ImageGenerationResult | null> {
    try {
      const prompt = this.createOptimizedPrompt(request);
      
      // Note: This is a placeholder for Google AI image generation
      // You would need to implement the actual Google AI Imagen API call
      const response = await ai.generate({
        model: 'googleai/imagen-3.0-generate-001', // Hypothetical model name
        prompt: prompt,
        config: {
          aspectRatio: this.getAspectRatio(request.format),
          style: request.style,
          quality: 'high'
        }
      });

      if (response && 'imageUrl' in response) {
        return {
          imageUrl: (response as any).imageUrl,
          altText: `${request.concept} - ${request.description}`,
          description: request.description,
          metadata: {
            concept: request.concept,
            style: request.style || 'diagram',
            generatedAt: new Date().toISOString(),
            model: 'google-ai-imagen'
          }
        };
      }
    } catch (error) {
      console.error('Google AI image generation error:', error);
    }

    return null;
  }

  /**
   * Generate image using OpenAI DALL-E
   */
  private async generateWithOpenAI(request: ImageGenerationRequest): Promise<ImageGenerationResult | null> {
    try {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const prompt = this.createOptimizedPrompt(request);
      
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: this.getOpenAISize(request.format),
          quality: 'standard',
          response_format: 'url'
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.data && data.data[0] && data.data[0].url) {
        return {
          imageUrl: data.data[0].url,
          altText: `${request.concept} - ${request.description}`,
          description: request.description,
          metadata: {
            concept: request.concept,
            style: request.style || 'diagram',
            generatedAt: new Date().toISOString(),
            model: 'openai-dall-e-3'
          }
        };
      }
    } catch (error) {
      console.error('OpenAI image generation error:', error);
    }

    return null;
  }

  /**
   * Generate SVG fallback diagram
   */
  private generateSVGFallback(request: ImageGenerationRequest): ImageGenerationResult {
    const svg = this.createEducationalSVG(request);
    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    return {
      imageDataUri: dataUri,
      altText: `${request.concept} - ${request.description}`,
      description: request.description,
      fallbackSvg: svg,
      metadata: {
        concept: request.concept,
        style: request.style || 'diagram',
        generatedAt: new Date().toISOString(),
        model: 'svg-fallback'
      }
    };
  }

  /**
   * Create optimized prompt for AI image generation
   */
  private createOptimizedPrompt(request: ImageGenerationRequest): string {
    const {
      concept,
      description,
      style = 'diagram',
      complexity = 'medium',
      colorScheme = 'educational'
    } = request;

    const stylePrompts = {
      diagram: 'clean technical diagram with clear labels and arrows',
      illustration: 'educational illustration with friendly, approachable design',
      chart: 'professional chart or graph with clear data visualization',
      flowchart: 'structured flowchart with connected boxes and decision points',
      infographic: 'modern infographic with icons, text, and visual elements'
    };

    const complexityPrompts = {
      simple: 'minimalist design with essential elements only',
      medium: 'balanced detail with clear hierarchy and organization',
      detailed: 'comprehensive visualization with rich detail and annotations'
    };

    const colorPrompts = {
      monochrome: 'black and white with grayscale shading',
      colorful: 'vibrant colors that enhance understanding',
      professional: 'professional color palette with blues and grays',
      educational: 'friendly educational colors that aid learning'
    };

    return `Create a ${stylePrompts[style]} for "${concept}". ${description}. 
    Style: ${complexityPrompts[complexity]}, ${colorPrompts[colorScheme]}. 
    Educational context, clear and easy to understand, suitable for learning materials. 
    High quality, professional appearance, optimized for digital display.`;
  }

  /**
   * Create educational SVG diagram
   */
  private createEducationalSVG(request: ImageGenerationRequest): string {
    const { concept, description, style = 'diagram' } = request;
    
    // Generate different SVG types based on style
    switch (style) {
      case 'flowchart':
        return this.createFlowchartSVG(concept, description);
      case 'chart':
        return this.createChartSVG(concept, description);
      case 'infographic':
        return this.createInfographicSVG(concept, description);
      default:
        return this.createDiagramSVG(concept, description);
    }
  }

  private createDiagramSVG(concept: string, description: string): string {
    return `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:0.1" />
            <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:0.1" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="400" height="300" fill="url(#grad1)" stroke="#E5E7EB" stroke-width="2" rx="8"/>
        
        <!-- Title -->
        <text x="200" y="30" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#1F2937">
          ${concept}
        </text>
        
        <!-- Main diagram elements -->
        <g transform="translate(50, 60)">
          <!-- Central concept box -->
          <rect x="125" y="80" width="150" height="60" fill="#EEF2FF" stroke="#4F46E5" stroke-width="2" rx="8"/>
          <text x="200" y="105" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#1F2937">
            Main Concept
          </text>
          <text x="200" y="125" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">
            ${concept}
          </text>
          
          <!-- Connected elements -->
          <rect x="25" y="20" width="100" height="40" fill="#FEF3C7" stroke="#F59E0B" stroke-width="1" rx="4"/>
          <text x="75" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#92400E">
            Component 1
          </text>
          <text x="75" y="50" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#B45309">
            Input
          </text>
          
          <rect x="275" y="20" width="100" height="40" fill="#DCFCE7" stroke="#22C55E" stroke-width="1" rx="4"/>
          <text x="325" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#15803D">
            Component 2
          </text>
          <text x="325" y="50" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#166534">
            Output
          </text>
          
          <!-- Arrows -->
          <path d="M 125 40 L 175 80" stroke="#6B7280" stroke-width="2" marker-end="url(#arrowhead)"/>
          <path d="M 225 80 L 275 40" stroke="#6B7280" stroke-width="2" marker-end="url(#arrowhead)"/>
        </g>
        
        <!-- Description -->
        <text x="200" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#6B7280">
          ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}
        </text>
        
        <!-- Arrow marker -->
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#6B7280"/>
          </marker>
        </defs>
      </svg>
    `;
  }

  private createFlowchartSVG(concept: string, description: string): string {
    return `
      <svg width="400" height="350" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="400" height="350" fill="#FAFAFA" stroke="#E5E7EB" stroke-width="1" rx="8"/>
        
        <!-- Title -->
        <text x="200" y="25" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1F2937">
          ${concept} Flowchart
        </text>
        
        <!-- Start -->
        <ellipse cx="200" cy="60" rx="40" ry="20" fill="#EEF2FF" stroke="#4F46E5" stroke-width="2"/>
        <text x="200" y="65" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#1F2937">Start</text>
        
        <!-- Process 1 -->
        <rect x="150" y="100" width="100" height="40" fill="#FEF3C7" stroke="#F59E0B" stroke-width="2" rx="4"/>
        <text x="200" y="115" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#92400E">Process 1</text>
        <text x="200" y="130" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#B45309">Initialize</text>
        
        <!-- Decision -->
        <polygon points="200,160 240,180 200,200 160,180" fill="#FECACA" stroke="#EF4444" stroke-width="2"/>
        <text x="200" y="185" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#DC2626">Decision?</text>
        
        <!-- Process 2 -->
        <rect x="100" y="220" width="80" height="35" fill="#DCFCE7" stroke="#22C55E" stroke-width="2" rx="4"/>
        <text x="140" y="235" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#15803D">Yes Path</text>
        <text x="140" y="248" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#166534">Execute</text>
        
        <!-- Process 3 -->
        <rect x="220" y="220" width="80" height="35" fill="#FEE2E2" stroke="#F87171" stroke-width="2" rx="4"/>
        <text x="260" y="235" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#DC2626">No Path</text>
        <text x="260" y="248" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#B91C1C">Handle</text>
        
        <!-- End -->
        <ellipse cx="200" cy="290" rx="40" ry="20" fill="#EEF2FF" stroke="#4F46E5" stroke-width="2"/>
        <text x="200" y="295" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#1F2937">End</text>
        
        <!-- Arrows -->
        <path d="M 200 80 L 200 100" stroke="#6B7280" stroke-width="2" marker-end="url(#arrowhead)"/>
        <path d="M 200 140 L 200 160" stroke="#6B7280" stroke-width="2" marker-end="url(#arrowhead)"/>
        <path d="M 180 190 L 150 220" stroke="#6B7280" stroke-width="2" marker-end="url(#arrowhead)"/>
        <path d="M 220 190 L 250 220" stroke="#6B7280" stroke-width="2" marker-end="url(#arrowhead)"/>
        <path d="M 140 255 L 180 280" stroke="#6B7280" stroke-width="2" marker-end="url(#arrowhead)"/>
        <path d="M 260 255 L 220 280" stroke="#6B7280" stroke-width="2" marker-end="url(#arrowhead)"/>
        
        <!-- Labels -->
        <text x="165" y="210" font-family="Arial, sans-serif" font-size="8" fill="#059669">Yes</text>
        <text x="235" y="210" font-family="Arial, sans-serif" font-size="8" fill="#DC2626">No</text>
        
        <!-- Arrow marker -->
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#6B7280"/>
          </marker>
        </defs>
      </svg>
    `;
  }

  private createChartSVG(concept: string, description: string): string {
    return `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="400" height="300" fill="#FAFAFA" stroke="#E5E7EB" stroke-width="1" rx="8"/>
        
        <!-- Title -->
        <text x="200" y="25" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1F2937">
          ${concept} Chart
        </text>
        
        <!-- Chart area -->
        <g transform="translate(60, 50)">
          <!-- Axes -->
          <line x1="0" y1="200" x2="280" y2="200" stroke="#6B7280" stroke-width="2"/>
          <line x1="0" y1="0" x2="0" y2="200" stroke="#6B7280" stroke-width="2"/>
          
          <!-- Y-axis labels -->
          <text x="-10" y="15" text-anchor="end" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">100</text>
          <text x="-10" y="55" text-anchor="end" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">75</text>
          <text x="-10" y="95" text-anchor="end" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">50</text>
          <text x="-10" y="135" text-anchor="end" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">25</text>
          <text x="-10" y="205" text-anchor="end" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">0</text>
          
          <!-- Bars -->
          <rect x="20" y="80" width="40" height="120" fill="#4F46E5" opacity="0.8"/>
          <rect x="80" y="40" width="40" height="160" fill="#7C3AED" opacity="0.8"/>
          <rect x="140" y="120" width="40" height="80" fill="#EC4899" opacity="0.8"/>
          <rect x="200" y="60" width="40" height="140" fill="#10B981" opacity="0.8"/>
          
          <!-- X-axis labels -->
          <text x="40" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">A</text>
          <text x="100" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">B</text>
          <text x="160" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">C</text>
          <text x="220" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">D</text>
          
          <!-- Grid lines -->
          <line x1="0" y1="50" x2="280" y2="50" stroke="#E5E7EB" stroke-width="1" opacity="0.5"/>
          <line x1="0" y1="100" x2="280" y2="100" stroke="#E5E7EB" stroke-width="1" opacity="0.5"/>
          <line x1="0" y1="150" x2="280" y2="150" stroke="#E5E7EB" stroke-width="1" opacity="0.5"/>
        </g>
        
        <!-- Legend -->
        <g transform="translate(60, 270)">
          <text x="0" y="0" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">
            ${description.substring(0, 40)}${description.length > 40 ? '...' : ''}
          </text>
        </g>
      </svg>
    `;
  }

  private createInfographicSVG(concept: string, description: string): string {
    return `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="400" height="400" fill="url(#infoBg)" stroke="#E5E7EB" stroke-width="1" rx="12"/>
        
        <!-- Title section -->
        <rect x="20" y="20" width="360" height="60" fill="#4F46E5" rx="8"/>
        <text x="200" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white">
          ${concept}
        </text>
        <text x="200" y="65" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#E0E7FF">
          Educational Overview
        </text>
        
        <!-- Info sections -->
        <g transform="translate(40, 100)">
          <!-- Section 1 -->
          <circle cx="30" cy="30" r="20" fill="#EEF2FF" stroke="#4F46E5" stroke-width="2"/>
          <text x="30" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#4F46E5">1</text>
          <text x="70" y="25" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#1F2937">Key Point 1</text>
          <text x="70" y="40" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">Essential concept explanation</text>
          
          <!-- Section 2 -->
          <circle cx="30" cy="90" r="20" fill="#FEF3C7" stroke="#F59E0B" stroke-width="2"/>
          <text x="30" y="95" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#F59E0B">2</text>
          <text x="70" y="85" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#1F2937">Key Point 2</text>
          <text x="70" y="100" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">Important details and context</text>
          
          <!-- Section 3 -->
          <circle cx="30" cy="150" r="20" fill="#DCFCE7" stroke="#22C55E" stroke-width="2"/>
          <text x="30" y="155" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#22C55E">3</text>
          <text x="70" y="145" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#1F2937">Key Point 3</text>
          <text x="70" y="160" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">Practical applications</text>
          
          <!-- Visual element -->
          <rect x="200" y="20" width="120" height="80" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="1" rx="8"/>
          <text x="260" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">Visual</text>
          <text x="260" y="60" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">Representation</text>
          <text x="260" y="75" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">Area</text>
          
          <!-- Stats box -->
          <rect x="200" y="120" width="120" height="60" fill="#EEF2FF" stroke="#4F46E5" stroke-width="1" rx="8"/>
          <text x="260" y="140" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#4F46E5">Quick Stats</text>
          <text x="260" y="155" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#6B7280">• Fact 1: Important</text>
          <text x="260" y="170" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#6B7280">• Fact 2: Relevant</text>
        </g>
        
        <!-- Footer -->
        <rect x="20" y="340" width="360" height="40" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1" rx="8"/>
        <text x="200" y="365" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">
          ${description.substring(0, 60)}${description.length > 60 ? '...' : ''}
        </text>
        
        <!-- Background gradient -->
        <defs>
          <linearGradient id="infoBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#FEFEFE;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#F8FAFC;stop-opacity:1" />
          </linearGradient>
        </defs>
      </svg>
    `;
  }

  private getAspectRatio(format?: string): string {
    switch (format) {
      case 'landscape': return '16:9';
      case 'portrait': return '9:16';
      default: return '1:1';
    }
  }

  private getOpenAISize(format?: string): string {
    switch (format) {
      case 'landscape': return '1792x1024';
      case 'portrait': return '1024x1792';
      default: return '1024x1024';
    }
  }
}

// Singleton instance
export const imageGenerationService = new ImageGenerationService();

// Helper function for easy integration
export async function generateEducationalImage(
  concept: string,
  description: string,
  options?: Partial<ImageGenerationRequest>
): Promise<ImageGenerationResult> {
  return await imageGenerationService.generateImage({
    concept,
    description,
    ...options
  });
}