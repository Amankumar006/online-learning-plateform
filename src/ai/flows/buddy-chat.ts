
'use server';
/**
 * @fileOverview A conversational AI flow for the main Buddy AI page, with tools.
 *
 * - buddyChat - A function that handles the conversation.
 * - BuddyChatInput - The input type for the function.
 * - BuddyChatOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {generateCustomExercise} from './generate-custom-exercise';
import {generateStudyTopics} from './generate-study-topics';
import {createExercise, getLessons, getUser, Exercise} from '@/lib/data';
import { PersonaSchema } from '@/ai/schemas/buddy-schemas';

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

const BuddyChatOutputSchema = z.object({
  response: z.string().describe("The AI's response to the user."),
});
export type BuddyChatOutput = z.infer<typeof BuddyChatOutputSchema>;


const createExerciseTool = ai.defineTool(
    {
        name: 'createCustomExercise',
        description: 'Creates a custom practice exercise based on a user prompt. Use this when the user asks for a practice problem, a quiz question, or a custom exercise on a specific topic.',
        inputSchema: z.object({ prompt: z.string().describe("The user's specific request for an exercise, e.g., 'a medium-difficulty question about javascript arrays'.") }),
        outputSchema: z.string(),
    },
    async ({ prompt }, {auth}) => {
        if (!auth || !auth.uid) {
            return "I can't create an exercise because I don't know who you are. Please make sure you are logged in.";
        }
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
    }
);

const suggestTopicsTool = ai.defineTool(
    {
        name: 'suggestStudyTopics',
        description: 'Suggests new topics for a user to study based on their progress. Use this when the user asks "what should I learn next?", "suggest a topic", or a similar question about guidance.',
        inputSchema: z.object({}), // No specific input needed from AI
        outputSchema: z.string(),
    },
    async (_, {auth}) => {
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
        // In a real application, this would call a search API (e.g., Google Search API).
        // For this simulation, we'll return a helpful placeholder that acknowledges the query.
        // This demonstrates the AI's ability to know WHEN to use the tool.
        return `I've performed a search for "${query}". Based on the top results, here's a summary: [Simulated search result about ${query} would be here].`;
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
        
        // Return the image as a markdown string
        return `![${prompt}](${media.url})`;
    }
);


export async function buddyChat(input: BuddyChatInput): Promise<BuddyChatOutput> {
  return buddyChatFlow(input);
}

const buddyChatFlow = ai.defineFlow(
  {
    name: 'buddyChatFlow',
    inputSchema: BuddyChatInputSchema,
    outputSchema: BuddyChatOutputSchema,
    authPolicy: (auth, input) => {
        if (!auth) throw new Error("Authentication is required to chat with Buddy AI.");
        if (auth.uid !== input.userId) throw new Error("User ID does not match authenticated user.");
    }
  },
  async (input, {auth}) => {
    const history = (input.history || []).map(msg => ({
        role: msg.role as 'user' | 'model',
        parts: [{ text: msg.content }],
    }));
    
    let systemPrompt: string;
    
    switch (input.persona) {
        case 'mentor':
            systemPrompt = `You are a Code Mentor AI, a direct and expert software engineer. Your goal is to provide precise, technical answers and code reviews. You are not overly chatty, but you are thorough.

**Core Principles:**
1.  **Be Precise & Technical:** Provide accurate, industry-standard information. Prioritize correctness and efficiency in your code examples and explanations.
2.  **Code First:** When a user asks a coding question, provide the code solution first, followed by a clear, step-by-step explanation.
3.  **Proactive Review:** When a user shows you code, critique it constructively. Point out potential bugs, style issues, or areas for optimization. Suggest alternatives.
4.  **Use Tools Strategically:** When a user wants to practice a concept, use your \`createCustomExercise\` tool to generate a relevant coding problem.
5.  **Leverage External Knowledge:** If the user's question goes beyond the provided code or common software engineering principles, use the \`searchTheWeb\` tool to find relevant documentation, articles, or official sources.
6.  **Illustrate Concepts Visually:** When explaining a complex data structure, algorithm, or system architecture, use the \`generateImageForExplanation\` tool to create a diagram.

**Formatting Guidelines:**
- Use Markdown extensively.
- Use '###' for breaking down technical concepts.
- Use '**bold text**' for key technical terms.
- Use code blocks with language identifiers (e.g., \`\`\`python) for ALL code examples.
- Use blockquotes '> ' for important warnings or best practices.`;
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


    const llmResponse = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        tools: [createExerciseTool, suggestTopicsTool, searchTheWebTool, generateImageForExplanationTool],
        system: systemPrompt,
        history: history,
        prompt: input.userMessage,
    }, { auth });
    
    return { response: llmResponse.text };
  }
);
