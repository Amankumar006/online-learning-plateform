/**
 * AI Services Configuration
 * Central configuration for all AI-powered services
 */

export interface AIServicesConfig {
  vectorStore: {
    persistent: boolean;
    storageFile: string;
    maxVectors: number;
    cleanupThreshold: number;
    embeddingDimensions: number;
  };
  imageGeneration: {
    enabled: boolean;
    primaryProvider: 'google-ai' | 'openai' | 'fallback';
    fallbackToSVG: boolean;
    maxRetries: number;
  };
  codeAnalysis: {
    enabled: boolean;
    useAIAnalysis: boolean;
    maxCodeLength: number;
    supportedLanguages: string[];
  };
  nlp: {
    enabled: boolean;
    useAIAnalysis: boolean;
    maxContentLength: number;
    confidenceThreshold: number;
    enableTopicExtraction: boolean;
    enableIntentClassification: boolean;
    enableSemanticSimilarity: boolean;
    enableContentUnderstanding: boolean;
  };
  apis: {
    googleAI: {
      enabled: boolean;
      models: {
        embedding: string;
        chat: string;
        vision: string;
      };
    };
    openAI: {
      enabled: boolean;
      models: {
        imageGeneration: string;
        codeAnalysis: string;
      };
    };
  };
}

export const defaultConfig: AIServicesConfig = {
  vectorStore: {
    persistent: true,
    storageFile: 'vector-store.json',
    maxVectors: 1000,
    cleanupThreshold: 1100,
    embeddingDimensions: 384
  },
  imageGeneration: {
    enabled: true,
    primaryProvider: 'openai',
    fallbackToSVG: true,
    maxRetries: 2
  },
  codeAnalysis: {
    enabled: true,
    useAIAnalysis: true,
    maxCodeLength: 10000,
    supportedLanguages: [
      'javascript', 'typescript', 'python', 'java', 'cpp', 'c',
      'csharp', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin'
    ]
  },
  nlp: {
    enabled: true,
    useAIAnalysis: true,
    maxContentLength: 5000,
    confidenceThreshold: 0.3,
    enableTopicExtraction: true,
    enableIntentClassification: true,
    enableSemanticSimilarity: true,
    enableContentUnderstanding: true
  },
  apis: {
    googleAI: {
      enabled: !!process.env.GOOGLE_API_KEY,
      models: {
        embedding: 'googleai/text-embedding-004',
        chat: 'googleai/gemini-1.5-flash',
        vision: 'googleai/gemini-1.5-flash'
      }
    },
    openAI: {
      enabled: !!process.env.OPENAI_API_KEY,
      models: {
        imageGeneration: 'dall-e-3',
        codeAnalysis: 'gpt-4'
      }
    }
  }
};

// Environment-based configuration
export function getAIServicesConfig(): AIServicesConfig {
  const config = { ...defaultConfig };

  // Override based on environment variables
  if (process.env.VECTOR_STORE_PERSISTENT === 'false') {
    config.vectorStore.persistent = false;
  }

  if (process.env.IMAGE_GENERATION_ENABLED === 'false') {
    config.imageGeneration.enabled = false;
  }

  if (process.env.CODE_ANALYSIS_ENABLED === 'false') {
    config.codeAnalysis.enabled = false;
  }

  if (process.env.NLP_ENABLED === 'false') {
    config.nlp.enabled = false;
  }

  if (process.env.NLP_CONFIDENCE_THRESHOLD) {
    config.nlp.confidenceThreshold = parseFloat(process.env.NLP_CONFIDENCE_THRESHOLD);
  }

  // Set primary image generation provider
  if (process.env.IMAGE_GENERATION_PROVIDER) {
    config.imageGeneration.primaryProvider = process.env.IMAGE_GENERATION_PROVIDER as any;
  }

  return config;
}

// Service availability checker
export function checkServiceAvailability(): {
  vectorStore: boolean;
  imageGeneration: boolean;
  codeAnalysis: boolean;
  googleAI: boolean;
  openAI: boolean;
} {
  const config = getAIServicesConfig();
  
  return {
    vectorStore: config.vectorStore.persistent,
    imageGeneration: config.imageGeneration.enabled && (
      config.apis.googleAI.enabled || 
      config.apis.openAI.enabled || 
      config.imageGeneration.fallbackToSVG
    ),
    codeAnalysis: config.codeAnalysis.enabled,
    nlp: config.nlp.enabled,
    googleAI: config.apis.googleAI.enabled,
    openAI: config.apis.openAI.enabled
  };
}

// Configuration validation
export function validateConfiguration(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const config = getAIServicesConfig();

  // Check required environment variables
  if (config.imageGeneration.enabled && config.imageGeneration.primaryProvider === 'openai' && !process.env.OPENAI_API_KEY) {
    issues.push('OpenAI API key required for image generation but not configured');
  }

  if (config.apis.googleAI.enabled && !process.env.GOOGLE_API_KEY) {
    issues.push('Google AI API key required but not configured');
  }

  // Check file system permissions for persistent storage
  if (config.vectorStore.persistent) {
    try {
      const fs = require('fs');
      const path = require('path');
      const dataDir = path.join(process.cwd(), 'data');
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Test write permissions
      const testFile = path.join(dataDir, 'test-write.tmp');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (error) {
      issues.push('Cannot write to data directory for persistent vector storage');
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

// Export singleton config
export const aiServicesConfig = getAIServicesConfig();