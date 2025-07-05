import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import fromNext from '@genkit-ai/next';

export const ai = genkit({
  plugins: [
    googleAI(),
    fromNext(),
  ],
  model: 'googleai/gemini-2.0-flash',
});
