
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { User } from "@/lib/data";
import { Hand } from "lucide-react";

interface Participant extends User {
    handRaised?: boolean;
}

interface ParticipantListProps {
  participants: Participant[];
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
                <div className="relative">
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={participant.photoURL || undefined} />
                    <AvatarFallback>{getInitials(participant.name)}</AvatarFallback>
                  </Avatar>
                  {participant.handRaised && (
                    <div className="absolute -bottom-1 -right-1 rounded-full bg-yellow-400 p-0.5 border-2 border-background">
                      <Hand className="h-3 w-3 text-black" />
                    </div>
                  )}
                </div>
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
