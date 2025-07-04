import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import next from '@genkit-ai/next';

export const ai = genkit({
  plugins: [
    googleAI(),
    next({
      // The Next.js plugin integrates Genkit with Next.js server actions
      // and automatically handles authentication context.
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
