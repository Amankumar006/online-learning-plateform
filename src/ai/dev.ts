import { config } from 'dotenv';
config();

import '@/ai/flows/generate-study-topics.ts';
import '@/ai/flows/chat-with-ai-buddy.ts';
import '@/ai/flows/generate-exercise.ts';
import '@/ai/flows/generate-lesson-content.ts';
import '@/ai/flows/generate-lesson-image.ts';
import '@/ai/flows/grade-long-form-answer.ts';
import '@/ai/tools/lesson-tools.ts';
