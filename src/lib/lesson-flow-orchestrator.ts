'use server'

import { generateLessonContent } from '@/ai/flows/generate-lesson-content'
import { generateLessonImage } from '@/ai/flows/generate-lesson-image'
import { uploadImageFromDataUrl } from '@/lib/storage'
import { createLesson } from '@/lib/lessons'
import { FlowStep } from '@/components/admin/lesson-flow/LessonFlowMonitor'

export interface LessonGenerationInput {
  topic: string
  subject?: string
  gradeLevel?: string
  ageGroup?: string
  curriculumBoard?: string
  topicDepth?: string
  generateImage?: boolean
  tags?: string[]
}

export interface LessonGenerationResult {
  success: boolean
  lessonId?: string
  steps: FlowStep[]
  totalTime: number
  errors: string[]
}

export class LessonFlowOrchestrator {
  private steps: FlowStep[] = []
  private startTime: number = 0

  constructor() {
    this.initializeSteps()
  }

  private initializeSteps() {
    this.steps = [
      { id: 'validate', name: 'Validate Input', status: 'pending' },
      { id: 'generate-content', name: 'Generate Lesson Content', status: 'pending' },
      { id: 'generate-image', name: 'Generate Lesson Image', status: 'pending' },
      { id: 'upload-image', name: 'Upload Image to Storage', status: 'pending' },
      { id: 'save-lesson', name: 'Save Lesson to Database', status: 'pending' },
      { id: 'post-process', name: 'Background Processing', status: 'pending' }
    ]
  }

  private updateStep(stepId: string, updates: Partial<FlowStep>) {
    const stepIndex = this.steps.findIndex(s => s.id === stepId)
    if (stepIndex !== -1) {
      this.steps[stepIndex] = { ...this.steps[stepIndex], ...updates }
    }
  }

  private startStep(stepId: string) {
    this.updateStep(stepId, {
      status: 'running',
      startTime: Date.now()
    })
  }

  private completeStep(stepId: string, metadata?: Record<string, any>) {
    this.updateStep(stepId, {
      status: 'success',
      endTime: Date.now(),
      metadata
    })
  }

  private failStep(stepId: string, error: string) {
    this.updateStep(stepId, {
      status: 'error',
      endTime: Date.now(),
      error
    })
  }

  private skipStep(stepId: string, reason: string) {
    this.updateStep(stepId, {
      status: 'skipped',
      metadata: { reason }
    })
  }

