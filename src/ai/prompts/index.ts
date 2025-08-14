import { Persona } from '@/ai/schemas/buddy-schemas';
import { MENTOR_PROMPT_BASE } from './base/mentor';
import { BUDDY_PROMPT_BASE } from './base/buddy';
import { LESSON_CONTEXT_INSTRUCTION } from './modifiers/lesson-context';

const PROMPTS = {
  mentor: MENTOR_PROMPT_BASE,
  buddy: BUDDY_PROMPT_BASE,
};

export function getSystemPrompt(persona: Persona, hasLessonContext: boolean): string {
  const basePrompt = PROMPTS[persona];
  return hasLessonContext 
    ? `${basePrompt}\n${LESSON_CONTEXT_INSTRUCTION}`
    : basePrompt;
}