
"use client";

import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { ChatMessage, User as AppUser } from "@/lib/data";
import { cn } from "@/lib/utils";
import { formatRelative } from "date-fns";

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUser: AppUser;
  onSendMessage: (content: string) => void;
}

const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
};

export function ChatPanel({ messages, currentUser, onSendMessage }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">Session Chat</h3>
      </div>
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg) => {
            const isCurrentUser = msg.userId === currentUser.uid;
            return (
              <div
                key={msg.id}
                className={cn("flex items-start gap-3", isCurrentUser && "justify-end")}
              >
                 {!isCurrentUser && (
                    <Avatar className="h-8 w-8">
                        <AvatarFallback>{getInitials(msg.userName)}</AvatarFallback>
                    </Avatar>
                 )}
                <div className={cn("max-w-xs md:max-w-md rounded-lg p-3 text-sm", isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                    {!isCurrentUser && (
                        <p className="font-semibold text-xs mb-1">{msg.userName}</p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1 text-right">
                        {formatRelative(msg.createdAt.toDate(), new Date())}
                    </p>
                </div>
                {isCurrentUser && (
                     <Avatar className="h-8 w-8">
                         <AvatarImage src={currentUser.photoURL || undefined} />
                        <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                    </Avatar>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
          />
          <Button onClick={handleSend} size="icon" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
