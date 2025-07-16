
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Lesson } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Loader2, Pen, PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createStudyRoomSession } from "@/hooks/use-study-room";

const roomSchema = z.object({
  name: z.string().min(3, "Room name must be at least 3 characters."),
  visibility: z.enum(["public", "private"]),
  lessonId: z.string().optional(),
});

type RoomFormValues = z.infer<typeof roomSchema>;

export default function StartStudyRoom({ userId, lessons }: { userId: string; lessons: Lesson[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      visibility: "private",
    },
  });

  const handleCreateStudyRoom = async (data: RoomFormValues) => {
    if (!userId) return;
    try {
        const selectedLesson = lessons.find(l => l.id === data.lessonId);
        const roomId = await createStudyRoomSession({
            ownerId: userId,
            name: data.name,
            visibility: data.visibility,
            lessonId: data.lessonId || null,
            lessonTitle: selectedLesson?.title || null,
        });
        
        toast({
            title: "Study Room Created!",
            description: "Redirecting you to your new collaborative space."
        });
        setOpen(false);
        router.push(`/dashboard/study-room/${roomId}`);

    } catch (error) {
        console.error("Failed to create study room:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not create a new study room. Please try again."
        });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button>
                <Pen className="mr-2 h-4 w-4" />
                Start a Study Session
            </Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Create a New Study Room</DialogTitle>
                <DialogDescription>
                    Configure your collaborative session. Public rooms are visible to everyone on the dashboard.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleCreateStudyRoom)} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Room Name</Label>
                    <Input id="name" {...register("name")} placeholder="e.g., Mid-term Prep, Project Brainstorm"/>
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label>Visibility</Label>
                     <Controller
                        name="visibility"
                        control={control}
                        render={({ field }) => (
                            <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-2 gap-4">
                                <div>
                                    <RadioGroupItem value="private" id="private" className="peer sr-only" />
                                    <Label htmlFor="private" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                        Private
                                        <span className="text-xs font-normal text-muted-foreground mt-1">Only people with the link can join.</span>
                                    </Label>
                                </div>
                                <div>
                                     <RadioGroupItem value="public" id="public" className="peer sr-only" />
                                    <Label htmlFor="public" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                        Public
                                         <span className="text-xs font-normal text-muted-foreground mt-1">Visible to everyone on the dashboard.</span>
                                    </Label>
                                </div>
                            </RadioGroup>
                        )}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="lessonId">Link to a Lesson (Optional)</Label>
                    <Controller
                        name="lessonId"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a lesson..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {lessons.map(lesson => (
                                        <SelectItem key={lesson.id} value={lesson.id}>{lesson.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>

                 <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Create Room
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
}
