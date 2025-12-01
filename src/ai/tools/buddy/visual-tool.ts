import { ai } from '@/ai/ai';
import { z } from 'zod';
import { imageGenerationService, type ImageGenerationRequest } from '@/ai/services/image-generation';

export const generateImageForExplanationTool = ai.defineTool(
    {
        name: 'generateImageForExplanation',
        description: 'Generates a visual diagram or illustration to help explain a concept. Use this when explaining complex topics that would benefit from visual aids.',
        inputSchema: z.object({ 
            concept: z.string().describe("The concept to create a visual explanation for"),
            description: z.string().describe("Detailed description of what the image should show"),
            style: z.enum(['diagram', 'illustration', 'chart', 'flowchart', 'infographic']).optional().describe("Visual style preference"),
            complexity: z.enum(['simple', 'medium', 'detailed']).optional().describe("Level of detail")
        }),
        outputSchema: z.string(),
    },
    async ({ concept, description, style = 'diagram', complexity = 'medium' }) => {
        try {
            console.log(`🎨 Generating ${style} for concept: ${concept}`);
            
            const imageRequest: ImageGenerationRequest = {
                concept,
                description,
                style,
                complexity,
                colorScheme: 'educational',
                format: 'square'
            };

            const result = await imageGenerationService.generateImage(imageRequest);
            
            if (result.imageUrl) {
                return `🎨 **Visual Diagram Created!**

I've generated a ${style} for **${concept}**:

![${result.altText}](${result.imageUrl})

**Description:** ${result.description}

**Generated using:** ${result.metadata.model}
**Style:** ${result.metadata.style}
**Created:** ${new Date(result.metadata.generatedAt).toLocaleString()}

This visual aid should help illustrate the key concepts and make the information easier to understand!`;
            } else if (result.imageDataUri) {
                return `🎨 **Educational Diagram Created!**

I've created a ${style} for **${concept}**:

![${result.altText}](${result.imageDataUri})

**Description:** ${result.description}

**Type:** ${result.metadata.model === 'svg-fallback' ? 'Interactive SVG Diagram' : 'Generated Image'}
**Style:** ${result.metadata.style}

This diagram provides a clear visual representation of the concept to enhance your understanding!`;
            } else {
                throw new Error('No image generated');
            }
        } catch (error) {
            console.error('Error in generateImageForExplanationTool:', error);
            
            // Provide helpful fallback with structured guidance
            return `🎨 **Visual Diagram Concept for "${concept}"**

I encountered an issue generating the image, but here's what the ${style} would include:

📊 **Visual Elements:**
${description}

🎯 **Recommended Structure:**
- **Main Focus:** Central representation of ${concept}
- **Supporting Elements:** Key components and relationships
- **Labels & Annotations:** Clear explanations of each part
- **Color Coding:** Different colors for different categories
- **Flow/Connections:** Arrows or lines showing relationships

💡 **Manual Creation Options:**
- **Digital Tools:** Lucidchart, Draw.io, Canva, or Figma
- **Simple Tools:** PowerPoint, Google Drawings
- **Hand-drawn:** Sketch and photograph for a personal touch

**Error Details:** ${error instanceof Error ? error.message : 'Unknown error'}

Would you like me to provide more specific guidance for creating this diagram manually?`;
        }
    }
);

export const processImageTool = ai.defineTool(
    {
        name: 'processImageInput',
        description: 'Processes and analyzes images uploaded by users, such as handwritten notes, diagrams, or code screenshots.',
        inputSchema: z.object({ 
            imageUrl: z.string().describe("The URL or data URI of the image to analyze"),
            analysisType: z.enum(['handwriting', 'diagram', 'code', 'math', 'general']).describe("The type of analysis to perform")
        }),
        outputSchema: z.string(),
    },
    async ({ imageUrl, analysisType }) => {
        try {
            console.log(`🔍 Processing ${analysisType} image: ${imageUrl.substring(0, 50)}...`);
            
            // Try Google Vision API for image analysis
            const analysisResult = await analyzeImageWithVision(imageUrl, analysisType);
            
            if (analysisResult.success) {
                return formatImageAnalysisResult(analysisResult, analysisType);
            } else {
                throw new Error(analysisResult.error || 'Analysis failed');
            }
            
        } catch (error) {
            console.error('Error in processImageTool:', error);
            
            // Provide helpful fallback guidance
            const analysisPrompts = {
                handwriting: "I can see handwritten content in your image. While I'm working on processing it, I can help you if you type out the text you'd like me to review.",
                diagram: "I notice you've shared a diagram. I'd love to analyze it for you! For now, could you describe what the diagram shows?",
                code: "I can see code in your image. Please type out the code so I can help you debug, review, or explain it.",
                math: "I see mathematical content. Type out the equations or problems and I'll help solve them step by step.",
                general: "I can see your image but encountered an issue analyzing it. Could you describe what you'd like help with?"
            };
            
            return `📸 **Image Analysis - Processing Issue**

${analysisPrompts[analysisType]}

**What I can help with once you provide the text:**
${analysisType === 'code' ? '- Code review and debugging\n- Complexity analysis\n- Best practices suggestions' : 
  analysisType === 'math' ? '- Step-by-step solutions\n- Concept explanations\n- Practice problems' :
  analysisType === 'handwriting' ? '- Content review\n- Study suggestions\n- Related topics' :
  analysisType === 'diagram' ? '- Diagram interpretation\n- Concept explanations\n- Related visual aids' :
  '- Detailed explanations\n- Related resources\n- Practice exercises'}

**Error:** ${error instanceof Error ? error.message : 'Unknown processing error'}

*I'm continuously improving image processing capabilities. Thank you for your patience!*`;
        }
    }
);

