"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Block, TextBlock, CodeBlock, VideoBlock, ImageBlock } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Type, 
  Code, 
  Video, 
  Image,
  Edit3, 
  Check, 
  X,
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  Upload,
  Sparkles,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { generateLessonImage } from '@/ai/flows/generate-lesson-image'
import { uploadImageFromDataUrl } from '@/lib/storage'
import { useToast } from '@/hooks/use-toast'

interface BlockEditorProps {
  block: Block
  isEditing: boolean
  onUpdate: (block: Block) => void
  onStartEdit: () => void
  onStopEdit: () => void
  disabled?: boolean
  sectionTitle?: string
  lessonContext?: string
}

const PROGRAMMING_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
  'html', 'css', 'sql', 'bash', 'json', 'xml', 'yaml', 'markdown'
]

export function BlockEditor({ 
  block, 
  isEditing, 
  onUpdate, 
  onStartEdit, 
  onStopEdit, 
  disabled = false,
  sectionTitle = '',
  lessonContext = ''
}: BlockEditorProps) {
  const [localBlock, setLocalBlock] = useState<Block>(block)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    setLocalBlock(block)
  }, [block])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      // Auto-resize textarea
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleSave = () => {
    onUpdate(localBlock)
    onStopEdit()
  }

  const handleCancel = () => {
    setLocalBlock(block)
    onStopEdit()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSave()
    }
    if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const insertFormatting = (before: string, after: string = '') => {
    if (!textareaRef.current || block.type !== 'text') return
    
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    const newText = textarea.value.substring(0, start) + before + selectedText + after + textarea.value.substring(end)
    
    setLocalBlock({ ...localBlock, content: newText } as TextBlock)
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, end + before.length)
    }, 0)
  }

  const generateAIImage = async () => {
    if (block.type !== 'image') return
    
    setIsGeneratingImage(true)
    setIsUploadingImage(false)
    
    try {
      // Create a contextual prompt for the image
      const currentImageBlock = localBlock as ImageBlock
      const contextualPrompt = createImagePrompt(currentImageBlock, sectionTitle, lessonContext)
      
      const result = await generateLessonImage({ 
        prompt: contextualPrompt,
        style: 'educational',
        speed: 'nano-banana',
        context: `Section: ${sectionTitle}. ${lessonContext.substring(0, 200)}`
      })
      
      setIsUploadingImage(true)
      const fileName = `lesson_image_${Date.now()}`
      const publicUrl = await uploadImageFromDataUrl(result.imageUrl, fileName)
      
      setLocalBlock({ 
        ...localBlock, 
        url: publicUrl,
        alt: currentImageBlock.alt || `Generated image for ${sectionTitle}`,
        caption: currentImageBlock.caption || `AI-generated illustration for ${sectionTitle}`
      } as ImageBlock)
      
      toast({
        title: "🍌 Nano-Banana Speed!",
        description: `Image generated in ${result.generationTime}ms using ${result.model}. Lightning fast!`
      })
      
    } catch (error: any) {
      console.error('Failed to generate image:', error)
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message || "Failed to generate image. Please try again or enter a URL manually."
      })
    } finally {
      setIsGeneratingImage(false)
      setIsUploadingImage(false)
    }
  }

  const createImagePrompt = (imageBlock: ImageBlock, sectionTitle: string, lessonContext: string) => {
    // Create a smart prompt based on available context
    let prompt = 'A high-quality, educational illustration'
    
    if (imageBlock.alt && imageBlock.alt.trim()) {
      prompt += ` showing ${imageBlock.alt}`
    } else if (sectionTitle) {
      prompt += ` for a lesson section about ${sectionTitle}`
    }
    
    if (imageBlock.caption && imageBlock.caption.trim()) {
      prompt += `. ${imageBlock.caption}`
    }
    
    if (lessonContext) {
      prompt += `. Context: ${lessonContext}`
    }
    
    prompt += '. The style should be clean, modern, educational, and engaging for students. Avoid text in the image.'
    
    return prompt
  }

  const renderBlockIcon = () => {
    switch (block.type) {
      case 'text':
        return <Type className="h-4 w-4 text-blue-500" />
      case 'image':
        return <Image className="h-4 w-4 text-orange-500" />
      case 'code':
        return <Code className="h-4 w-4 text-green-500" />
      case 'video':
        return <Video className="h-4 w-4 text-purple-500" />
    }
  }

  const renderTextBlock = (textBlock: TextBlock) => {
    if (isEditing) {
      return (
        <div className="space-y-3">
          {/* Formatting Toolbar */}
          <div className="flex items-center gap-1 p-2 bg-muted/50 rounded-md border">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => insertFormatting('**', '**')}
              className="h-8 w-8 p-0"
              title="Bold"
            >
              <Bold className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => insertFormatting('*', '*')}
              className="h-8 w-8 p-0"
              title="Italic"
            >
              <Italic className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => insertFormatting('[', '](url)')}
              className="h-8 w-8 p-0"
              title="Link"
            >
              <Link className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => insertFormatting('- ')}
              className="h-8 w-8 p-0"
              title="Bullet List"
            >
              <List className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => insertFormatting('1. ')}
              className="h-8 w-8 p-0"
              title="Numbered List"
            >
              <ListOrdered className="h-3 w-3" />
            </Button>
            <div className="ml-auto flex gap-1">
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                <X className="h-3 w-3" />
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <Textarea
            ref={textareaRef}
            value={localBlock.type === 'text' ? localBlock.content : ''}
            onChange={(e) => setLocalBlock({ ...localBlock, content: e.target.value } as TextBlock)}
            onKeyDown={handleKeyDown}
            className="min-h-[120px] resize-none border-0 focus-visible:ring-1 focus-visible:ring-primary"
            placeholder="Start typing... Use Markdown for formatting and LaTeX for equations (e.g., $x^2 + y^2 = z^2$)"
          />
          
          <div className="text-xs text-muted-foreground">
            Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">⌘ + Enter</kbd> to save, <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> to cancel
          </div>
        </div>
      )
    }

    return (
      <div
        className={cn(
          "prose prose-sm max-w-none cursor-pointer p-4 rounded-lg transition-all duration-200",
          "hover:bg-muted/30 hover:shadow-sm",
          !disabled && "group-hover:ring-1 group-hover:ring-primary/20"
        )}
        onClick={!disabled ? onStartEdit : undefined}
      >
        {textBlock.content ? (
          <div 
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ 
              __html: textBlock.content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>')
                .replace(/^- (.+)$/gm, '<li>$1</li>')
                .replace(/^(\d+)\. (.+)$/gm, '<li>$1. $2</li>')
            }}
          />
        ) : (
          <div className="text-muted-foreground italic">Click to add content...</div>
        )}
        
        {!disabled && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
              <Edit3 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  const renderCodeBlock = (codeBlock: CodeBlock) => {
    if (isEditing) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Select
              value={localBlock.type === 'code' ? localBlock.language : 'javascript'}
              onValueChange={(language) => setLocalBlock({ ...localBlock, language } as CodeBlock)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROGRAMMING_LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="ml-auto flex gap-1">
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                <X className="h-3 w-3" />
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <Textarea
            ref={textareaRef}
            value={localBlock.type === 'code' ? localBlock.code : ''}
            onChange={(e) => setLocalBlock({ ...localBlock, code: e.target.value } as CodeBlock)}
            onKeyDown={handleKeyDown}
            className="min-h-[200px] font-mono text-sm resize-none border-0 focus-visible:ring-1 focus-visible:ring-primary bg-muted/50"
            placeholder="Enter your code here..."
          />
          
          <div className="text-xs text-muted-foreground">
            Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">⌘ + Enter</kbd> to save, <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> to cancel
          </div>
        </div>
      )
    }

    return (
      <div
        className={cn(
          "cursor-pointer rounded-lg transition-all duration-200",
          "hover:bg-muted/30 hover:shadow-sm",
          !disabled && "group-hover:ring-1 group-hover:ring-primary/20"
        )}
        onClick={!disabled ? onStartEdit : undefined}
      >
        <div className="bg-muted/50 px-3 py-2 rounded-t-lg border-b flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-muted-foreground">
            {codeBlock.language}
          </span>
          {!disabled && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit3 className="h-3 w-3" />
            </Button>
          )}
        </div>
        <pre className="p-4 bg-muted/20 rounded-b-lg overflow-x-auto">
          <code className="text-sm font-mono">
            {codeBlock.code || '// Click to add code...'}
          </code>
        </pre>
      </div>
    )
  }

  const renderImageBlock = (imageBlock: ImageBlock) => {
    if (isEditing) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={localBlock.type === 'image' ? localBlock.url : ''}
              onChange={(e) => setLocalBlock({ ...localBlock, url: e.target.value } as ImageBlock)}
              onKeyDown={handleKeyDown}
              placeholder="Enter image URL or generate with AI"
              className="flex-1"
              disabled={isGeneratingImage || isUploadingImage}
            />
            
            <Button 
              size="sm" 
              variant="outline" 
              className="shrink-0"
              disabled={isGeneratingImage || isUploadingImage}
            >
              <Upload className="h-3 w-3 mr-1" />
              Upload
            </Button>
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={generateAIImage}
              disabled={isGeneratingImage || isUploadingImage}
              className="shrink-0"
            >
              {isGeneratingImage ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : isUploadingImage ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3 mr-1" />
              )}
              {isGeneratingImage ? 'Nano-Banana...' : isUploadingImage ? 'Uploading...' : '🍌 Nano-Banana'}
            </Button>
            
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isGeneratingImage || isUploadingImage}>
                <X className="h-3 w-3" />
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isGeneratingImage || isUploadingImage}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              value={localBlock.type === 'image' ? localBlock.alt || '' : ''}
              onChange={(e) => setLocalBlock({ ...localBlock, alt: e.target.value } as ImageBlock)}
              placeholder="Alt text (helps AI generate better images)"
              className="text-sm"
              disabled={isGeneratingImage || isUploadingImage}
            />
            <Input
              value={localBlock.type === 'image' ? localBlock.caption || '' : ''}
              onChange={(e) => setLocalBlock({ ...localBlock, caption: e.target.value } as ImageBlock)}
              placeholder="Caption (also helps AI generation)"
              className="text-sm"
              disabled={isGeneratingImage || isUploadingImage}
            />
          </div>
          
          {(isGeneratingImage || isUploadingImage) && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-primary font-medium">
                {isGeneratingImage ? '🍌 Nano-Banana mode: Ultra-fast image creation...' : 'Uploading generated image...'}
              </span>
            </div>
          )}
          
          {localBlock.type === 'image' && localBlock.url && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg">
              <img 
                src={localBlock.url} 
                alt={localBlock.alt || 'Preview'} 
                className="max-w-full h-auto max-h-48 rounded-md mx-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to save, <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> to cancel
          </div>
        </div>
      )
    }

    return (
      <div
        className={cn(
          "cursor-pointer rounded-lg transition-all duration-200",
          "hover:bg-muted/30 hover:shadow-sm",
          !disabled && "group-hover:ring-1 group-hover:ring-primary/20"
        )}
        onClick={!disabled ? onStartEdit : undefined}
      >
        {imageBlock.url ? (
          <div className="space-y-3">
            <div className="relative">
              <img 
                src={imageBlock.url} 
                alt={imageBlock.alt || 'Lesson image'} 
                className="w-full h-auto max-h-96 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4='
                }}
              />
              {!disabled && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            {imageBlock.caption && (
              <p className="text-sm text-muted-foreground text-center italic">
                {imageBlock.caption}
              </p>
            )}
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed border-muted rounded-lg text-center hover:border-primary/50 transition-colors">
            <Image className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Click to add an image</p>
            <p className="text-xs text-muted-foreground mt-1">Upload or paste an image URL</p>
          </div>
        )}
      </div>
    )
  }

  const renderVideoBlock = (videoBlock: VideoBlock) => {
    if (isEditing) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Input
              ref={inputRef}
              value={localBlock.type === 'video' ? localBlock.url : ''}
              onChange={(e) => setLocalBlock({ ...localBlock, url: e.target.value } as VideoBlock)}
              onKeyDown={handleKeyDown}
              placeholder="Enter video URL (YouTube, Vimeo, etc.)"
              className="flex-1"
            />
            
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                <X className="h-3 w-3" />
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to save, <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> to cancel
          </div>
        </div>
      )
    }

    return (
      <div
        className={cn(
          "cursor-pointer p-4 rounded-lg border-2 border-dashed border-muted transition-all duration-200",
          "hover:bg-muted/30 hover:border-primary/50",
          !disabled && "group-hover:ring-1 group-hover:ring-primary/20"
        )}
        onClick={!disabled ? onStartEdit : undefined}
      >
        <div className="flex items-center gap-3">
          <Video className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            {videoBlock.url ? (
              <a 
                href={videoBlock.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate block"
                onClick={(e) => e.stopPropagation()}
              >
                {videoBlock.url}
              </a>
            ) : (
              <span className="text-muted-foreground italic">Click to add video URL...</span>
            )}
          </div>
          {!disabled && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit3 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative group">
      {/* Block Type Indicator */}
      <div className="absolute -left-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {renderBlockIcon()}
      </div>
      
      {/* Block Content */}
      <div className="relative">
        {block.type === 'text' && renderTextBlock(block as TextBlock)}
        {block.type === 'image' && renderImageBlock(block as ImageBlock)}
        {block.type === 'code' && renderCodeBlock(block as CodeBlock)}
        {block.type === 'video' && renderVideoBlock(block as VideoBlock)}
      </div>
    </div>
  )
}