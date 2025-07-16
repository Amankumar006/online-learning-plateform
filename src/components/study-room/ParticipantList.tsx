
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { User } from "@/lib/data";

interface ParticipantListProps {
  participants: User[];
}

const getInitials = (name?: string) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

export function ParticipantList({ participants }: ParticipantListProps) {
  return (
    <div className="flex items-center space-x-2 pl-4">
      <div className="flex -space-x-2">
        {participants.slice(0, 4).map((participant) => (
          <TooltipProvider key={participant.uid}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={participant.photoURL || undefined} />
                  <AvatarFallback>{getInitials(participant.name)}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{participant.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      {participants.length > 4 && (
        <span className="text-sm font-medium text-muted-foreground">
          +{participants.length - 4} more
        </span>
      )}
    </div>
  );
}
