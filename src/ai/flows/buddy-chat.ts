
'use server';
/**
 * @fileOverview A conversational AI flow for the main Buddy AI page, with tools.
 *
 * - buddyChatStream - A function that handles the conversation.
 * - BuddyChatInput - The input type for the function.
 * - StreamedOutput - The output type for the function's stream.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {generateCustomExercise} from './generate-custom-exercise';
import {generateStudyTopics} from './generate-study-topics';
import {createExercise, getLessons, getUser, Exercise} from '@/lib/data';
import { PersonaSchema } from '@/ai/schemas/buddy-schemas';
import { simulateCodeExecution } from './simulate-code-execution';
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
});
export type BuddyChatInput = z.infer<typeof BuddyChatInputSchema>;

const StreamedOutputSchema = z.object({
    type: z.enum(['thought', 'response', 'error']),
    content: z.string(),
    suggestions: z.array(z.string()).optional(),
});
export type StreamedOutput = z.infer<typeof StreamedOutputSchema>;


const createExerciseTool = ai.defineTool(
    {
        name: 'createCustomExercise',
        description: 'Creates a custom practice exercise based on a user prompt. Use this when the user asks for a practice problem, a quiz question, or a custom exercise on a specific topic.',
        inputSchema: z.object({ prompt: z.string().describe("The user's specific request for an exercise, e.g., 'a medium-difficulty question about javascript arrays'.") }),
        outputSchema: z.string(),
    },
    async (input, context) => {
        try {
            const auth = context?.auth;
            if (!auth || !auth.uid) {
                return "I can't create an exercise because I don't know who you are. Please make sure you are logged in.";
            }
            const { prompt } = input;
            const exercise = await generateCustomExercise({ prompt });
            
            let exerciseData: Omit<Exercise, 'id'>;
            switch (exercise.type) {
                case 'mcq': case 'true_false':
                    exerciseData = { ...exercise, correctAnswer: String(exercise.correctAnswer), lessonId: 'custom', isCustom: true, userId: auth.uid, createdAt: Date.now() };
                    break;
                case 'long_form': case 'fill_in_the_blanks':
                    exerciseData = { ...exercise, lessonId: 'custom', isCustom: true, userId: auth.uid, createdAt: Date.now() };
                    break;
                default:
                    return "Sorry, I had trouble creating an exercise of that type. Please try rephrasing your request.";
            }
            await createExercise(exerciseData);
            
            const questionText = exercise.type === 'fill_in_the_blanks' ? exercise.questionParts.join(' ___ ') : (exercise as any).question;
            return `I've created a new exercise for you: "${questionText}". You can find it on your "Practice" page.`;
        } catch (error) {
            console.error('Error in createExerciseTool:', error);
            return 'Sorry, I encountered an internal error while trying to create an exercise.';
        }
    }
);

const suggestTopicsTool = ai.defineTool(
    {
        name: 'suggestStudyTopics',
        description: 'Suggests new topics for a user to study based on their progress. Use this when the user asks "what should I learn next?", "suggest a topic", or a similar question about guidance.',
        inputSchema: z.object({}), // No specific input needed from AI
        outputSchema: z.string(),
    },
    async (_, context) => {
        try {
            const auth = context?.auth;
            if (!auth || !auth.uid) {
                return "I can't suggest topics without knowing your progress. Please make sure you are logged in.";
            }
            const [user, lessonsData] = await Promise.all([
                getUser(auth.uid),
                getLessons()
            ]);

            if (!user) return "I couldn't find your profile to check your progress.";

            const progressSummary = `Completed lessons: ${user.progress.completedLessonIds?.length || 0}. Mastery by subject: ${user.progress.subjectsMastery?.map(s => `${s.subject}: ${s.mastery}%`).join(', ') || 'None'}.`;
            const goals = 'Achieve mastery in all available subjects and discover new areas of interest.';
            const uncompletedLessonTitles = lessonsData
                .filter(l => !user.progress.completedLessonIds?.includes(l.id))
                .map(l => l.title);

            if (uncompletedLessonTitles.length === 0) {
                return "It looks like you've completed all available lessons! Great job! I can't suggest any new ones right now, but feel free to ask me to create a custom practice exercise for you on any topic."
            }

            const result = await generateStudyTopics({
                currentProgress: progressSummary,
                learningGoals: goals,
                availableLessons: uncompletedLessonTitles
            });

            const suggestions = result.suggestedTopics.map(topic => `- ${topic}`).join('\n');
            return `Based on your progress, here are a few topics I'd recommend you check out next:\n\n${suggestions}\n\nYou can find these on the "Lessons" page.`;
        } catch (error) {
            console.error('Error in suggestTopicsTool:', error);
            return 'Sorry, I encountered an internal error while trying to suggest topics.';
        }
    }
);

const searchTheWebTool = ai.defineTool(
    {
        name: 'searchTheWeb',
        description: 'Searches the web for up-to-date information on a given topic. Use this for general knowledge questions, current events, or topics not covered in the user\'s study materials.',
        inputSchema: z.object({ query: z.string().describe("The user's question or topic to search for.") }),
        outputSchema: z.string(),
    },
    async ({ query }) => {
        try {
            const apiKey = process.env.GOOGLE_API_KEY;
            const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
            
            if (!apiKey || !searchEngineId) {
                 return "I am sorry, but the web search tool is not configured correctly. I cannot access real-time information right now.";
            }

            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`;
            
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Google Search API Error:", errorData);
                return `Sorry, I encountered an error while searching the web: ${errorData.error.message}`;
            }

            const data = await response.json();
            
            if (!data.items || data.items.length === 0) {
                return `I couldn't find any direct results for "${query}". You might want to try rephrasing your question.`;
            }

            // Extract titles, links, and snippets from the top 3 results
            const searchResults = data.items.slice(0, 3).map((item: any) => ({
                title: item.title,
                link: item.link,
                snippet: item.snippet
            }));
            
            const summary = searchResults.map((r: any) => `Title: ${r.title}\nSnippet: ${r.snippet}`).join('\n\n');
            return `Based on a web search for "${query}", here is a summary of the top results:\n\n${summary}`;

        } catch (error) {
            console.error("Error in searchTheWebTool:", error);
            return "I ran into a problem while trying to search the web. Please try again in a moment.";
        }
    }
);

const generateImageForExplanationTool = ai.defineTool(
    {
        name: 'generateImageForExplanation',
        description: 'Generates an image, diagram, or chart to visually explain a concept. Use this when a user asks for a visual explanation or when a concept is highly visual (e.g., "show me a diagram of a plant cell", "what does a solar eclipse look like?"). Do not use it for generating user avatars or other non-educational images.',
        inputSchema: z.object({ 
            prompt: z.string().describe("A detailed, descriptive text prompt for the image generation model. For example: 'A labeled diagram of a plant cell showing the cell wall, cell membrane, nucleus, and chloroplasts.'") 
        }),
        outputSchema: z.string().describe("A markdown string for the generated image, in the format '![<prompt>](<data_uri>)'.")
    },
    async ({ prompt }) => {
        try {
            const { media } = await ai.generate({
                model: 'googleai/gemini-2.0-flash-preview-image-generation',
                prompt: prompt,
                config: {
                    responseModalities: ['TEXT', 'IMAGE'],
                },
            });

            if (!media || !media.url) {
                return "Sorry, I was unable to generate an image for that prompt. Please try rephrasing your request.";
            }
            
            return `![${prompt}](${media.url})`;
        } catch (error) {
            console.error('Error in generateImageForExplanationTool:', error);
            return 'Sorry, I encountered an internal error while trying to generate an image.';
        }
    }
);

const analyzeCodeComplexityTool = ai.defineTool(
    {
        name: 'analyzeCodeComplexity',
        description: "Analyzes a given code snippet for its time and space complexity (Big O notation) and provides a brief explanation. Use this when a user's code could be analyzed for performance.",
        inputSchema: z.object({ 
            code: z.string().describe("The code snippet to analyze."),
            language: z.string().describe("The programming language of the code, e.g., 'python' or 'javascript'.")
        }),
        outputSchema: z.string().describe("A summary of the complexity analysis, e.g., 'Time Complexity: O(n), Space Complexity: O(1). This is because...'")
    },
    async (input) => {
        try {
            const result = await simulateCodeExecution({ code: input.code, language: input.language });
            return `
Time Complexity: **${result.complexity.time}**
Space Complexity: **${result.complexity.space}**

Summary: ${result.analysis.summary}
            `.trim();
        } catch (e) {
            console.error('Error in analyzeCodeComplexityTool:', e);
            return "I was unable to analyze the complexity of that code snippet.";
        }
    }
);

/**
 * The main exported function that clients (like the Next.js page) will call.
 * This is an async generator that streams the output.
 */
