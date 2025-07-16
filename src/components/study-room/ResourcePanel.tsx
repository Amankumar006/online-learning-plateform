
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudyRoomResource, User as AppUser } from "@/lib/data";
import { Link2, Plus, Trash2, Globe } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ResourcePanelProps {
  resources: StudyRoomResource[];
  onAddResource: (url: string) => void;
  onDeleteResource: (resourceId: string) => void;
  currentUser: AppUser | null;
  roomOwnerId: string | undefined;
}

const resourceSchema = z.object({
  url: z.string().url("Please enter a valid URL."),
});

type ResourceFormValues = z.infer<typeof resourceSchema>;

const getFaviconUrl = (url: string) => {
    try {
        const hostname = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    } catch {
        return null;
    }
};

export function ResourcePanel({ resources, onAddResource, onDeleteResource, currentUser, roomOwnerId }: ResourcePanelProps) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
  });

  const onSubmit = (data: ResourceFormValues) => {
    onAddResource(data.url);
    reset();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Shared Resources
        </h3>
      </div>
      <ScrollArea className="flex-1 p-4">
        {resources.length > 0 ? (
            <div className="space-y-3">
            {resources.map((resource) => {
                const canDelete = currentUser?.uid === resource.addedByUserId || currentUser?.uid === roomOwnerId;
                const favicon = getFaviconUrl(resource.url);

                return (
                    <div key={resource.id} className="group flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted">
                        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 truncate flex-1">
                            {favicon ? (
                                <img src={favicon} alt="favicon" className="h-5 w-5 shrink-0" />
                            ) : (
                                <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
                            )}
                            <div className="truncate">
                                <p className="text-sm font-medium truncate">{resource.url}</p>
                                <p className="text-xs text-muted-foreground">Added by {resource.addedByUserName}</p>
                            </div>
                        </a>
                        {canDelete && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Delete Resource?</AlertDialogTitle><AlertDialogDescription>This will permanently remove the link for everyone. Are you sure?</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => onDeleteResource(resource.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                );
            })}
            </div>
        ) : (
            <div className="text-center text-muted-foreground pt-16">
                <p>No resources shared yet.</p>
                <p className="text-sm">Add a link below to get started.</p>
            </div>
        )}
      </ScrollArea>
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit(onSubmit)} className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              {...register("url")}
              placeholder="https://..."
              className={errors.url ? "border-destructive" : ""}
            />
            {errors.url && <p className="text-xs text-destructive mt-1">{errors.url.message}</p>}
          </div>
          <Button type="submit" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
