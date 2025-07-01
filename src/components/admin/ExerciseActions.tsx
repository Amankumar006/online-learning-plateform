
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { deleteExercise } from "@/lib/data";
import { Trash2, Edit } from "lucide-react";
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
import Link from "next/link";

export default function ExerciseActions({ exerciseId }: { exerciseId: string }) {
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteExercise(exerciseId);
      toast({
        title: "Exercise Deleted",
        description: "The exercise has been successfully deleted.",
      });
      router.refresh(); // This will re-fetch the exercises on the page
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete the exercise.",
      });
    }
  };

  return (
    <div className="flex gap-2 justify-end">
      <Button variant="ghost" size="icon" asChild>
        <Link href={`/admin/exercises/${exerciseId}/edit`}>
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
        </Link>
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Trash2 className="h-4 w-4 text-destructive" />
            <span className="sr-only">Delete</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the exercise from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
