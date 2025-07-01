
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Square, Loader2, Download } from "lucide-react";

interface LessonPlayerProps {
  isPlaying: boolean;
  isGenerating: boolean;
  currentSectionTitle: string | null;
  audioUrl: string | null;
  onPlayPause: () => void;
  onStop: () => void;
  onDownload: () => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
}

export default function LessonPlayer({
  isPlaying,
  isGenerating,
  currentSectionTitle,
  audioUrl,
  onPlayPause,
  onStop,
  onDownload,
  playbackRate,
  onPlaybackRateChange,
}: LessonPlayerProps) {
  if (currentSectionTitle === null && !isGenerating) {
    return null; // Don't render if nothing has been played yet
  }

  return (
    <Card className="mb-6 sticky top-20 z-30 bg-background/80 backdrop-blur-sm shadow-lg">
      <CardContent className="p-3 flex items-center justify-between gap-2">
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
        <div className="flex items-center gap-1 sm:gap-2">
            <Select
                value={String(playbackRate)}
                onValueChange={(value) => onPlaybackRateChange(Number(value))}
            >
                <SelectTrigger className="w-[80px] sm:w-[90px] h-9 text-xs">
                    <SelectValue placeholder="Speed" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="0.75">0.75x</SelectItem>
                    <SelectItem value="1">1x</SelectItem>
                    <SelectItem value="1.25">1.25x</SelectItem>
                    <SelectItem value="1.5">1.5x</SelectItem>
                    <SelectItem value="2">2x</SelectItem>
                </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={onDownload} disabled={!audioUrl} className="shrink-0">
                <Download className="h-4 w-4"/>
                <span className="sr-only">Download Audio</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onStop} className="shrink-0">
                <Square />
                <span className="sr-only">Stop</span>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
