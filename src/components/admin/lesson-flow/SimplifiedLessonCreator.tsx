"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { LessonFlowMonitor, FlowAnalytics } from './LessonFlowMonitor'
import { LessonFlowOrchestrator, LessonGenerationInput, LessonGenerationResult } from '@/lib/lesson-flow-orchestrator'
import { 
  Sparkles, 
  Zap, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react'

export function SimplifiedLessonCreator() {
  const [input, setInput] = useState<LessonGenerationInput>({
    topic: '',
    generateImage: true
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<LessonGenerationResult | null>(null)
  const [orchestrator] = useState(() => new LessonFlowOrchestrator())
  const { toast } = useToast()

  const handleGenerate = async () => {
    if (!input.topic.trim()) {
      toast({
        variant: "destructive",
        title: "Topic Required",
        description: "Please enter a lesson topic to generate content."
      })
      return
    }

    setIsGenerating(true)
    setResult(null)

    try {
      const generationResult = await orchestrator.generateLesson(input)
      setResult(generationResult)

      if (generationResult.success) {
        toast({
          title: "🎉 Lesson Generated Successfully!",
          description: `Created in ${generationResult.totalTime}ms with ${generationResult.errors.length} warnings.`
        })
      } else {
        toast({
          variant: "destructive",
          title: "Generation Failed",
          description: `Failed after ${generationResult.totalTime}ms. Check the flow details below.`
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unexpected Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred."
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRetry = async (stepId: string) => {
    setIsGenerating(true)
    try {
      const success = await orchestrator.retryStep(stepId, input)
      if (success) {
        toast({
          title: "Retry Successful",
          description: `Step ${stepId} completed successfully.`
        })
        // Refresh the result
        setResult(prev => prev ? { ...prev, steps: orchestrator.getSteps() } : null)
      } else {
        toast({
          variant: "destructive",
          title: "Retry Failed",
          description: `Failed to retry step ${stepId}.`
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Retry Error",
        description: error instanceof Error ? error.message : "Retry failed."
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const getOverallStatus = () => {
    if (!result) return 'idle'
    if (result.success) return 'success'
    return 'error'
  }

  return (
    <div className="space-y-6">
      {/* Simplified Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Quick Lesson Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Lesson Topic *</Label>
              <Textarea
                id="topic"
                placeholder="e.g., Introduction to Photosynthesis, Basic Python Variables, World War II Causes"
                value={input.topic}
                onChange={(e) => setInput(prev => ({ ...prev, topic: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject (Optional)</Label>
                <Input
                  id="subject"
                  placeholder="e.g., Biology, Programming, History"
                  value={input.subject || ''}
                  onChange={(e) => setInput(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade Level</Label>
                  <Input
                    id="grade"
                    placeholder="e.g., 10th"
                    value={input.gradeLevel || ''}
                    onChange={(e) => setInput(prev => ({ ...prev, gradeLevel: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="age">Age Group</Label>
                  <Input
                    id="age"
                    placeholder="e.g., 14-16"
                    value={input.ageGroup || ''}
                    onChange={(e) => setInput(prev => ({ ...prev, ageGroup: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Switch
                id="generate-image"
                checked={input.generateImage}
                onCheckedChange={(checked) => setInput(prev => ({ ...prev, generateImage: checked }))}
              />
              <Label htmlFor="generate-image">Generate AI Image (🍌 Nano-Banana)</Label>
            </div>
            
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || !input.topic.trim()}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Generate Lesson
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Overview */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {getOverallStatus() === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-lg font-bold capitalize">{getOverallStatus()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Time</p>
                  <p className="text-lg font-bold">{result.totalTime}ms</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Success Steps</p>
                  <p className="text-lg font-bold">
                    {result.steps.filter(s => s.status === 'success').length}/{result.steps.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Warnings</p>
                  <p className="text-lg font-bold">{result.errors.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Flow Monitor */}
      {result && (
        <LessonFlowMonitor
          steps={result.steps}
          onRetry={handleRetry}
          onViewDetails={(stepId) => {
            toast({
              title: "Step Details",
              description: `Viewing details for step: ${stepId}`
            })
          }}
        />
      )}

      {/* Analytics */}
      {result && result.success && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <FlowAnalytics steps={result.steps} />
          </CardContent>
        </Card>
      )}

      {/* Success Actions */}
      {result && result.success && result.lessonId && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                  Lesson Created Successfully! 🎉
                </h3>
                <p className="text-green-600 dark:text-green-300">
                  Your lesson has been generated and saved. You can now edit it or create another one.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <a href={`/admin/lessons/${result.lessonId}/edit`}>
                    Edit Lesson
                  </a>
                </Button>
                <Button asChild>
                  <a href={`/dashboard/lessons/${result.lessonId}`}>
                    View Lesson
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}