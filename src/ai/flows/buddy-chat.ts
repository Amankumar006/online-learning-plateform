'use server';
/**
 * @fileOverview A conversational AI flow for the main Buddy AI page, with tools.
 *
 * - buddyChatStream - A function that handles the conversation.
 * - BuddyChatInput - The input type for the function.
 * - StreamedOutput - The output type for the function's stream.
 */

import { ai } from '@/ai/ai';
import { z } from 'zod';
import { PersonaSchema } from '@/ai/schemas/buddy-schemas';
import { getBuddyChatTools, setCurrentUserId, setCurrentUserData } from '@/ai/tools/buddy';
import { getSystemPrompt } from '@/ai/prompts';
import { generateFollowUpSuggestions } from './generate-follow-up-suggestions';

const MessageSchema = z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
});

const BuddyChatInputSchema = z.object({
    userMessage: z.string().describe('The message sent by the user.'),
    userId: z.string().describe("The ID of the current user, used for context-aware actions."),
    history: z.array(MessageSchema).optional().describe('The conversation history.'),
    persona: PersonaSchema.optional().default('buddy').describe("The AI's persona, which determines its personality and expertise."),
    lessonContext: z.string().optional().describe('The content of a lesson the user is currently viewing, if any. This should be used as the primary source of truth for lesson-specific questions.'),
    userProgress: z.object({
        completedLessonIds: z.array(z.string()).optional(),
        subjectsMastery: z.array(z.object({
            subject: z.string(),
            mastery: z.number()
        })).optional()
    }).optional().describe('User progress data passed from client to avoid server-side Firebase access'),
    availableLessons: z.array(z.object({
        id: z.string(),
        title: z.string(),
        subject: z.string().optional()
    })).optional().describe('Available lessons passed from client to avoid server-side Firebase access'),
    webSearchEnabled: z.boolean().optional().default(false).describe('Whether web search functionality is enabled for this conversation'),
    uploadedFiles: z.array(z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(['image', 'pdf', 'document', 'other']),
        content: z.string().optional(),
        preview: z.string().optional(),
        size: z.number()
    })).optional().describe('Files uploaded by the user for analysis')
});
export type BuddyChatInput = z.infer<typeof BuddyChatInputSchema>;

const StreamedOutputSchema = z.object({
    type: z.enum(['thought', 'response', 'error']),
    content: z.string(),
    suggestions: z.array(z.string()).optional(),
});
export type StreamedOutput = z.infer<typeof StreamedOutputSchema>;

