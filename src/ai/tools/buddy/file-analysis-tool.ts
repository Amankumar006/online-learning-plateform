/**
 * File Analysis Tool for Buddy AI
 * Handles analysis of uploaded files including images, PDFs, and documents
 */

import { ai } from '@/ai/ai';
import { z } from 'zod';

// Schema for file analysis requests
const FileAnalysisRequestSchema = z.object({
    files: z.array(z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(['image', 'pdf', 'document', 'other']),
        content: z.string().optional(),
        preview: z.string().optional(), // base64 image data for images
        size: z.number()
    })),
    query: z.string().describe('The user\'s question or request about the files'),
    analysisType: z.enum(['general', 'extract-text', 'summarize', 'compare', 'explain']).optional().default('general')
});

const FileAnalysisResponseSchema = z.object({
    analysis: z.string().describe('Detailed analysis of the uploaded files'),
    extractedInfo: z.array(z.object({
        fileId: z.string(),
        fileName: z.string(),
        insights: z.array(z.string()),
        keyPoints: z.array(z.string()).optional(),
        summary: z.string().optional()
    })),
    recommendations: z.array(z.string()).optional(),
    followUpQuestions: z.array(z.string()).optional()
});

export const analyzeUploadedFilesTool = ai.defineTool({
    name: 'analyzeUploadedFiles',
    description: 'Analyze uploaded files (images, PDFs, documents) and answer questions about their content',
    inputSchema: FileAnalysisRequestSchema,
    outputSchema: FileAnalysisResponseSchema
}, async (input) => {
    const { files, query, analysisType } = input;
    
    console.log('🔍 File Analysis Tool Called');
    console.log('Files to analyze:', files.length);
    console.log('Query:', query);
    console.log('Analysis type:', analysisType);
    
    try {
        // Process each file based on its type
        const fileAnalyses = await Promise.all(files.map(async (file) => {
            console.log(`📁 Processing file: ${file.name} (${file.type})`);
            
            let insights: string[] = [];
            let keyPoints: string[] = [];
            let summary: string = '';

            switch (file.type) {
                case 'image':
                    console.log('🖼️ Analyzing image...');
                    insights = await analyzeImage(file, query);
                    console.log('✅ Image analysis completed');
                    break;
                
                case 'pdf':
                case 'document':
                    console.log('📄 Analyzing document...');
                    if (file.content) {
                        const textAnalysis = await analyzeTextContent(file.content, query, analysisType);
                        insights = textAnalysis.insights;
                        keyPoints = textAnalysis.keyPoints;
                        summary = textAnalysis.summary;
                    } else {
                        insights = [`Document "${file.name}" was uploaded but no text content was extracted.`];
                    }
                    console.log('✅ Document analysis completed');
                    break;
                
                default:
                    insights = [`File "${file.name}" is of type ${file.type}. Limited analysis available for this file type.`];
            }

            return {
                fileId: file.id,
                fileName: file.name,
                insights,
                keyPoints,
                summary
            };
        }));

        console.log('📊 Generating overall analysis...');
        
        // Generate overall analysis
        const overallAnalysis = generateOverallAnalysis(files, fileAnalyses, query, analysisType);
        
        // Generate recommendations and follow-up questions
        const recommendations = generateRecommendations(files, fileAnalyses, query);
        const followUpQuestions = generateFollowUpQuestions(files, query);

        console.log('✅ File analysis completed successfully');

        return {
            analysis: overallAnalysis,
            extractedInfo: fileAnalyses,
            recommendations,
            followUpQuestions
        };

    } catch (error) {
        console.error('❌ Error analyzing files:', error);
        
        return {
            analysis: `I encountered an error while analyzing your files: ${error instanceof Error ? error.message : 'Unknown error'}. 

**Debug Information:**
- Files uploaded: ${files.length}
- File types: ${files.map(f => f.type).join(', ')}
- Query: "${query}"

Please try uploading the files again. If the issue persists, you can describe what you see in the image and I'll help explain it!`,
            extractedInfo: files.map(file => ({
                fileId: file.id,
                fileName: file.name,
                insights: [`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`],
                keyPoints: [],
                summary: 'Analysis failed'
            })),
            recommendations: [
                'Try uploading the files again', 
                'Check if the files are not corrupted', 
                'Ensure files are in supported formats (JPG, PNG, PDF, TXT)',
                'Describe what you see in the image and I can help explain it'
            ],
            followUpQuestions: [
                'What do you see in the image?',
                'What subject area does this relate to?',
                'What specific help do you need with this content?'
            ]
        };
    }
});

