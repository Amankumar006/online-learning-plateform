
'use server';
/**
 * @fileOverview A Genkit flow to convert text to speech.
 *
 * - generateAudioFromText - A function that generates audio from a string of text.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import wav from 'wav';

const GenerateAudioInputSchema = z.object({
  text: z.string().describe('The text to be converted to speech.'),
  voice: z.string().optional().default('Algenib').describe('The prebuilt voice to use for generation.'),
});
type GenerateAudioInput = z.infer<typeof GenerateAudioInputSchema>;

const GenerateAudioOutputSchema = z.object({
  audioDataUri: z.string().describe('The base64 encoded data URI of the generated WAV audio file.'),
});
type GenerateAudioOutput = z.infer<typeof GenerateAudioOutputSchema>;

export async function generateAudioFromText(input: GenerateAudioInput): Promise<GenerateAudioOutput> {
  return generateAudioFlow(input);
}

const generateAudioFlow = ai.defineFlow(
  {
    name: 'generateAudioFlow',
    inputSchema: GenerateAudioInputSchema,
    outputSchema: GenerateAudioOutputSchema,
  },
  async ({ text, voice }) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Algenib' },
          },
        },
      },
      prompt: text,
    });
    if (!media) {
      throw new Error('No media returned from TTS model.');
    }
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    const wavData = await toWav(audioBuffer);
    return { audioDataUri: `data:audio/wav;base64,${wavData}` };
  }
);

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

    let bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', (d) => {
      bufs.push(d);
    });
    writer.on('end', () => {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
