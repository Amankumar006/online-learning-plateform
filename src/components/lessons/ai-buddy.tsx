"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateConversationStarters } from '@/ai/flows/generate-conversation-starters';
import { Bot, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AIBuddy({ lessonContent }: { lessonContent: string }) {
  const [starters, setStarters] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setStarters([]);
    try {
      const result = await generateConversationStarters({ lessonContent });
      if (result.conversationStarters && result.conversationStarters.length > 0) {
        setStarters(result.conversationStarters);
      } else {
        setError('The AI could not generate conversation starters. Please try again.');
      }
    } catch (e) {
      setError('An error occurred while communicating with the AI.');
      console.error(e);
    }
    setIsLoading(false);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Bot /> AI Study Buddy
        </CardTitle>
        <CardDescription>
          Practice what you've learned. Generate some conversation starters to discuss the topic.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center mb-6">
            <Button onClick={handleGenerate} disabled={isLoading} size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Discussion Points'
              )}
            </Button>
        </div>

        {error && (
            <Alert variant="destructive" className="my-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {starters.length > 0 && (
          <div className="space-y-4 animate-in fade-in-0 duration-500">
            <h3 className="font-semibold text-lg">Here are some ideas to get you started:</h3>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              {starters.map((starter, index) => (
                <li key={index} className="p-2 rounded-md hover:bg-accent/20">{starter}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
