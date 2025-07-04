
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

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const BuddyChatInputSchema = z.object({
  userMessage: z.string().describe('The message sent by the user.'),
  userId: z.string().describe("The ID of the current user, used for context-aware actions."),
  history: z.array(MessageSchema).optional().describe('The conversation history.'),
});
type BuddyChatInput = z.infer<typeof BuddyChatInputSchema>;

const BuddyChatOutputSchema = z.object({
  response: z.string().describe("The AI's response to the user."),
});
type BuddyChatOutput = z.infer<typeof BuddyChatOutputSchema>;


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

    const llmResponse = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        tools: [createExerciseTool, suggestTopicsTool],
        system: `You are Buddy AI, a friendly, encouraging, and highly knowledgeable study companion. Your primary goal is to provide exceptionally clear explanations and to actively guide the user's learning journey.

**Core Principles:**
1.  **Be Proactive:** Don't just answer questions. Anticipate the user's needs. After explaining a concept, suggest a relevant next step, such as creating a practice problem, explaining a related topic, or simplifying the concept further.
2.  **Be Conversational:** End every response with an engaging, open-ended question to encourage dialogue. Make the user feel like they are in a real conversation with a helpful tutor. (e.g., "Does that make sense?", "Would you like to try a practice problem on this?", "What should we explore next?").
3.  **Be a Guide:** Use your tools strategically. If a user asks a question about a concept, answer it, and then offer to create a custom exercise using your \`createCustomExercise\` tool. If a user seems unsure of what to do, proactively use the \`suggestStudyTopics\` tool.

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

For all interactions, maintain a positive and supportive tone. If you don't know an answer, admit it and suggest how the user might find the information.`,
        history: history,
        prompt: input.userMessage,
    }, { auth });
    
    return { response: llmResponse.text };
  }
);
