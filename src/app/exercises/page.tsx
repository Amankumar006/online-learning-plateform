import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrainCircuit } from "lucide-react";
import Link from "next/link";

export default function ExercisesPage() {
  return (
    <div className="flex justify-center items-start pt-10">
        <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
                <div className="mx-auto bg-primary/20 text-primary rounded-full h-16 w-16 flex items-center justify-center mb-4">
                    <BrainCircuit className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl font-headline">Practice Exercises</CardTitle>
                <CardDescription>
                    Test your knowledge and sharpen your skills.
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <p className="text-muted-foreground mb-6">
                    Our adaptive exercises are integrated directly into each lesson. To start practicing, please select a lesson first.
                </p>
                <Button asChild>
                    <Link href="/lessons">Browse Lessons</Link>
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