// Helper function for Google Vision API analysis
async function analyzeImageWithVision(imageUrl: string, analysisType: string): Promise<{
    success: boolean;
    extractedText?: string;
    detectedObjects?: string[];
    confidence?: number;
    error?: string;
}> {
    try {
        const visionApiKey = process.env.GOOGLE_VISION_API_KEY;
        if (!visionApiKey) {
            throw new Error('Google Vision API key not configured');
        }

        // Convert data URI to base64 if needed
        let imageData: string;
        if (imageUrl.startsWith('data:')) {
            imageData = imageUrl.split(',')[1];
        } else {
            // Fetch image and convert to base64
            const response = await fetch(imageUrl);
            const buffer = await response.arrayBuffer();
            imageData = Buffer.from(buffer).toString('base64');
        }

        const requestBody = {
            requests: [{
                image: { content: imageData },
                features: getVisionFeatures(analysisType)
            }]
        };

        const response = await fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }
        );

        if (!response.ok) {
            throw new Error(`Vision API error: ${response.status}`);
        }

        const data = await response.json();
        const result = data.responses[0];

        if (result.error) {
            throw new Error(result.error.message);
        }

        return {
            success: true,
            extractedText: result.fullTextAnnotation?.text || '',
            detectedObjects: result.localizedObjectAnnotations?.map((obj: any) => obj.name) || [],
            confidence: result.fullTextAnnotation?.pages?.[0]?.confidence || 0
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

function getVisionFeatures(analysisType: string) {
    const baseFeatures = [
        { type: 'TEXT_DETECTION', maxResults: 1 },
        { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
    ];

    switch (analysisType) {
        case 'handwriting':
            return [
                ...baseFeatures,
                { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
            ];
        case 'diagram':
        case 'general':
            return [
                ...baseFeatures,
                { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
                { type: 'LABEL_DETECTION', maxResults: 10 }
            ];
        case 'code':
        case 'math':
            return [
                { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
                { type: 'TEXT_DETECTION', maxResults: 1 }
            ];
        default:
            return baseFeatures;
    }
}

function formatImageAnalysisResult(result: any, analysisType: string): string {
    const { extractedText, detectedObjects, confidence } = result;
    
    let response = `📸 **Image Analysis Complete**\n\n`;
    
    if (extractedText && extractedText.trim()) {
        response += `📝 **Extracted Text:**\n\`\`\`\n${extractedText.trim()}\n\`\`\`\n\n`;
        
        if (confidence) {
            response += `🎯 **Confidence:** ${Math.round(confidence * 100)}%\n\n`;
        }
        
        // Provide analysis based on type
        switch (analysisType) {
            case 'code':
                response += `💻 **Code Analysis:**\n`;
                response += `I can see code in your image. Let me help you with:\n`;
                response += `- Code review and optimization suggestions\n`;
                response += `- Syntax checking and error detection\n`;
                response += `- Explanation of code functionality\n\n`;
                break;
                
            case 'math':
                response += `🔢 **Mathematical Content:**\n`;
                response += `I can help you with:\n`;
                response += `- Step-by-step problem solving\n`;
                response += `- Concept explanations\n`;
                response += `- Similar practice problems\n\n`;
                break;
                
            case 'handwriting':
                response += `✍️ **Handwritten Notes:**\n`;
                response += `I can assist with:\n`;
                response += `- Content review and clarification\n`;
                response += `- Study suggestions based on your notes\n`;
                response += `- Related topic recommendations\n\n`;
                break;
        }
    }
    
    if (detectedObjects && detectedObjects.length > 0) {
        response += `🔍 **Detected Elements:** ${detectedObjects.join(', ')}\n\n`;
    }
    
    response += `Would you like me to help you with any specific aspect of this content?`;
    
    return response;
}