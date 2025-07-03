
"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { createCustomAnnouncement, AnnouncementType } from "@/lib/data";
import { Loader2, Send } from "lucide-react";

const announcementSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  message: z.string().min(10, "Message must be at least 10 characters long."),
  type: z.enum(['general_update', 'new_feature']),
  link: z.string().url().optional().or(z.literal('')),
  sendToGmail: z.boolean().default(false).optional(),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

export default function AnnouncementForm() {
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, control } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      type: 'general_update',
      sendToGmail: false,
    },
  });

  const onSubmit = async (data: AnnouncementFormValues) => {
    try {
      await createCustomAnnouncement({
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || undefined,
      }, data.sendToGmail);
      
      let toastDescription = "Your message has been broadcast to all users.";
      if (data.sendToGmail) {
        toastDescription += " Emails have been queued for delivery."
      }

      toast({
        title: "Announcement Sent!",
        description: toastDescription,
      });
      reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Send",
        description: error.message || "An unexpected error occurred.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register("title")} disabled={isSubmitting} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" {...register("message")} disabled={isSubmitting} />
        {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
             <Controller
                control={control}
                name="type"
                render={({ field }) => (
                   <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="general_update">General Update</SelectItem>
                            <SelectItem value="new_feature">New Feature</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="link">Link (Optional)</Label>
            <Input id="link" {...register("link")} placeholder="https://example.com/..." disabled={isSubmitting}/>
             {errors.link && <p className="text-sm text-destructive">{errors.link.message}</p>}
        </div>
      </div>

      <div className="flex items-center space-x-2">
         <Controller
            control={control}
            name="sendToGmail"
            render={({ field }) => (
                <Checkbox
                    id="sendToGmail"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                />
            )}
        />
        <Label htmlFor="sendToGmail" className="font-normal">
          Send this announcement as an email to all users
        </Label>
      </div>
      
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Send Announcement
        </Button>
      </div>
    </form>
  );
}