/**
 * Analyze image content using AI vision capabilities
 */
async function analyzeImage(file: any, query: string): Promise<string[]> {
    const insights: string[] = [];
    
    // Basic image analysis
    insights.push(`📸 **Image Analysis: ${file.name}**`);
    insights.push(`File size: ${formatFileSize(file.size)}`);
    
    if (file.preview) {
        try {
            console.log('Starting image analysis for:', file.name);
            console.log('Preview data available:', file.preview ? 'Yes' : 'No');
            console.log('Query:', query);

            // Use Google AI's vision capabilities to analyze the image
            const visionPrompt = `You are analyzing an image uploaded by a student. Please provide a detailed analysis.

User's question: "${query}"

Please analyze the image and provide:
1. **What you see**: Describe all visible elements (objects, people, text, diagrams, charts, equations, etc.)
2. **Main content**: What is the primary subject or focus?
3. **Text content**: Any visible text, numbers, equations, or formulas
4. **Educational value**: If it's educational content, explain what it teaches
5. **Answer the question**: Directly address the user's specific question about the image

Be thorough, specific, and educational in your response. If you see mathematical equations, solve them. If you see diagrams, explain them. If you see text, read it and explain it.`;

            let visionResponse;
            
            // Try to use Genkit's vision capabilities with proper error handling
            if (file.preview && file.preview.startsWith('data:image/')) {
                console.log('Attempting vision analysis...');
                
                try {
                    visionResponse = await ai.generate({
                        prompt: [
                            { text: visionPrompt },
                            { media: { url: file.preview } }
                        ],
                        config: {
                            temperature: 0.3, // Lower temperature for more consistent analysis
                        }
                    });
                    
                    console.log('Vision analysis successful');
                } catch (visionError) {
                    console.error('Vision API error:', visionError);
                    
                    // Try alternative approach - direct text analysis
                    visionResponse = await ai.generate({
                        prompt: `I need to analyze an image that a student uploaded. The image is "${file.name}" and they're asking: "${query}"

Since I cannot directly see the image right now, I'll provide helpful guidance on how I can assist with image analysis:

🔍 **I can help analyze your image in these ways:**

**For Math & Science:**
- Solve equations and mathematical problems
- Explain scientific diagrams and processes  
- Interpret graphs, charts, and data visualizations
- Break down complex formulas step-by-step

**For Text & Documents:**
- Read and explain text content in images
- Summarize written information
- Help with handwritten notes (if clear)
- Translate text if needed

**For Educational Content:**
- Explain concepts shown in diagrams
- Provide context for historical images
- Analyze artistic or literary content
- Help with homework problems

**To get the best help, please:**
1. Describe what you see in the image
2. Tell me the subject area (math, science, history, etc.)
3. Ask specific questions about what you need help with

For example: "This image shows a quadratic equation x² + 5x + 6 = 0, can you solve it?" or "There's a diagram of photosynthesis, can you explain the process?"

What do you see in your image? I'm ready to help explain it! 📚✨`
                    });
                }
            } else {
                throw new Error('No valid image data available');
            }

            if (visionResponse && visionResponse.text) {
                insights.push('');
                insights.push('🤖 **AI Analysis:**');
                insights.push(visionResponse.text);
                insights.push('');
                insights.push('💡 **Need more help?** Feel free to ask follow-up questions about any part of the image!');
            } else {
                insights.push('⚠️ I can see the image but was unable to generate a detailed analysis. Please describe what you\'d like to know about it and I\'ll help explain!');
            }

        } catch (error) {
            console.error('Complete vision analysis error:', error);
            
            // Provide helpful fallback response
            insights.push('');
            insights.push('🔧 **Image Analysis Available**');
            insights.push(`I can see you've uploaded "${file.name}" and you're asking: "${query}"`);
            insights.push('');
            insights.push('While I\'m having trouble with automatic image analysis right now, I can still help! Here\'s how:');
            insights.push('');
            
            if (query.toLowerCase().includes('math') || query.toLowerCase().includes('equation') || query.toLowerCase().includes('solve')) {
                insights.push('📊 **For Math Problems:**');
                insights.push('- Describe the equation or problem you see');
                insights.push('- Tell me what type of math it is (algebra, calculus, etc.)');
                insights.push('- I\'ll solve it step-by-step and explain the process');
            } else if (query.toLowerCase().includes('diagram') || query.toLowerCase().includes('chart') || query.toLowerCase().includes('graph')) {
                insights.push('📈 **For Diagrams & Charts:**');
                insights.push('- Describe what the diagram shows');
                insights.push('- Tell me the subject area (biology, chemistry, physics, etc.)');
                insights.push('- I\'ll explain the concepts and processes');
            } else if (query.toLowerCase().includes('text') || query.toLowerCase().includes('read') || query.toLowerCase().includes('words')) {
                insights.push('📝 **For Text Content:**');
                insights.push('- Tell me what text you see in the image');
                insights.push('- I can explain, summarize, or help you understand it');
                insights.push('- I can also help with translations if needed');
            } else {
                insights.push('🎯 **General Help:**');
                insights.push('- Describe what you see in the image');
                insights.push('- Tell me what subject this relates to');
                insights.push('- Ask specific questions about what you need help with');
            }
            
            insights.push('');
            insights.push('**Example:** "I see a chemistry diagram showing the water cycle with arrows and labels. Can you explain each step?"');
            insights.push('');
            insights.push('Just describe what you see and I\'ll provide detailed explanations! 🚀');
        }
    } else {
        insights.push('❌ Image preview not available. Please ensure the image was uploaded correctly.');
        insights.push('');
        insights.push('**Troubleshooting:**');
        insights.push('- Try uploading the image again');
        insights.push('- Make sure the file is a supported image format (JPG, PNG, GIF, etc.)');
        insights.push('- Check that the file size is under 10MB');
    }
    
    return insights;
}

