
'use server';
/**
 * @fileOverview A Genkit flow to generate a single custom exercise from a user's prompt.
 *
 * - generateCustomExercise - A function that generates a single exercise.
 * - GenerateCustomExerciseInput - The input type for the function.
 * - GeneratedExercise - The output type (reused from schemas).
 */

import { ai } from '@/ai/ai';
import { z } from 'zod';
import { GeneratedExerciseSchema, type GeneratedExercise } from '@/ai/schemas/exercise-schemas';

const GenerateCustomExerciseInputSchema = z.object({
  prompt: z.string().describe("The user's request for a custom exercise, e.g., 'a python question about lists'"),
  gradeLevel: z.string().optional().describe('The grade level for the students (e.g., "10th", "12th").'),
  ageGroup: z.string().optional().describe('The age group of the students (e.g., "15-17 years old").'),
  curriculumBoard: z.string().optional().describe('The curriculum board (e.g., "CBSE", "ICSE", "NCERT", "State Board").'),
  difficulty: z.number().min(1).max(3).optional().describe('The desired difficulty from 1 (easy) to 3 (hard).'),
  questionType: z.enum(['mcq', 'true_false', 'long_form', 'fill_in_the_blanks', 'code', 'any']).optional().describe("The preferred question type. 'any' lets the AI decide."),
});
export type GenerateCustomExerciseInput = z.infer<typeof GenerateCustomExerciseInputSchema>;

// Re-export type for external use
export type { GeneratedExercise } from '@/ai/schemas/exercise-schemas';


export async function generateCustomExercise(input: GenerateCustomExerciseInput): Promise<z.infer<typeof GeneratedExerciseSchema> | null> {
  const result = await generateCustomExerciseFlow(input);
  if (!result) {
    // Return null explicitly if the flow fails to produce a valid result.
    return null;
  }
  return result;
}

const prompt = ai.definePrompt({
  name: 'generateCustomExercisePrompt',
  input: { schema: GenerateCustomExerciseInputSchema },
  output: { schema: GeneratedExerciseSchema },
  prompt: (input) => `
      You are an expert educational content generator. Your task is to generate a custom practice exercise based on the user's request.

      User Request: ${input.prompt}

**Structured Context:**
${input.gradeLevel ? `- Grade Level: ${input.gradeLevel}` : ''}
${input.ageGroup ? `- Age Group: ${input.ageGroup}` : ''}
${input.curriculumBoard ? `- Curriculum Board: ${input.curriculumBoard} (You MUST align the question style, terminology, and complexity with this board's standards.)` : ''}
${input.difficulty ? `- Difficulty: ${input.difficulty} (1=easy, 2=medium, 3=hard)` : ''}
${input.questionType ? `- Preferred Question Type: ${input.questionType} (if 'any', choose the best fit for the prompt)` : ''}


**Instructions:**
1.  **Analyze Request and Context:** Understand the core topic, desired difficulty, grade level, and curriculum standards from all provided information.
2.  **Choose the Best Type:** If a 'questionType' is specified and is not 'any', you MUST generate that type. If it's 'any' or not provided, choose the most suitable type based on the prompt.
3.  **Generate Full Content:** Create all the necessary fields for the chosen type (question, options, answer, explanation, criteria, hint, etc.). Ensure the content is age-appropriate and aligns with the specified curriculum.
4.  **Set Difficulty:** If a difficulty level is provided in the context, use it. Otherwise, infer a difficulty level (1-3) from the prompt.
5.  **Categorize:** Assign a category: 'code', 'math', or 'general'.
6.  **Add Tags:** Generate 3-4 relevant string tags (e.g., 'python', 'arrays', 'loops').
7.  **JSON Structure:** You MUST output valid JSON with a structure matching the 'type'.
    
    **Example for 'mcq':**
    {
      "type": "mcq",
      "category": "code",
      "difficulty": 1,
      "question": "What is the output of print(2+2)?",
      "options": ["3", "4", "5", "22"],
      "correctAnswer": "4",
      "explanation": "Standard integer addition.",
      "hint": "Basic math.",
      "tags": ["python", "math"]
    }

    **Example for 'long_form' (Coding/Essay):**
    {
      "type": "long_form",
      "category": "code",
      "difficulty": 2,
      "question": "Write a Python function to reverse a string.",
      "language": "python", // Required for code category
      "evaluationCriteria": "Check for correct slicing or reversed() usage.",
      "hint": "Try using string slicing [::-1]",
      "tags": ["python", "strings"]
    }

    **Example for 'fill_in_the_blanks':**
    {
      "type": "fill_in_the_blanks",
      "category": "general",
      "difficulty": 1,
      "questionParts": ["The capital of France is", "."],
      "correctAnswers": ["Paris"],
      "explanation": "Paris is the capital.",
      "hint": "Starts with P",
      "tags": ["geography"]
    }
    
    **Example for 'code' (Interactive Coding Challenge):**
    {
      "type": "code",
      "category": "code",
      "difficulty": 2,
      "title": "Reverse a String",
      "description": "Write a function that reverses a given string.",
      "language": "python",
      "starterCode": "def reverse_string(s):\n    # Your code here\n    pass",
      "testCases": [
        {
          "id": "tc1",
          "input": "hello",
          "expectedOutput": "olleh",
          "description": "Reverses a simple word",
          "points": 5
        }
      ],
      "totalPoints": 10,
      "hint": "Try using string slicing with step -1.",
      "tags": ["python", "strings", "algorithms"]
    }

Return your response as a single, valid JSON object that strictly conforms to the exercise schema.
**IMPORTANT:** Do not include any markdown formatting (like \`\`\`json ... \`\`\`), checks, or conversational text. Return ONLY the raw JSON string. If you must use markdown, ensure the code block is clean.
`,
});

const generateCustomExerciseFlow = ai.defineFlow(
  {
    name: 'generateCustomExerciseFlow',
    inputSchema: GenerateCustomExerciseInputSchema,
    outputSchema: GeneratedExerciseSchema.nullable(),
  },
  async input => {
    const { output } = await prompt(input);
    if (!output) {
      // Return null instead of throwing an error to allow the UI to handle it gracefully.
      return null;
    }
    // Fallback: if the AI hallucinates a correct answer not in the options, default to the first option.
    if (output.type === 'mcq' && !output.options.includes(output.correctAnswer)) {
      output.correctAnswer = output.options[0];
    }
    return output;
  }
);
