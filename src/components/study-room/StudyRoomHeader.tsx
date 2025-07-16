
"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MessageSquare, Share2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface StudyRoomHeaderProps {
  roomId: string;
  onToggleChat: () => void;
}

export default function StudyRoomHeader({ roomId, onToggleChat }: StudyRoomHeaderProps) {
  const pathname = usePathname();
  const { toast } = useToast();

  const handleShare = () => {
    const url = `${window.location.origin}${pathname}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied!",
      description: "You can now share the link with participants.",
    });
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" /> Share
        </Button>
         <Button variant="secondary" onClick={onToggleChat}>
          <MessageSquare className="mr-2 h-4 w-4" /> Chat
        </Button>
      </div>
    </header>
  );
}
