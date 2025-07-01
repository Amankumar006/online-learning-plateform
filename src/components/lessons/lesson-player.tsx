
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Square, Loader2 } from "lucide-react";

interface LessonPlayerProps {
  isPlaying: boolean;
  isGenerating: boolean;
  currentSectionTitle: string | null;
  onPlayPause: () => void;
  onStop: () => void;
}

export default function LessonPlayer({
  isPlaying,
  isGenerating,
  currentSectionTitle,
  onPlayPause,
  onStop,
}: LessonPlayerProps) {
  if (currentSectionTitle === null && !isGenerating) {
    return null; // Don't render if nothing has been played yet
  }

  return (
    <Card className="mb-6 sticky top-20 z-30 bg-background/80 backdrop-blur-sm shadow-lg">
      <CardContent className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
            <Button variant="secondary" size="icon" onClick={onPlayPause} disabled={isGenerating} className="shrink-0">
                {isGenerating ? <Loader2 className="animate-spin"/> : (isPlaying ? <Pause /> : <Play />)}
            </Button>
            <div className="flex flex-col overflow-hidden">
                <span className="text-xs text-muted-foreground uppercase">Now Playing</span>
                <span className="font-semibold truncate text-sm">
                    {isGenerating ? "Generating audio..." : (currentSectionTitle || "Select a section to play")}
                </span>
            </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onStop} className="shrink-0">
            <Square />
            <span className="sr-only">Stop</span>
        </Button>
      </CardContent>
    </Card>
  );
}
