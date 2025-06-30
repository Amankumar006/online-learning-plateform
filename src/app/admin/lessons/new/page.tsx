
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createLesson } from "@/lib/data";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default function NewLessonPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    description: "",
    content: "",
    image: "https://placehold.co/600x400.png",
    difficulty: "Beginner" as "Beginner" | "Intermediate" | "Advanced",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };
  
  const handleSelectChange = (value: "Beginner" | "Intermediate" | "Advanced") => {
    setFormData((prev) => ({...prev, difficulty: value}));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await createLesson(formData);
      toast({
        title: "Success!",
        description: "New lesson has been created.",
      });
      router.push("/admin/lessons");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create the lesson.",
      });
      setIsLoading(false);
    }
  };

  const breadcrumbItems = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/lessons", label: "Lessons" },
    { href: "/admin/lessons/new", label: "New" },
  ];

  return (
    <div>
        <Breadcrumb items={breadcrumbItems} />
        <form onSubmit={handleSubmit}>
        <Card>
            <CardHeader>
            <CardTitle>Create New Lesson</CardTitle>
            <CardDescription>Fill out the form below to add a new lesson to the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                <Label htmlFor="title">Lesson Title</Label>
                <Input id="title" value={formData.title} onChange={handleChange} placeholder="e.g., Introduction to Algebra" required />
                </div>
                <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={formData.subject} onChange={handleChange} placeholder="e.g., Mathematics" required />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Short Description</Label>
                <Input id="description" value={formData.description} onChange={handleChange} placeholder="A brief summary of the lesson." required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="content">Lesson Content</Label>
                <Textarea id="content" value={formData.content} onChange={handleChange} placeholder="The main content of the lesson. You can use Markdown." rows={10} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select onValueChange={handleSelectChange} defaultValue={formData.difficulty}>
                        <SelectTrigger id="difficulty">
                            <SelectValue placeholder="Select difficulty"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Beginner">Beginner</SelectItem>
                            <SelectItem value="Intermediate">Intermediate</SelectItem>
                            <SelectItem value="Advanced">Advanced</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="image">Image URL</Label>
                    <Input id="image" value={formData.image} onChange={handleChange} placeholder="https://example.com/image.png" required/>
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="outline" asChild>
                    <Link href="/admin/lessons">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Lesson
                </Button>
            </div>
            </CardContent>
        </Card>
        </form>
    </div>
  );
}
