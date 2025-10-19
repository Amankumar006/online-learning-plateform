
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createLesson, Section } from "@/lib/data";
import { Loader2, Sparkles, Code, Video, FileText } from "lucide-react";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { generateLessonContent } from "@/ai/flows/generate-lesson-content";
import { generateLessonImage } from "@/ai/flows/generate-lesson-image";
import { uploadImageFromDataUrl } from "@/lib/storage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { LessonContentEditor } from "@/components/admin/lesson-editor";

export default function NewLessonPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // AI prompt state
  const [aiTopic, setAiTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [curriculumBoard, setCurriculumBoard] = useState("");
  const [topicDepth, setTopicDepth] = useState("");
  
  // Form state
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced">("Beginner");
  const [tags, setTags] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  
  useEffect(() => {
    // Pre-fill form from URL parameters if they exist
    setAiTopic(searchParams.get('topic') || '');
    setSubject(searchParams.get('subject') || '');
    setGradeLevel(searchParams.get('gradeLevel') || '');
    setAgeGroup(searchParams.get('ageGroup') || '');
    setCurriculumBoard(searchParams.get('curriculumBoard') || '');
    setTopicDepth(searchParams.get('topicDepth') || '');
  }, [searchParams]);

  const handleGenerateLesson = async () => {
    console.log('🚀 handleGenerateLesson called with topic:', aiTopic);
    
    if (!aiTopic.trim()) {
        toast({ variant: "destructive", title: "Error", description: "Please enter a topic to generate a lesson." });
        return;
    }
    setIsGenerating(true);
    
    console.log('🚀 Starting lesson generation...');
    try {
        // Step 1: Generate lesson content
        const result = await generateLessonContent({
             topic: aiTopic,
             gradeLevel,
             ageGroup,
             curriculumBoard,
             topicDepth
        });
        setTitle(result.title);
        setSubject(result.subject);
        setDescription(result.description);
        setDifficulty(result.difficulty);
        setSections(result.sections);
        setTags(result.tags.join(', '));

        // Step 2: Automatically generate image with nano-banana
        console.log('🍌 Auto-generating image for lesson...', {
          title: result.title,
          subject: result.subject
        });
        
        try {
          const imagePrompt = `A high-quality, educational illustration for "${result.title}" in ${result.subject}. Clean, modern, engaging style.`;
          console.log('🍌 Image prompt:', imagePrompt);
          
          const imageResult = await generateLessonImage({
            prompt: imagePrompt,
            style: 'educational',
            speed: 'nano-banana',
            context: `Lesson: ${result.title}, Subject: ${result.subject}`
          });

          console.log('🍌 Auto-image generation successful:', {
            model: imageResult.model,
            generationTime: imageResult.generationTime,
            imageUrlLength: imageResult.imageUrl.length
          });
          
          console.log('🍌 Uploading to Firebase...');
          const fileName = `lesson_auto_${Date.now()}`;
          const publicUrl = await uploadImageFromDataUrl(imageResult.imageUrl, fileName);
          
          console.log('🍌 Upload successful:', publicUrl);
          setImage(publicUrl);
          
          toast({ 
            title: "🍌 Lesson + Image Generated!", 
            description: `Lesson created with nano-banana image in ${imageResult.generationTime}ms. Ready to save!` 
          });
        } catch (imageError) {
          console.error('🍌 Auto-image generation failed:', imageError);
          setImage("https://placehold.co/600x400.png");
          toast({ 
            variant: "destructive",
            title: "Image Generation Failed", 
            description: `Lesson created but image failed: ${imageError instanceof Error ? imageError.message : 'Unknown error'}. You can generate one manually.` 
          });
        }

    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "AI Error", description: "Failed to generate the lesson. The topic might be too broad or complex." });
    } finally {
        setIsGenerating(false);
    }
  };

  const testImageGeneration = async () => {
    console.log('🧪 Testing image generation directly...');
    try {
      const testResult = await generateLessonImage({
        prompt: 'A simple educational diagram of a tree. Clean, modern style.',
        style: 'educational',
        speed: 'nano-banana',
        context: 'Test lesson'
      });
      
      console.log('🧪 Test successful:', {
        model: testResult.model,
        generationTime: testResult.generationTime,
        imageUrlLength: testResult.imageUrl.length
      });
      
      toast({
        title: "🧪 Test Successful!",
        description: `Image generated in ${testResult.generationTime}ms`
      });
    } catch (error) {
      console.error('🧪 Test failed:', error);
      toast({
        variant: "destructive",
        title: "🧪 Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleGenerateImage = async () => {
    if (!title) {
        toast({ variant: "destructive", title: "Error", description: "Please generate or enter a title first to create a relevant image." });
        return;
    }
    setIsGeneratingImage(true);
    setIsUploadingImage(false);
    try {
        const imagePrompt = `A high-quality, educational illustration or photo for a lesson titled "${title}" on the subject of ${subject}. The style should be clean, modern, and engaging.`;
        const result = await generateLessonImage({ 
          prompt: imagePrompt,
          style: 'educational',
          speed: 'nano-banana',
          context: `Lesson: ${title}, Subject: ${subject}`
        });

        toast({ title: "Uploading image...", description: "Please wait while the generated image is uploaded to storage." });
        setIsUploadingImage(true);
        const fileName = `lesson_${Date.now()}`;
        const publicUrl = await uploadImageFromDataUrl(result.imageUrl, fileName);
        setImage(publicUrl);
        
        toast({ 
          title: "🍌 Nano-Banana Success!", 
          description: `Image generated in ${result.generationTime}ms and uploaded successfully!` 
        });
    } catch (error: any) {
        console.error(error);
        toast({ variant: "destructive", title: "AI/Upload Error", description: error.message || "Failed to generate or upload image." });
    } finally {
        setIsGeneratingImage(false);
        setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if (!title || !subject || !description || sections.length === 0 || !image) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill out all fields and ensure lesson content and an image are present.",
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

      await createLesson(lessonData);
      toast({
        title: "Success!",
        description: "New lesson created. Audio generation has started in the background.",
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
      setIsSaving(false);
    }
  };

  const breadcrumbItems = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/lessons", label: "Lessons" },
    { href: "/admin/lessons/new", label: "New" },
  ];

  const canGenerate = isGenerating || isGeneratingImage || isUploadingImage;

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Create New Lesson</CardTitle>
            <CardDescription>Use AI to generate a complete, structured lesson from a single topic, then review and save.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>AI Lesson Generator</AlertTitle>
              <AlertDescription className="mb-4">
                  Enter a topic and provide educational context, and let AI generate the entire lesson structure for you.
              </AlertDescription>
              <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="ai-topic">Lesson Topic</Label>
                    <Input 
                        id="ai-topic" 
                        value={aiTopic} 
                        onChange={(e) => setAiTopic(e.target.value)} 
                        placeholder="e.g., Introduction to Photosynthesis"
                        className="flex-grow"
                        disabled={canGenerate}
                    />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="gradeLevel">Grade Level</Label>
                        <Input id="gradeLevel" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="e.g., 10th" disabled={canGenerate}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ageGroup">Age Group</Label>
                        <Input id="ageGroup" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} placeholder="e.g., 14-16" disabled={canGenerate}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="curriculumBoard">Curriculum Board</Label>
                        <Select onValueChange={setCurriculumBoard} value={curriculumBoard} disabled={canGenerate}>
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
                        <Select onValueChange={setTopicDepth} value={topicDepth} disabled={canGenerate}>
                            <SelectTrigger><SelectValue placeholder="Select Depth" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Introductory">Introductory</SelectItem>
                                <SelectItem value="Detailed">Detailed</SelectItem>
                                <SelectItem value="Comprehensive">Comprehensive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={testImageGeneration} disabled={canGenerate} size="sm">
                        🧪 Test Image
                    </Button>
                    <Button type="button" variant="outline" onClick={handleGenerateLesson} disabled={canGenerate || !aiTopic.trim()} className="shrink-0">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Generate with AI
                    </Button>
                </div>
              </div>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
              <div className="space-y-2">
                <Label htmlFor="title">Lesson Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Generated or manually enter title" required disabled={canGenerate}/>
              </div>
               <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Biology" required disabled={canGenerate}/>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Short Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief summary of the lesson." required disabled={canGenerate}/>
            </div>
            
            <div className="space-y-4 rounded-lg border p-4">
                <Label className="text-base font-medium">Lesson Content Editor</Label>
                <CardDescription>
                  {sections.length > 0 
                    ? "Edit the AI-generated content with our Medium-style editor. Drag to reorder, click to edit inline."
                    : "Lesson content will appear here after generation, or you can create content manually."
                  }
                </CardDescription>
                
                <LessonContentEditor
                  sections={sections}
                  onChange={setSections}
                  disabled={canGenerate}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select onValueChange={(v: "Beginner" | "Intermediate" | "Advanced") => setDifficulty(v)} value={difficulty} disabled={canGenerate}>
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
                    <Input id="image" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://... or generate one" required disabled={canGenerate}/>
                    <Button type="button" variant="outline" size="icon" onClick={handleGenerateImage} disabled={isGeneratingImage || isUploadingImage || !title}>
                         {(isGeneratingImage || isUploadingImage) ? <Loader2 className="animate-spin" /> : <Sparkles />}
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
              <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., algebra, basics, calculus" disabled={canGenerate}/>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" asChild>
                <Link href="/admin/lessons">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSaving || isGenerating || isGeneratingImage}>
                {(isSaving || isGenerating || isGeneratingImage) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Lesson
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
