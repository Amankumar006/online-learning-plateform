
'use server';
/**
 * @fileOverview A Genkit flow to convert a lesson section into speakable audio.
 *
 * - generateAudioFromText - Converts text (including LaTeX) into a WAV audio data URI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import wav from 'wav';

const GenerateAudioFromTextInputSchema = z.object({
  sectionTitle: z.string().describe('The title of the lesson section.'),
  sectionContent: z.string().describe('The text content of the section, which may contain LaTeX.'),
});
type GenerateAudioFromTextInput = z.infer<typeof GenerateAudioFromTextInputSchema>;

const GenerateAudioFromTextOutputSchema = z.object({
  audioDataUri: z.string().describe('The resulting WAV audio file as a data URI.'),
});
type GenerateAudioFromTextOutput = z.infer<typeof GenerateAudioFromTextOutputSchema>;

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', (d: Buffer) => bufs.push(d));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));

    writer.write(pcmData);
    writer.end();
  });
}

// Step 1: Define a prompt to convert raw text into a clean, speakable script.
const makeSpeakablePrompt = ai.definePrompt({
  name: 'makeSpeakablePrompt',
  input: { schema: z.object({ text: z.string() }) },
  output: { schema: z.object({ speakableText: z.string() }) },
  model: 'googleai/gemini-2.0-flash',
  prompt: `Convert the following text, which may contain Markdown, LaTeX math expressions (e.g., $ax^2+bx+c=0$), or code blocks (e.g., \`\`\`python...), into a clean, natural-sounding script for a text-to-speech engine.
- Read all mathematical expressions aloud clearly. For example, convert $x^2$ to "x squared".
- When you encounter a code block, say "Here is a code snippet:" and then read the code content.
- Do not add any conversational filler or introductory phrases like "Here is the converted text:".
- Do not say "dollar sign" or "backticks".
- Just provide the clean, speakable text.

Text to convert:
"{{{text}}}"
`,
});

// Step 2: Define the main flow that orchestrates the process.
export async function generateAudioFromText(input: GenerateAudioFromTextInput): Promise<GenerateAudioFromTextOutput> {
  // First, call the text transformation prompt.
  const { output: speakableResult } = await makeSpeakablePrompt({ text: input.sectionContent });
  if (!speakableResult?.speakableText) {
    throw new Error('Could not convert text to a speakable format.');
  }

  // Combine the title with the *cleaned* speakable text.
  const fullScript = input.sectionTitle
    ? `Reading section: ${input.sectionTitle}. ${speakableResult.speakableText}`
    : speakableResult.speakableText;

  // Now, send the clean script to the specialized TTS model.
  const { media } = await ai.generate({
    model: 'googleai/gemini-2.5-flash-preview-tts',
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Algenib' },
        },
      },
    },
    prompt: { text: fullScript },
  });

  if (!media) {
    throw new Error('Text-to-Speech generation failed to return audio media.');
  }

  // Convert the raw PCM audio data to a WAV file data URI.
  const audioBuffer = Buffer.from(
    media.url.substring(media.url.indexOf(',') + 1),
    'base64'
  );

  const wavBase64 = await toWav(audioBuffer);

  return {
    audioDataUri: 'data:audio/wav;base64,' + wavBase64,
  };
}
