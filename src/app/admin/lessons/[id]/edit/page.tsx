
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getLesson, updateLesson, Lesson, Section } from "@/lib/data";
import { Loader2, Code, Video, FileText } from "lucide-react";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

function EditLessonSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
                </div>
                <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-20 w-full" /></div>
                <div className="space-y-4 rounded-lg border p-4">
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-24 w-full" />
                </div>
                <div className="flex justify-end gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </CardContent>
        </Card>
    )
}

export default function EditLessonPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params.id as string;
  const { toast } = useToast();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("https://placehold.co/600x400.png");
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced">("Beginner");
  const [tags, setTags] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  
  useEffect(() => {
    if (!lessonId) return;

    const fetchLessonData = async () => {
      setIsLoading(true);
      try {
        const lessonData = await getLesson(lessonId);
        if (lessonData) {
          setLesson(lessonData);
          setTitle(lessonData.title);
          setSubject(lessonData.subject);
          setDescription(lessonData.description);
          setImage(lessonData.image || "https://placehold.co/600x400.png");
          setDifficulty(lessonData.difficulty);
          setTags(lessonData.tags?.join(', ') || "");
          setSections(lessonData.sections || []);
        } else {
            toast({ variant: "destructive", title: "Error", description: "Lesson not found." });
            router.push('/admin/lessons');
        }
      } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: "Failed to fetch lesson data." });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLessonData();
  }, [lessonId, router, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if (!title || !subject || !description) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill out all required fields.",
      });
      setIsSaving(false);
      return;
    }

    try {
      const lessonData = {
        title,
        subject,
        description,
        image,
        difficulty,
        sections,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };
      await updateLesson(lessonId, lessonData);
      toast({
        title: "Success!",
        description: "Lesson has been updated.",
      });
      router.push("/admin/lessons");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update the lesson.",
      });
      setIsSaving(false);
    }
  };

  const breadcrumbItems = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/lessons", label: "Lessons" },
    { href: `/admin/lessons/${lessonId}/edit`, label: lesson?.title || "Edit Lesson" },
  ];

  if (isLoading) {
      return (
          <div>
              <Breadcrumb items={breadcrumbItems} />
              <EditLessonSkeleton />
          </div>
      )
  }

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Edit Lesson</CardTitle>
            <CardDescription>Make changes to an existing lesson. Manual editing of section content will be available soon.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
              <div className="space-y-2">
                <Label htmlFor="title">Lesson Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title" required />
              </div>
               <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Biology" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Short Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief summary of the lesson." required />
            </div>
            
            <div className="space-y-4 rounded-lg border p-4">
                <Label className="text-base font-medium">Lesson Content</Label>
                <CardDescription>Review the generated sections and blocks. Manual editing will be available in a future update.</CardDescription>
                
                {sections.length > 0 ? (
                    <div className="space-y-6">
                        {sections.map((section, sIndex) => (
                            <div key={sIndex} className="p-4 rounded-md border bg-secondary/30">
                                <h3 className="font-semibold text-lg mb-2">{section.title}</h3>
                                <div className="space-y-4">
                                    {section.blocks.map((block, bIndex) => (
                                        <div key={bIndex} className="p-3 bg-background rounded-md shadow-sm">
                                            {block.type === 'text' && <div className="flex items-start gap-3"><FileText className="h-5 w-5 text-muted-foreground mt-1 shrink-0" /><p className="flex-1 text-sm">{block.content}</p></div>}
                                            {block.type === 'code' && <div className="flex items-start gap-3"><Code className="h-5 w-5 text-muted-foreground mt-1 shrink-0" /><div className="flex-1"><span className="text-xs font-mono bg-muted px-2 py-1 rounded">{block.language}</span><pre className="text-sm bg-muted p-2 rounded-md overflow-x-auto mt-2"><code>{block.code}</code></pre></div></div>}
                                            {block.type === 'video' && <div className="flex items-start gap-3"><Video className="h-5 w-5 text-muted-foreground mt-1 shrink-0" /><a href={block.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-blue-600 truncate hover:underline">{block.url}</a></div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-8">
                        This lesson has no section-based content.
                    </div>
                )}
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
                <Label htmlFor="image">Main Image URL</Label>
                <Input id="image" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://placehold.co/600x400.png" required />
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
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
