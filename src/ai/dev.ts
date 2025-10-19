'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-study-topics.ts';
import '@/ai/flows/buddy-chat.ts';
import '@/ai/flows/generate-exercise.ts';
import '@/ai/flows/generate-lesson-content.ts';
import '@/ai/flows/generate-lesson-image.ts';
import '@/ai/flows/grade-long-form-answer.ts';
import '@/ai/tools/buddy';
import '@/ai/flows/generate-custom-exercise.ts';

import '@/ai/flows/generate-proactive-suggestion.ts';
import '@/ai/flows/generate-audio-from-text.ts';
import '@/ai/flows/generate-follow-up-suggestions.ts';
import '@/ai/flows/quick-chat.ts';