export async function* buddyChatStream(input: BuddyChatInput): AsyncGenerator<StreamedOutput> {
    yield* buddyChatFlow(input);
}


const buddyChatFlow = ai.defineFlow(
  {
    name: 'buddyChatFlow',
    inputSchema: BuddyChatInputSchema,
    outputSchema: z.string(), // The final output is just the string response
    streamSchema: StreamedOutputSchema,
    authPolicy: (auth, input) => {
        if (!auth) throw new Error("Authentication is required to chat with Buddy AI.");
        if (auth.uid !== input.userId) throw new Error("User ID does not match authenticated user.");
    }
  },
  async function* (input, {auth}) {
    
    try {
        const MAX_HISTORY_MESSAGES = 10; // Keep the last 5 user/model turns

        const history = (input.history || []).slice(-MAX_HISTORY_MESSAGES).map(msg => ({
            role: msg.role as 'user' | 'model',
            parts: [{ text: msg.content }],
        }));
        
        let systemPrompt: string;
        
        switch (input.persona) {
            case 'mentor':
                systemPrompt = `You are a world-class Staff Software Engineer AI, acting as a Code Mentor. Your purpose is to deliver technically precise, in-depth, and actionable advice. You are concise but comprehensive, prioritizing professional software development standards.

**Core Directives:**
1.  **Analyze First, Answer Second:** When presented with code, do not just fix it. First, analyze its correctness, efficiency, and style.
2.  **Code, Then Explain:** Provide the corrected or improved code block first. Immediately follow with a clear, step-by-step breakdown of your changes and the reasoning behind them.
3.  **Go Beyond the Surface:**
    *   **Complexity Analysis:** For any algorithm, use the \`analyzeCodeComplexity\` tool to determine and explain its time and space complexity. Discuss potential performance bottlenecks.
    *   **Edge Cases & Testing:** Challenge the user to think about edge cases. Ask "How would you test this?" or "What happens if the input is an empty array?".
    *   **Refactoring & Design Patterns:** If the code is functional but poorly structured, suggest specific refactoring techniques (e.g., "Extract this logic into a separate function"). If applicable, introduce relevant design patterns (e.g., "This could be solved using a Singleton pattern because...").
4.  **Tool-Driven Workflow:**
    *   \`analyzeCodeComplexity\`: Use this to provide performance insights on user code.
    *   \`createCustomExercise\`: When a user learns a concept, use this to create a tailored practice problem.
    *   \`suggestStudyTopics\`: Use this to guide the user's learning path when they ask for direction.
    *   \`searchTheWeb\`: Use this to pull in the latest documentation, best practices, or information on specific libraries.
    *   \`generateImageForExplanation\`: Use this to create diagrams for system architecture, data structures, or complex algorithms.
5.  **Professional Formatting:**
    *   Use Markdown extensively. Employ '###' for sections, '**bold**' for key terms, and code blocks with language identifiers.
    *   Use blockquotes '> ' for critical advice, security warnings, or best practices.
    *   Present trade-offs clearly, perhaps using a bulleted list. E.g., "- **Approach A:** Faster but uses more memory. - **Approach B:** Slower but more memory-efficient."`;
                break;
            case 'buddy':
            default:
                 systemPrompt = `You are Buddy AI, a friendly, encouraging, and highly knowledgeable study companion. Your primary goal is to provide exceptionally clear explanations and to actively guide the user's learning journey.

**Core Principles:**
1.  **Be Proactive:** Don't just answer questions. Anticipate the user's needs. After explaining a concept, suggest a relevant next step, such as creating a practice problem, explaining a related topic, or simplifying the concept further.
2.  **Be Conversational:** End every response with an engaging, open-ended question to encourage dialogue. Make the user feel like they are in a real conversation with a helpful tutor. (e.g., "Does that make sense?", "Would you like to try a practice problem on this?", "What should we explore next?").
3.  **Be a Guide:** Use your tools strategically. If a user asks a question about a concept, answer it, and then offer to create a custom exercise using your \`createCustomExercise\` tool. If a user seems unsure of what to do, proactively use the \`suggestStudyTopics\` tool.
4.  **Be Knowledgeable:** If the user asks a general knowledge question or something about a current event, use your \`searchTheWeb\` tool to find an answer.
5.  **Visualize to Clarify:** When explaining a concept that would benefit from a visual aid (like a biological process, a historical map, or a mathematical graph), use the \`generateImageForExplanation\` tool to create and display a helpful image.

**Formatting Guidelines:**
- Use Markdown to structure your responses for maximum clarity and engagement.
- Use '###' for main headings to break down concepts.
- Use '**bold text**' for key terms.
- Use emojis to add visual cues and make content engaging (e.g., 💡, 🧩, ⚠️, ✅, 🎯).
- Use horizontal rules '---' to separate major sections.
- Use code blocks with language identifiers (e.g., \`\`\`python) for code examples.
- Use blockquotes '> ' for summaries or important callouts.

**Tool Usage:**
- **createCustomExercise**: Use this tool not only when asked, but also as a suggestion after explaining a concept. When you use it, tell the user the exercise has been created and is on their "Practice" page.
- **suggestStudyTopics**: Use this tool when the user asks for guidance (e.g., "what should I learn next?") or seems unsure.
- **searchTheWeb**: Use this tool for general knowledge questions or topics not directly related to the user's study material.
- **generateImageForExplanation**: Use this to create diagrams, charts, or illustrations to make complex topics easier to understand.

For all interactions, maintain a positive and supportive tone. If you don't know an answer, admit it and suggest how the user might find the information.`;
                break;
        }


        const {stream: llmStream, response: llmResponse} = ai.generateStream({
            model: 'googleai/gemini-2.0-flash',
            tools: [createExerciseTool, suggestTopicsTool, searchTheWebTool, generateImageForExplanationTool, analyzeCodeComplexityTool],
            system: systemPrompt,
            history: history,
            prompt: input.userMessage,
            config: {
                safetySettings: [
                  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                ],
            },
        }, { auth });
        
        // Stream tool usage as "thoughts"
        for await (const chunk of llmStream) {
            if (chunk.type === 'toolRequest') {
                 yield { type: 'thought', content: `Using tool: \`${chunk.toolRequest.name}\`...` };
            }
        }
        
        // Await the final response and then generate follow-up suggestions
        const finalResponse = await llmResponse;
        const aiResponseText = finalResponse.text;
        
        const followUpResult = await generateFollowUpSuggestions({
            lastUserMessage: input.userMessage,
            aiResponse: aiResponseText,
        });
        
        // Yield the final response with suggestions
        yield {
            type: 'response',
            content: aiResponseText,
            suggestions: followUpResult.suggestions,
        };

        return aiResponseText;
    } catch (e: any) {
        console.error("Error in buddyChatFlow:", e);
        // Yield a specific error message to the client
        yield {
            type: 'error',
            content: `I'm sorry, but an unexpected error occurred. Here are the details:\n\n> ${e.message || 'An unknown internal error happened.'}\n\nPlease try rephrasing your message or starting a new chat.`,
        };
        // Still return an empty string to satisfy the flow's output schema
        return "";
    }
  }
);

    