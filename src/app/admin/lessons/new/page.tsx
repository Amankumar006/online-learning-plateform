
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
import { createLesson, ContentBlock } from "@/lib/data";
import { Loader2, Plus, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default function NewLessonPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("https://placehold.co/600x400.png");
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced">("Beginner");
  const [tags, setTags] = useState("");
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);

  const addContentBlock = (type: 'paragraph' | 'video') => {
    setContentBlocks([...contentBlocks, { type, value: "" }]);
  };

  const handleContentBlockChange = (index: number, value: string) => {
    const newBlocks = [...contentBlocks];
    newBlocks[index].value = value;
    setContentBlocks(newBlocks);
  };

  const removeContentBlock = (index: number) => {
    const newBlocks = [...contentBlocks];
    newBlocks.splice(index, 1);
    setContentBlocks(newBlocks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!title || !subject || !description || contentBlocks.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill out all required fields and add at least one content block.",
      });
      setIsLoading(false);
      return;
    }

    try {
      const lessonData = {
        title,
        subject,
        description,
        image,
        difficulty,
        content: contentBlocks,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };
      await createLesson(lessonData);
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
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Introduction to Algebra" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Mathematics" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Short Description</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief summary of the lesson." required />
            </div>
            
            {/* Modular Content Editor */}
            <div className="space-y-4 rounded-lg border p-4">
              <Label className="text-base font-medium">Lesson Content</Label>
              <CardDescription>Add paragraphs and video URLs to build your lesson.</CardDescription>
              
              <div className="space-y-4">
                {contentBlocks.map((block, index) => (
                  <div key={index} className="flex items-start gap-4 p-3 rounded-md bg-secondary/50">
                    <div className="flex-grow space-y-2">
                      <Label htmlFor={`block-${index}`}>
                        {block.type === 'paragraph' ? `Paragraph ${index + 1}` : `Video URL ${index + 1}`}
                      </Label>
                      {block.type === 'paragraph' ? (
                        <Textarea
                          id={`block-${index}`}
                          value={block.value}
                          onChange={(e) => handleContentBlockChange(index, e.target.value)}
                          placeholder="Write your paragraph here..."
                          rows={5}
                        />
                      ) : (
                        <Input
                          id={`block-${index}`}
                          value={block.value}
                          onChange={(e) => handleContentBlockChange(index, e.target.value)}
                          placeholder="e.g., https://www.youtube.com/embed/your_video_id"
                        />
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeContentBlock(index)} className="mt-6">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => addContentBlock('paragraph')}>
                  <Plus className="mr-2 h-4 w-4" /> Add Paragraph
                </Button>
                <Button type="button" variant="outline" onClick={() => addContentBlock('video')}>
                  <Video className="mr-2 h-4 w-4" /> Add Video
                </Button>
              </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select onValueChange={(v: "Beginner" | "Intermediate" | "Advanced") => setDifficulty(v)} value={difficulty}>
                  <SelectTrigger id="difficulty">
                    <SelectValue placeholder="Select difficulty" />
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
                <Input id="image" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://example.com/image.png" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., algebra, basics, calculus" />
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
