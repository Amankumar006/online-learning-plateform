"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap, 
  AlertTriangle,
  RefreshCw,
  Eye,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FlowStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped'
  startTime?: number
  endTime?: number
  error?: string
  metadata?: Record<string, any>
}

export interface FlowMonitorProps {
  steps: FlowStep[]
  onRetry?: (stepId: string) => void
  onViewDetails?: (stepId: string) => void
  className?: string
}

export function LessonFlowMonitor({ 
  steps, 
  onRetry, 
  onViewDetails, 
  className 
}: FlowMonitorProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null)

  const getStepIcon = (step: FlowStep) => {
    switch (step.status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'skipped':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStepDuration = (step: FlowStep) => {
    if (!step.startTime) return null
    const endTime = step.endTime || Date.now()
    return endTime - step.startTime
  }

  const getOverallProgress = () => {
    const completedSteps = steps.filter(s => s.status === 'success' || s.status === 'error').length
    return (completedSteps / steps.length) * 100
  }

  const getOverallStatus = () => {
    if (steps.some(s => s.status === 'error')) return 'error'
    if (steps.some(s => s.status === 'running')) return 'running'
    if (steps.every(s => s.status === 'success' || s.status === 'skipped')) return 'success'
    return 'pending'
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Lesson Generation Flow
          </CardTitle>
          <Badge variant={getOverallStatus() === 'error' ? 'destructive' : 
                         getOverallStatus() === 'success' ? 'default' : 'secondary'}>
            {getOverallStatus()}
          </Badge>
        </div>
        <Progress value={getOverallProgress()} className="w-full" />
      </CardHeader>
      
      <CardContent className="space-y-3">
        {steps.map((step, index) => {
          const duration = getStepDuration(step)
          const isExpanded = expandedStep === step.id
          
          return (
            <div key={step.id} className="space-y-2">
              <div 
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
                  step.status === 'success' && "bg-green-50 border-green-200 dark:bg-green-950/20",
                  step.status === 'error' && "bg-red-50 border-red-200 dark:bg-red-950/20",
                  step.status === 'running' && "bg-blue-50 border-blue-200 dark:bg-blue-950/20",
                  step.status === 'pending' && "bg-gray-50 border-gray-200 dark:bg-gray-950/20"
                )}
                onClick={() => setExpandedStep(isExpanded ? null : step.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                  {getStepIcon(step)}
                  <span className="font-medium">{step.name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {duration && (
                    <Badge variant="outline" className="text-xs">
                      {duration}ms
                    </Badge>
                  )}
                  {step.metadata?.model && (
                    <Badge variant="secondary" className="text-xs">
                      {step.metadata.model}
                    </Badge>
                  )}
                  {step.status === 'error' && onRetry && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRetry(step.id)
                      }}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  )}
                </div>
              </div>
              
              {isExpanded && (
                <div className="ml-6 p-3 bg-muted/50 rounded-lg text-sm space-y-2">
                  {step.error && (
                    <div className="text-red-600 dark:text-red-400">
                      <strong>Error:</strong> {step.error}
                    </div>
                  )}
                  
                  {step.metadata && (
                    <div className="space-y-1">
                      <strong>Details:</strong>
                      {Object.entries(step.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{key}:</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {onViewDetails && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onViewDetails(step.id)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Details
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// Performance Analytics Component
export function FlowAnalytics({ steps }: { steps: FlowStep[] }) {
  const totalTime = steps.reduce((acc, step) => {
    const duration = getStepDuration(step)
    return acc + (duration || 0)
  }, 0)

  const successRate = (steps.filter(s => s.status === 'success').length / steps.length) * 100
  const avgStepTime = totalTime / steps.filter(s => s.status === 'success').length

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold">{successRate.toFixed(1)}%</p>
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
              <p className="text-2xl font-bold">{totalTime}ms</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Avg Step Time</p>
              <p className="text-2xl font-bold">{avgStepTime.toFixed(0)}ms</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getStepDuration(step: FlowStep) {
  if (!step.startTime) return null
  const endTime = step.endTime || Date.now()
  return endTime - step.startTime
}