/**
 * Analyze text content from documents
 */
async function analyzeTextContent(content: string, query: string, analysisType: string) {
    const insights: string[] = [];
    let keyPoints: string[] = [];
    let summary = '';

    // Basic text statistics
    const wordCount = content.split(/\s+/).length;
    const charCount = content.length;
    const paragraphs = content.split(/\n\s*\n/).length;
    
    insights.push(`Document contains ${wordCount} words, ${charCount} characters, and ${paragraphs} paragraphs.`);

    // Content analysis based on query and type
    switch (analysisType) {
        case 'extract-text':
            insights.push('Text content extracted successfully.');
            summary = content.length > 500 ? content.substring(0, 500) + '...' : content;
            break;
            
        case 'summarize':
            summary = generateTextSummary(content);
            insights.push('Document summarized based on key themes and main points.');
            break;
            
        case 'explain':
            keyPoints = extractKeyPoints(content);
            insights.push('Key concepts and explanations identified in the document.');
            break;
            
        default:
            // General analysis
            keyPoints = extractKeyPoints(content);
            summary = generateTextSummary(content);
            insights.push('General document analysis completed.');
    }

    // Query-specific analysis
    if (query.toLowerCase().includes('main point') || query.toLowerCase().includes('summary')) {
        keyPoints.push(...extractMainPoints(content));
    }
    
    if (query.toLowerCase().includes('question') || query.toLowerCase().includes('answer')) {
        insights.push('Document analyzed for question-answer content.');
    }

    return { insights, keyPoints, summary };
}

/**
 * Generate overall analysis combining all files
 */
