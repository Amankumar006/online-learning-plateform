
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { createStudyRoomSession } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Loader2, Pen } from "lucide-react";

export default function StartStudyRoom({ userId }: { userId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const handleCreateStudyRoom = async () => {
    if (!userId) return;
    setIsCreatingRoom(true);
    try {
        const roomId = await createStudyRoomSession(userId);
        toast({
            title: "Study Room Created!",
            description: "Redirecting you to your new collaborative space."
        });
        router.push(`/dashboard/study-room/${roomId}`);
    } catch (error) {
        console.error("Failed to create study room:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not create a new study room. Please try again."
        });
        setIsCreatingRoom(false);
    }
  };

  return (
    <Button onClick={handleCreateStudyRoom} disabled={isCreatingRoom}>
        {isCreatingRoom ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pen className="mr-2 h-4 w-4" />}
        Start a Study Session
    </Button>
  );
}
