
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getLesson, updateLesson, Lesson, Section, generateAndStoreLessonAudio } from "@/lib/data";
import { Loader2, Code, Video, FileText, Sparkles, Wand2, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { generateLessonImage } from "@/ai/flows/generate-lesson-image";
import { uploadImageFromDataUrl } from "@/lib/storage";
import { generateFollowUpSuggestions } from "@/ai/flows/generate-follow-up-suggestions";

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
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isRegeneratingAudio, setIsRegeneratingAudio] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced">("Beginner");
  const [tags, setTags] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  // New educational context state
  const [gradeLevel, setGradeLevel] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [curriculumBoard, setCurriculumBoard] = useState("");
  const [topicDepth, setTopicDepth] = useState("");
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  
  const fetchLessonData = async () => {
      if (!lessonId) return;
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
          // Set new fields
          setGradeLevel(lessonData.gradeLevel || "");
          setAgeGroup(lessonData.ageGroup || "");
          setCurriculumBoard(lessonData.curriculumBoard || "");
          setTopicDepth(lessonData.topicDepth || "");
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
  
  useEffect(() => {
    fetchLessonData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const handleGenerateImage = async () => {
    if (!title) {
        toast({ variant: "destructive", title: "Error", description: "Please enter a title first to generate a relevant image." });
        return;
    }
    setIsGeneratingImage(true);
    setIsUploadingImage(false);
    try {
        const imagePrompt = `A high-quality, educational illustration or photo for a lesson titled "${title}" on the subject of ${subject}. The style should be clean, modern, and engaging.`;
        const result = await generateLessonImage({ prompt: imagePrompt });
        
        toast({ title: "Uploading image...", description: "Please wait while the generated image is uploaded to storage." });
        setIsUploadingImage(true);
        const fileName = `lesson_${lessonId}_${Date.now()}`;
        const publicUrl = await uploadImageFromDataUrl(result.imageUrl, fileName);
        setImage(publicUrl);

        toast({ title: "Success!", description: "New lesson image generated and uploaded." });
    } catch (error: any) {
        console.error(error);
        toast({ variant: "destructive", title: "AI/Upload Error", description: error.message || "Failed to generate or upload the image." });
    } finally {
        setIsGeneratingImage(false);
        setIsUploadingImage(false);
    }
  };


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
        gradeLevel,
        ageGroup,
        curriculumBoard,
        topicDepth,
      };

      await updateLesson(lessonId, lessonData);
      toast({
        title: "Success!",
        description: "Lesson updated. Audio regeneration for new sections has started in the background.",
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

  const handleSuggestFollowUp = async () => {
      if (!lesson) return;
      setIsSuggesting(true);
      setSuggestedTopics([]);
      try {
        const lessonContent = lesson.sections?.map(s => s.blocks.filter(b => b.type === 'text').map(b => (b as any).content).join('\n\n')).join('\n\n') || lesson.description;
        const { suggestions } = await generateFollowUpSuggestions({ 
            lastUserMessage: `I just finished the lesson on "${lesson.title}". What's a good follow-up topic?`,
            aiResponse: lessonContent,
         });
        setSuggestedTopics(suggestions);
        if (suggestions.length === 0) {
            toast({ title: "No suggestions found.", description: "The AI could not determine a clear next step." });
        }
      } catch (error: any) {
          console.error(error);
          toast({ variant: "destructive", title: "AI Error", description: error.message || "Failed to suggest follow-up topics." });
      } finally {
          setIsSuggesting(false);
      }
  };

  const handleRegenerateAudio = async () => {
    if (!lessonId) return;
    setIsRegeneratingAudio(true);
    toast({ title: "Starting Audio Regeneration", description: "The system will now attempt to generate audio for any missing sections. This may take a few moments." });
    try {
        await generateAndStoreLessonAudio(lessonId);
        toast({ title: "Success!", description: "Audio regeneration process completed." });
        // Re-fetch lesson data to get the new audio URLs
        await fetchLessonData();
    } catch (error: any) {
        console.error(error);
        toast({ variant: "destructive", title: "Audio Error", description: "An error occurred during audio regeneration." });
    } finally {
        setIsRegeneratingAudio(false);
    }
  }
  
  const handleCreateFollowUp = (topic: string) => {
      const queryParams: Record<string, string> = { topic };
      
      // Only add non-empty values to avoid undefined/empty string issues
      if (subject) queryParams.subject = subject;
      if (gradeLevel) queryParams.gradeLevel = gradeLevel;
      if (ageGroup) queryParams.ageGroup = ageGroup;
      if (curriculumBoard) queryParams.curriculumBoard = curriculumBoard;
      if (topicDepth) queryParams.topicDepth = topicDepth;
      
      const query = new URLSearchParams(queryParams);
      router.push(`/admin/lessons/new?${query.toString()}`);
  }

  const breadcrumbItems = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/lessons", label: "Lessons" },
    { href: `/admin/lessons/${lessonId}/edit`, label: lesson?.title || "Edit Lesson" },
  ];
  
  const canGenerate = isGeneratingImage || isUploadingImage || isSuggesting || isRegeneratingAudio;

  if (isLoading) {
      return (
          <div>
              <Breadcrumb items={breadcrumbItems} />
              <EditLessonSkeleton />
          </div>
      )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
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

               <div className="pt-6 border-t space-y-4">
                  <h3 className="text-lg font-medium">Educational Context</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="gradeLevel">Grade Level</Label>
                          <Input id="gradeLevel" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="e.g., 10th" />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="ageGroup">Age Group</Label>
                          <Input id="ageGroup" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} placeholder="e.g., 14-16" />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="curriculumBoard">Curriculum Board</Label>
                          <Select onValueChange={setCurriculumBoard} value={curriculumBoard}>
                              <SelectTrigger><SelectValue placeholder="Select Board" /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="CBSE">CBSE</SelectItem>
                                  <SelectItem value="ICSE">ICSE</SelectItem>
                                  <SelectItem value="NCERT">NCERT</SelectItem>
                                  <SelectItem value="State Board">State Board</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="topicDepth">Topic Depth</Label>
                          <Select onValueChange={setTopicDepth} value={topicDepth}>
                              <SelectTrigger><SelectValue placeholder="Select Depth" /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="Introductory">Introductory</SelectItem>
                                  <SelectItem value="Detailed">Detailed</SelectItem>
                                  <SelectItem value="Comprehensive">Comprehensive</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
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
                   <div className="flex items-center gap-2">
                      <Input id="image" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://... or generate one" required />
                      <Button type="button" variant="outline" size="icon" onClick={handleGenerateImage} disabled={canGenerate || !title}>
                           {isGeneratingImage || isUploadingImage ? <Loader2 className="animate-spin" /> : <Sparkles />}
                           <span className="sr-only">Generate Image</span>
                      </Button>
                  </div>
                   {image && (
                      <div className="mt-2 rounded-md border p-2">
                          <Image src={image} width={200} height={100} alt="Lesson image preview" className="rounded-md aspect-video object-cover" data-ai-hint="lesson image" />
                      </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., algebra, basics, calculus" />
              </div>

              <div className="flex justify-end gap-2 pt-6 border-t">
                <Button variant="outline" asChild>
                  <Link href="/admin/lessons">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSaving || canGenerate}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>

      <div className="lg:col-span-1 space-y-6">
        <div className="sticky top-24">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary"/> AI Actions</CardTitle>
                    <CardDescription>Use AI to enhance this lesson after saving any initial changes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Button onClick={handleRegenerateAudio} disabled={isRegeneratingAudio || isSaving} className="w-full">
                        {isRegeneratingAudio ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2" />}
                        Regenerate Audio
                    </Button>
                    <hr/>
                    <Button onClick={handleSuggestFollowUp} disabled={isSuggesting} className="w-full">
                        {isSuggesting ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                        Suggest Follow-up Topics
                    </Button>
                    {suggestedTopics.length > 0 && (
                        <div className="mt-4 space-y-2 pt-4 border-t">
                            <h4 className="font-semibold">Suggested Topics:</h4>
                            {suggestedTopics.map((topic, index) => (
                                <Button
                                    key={index}
                                    variant="secondary"
                                    className="w-full justify-between"
                                    onClick={() => handleCreateFollowUp(topic)}
                                >
                                    {topic}
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
