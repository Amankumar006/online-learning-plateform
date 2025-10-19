/**
 * Advanced Topic Extraction Tool
 * Uses NLP service for intelligent topic extraction and content understanding
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { nlpService, type TopicExtractionRequest, type ContentUnderstandingRequest } from '@/ai/services/nlp-service';

export const extractTopicsTool = ai.defineTool(
    {
        name: 'extractTopics',
        description: 'Intelligently extracts topics and themes from content using advanced NLP. Use this to understand what a user is talking about, identify learning objectives, or categorize content.',
        inputSchema: z.object({
            content: z.string().describe("The content to analyze for topics"),
            context: z.string().optional().describe("Additional context about the content"),
            maxTopics: z.number().optional().default(5).describe("Maximum number of topics to extract"),
            includeSubtopics: z.boolean().optional().default(true).describe("Whether to include subtopics"),
            analysisDepth: z.enum(['quick', 'standard', 'comprehensive']).optional().default('standard').describe("Depth of analysis")
        }),
        outputSchema: z.string(),
    },
    async ({ content, context, maxTopics, includeSubtopics, analysisDepth }) => {
        try {
            console.log(`🧠 Extracting topics from content (${analysisDepth} analysis)`);
            
            const request: TopicExtractionRequest = {
                content,
                context,
                maxTopics,
                includeSubtopics,
                confidenceThreshold: analysisDepth === 'quick' ? 0.5 : analysisDepth === 'comprehensive' ? 0.2 : 0.3
            };

            const topics = await nlpService.extractTopics(request);
            
            if (topics.length === 0) {
                return `🔍 **No Clear Topics Found**

I couldn't identify specific topics in the provided content. This might be because:
- The content is too short or general
- The text lacks clear thematic elements
- The confidence threshold is too high

Try providing more detailed content or context for better topic extraction.`;
            }

            let response = `🧠 **Topic Analysis Results**\n\n`;
            response += `**Content Analysis:** ${analysisDepth} depth\n`;
            response += `**Topics Found:** ${topics.length}\n\n`;

            // Group topics by category
            const primaryTopics = topics.filter(t => t.category === 'primary');
            const secondaryTopics = topics.filter(t => t.category === 'secondary');
            const tertiaryTopics = topics.filter(t => t.category === 'tertiary');

            if (primaryTopics.length > 0) {
                response += `## 🎯 Primary Topics\n\n`;
                primaryTopics.forEach((topic, index) => {
                    const confidencePercent = Math.round(topic.confidence * 100);
                    response += `**${index + 1}. ${topic.topic}** (${confidencePercent}% confidence)\n`;
                    
                    if (topic.keywords.length > 0) {
                        response += `   - Keywords: ${topic.keywords.join(', ')}\n`;
                    }
                    
                    if (topic.subtopics && topic.subtopics.length > 0) {
                        response += `   - Subtopics: ${topic.subtopics.join(', ')}\n`;
                    }
                    
                    if (topic.context) {
                        response += `   - Context: ${topic.context}\n`;
                    }
                    
                    response += `\n`;
                });
            }

            if (secondaryTopics.length > 0) {
                response += `## 📋 Secondary Topics\n\n`;
                secondaryTopics.forEach((topic, index) => {
                    const confidencePercent = Math.round(topic.confidence * 100);
                    response += `- **${topic.topic}** (${confidencePercent}%)\n`;
                });
                response += `\n`;
            }

            if (tertiaryTopics.length > 0) {
                response += `## 📝 Related Topics\n\n`;
                response += tertiaryTopics.map(t => t.topic).join(', ') + '\n\n';
            }

            // Add insights
            response += `## 💡 Insights\n\n`;
            
            const technicalTopics = topics.filter(t => 
                t.keywords.some(k => ['programming', 'code', 'algorithm', 'function', 'javascript', 'python'].includes(k.toLowerCase()))
            );
            
            if (technicalTopics.length > 0) {
                response += `🔧 **Technical Focus:** This content appears to be technical in nature, covering ${technicalTopics.length} programming-related topics.\n\n`;
            }

            const educationalTopics = topics.filter(t => 
                t.keywords.some(k => ['learn', 'understand', 'explain', 'tutorial', 'guide'].includes(k.toLowerCase()))
            );
            
            if (educationalTopics.length > 0) {
                response += `📚 **Educational Content:** This appears to be educational material suitable for learning.\n\n`;
            }

            // Suggest follow-up actions
            response += `## 🚀 Suggested Actions\n\n`;
            
            if (primaryTopics.length > 0) {
                const mainTopic = primaryTopics[0].topic;
                response += `- Create exercises or examples related to **${mainTopic}**\n`;
                response += `- Provide deeper explanations of **${mainTopic}** concepts\n`;
                response += `- Find related learning materials on **${mainTopic}**\n`;
            }
            
            if (topics.length > 3) {
                response += `- Break down the content into focused sections for each major topic\n`;
                response += `- Create a learning path connecting these topics\n`;
            }

            return response;

        } catch (error) {
            console.error('Topic extraction error:', error);
            
            return `🧠 **Topic Extraction - Processing Issue**

I encountered an issue while analyzing the content for topics:

**Error:** ${error instanceof Error ? error.message : 'Unknown error'}

## 🔧 Manual Topic Identification

Here are some ways to identify topics manually:

1. **Look for repeated keywords** - Words that appear multiple times often indicate main topics
2. **Identify technical terms** - Programming languages, frameworks, concepts
3. **Find action words** - "learn", "create", "understand", "implement"
4. **Check for examples** - Code snippets, demonstrations, use cases

## 📝 Content Analysis Tips

- **Main theme:** What is the overall subject?
- **Key concepts:** What specific ideas are discussed?
- **Learning objectives:** What should someone understand after reading?
- **Prerequisites:** What knowledge is assumed?

Would you like me to help you manually identify topics in your content?`;
        }
    }
);

export const analyzeContentTool = ai.defineTool(
    {
        name: 'analyzeContent',
        description: 'Performs comprehensive content analysis including sentiment, complexity, educational level, and structure. Use this to understand content deeply and provide personalized responses.',
        inputSchema: z.object({
            content: z.string().describe("The content to analyze"),
            analysisType: z.enum(['educational', 'technical', 'conversational', 'comprehensive']).optional().default('comprehensive').describe("Type of analysis to perform"),
            includeEntities: z.boolean().optional().default(true).describe("Whether to extract named entities"),
            includeSentiment: z.boolean().optional().default(true).describe("Whether to analyze sentiment"),
            includeComplexity: z.boolean().optional().default(true).describe("Whether to analyze complexity")
        }),
        outputSchema: z.string(),
    },
    async ({ content, analysisType, includeEntities, includeSentiment, includeComplexity }) => {
        try {
            console.log(`📊 Analyzing content comprehensively (${analysisType} focus)`);
            
            const request: ContentUnderstandingRequest = {
                content,
                analysisType,
                includeEntities,
                includeSentiment,
                includeComplexity
            };

            const analysis = await nlpService.analyzeContent(request);
            
            let response = `📊 **Comprehensive Content Analysis**\n\n`;
            
            // Main theme and overview
            response += `## 🎯 Content Overview\n\n`;
            response += `**Main Theme:** ${analysis.mainTheme}\n`;
            response += `**Content Type:** ${analysis.contentType.primary} (${analysis.contentType.format})\n`;
            response += `**Educational Level:** ${analysis.educationalLevel.gradeLevel} (${analysis.educationalLevel.ageRange})\n`;
            response += `**Complexity:** ${analysis.complexity.level} (${analysis.complexity.score}/100)\n\n`;

            // Key points
            if (analysis.keyPoints.length > 0) {
                response += `## 📝 Key Points\n\n`;
                analysis.keyPoints.forEach((point, index) => {
                    response += `${index + 1}. ${point}\n`;
                });
                response += `\n`;
            }

            // Sentiment analysis
            if (includeSentiment && analysis.sentiment) {
                response += `## 😊 Sentiment & Tone Analysis\n\n`;
                response += `**Overall Sentiment:** ${analysis.sentiment.overall} (${Math.round(analysis.sentiment.confidence * 100)}% confidence)\n`;
                response += `**Tone:** ${analysis.sentiment.tone}\n`;
                
                if (analysis.sentiment.emotions.length > 0) {
                    response += `**Emotions Detected:** `;
                    response += analysis.sentiment.emotions.map(e => 
                        `${e.emotion} (${Math.round(e.intensity * 100)}%)`
                    ).join(', ') + '\n';
                }
                response += `\n`;
            }

            // Complexity analysis
            if (includeComplexity && analysis.complexity) {
                response += `## 🧮 Complexity Analysis\n\n`;
                response += `**Complexity Level:** ${analysis.complexity.level}\n`;
                response += `**Overall Score:** ${analysis.complexity.score}/100\n\n`;
                
                response += `**Breakdown:**\n`;
                response += `- Vocabulary: ${analysis.complexity.factors.vocabularyComplexity}/100\n`;
                response += `- Sentence Structure: ${analysis.complexity.factors.sentenceComplexity}/100\n`;
                response += `- Conceptual Depth: ${analysis.complexity.factors.conceptualDepth}/100\n`;
                response += `- Technical Density: ${analysis.complexity.factors.technicalDensity}/100\n\n`;
                
                response += `**Readability:**\n`;
                response += `- Grade Level: ${analysis.complexity.readabilityMetrics.fleschKincaidGrade.toFixed(1)}\n`;
                response += `- Avg Words/Sentence: ${analysis.complexity.readabilityMetrics.averageWordsPerSentence.toFixed(1)}\n`;
                response += `- Avg Syllables/Word: ${analysis.complexity.readabilityMetrics.averageSyllablesPerWord.toFixed(1)}\n\n`;
            }

            // Named entities
            if (includeEntities && analysis.entities.length > 0) {
                response += `## 🏷️ Named Entities\n\n`;
                
                const entityGroups = analysis.entities.reduce((groups, entity) => {
                    if (!groups[entity.type]) groups[entity.type] = [];
                    groups[entity.type].push(entity);
                    return groups;
                }, {} as Record<string, typeof analysis.entities>);
                
                Object.entries(entityGroups).forEach(([type, entities]) => {
                    response += `**${type}:** ${entities.map(e => e.text).join(', ')}\n`;
                });
                response += `\n`;
            }

            // Content structure
            response += `## 🏗️ Content Structure\n\n`;
            const structure = analysis.structure;
            response += `**Structure Elements:**\n`;
            response += `- ${structure.hasIntroduction ? '✅' : '❌'} Introduction\n`;
            response += `- ${structure.hasExamples ? '✅' : '❌'} Examples\n`;
            response += `- ${structure.hasCodeBlocks ? '✅' : '❌'} Code blocks\n`;
            response += `- ${structure.hasList ? '✅' : '❌'} Lists\n`;
            response += `- ${structure.hasSteps ? '✅' : '❌'} Step-by-step instructions\n`;
            response += `- ${structure.hasConclusion ? '✅' : '❌'} Conclusion\n\n`;

            if (structure.sections.length > 0) {
                response += `**Sections Identified:**\n`;
                structure.sections.forEach((section, index) => {
                    const importance = Math.round(section.importance * 100);
                    response += `${index + 1}. ${section.title} (${section.type}, ${importance}% importance)\n`;
                });
                response += `\n`;
            }

            // Educational insights
            response += `## 🎓 Educational Insights\n\n`;
            
            if (analysis.educationalLevel.prerequisites.length > 0) {
                response += `**Prerequisites:** ${analysis.educationalLevel.prerequisites.join(', ')}\n`;
            }
            
            if (analysis.educationalLevel.learningObjectives.length > 0) {
                response += `**Learning Objectives:**\n`;
                analysis.educationalLevel.learningObjectives.forEach((objective, index) => {
                    response += `${index + 1}. ${objective}\n`;
                });
            }
            
            if (analysis.educationalLevel.suggestedFollowUp.length > 0) {
                response += `**Suggested Follow-up Topics:** ${analysis.educationalLevel.suggestedFollowUp.join(', ')}\n`;
            }
            response += `\n`;

            // Concept relationships
            if (analysis.relationships.length > 0) {
                response += `## 🔗 Concept Relationships\n\n`;
                analysis.relationships.forEach((rel, index) => {
                    const strength = Math.round(rel.strength * 100);
                    response += `${index + 1}. **${rel.concept1}** ${rel.relationship.replace('_', ' ')} **${rel.concept2}** (${strength}% strength)\n`;
                    if (rel.explanation) {
                        response += `   - ${rel.explanation}\n`;
                    }
                });
                response += `\n`;
            }

            // Recommendations
            response += `## 💡 Recommendations\n\n`;
            
            if (analysis.complexity.level === 'expert') {
                response += `- This is advanced content - consider providing additional context for beginners\n`;
            } else if (analysis.complexity.level === 'beginner') {
                response += `- This is beginner-friendly content - great for introductory learning\n`;
            }
            
            if (!analysis.structure.hasExamples) {
                response += `- Consider adding practical examples to illustrate concepts\n`;
            }
            
            if (!analysis.structure.hasSteps && analysis.contentType.primary === 'tutorial') {
                response += `- Break down the tutorial into clear, numbered steps\n`;
            }
            
            if (analysis.sentiment.overall === 'negative') {
                response += `- The content has a negative tone - consider more encouraging language\n`;
            }

            return response;

        } catch (error) {
            console.error('Content analysis error:', error);
            
            return `📊 **Content Analysis - Processing Issue**

I encountered an issue while analyzing the content:

**Error:** ${error instanceof Error ? error.message : 'Unknown error'}

## 🔧 Manual Content Analysis

Here's how you can analyze content manually:

### 📝 Basic Analysis
1. **Main theme:** What is the primary subject?
2. **Key points:** What are the 3-5 most important ideas?
3. **Complexity:** Is this beginner, intermediate, or advanced?
4. **Structure:** Does it have intro, examples, conclusion?

### 😊 Sentiment Analysis
- **Tone:** Formal, casual, technical, friendly?
- **Emotion:** Positive, negative, neutral?
- **Clarity:** Easy to understand or confusing?

### 🎓 Educational Assessment
- **Target audience:** Who is this for?
- **Prerequisites:** What should readers know first?
- **Learning goals:** What will readers learn?

Would you like me to help you manually analyze specific aspects of your content?`;
        }
    }
);

export const classifyIntentTool = ai.defineTool(
    {
        name: 'classifyIntent',
        description: 'Classifies user intent from their message to provide more targeted responses. Use this to understand what the user really wants and how to best help them.',
        inputSchema: z.object({
            userMessage: z.string().describe("The user's message to classify"),
            conversationContext: z.string().optional().describe("Previous conversation context"),
            domain: z.enum(['educational', 'technical', 'general']).optional().default('educational').describe("Domain context")
        }),
        outputSchema: z.string(),
    },
    async ({ userMessage, conversationContext, domain }) => {
        try {
            console.log(`🎯 Classifying user intent in ${domain} domain`);
            
            const classification = await nlpService.classifyIntent({
                text: userMessage,
                context: conversationContext,
                domain
            });
            
            let response = `🎯 **Intent Classification Results**\n\n`;
            
            response += `**User Message:** "${userMessage}"\n\n`;
            
            response += `## 🔍 Classification\n\n`;
            response += `**Primary Intent:** ${classification.intent}\n`;
            response += `**Category:** ${classification.category}\n`;
            response += `**Confidence:** ${Math.round(classification.confidence * 100)}%\n\n`;
            
            if (Object.keys(classification.parameters).length > 0) {
                response += `**Parameters Detected:**\n`;
                Object.entries(classification.parameters).forEach(([key, value]) => {
                    response += `- ${key}: ${value}\n`;
                });
                response += `\n`;
            }
            
            response += `## 💡 Suggested Response Approach\n\n`;
            response += `${classification.suggestedResponse}\n\n`;
            
            // Provide specific guidance based on intent
            response += `## 🎯 Specific Guidance\n\n`;
            
            switch (classification.category) {
                case 'question':
                    response += `**This is a question** - The user is seeking information or clarification.\n`;
                    response += `- Provide a clear, comprehensive answer\n`;
                    response += `- Include examples if helpful\n`;
                    response += `- Ask follow-up questions to ensure understanding\n`;
                    break;
                    
                case 'request':
                    response += `**This is a request** - The user wants you to perform an action or create something.\n`;
                    response += `- Fulfill the request directly if possible\n`;
                    response += `- Explain what you're doing as you do it\n`;
                    response += `- Offer alternatives if the exact request isn't possible\n`;
                    break;
                    
                case 'explanation':
                    response += `**This seeks explanation** - The user wants to understand a concept or process.\n`;
                    response += `- Break down complex topics into simpler parts\n`;
                    response += `- Use analogies and examples\n`;
                    response += `- Check for understanding along the way\n`;
                    break;
                    
                case 'feedback':
                    response += `**This is feedback** - The user is sharing their experience or opinion.\n`;
                    response += `- Acknowledge their feedback positively\n`;
                    response += `- Ask clarifying questions if needed\n`;
                    response += `- Use the feedback to improve future responses\n`;
                    break;
                    
                case 'greeting':
                    response += `**This is a greeting** - The user is starting or continuing a conversation.\n`;
                    response += `- Respond warmly and welcomingly\n`;
                    response += `- Ask how you can help\n`;
                    response += `- Set a positive tone for the interaction\n`;
                    break;
                    
                default:
                    response += `**General interaction** - The user's intent is not clearly categorized.\n`;
                    response += `- Ask clarifying questions to understand their needs\n`;
                    response += `- Provide helpful suggestions\n`;
                    response += `- Be ready to adapt based on their response\n`;
            }
            
            // Add context-specific recommendations
            if (conversationContext) {
                response += `\n## 📚 Context Considerations\n\n`;
                response += `Given the conversation context, consider:\n`;
                response += `- Building on previous topics discussed\n`;
                response += `- Referencing earlier examples or explanations\n`;
                response += `- Maintaining consistency with the established learning path\n`;
            }
            
            return response;

        } catch (error) {
            console.error('Intent classification error:', error);
            
            return `🎯 **Intent Classification - Processing Issue**

I encountered an issue while classifying the user's intent:

**Error:** ${error instanceof Error ? error.message : 'Unknown error'}

## 🔧 Manual Intent Analysis

Here's how to analyze user intent manually:

### 🎯 Intent Categories
1. **Questions** - Contains "?", starts with "what/how/why/when/where"
2. **Requests** - Contains "please", "can you", "create", "make", "help me"
3. **Greetings** - "hello", "hi", "good morning", etc.
4. **Explanations** - "explain", "tell me about", "I don't understand"
5. **Feedback** - "this is good/bad", "I like/dislike", opinions

### 📝 Analysis Steps
1. **Look for question words** - what, how, why, when, where
2. **Check for action requests** - create, make, show, help, generate
3. **Identify the main topic** - what is the user asking about?
4. **Consider the context** - what were you discussing before?

### 💡 Response Strategy
- **Questions:** Provide clear, detailed answers
- **Requests:** Take action and explain what you're doing
- **Greetings:** Be friendly and ask how to help
- **Explanations:** Break down complex topics simply

Would you like me to help you analyze the specific intent in this message?`;
        }
    }
);