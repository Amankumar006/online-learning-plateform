
"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { createLessonRequest } from "@/lib/data";
import { PlusCircle, Loader2 } from "lucide-react";
import { differenceInDays } from "date-fns";

const requestSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  subject: z.string().min(3, "Subject must be at least 3 characters long."),
  description: z.string().min(20, "Description must be at least 20 characters long."),
  learningFormat: z.string({ required_error: "Please select a format." }),
  notes: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestSchema>;

interface LessonRequestFormProps {
  userId: string;
  userName: string;
  lastRequestAt: number | undefined | null;
  onSuccess: () => void;
}

export default function LessonRequestForm({ userId, userName, lastRequestAt, onSuccess }: LessonRequestFormProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, control } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
  });

  const daysSinceLastRequest = lastRequestAt ? differenceInDays(new Date(), new Date(lastRequestAt)) : Infinity;
  const canRequest = daysSinceLastRequest >= 7;

  const onSubmit: SubmitHandler<RequestFormValues> = async (data) => {
    try {
      await createLessonRequest(userId, userName, data);
      toast({
        title: "Request Submitted!",
        description: "Your lesson idea has been sent to the admins for review.",
      });
      reset();
      onSuccess();
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "An unexpected error occurred.",
      });
    }
  };

  const triggerButton = (
    <Button disabled={!canRequest}>
      <PlusCircle className="mr-2 h-4 w-4" /> Request a Lesson
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>{triggerButton}</DialogTrigger>
                </TooltipTrigger>
                {!canRequest && (
                    <TooltipContent>
                        <p>You can make a new request in {7 - daysSinceLastRequest} day(s).</p>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request a New Lesson</DialogTitle>
          <DialogDescription>
            Have an idea for a lesson? Fill out the form below and our team will review it. You can submit one request per week.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right">Title</Label>
                    <Input id="title" {...register("title")} className="col-span-3" />
                    {errors.title && <p className="col-span-4 text-right text-sm text-destructive">{errors.title.message}</p>}
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="subject" className="text-right">Subject</Label>
                    <Input id="subject" {...register("subject")} className="col-span-3" />
                    {errors.subject && <p className="col-span-4 text-right text-sm text-destructive">{errors.subject.message}</p>}
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="description" className="text-right pt-2">Description</Label>
                    <Textarea id="description" {...register("description")} className="col-span-3" />
                    {errors.description && <p className="col-span-4 text-right text-sm text-destructive">{errors.description.message}</p>}
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="learningFormat" className="text-right">Format</Label>
                    <Controller
                        control={control}
                        name="learningFormat"
                        render={({ field }) => (
                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select a preferred format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="text">Text-based</SelectItem>
                                    <SelectItem value="interactive">Interactive Exercises</SelectItem>
                                    <SelectItem value="mixed">Mixed (Text & Interactive)</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                     {errors.learningFormat && <p className="col-span-4 text-right text-sm text-destructive">{errors.learningFormat.message}</p>}
                </div>
                 <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="notes" className="text-right pt-2">Notes</Label>
                    <Textarea id="notes" {...register("notes")} placeholder="(Optional) Any specific requirements or links." className="col-span-3" />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Request
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