const buddyChatFlow = ai.defineFlow(
    {
        name: 'buddyChatFlow',
        inputSchema: BuddyChatInputSchema,
        outputSchema: z.object({
            response: z.string(),
            suggestions: z.array(z.string()).optional(),
            topics: z.array(z.string()).optional(),
            toolsUsed: z.array(z.string()).optional(),
            intent: z.object({
                category: z.string(),
                confidence: z.number(),
                parameters: z.record(z.any())
            }).optional(),
            complexity: z.object({
                level: z.string(),
                score: z.number()
            }).optional(),
        }),
    },
    async (input) => {
        try {
            // Set the user ID and data for tools to access
            await setCurrentUserId(input.userId);
            await setCurrentUserData(input.userProgress, input.availableLessons);

            // Generate system prompt
            let systemPrompt = getSystemPrompt(input.persona, !!input.lessonContext);

            // Add file context if files are uploaded
            if (input.uploadedFiles && input.uploadedFiles.length > 0) {
                console.log('Files uploaded:', input.uploadedFiles.length);
                console.log('File details:', input.uploadedFiles.map(f => ({ name: f.name, type: f.type, hasPreview: !!f.preview })));

                systemPrompt += `\n\n**UPLOADED FILES CONTEXT:**
The user has uploaded ${input.uploadedFiles.length} file(s):
${input.uploadedFiles.map(file => `- ${file.name} (${file.type}, ${formatFileSize(file.size)})`).join('\n')}

CRITICAL INSTRUCTION: You MUST immediately use the analyzeUploadedFiles tool with these exact parameters:
- files: The uploaded files array
- query: The user's message/question
- analysisType: "general"

Do NOT provide any response until you have used this tool. The tool will analyze the files and provide detailed insights that you must include in your response.`;
            }

            // Add web search context if enabled
            if (input.webSearchEnabled) {
                systemPrompt += `\n\n**WEB SEARCH TOOL AVAILABLE**
You have access to the searchTheWeb tool for current information. Use it when users ask about:
- Current rankings or "top X" lists (e.g., "top AI coding tools", "best code editors")
- Latest versions or updates
- Recent developments or trends
- Any question where you need current, up-to-date information`;
            }

            const tools = await getBuddyChatTools(input.webSearchEnabled);

            console.log('Starting AI generation with tools...');
            console.log('Available tools:', tools.map(t => t.name));

            // Special handling for image uploads - try direct vision analysis first
            if (input.uploadedFiles && input.uploadedFiles.length > 0) {
                const imageFiles = input.uploadedFiles.filter(f => f.type === 'image' && f.preview);

                if (imageFiles.length > 0) {
                    console.log('🖼️ Direct image analysis for', imageFiles.length, 'images');

                    try {
                        // Try direct vision analysis without tools
                        const imageFile = imageFiles[0]; // Start with first image

                        const visionPrompt = `You are analyzing an image uploaded by a student. 

User's question: "${input.userMessage}"

Please analyze the image and provide a detailed, helpful response. Describe what you see and answer their question directly.

If you see:
- Math equations: Solve them step by step
- Diagrams: Explain what they show
- Text: Read and explain it
- Charts/graphs: Interpret the data
- Educational content: Teach the concepts

Be thorough and educational in your response.`;

                        const visionResponse = await ai.generate([
                            { text: visionPrompt },
                            { media: { url: imageFile.preview! } }
                        ]);

                        if (visionResponse.text) {
                            console.log('✅ Direct vision analysis successful');

                            // Generate follow-up suggestions
                            const followUpResult = await generateFollowUpSuggestions({
                                lastUserMessage: input.userMessage,
                                aiResponse: visionResponse.text,
                            });

                            return {
                                response: visionResponse.text,
                                suggestions: followUpResult.suggestions.slice(0, 3),
                                topics: [],
                                toolsUsed: ['direct-vision-analysis'],
                                intent: {
                                    category: 'image-analysis',
                                    confidence: 0.9,
                                    parameters: { imageCount: imageFiles.length }
                                },
                                complexity: { level: 'intermediate', score: 60 }
                            };
                        }
                    } catch (visionError) {
                        console.error('❌ Direct vision analysis failed:', visionError);
                        // Fall back to tool-based approach
                    }
                }
            }

            // Use ai.generate with tools (fallback or non-image content)
            const response = await ai.generate({
                prompt: `${systemPrompt}

${input.lessonContext ? `**LESSON CONTEXT:**\n---\n${input.lessonContext}\n---\n\n` : ''}

${input.history && input.history.length > 0 ? `**CONVERSATION HISTORY:**\n${input.history.map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`).join('\n')}\n\n` : ''}

**USER MESSAGE:** ${input.userMessage}

${input.uploadedFiles && input.uploadedFiles.length > 0 ? `

**UPLOADED FILES:** The user has uploaded ${input.uploadedFiles.length} file(s). Please use the analyzeUploadedFiles tool to analyze them and provide detailed insights.` : ''}

Please respond helpfully and appropriately based on the context and conversation history.`,
                tools,
                config: {
                    safetySettings: [
                        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    ],
                },
            });

            console.log('AI generation completed');
            console.log('Response text length:', response.text?.length || 0);

            const aiResponseText = response.text || 'I apologize, but I was unable to generate a response.';

            // Generate follow-up suggestions
            const followUpResult = await generateFollowUpSuggestions({
                lastUserMessage: input.userMessage,
                aiResponse: aiResponseText,
            });

            return {
                response: aiResponseText,
                suggestions: followUpResult.suggestions.slice(0, 3),
                topics: [],
                toolsUsed: [],
                intent: {
                    category: 'question',
                    confidence: 0.8,
                    parameters: {}
                },
                complexity: { level: 'intermediate', score: 50 }
            };

        } catch (e: any) {
            console.error("❌ Error in buddyChatFlow:", e);
            console.error("Error stack:", e.stack);
            console.error("Error details:", {
                message: e.message,
                name: e.name,
                cause: e.cause
            });

            // Check if it's a specific API error
            let errorMessage = `I apologize, but I encountered an issue while processing your request.`;

            if (e.message?.includes('vision') || e.message?.includes('image')) {
                errorMessage += `\n\n**Image Analysis Issue:** There was a problem analyzing your image. You can still get help by describing what you see in the image, and I'll explain it for you!`;
            } else if (e.message?.includes('tool')) {
                errorMessage += `\n\n**Tool Error:** There was an issue with the analysis tools. Please try again or describe your question in more detail.`;
            } else if (e.message?.includes('API') || e.message?.includes('quota') || e.message?.includes('limit')) {
                errorMessage += `\n\n**API Issue:** There might be a temporary service issue. Please try again in a moment.`;
            }

            errorMessage += `\n\n**Debug Info:** ${e.message || 'Unknown error occurred'}`;

            return {
                response: errorMessage,
                suggestions: [
                    "Describe what you see in the image and I'll help explain it",
                    "Try uploading the image again",
                    "Ask your question in a different way"
                ],
                topics: [],
                toolsUsed: [],
            };
        } finally {
            // Clear the user ID and data after processing
            await setCurrentUserId(null);
            await setCurrentUserData(null, null);
        }
    }
);

// Helper function for file size formatting
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function buddyChatStream(input: BuddyChatInput): Promise<StreamedOutput> {
    try {
        const result = await buddyChatFlow(input);
        return {
            type: 'response',
            content: result.response,
            suggestions: result.suggestions,
        };
    } catch (e: any) {
        return {
            type: 'error',
            content: e.message,
        };
    }
}