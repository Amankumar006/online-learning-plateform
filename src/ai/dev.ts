
'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-study-topics.ts';
import '@/ai/flows/chat-with-ai-buddy.ts';
import '@/ai/flows/generate-exercise.ts';
import '@/ai/flows/generate-lesson-content.ts';
import '@/ai/flows/generate-lesson-image.ts';
import '@/ai/flows/grade-long-form-answer.ts';
import '@/ai/tools/lesson-tools.ts';
import '@/ai/flows/generate-audio-from-text.ts';
import '@/ai/flows/generate-custom-exercise.ts';
import '@/ai/flows/simulate-code-execution.ts';
import '@/ai/flows/convert-speech-to-latex.ts';
import '@/ai/flows/convert-latex-to-speech.ts';
import '@/ai/flows/buddy-chat.ts';
import '@/ai/flows/canvas-math-flow.ts';
import '@/ai/flows/visual-explainer-flow.ts';
import '@/ai/flows/grade-math-solution.ts';
import '@/ai/flows/generate-audio-from-text.ts';

