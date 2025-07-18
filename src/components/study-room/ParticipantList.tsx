
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, StudyRoom } from "@/lib/data";
import { Hand, Crown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Participant extends User {
    handRaised?: boolean;
}

interface ParticipantPanelProps {
  participants: Participant[];
  room: StudyRoom | null;
  currentUserId: string | null;
  onToggleEditorRole: (targetUserId: string, grant: boolean) => void;
}

const getInitials = (name?: string) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

export function ParticipantPanel({ participants, room, currentUserId, onToggleEditorRole }: ParticipantPanelProps) {
  const isOwner = currentUserId === room?.ownerId;

  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.uid === room?.ownerId) return -1;
    if (b.uid === room?.ownerId) return 1;
    if (a.handRaised && !b.handRaised) return -1;
    if (!a.handRaised && b.handRaised) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  return (
    <div className="flex flex-col h-full bg-background">
        <div className="p-4 border-b">
            <h3 className="font-semibold text-lg">Participants ({participants.length})</h3>
        </div>
        <ScrollArea className="flex-1">
            <div className="p-4 space-y-1">
                {sortedParticipants.map((participant) => {
                    const isParticipantOwner = participant.uid === room?.ownerId;
                    const isEditor = room?.editorIds.includes(participant.uid) || false;

                    return (
                    <div key={participant.uid} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                        <div className="flex items-center gap-3">
                        <div className="relative">
                            <Avatar className="h-9 w-9">
                            <AvatarImage src={participant.photoURL || undefined} />
                            <AvatarFallback>{getInitials(participant.name)}</AvatarFallback>
                            </Avatar>
                            {participant.handRaised && (
                            <div className="absolute -bottom-1 -right-1 rounded-full bg-yellow-400 p-0.5 border-2 border-background">
                                <Hand className="h-3 w-3 text-black" />
                            </div>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium flex items-center gap-1.5">
                            {participant.name}
                            {isParticipantOwner && <Crown className="h-4 w-4 text-yellow-500" title="Owner" />}
                            </span>
                            <span className="text-xs text-muted-foreground">
                            {isEditor ? 'Editor' : 'Viewer'}
                            </span>
                        </div>
                        </div>
                        
                        {isOwner && !isParticipantOwner && (
                        <div className="flex items-center space-x-2">
                            <Label htmlFor={`editor-switch-${participant.uid}`} className="text-xs text-muted-foreground">
                            Can Draw
                            </Label>
                            <Switch
                            id={`editor-switch-${participant.uid}`}
                            checked={isEditor}
                            onCheckedChange={(checked) => onToggleEditorRole(participant.uid, checked)}
                            />
                        </div>
                        )}
                    </div>
                    );
                })}
            </div>
        </ScrollArea>
    </div>
  );
}