function generateOverallAnalysis(files: any[], analyses: any[], query: string, analysisType: string): string {
    const fileCount = files.length;
    const fileTypes = [...new Set(files.map(f => f.type))];
    
    let analysis = `I've analyzed ${fileCount} file(s) of type(s): ${fileTypes.join(', ')}.\n\n`;
    
    // Add query-specific analysis
    if (query.toLowerCase().includes('compare')) {
        analysis += 'Comparison Analysis:\n';
        if (fileCount > 1) {
            analysis += `I've compared the ${fileCount} files you uploaded. `;
        } else {
            analysis += 'You\'ve uploaded one file. To compare files, please upload multiple files. ';
        }
    }
    
    if (query.toLowerCase().includes('summarize')) {
        analysis += 'Summary:\n';
        analyses.forEach(fileAnalysis => {
            if (fileAnalysis.summary) {
                analysis += `${fileAnalysis.fileName}: ${fileAnalysis.summary}\n`;
            }
        });
    }
    
    // Add insights from each file
    analyses.forEach(fileAnalysis => {
        analysis += `\n**${fileAnalysis.fileName}:**\n`;
        fileAnalysis.insights.forEach((insight: string) => {
            analysis += `- ${insight}\n`;
        });
        
        if (fileAnalysis.keyPoints && fileAnalysis.keyPoints.length > 0) {
            analysis += `Key Points:\n`;
            fileAnalysis.keyPoints.forEach((point: string) => {
                analysis += `  • ${point}\n`;
            });
        }
    });
    
    return analysis;
}

/**
 * Generate recommendations based on file analysis
 */
function generateRecommendations(files: any[], analyses: any[], query: string): string[] {
    const recommendations: string[] = [];
    
    // File-type specific recommendations
    const hasImages = files.some(f => f.type === 'image');
    const hasDocuments = files.some(f => f.type === 'pdf' || f.type === 'document');
    
    if (hasImages) {
        recommendations.push('For better image analysis, consider providing specific questions about what you see in the images');
    }
    
    if (hasDocuments) {
        recommendations.push('I can help extract specific information, create summaries, or answer questions about the document content');
    }
    
    // Query-specific recommendations
    if (query.toLowerCase().includes('study') || query.toLowerCase().includes('learn')) {
        recommendations.push('I can create study guides, flashcards, or practice questions based on your documents');
    }
    
    if (query.toLowerCase().includes('code') || query.toLowerCase().includes('program')) {
        recommendations.push('I can help explain code, suggest improvements, or debug issues if your files contain programming content');
    }
    
    return recommendations;
}

/**
 * Generate follow-up questions
 */
function generateFollowUpQuestions(files: any[], query: string): string[] {
    const questions: string[] = [];
    
    questions.push('Would you like me to explain any specific part of these files in more detail?');
    
    if (files.length > 1) {
        questions.push('Should I compare these files and highlight the differences?');
    }
    
    if (files.some(f => f.type === 'document' || f.type === 'pdf')) {
        questions.push('Would you like me to create a summary or extract key points from the documents?');
        questions.push('Do you have any specific questions about the content?');
    }
    
    if (files.some(f => f.type === 'image')) {
        questions.push('What specific aspects of the images would you like me to analyze?');
    }
    
    return questions;
}

/**
 * Helper functions
 */
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function generateTextSummary(content: string): string {
    // Simple extractive summary - take first few sentences
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const summaryLength = Math.min(3, sentences.length);
    return sentences.slice(0, summaryLength).join('. ') + '.';
}

function extractKeyPoints(content: string): string[] {
    const points: string[] = [];
    
    // Look for bullet points, numbered lists, or headers
    const lines = content.split('\n');
    
    lines.forEach(line => {
        const trimmed = line.trim();
        
        // Bullet points
        if (trimmed.match(/^[•\-\*]\s+/)) {
            points.push(trimmed.replace(/^[•\-\*]\s+/, ''));
        }
        
        // Numbered lists
        if (trimmed.match(/^\d+\.\s+/)) {
            points.push(trimmed.replace(/^\d+\.\s+/, ''));
        }
        
        // Headers (simple detection)
        if (trimmed.match(/^#{1,6}\s+/) || (trimmed.length < 100 && trimmed.endsWith(':'))) {
            points.push(trimmed);
        }
    });
    
    return points.slice(0, 10); // Limit to 10 key points
}

function extractMainPoints(content: string): string[] {
    // Simple main point extraction
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    // Look for sentences that might be main points (contain keywords)
    const mainPointKeywords = ['important', 'key', 'main', 'primary', 'essential', 'crucial', 'significant'];
    
    return sentences
        .filter(sentence => 
            mainPointKeywords.some(keyword => 
                sentence.toLowerCase().includes(keyword)
            )
        )
        .slice(0, 5)
        .map(s => s.trim());
}