  async generateLesson(input: LessonGenerationInput): Promise<LessonGenerationResult> {
    this.startTime = Date.now()
    const errors: string[] = []

    try {
      // Step 1: Validate Input
      this.startStep('validate')
      if (!input.topic?.trim()) {
        throw new Error('Topic is required')
      }
      this.completeStep('validate', { 
        topic: input.topic,
        hasOptionalFields: !!(input.gradeLevel || input.ageGroup)
      })

      // Step 2: Generate Content
      this.startStep('generate-content')
      let lessonContent
      try {
        lessonContent = await generateLessonContent({
          topic: input.topic,
          gradeLevel: input.gradeLevel,
          ageGroup: input.ageGroup,
          curriculumBoard: input.curriculumBoard,
          topicDepth: input.topicDepth
        })
        this.completeStep('generate-content', {
          model: 'gemini-2.0-flash',
          sectionsCount: lessonContent.sections?.length || 0,
          blocksCount: lessonContent.sections?.reduce((acc, s) => acc + s.blocks.length, 0) || 0
        })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Content generation failed'
        this.failStep('generate-content', errorMsg)
        errors.push(errorMsg)
        throw error
      }

      // Step 3: Generate Image (if requested)
      let imageUrl = 'https://placehold.co/600x400/png'
      if (input.generateImage) {
        console.log('🍌 Starting image generation in orchestrator...')
        this.startStep('generate-image')
        try {
          const imagePrompt = `A high-quality, educational illustration for "${lessonContent.title}" in ${lessonContent.subject}. Clean, modern, engaging style.`
          console.log('🍌 Image prompt:', imagePrompt)
          
          const imageResult = await generateLessonImage({
            prompt: imagePrompt,
            style: 'educational',
            speed: 'nano-banana',
            context: `Lesson: ${lessonContent.title}, Subject: ${lessonContent.subject}`
          })
          
          console.log('🍌 Image generation successful:', {
            model: imageResult.model,
            generationTime: imageResult.generationTime,
            imageUrlLength: imageResult.imageUrl.length
          })
          
          this.completeStep('generate-image', {
            model: imageResult.model,
            generationTime: imageResult.generationTime,
            style: imageResult.style
          })

          // Step 4: Upload Image
          this.startStep('upload-image')
          try {
            const fileName = `lesson_${Date.now()}`
            console.log('🍌 Uploading image to storage...')
            imageUrl = await uploadImageFromDataUrl(imageResult.imageUrl, fileName)
            console.log('🍌 Image upload successful:', imageUrl)
            this.completeStep('upload-image', {
              fileName,
              url: imageUrl
            })
          } catch (error) {
            const errorMsg = `Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            console.error('🍌 Image upload error:', error)
            this.failStep('upload-image', errorMsg)
            errors.push(errorMsg)
            // Continue with placeholder image
            imageUrl = 'https://placehold.co/600x400/png'
          }
        } catch (error) {
          const errorMsg = `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          console.error('🍌 Image generation error:', error)
          this.failStep('generate-image', errorMsg)
          this.skipStep('upload-image', 'Image generation failed')
          errors.push(errorMsg)
          // Continue with placeholder image
        }
      } else {
        console.log('🍌 Image generation skipped - not requested')
        this.skipStep('generate-image', 'Image generation not requested')
        this.skipStep('upload-image', 'No image to upload')
      }

      // Step 5: Save Lesson
      this.startStep('save-lesson')
      let lessonId
      try {
        const lessonData = {
          ...lessonContent,
          image: imageUrl,
          tags: input.tags || [],
          gradeLevel: input.gradeLevel,
          ageGroup: input.ageGroup,
          curriculumBoard: input.curriculumBoard,
          topicDepth: input.topicDepth
        }
        
        lessonId = await createLesson(lessonData)
        this.completeStep('save-lesson', {
          lessonId,
          dataSize: JSON.stringify(lessonData).length
        })
      } catch (error) {
        const errorMsg = 'Failed to save lesson'
        this.failStep('save-lesson', errorMsg)
        errors.push(errorMsg)
        throw error
      }

      // Step 6: Post-processing (background tasks)
      this.startStep('post-process')
      try {
        // Audio generation happens in background, so we mark as success immediately
        this.completeStep('post-process', {
          audioGeneration: 'started',
          announcements: 'created'
        })
      } catch (error) {
        // Post-processing failures shouldn't fail the entire flow
        this.failStep('post-process', 'Background processing failed')
        errors.push('Background processing failed')
      }

      const totalTime = Date.now() - this.startTime
      return {
        success: true,
        lessonId,
        steps: [...this.steps],
        totalTime,
        errors
      }

    } catch (error) {
      const totalTime = Date.now() - this.startTime
      return {
        success: false,
        steps: [...this.steps],
        totalTime,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  getSteps(): FlowStep[] {
    return [...this.steps]
  }

  async retryStep(stepId: string, input: LessonGenerationInput): Promise<boolean> {
    // Reset the step and all subsequent steps
    const stepIndex = this.steps.findIndex(s => s.id === stepId)
    if (stepIndex === -1) return false

    for (let i = stepIndex; i < this.steps.length; i++) {
      this.steps[i].status = 'pending'
      delete this.steps[i].startTime
      delete this.steps[i].endTime
      delete this.steps[i].error
      delete this.steps[i].metadata
    }

    // Re-run from the failed step
    try {
      switch (stepId) {
        case 'generate-content':
          // Re-run content generation and all subsequent steps
          await this.generateLesson(input)
          break
        case 'generate-image':
          // Re-run image generation and subsequent steps
          // This would need partial re-execution logic
          break
        // Add other retry cases as needed
      }
      return true
    } catch (error) {
      return false
    }
  }
}