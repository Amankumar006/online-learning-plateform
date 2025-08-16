// src/components/adaptive/adaptive-lesson-wrapper.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useAdaptiveLearning } from '@/hooks/use-adaptive-learning';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  Lightbulb, 
  TrendingDown, 
  TrendingUp, 
  Clock,
  Target,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdaptiveLessonWrapperProps {
  lessonId: string;
  children: React.ReactNode;
  onDifficultyAdjust?: (adjustment: number) => void;
  onBreakSuggested?: () => void;
}

export default function AdaptiveLessonWrapper({ 
  lessonId, 
  children, 
  onDifficultyAdjust,
  onBreakSuggested 
}: AdaptiveLessonWrapperProps) {
  const {
    currentPath,
    trackInteraction,
    adaptationTriggers,
    clearTriggers,
    getCognitiveLoadStatus,
    getLearningStyleRecommendations
  } = useAdaptiveLearning();

  const [lessonStartTime, setLessonStartTime] = useState<number>(Date.now());
  const [showAdaptiveHints, setShowAdaptiveHints] = useState(false);

  // Track lesson start
  useEffect(() => {
    const startTime = Date.now();
    setLessonStartTime(startTime);

    trackInteraction({
      eventType: 'lesson_start',
      lessonId,
      duration: 0,
      success: true,
      metadata: { startTime }
    });

    return () => {
      // Track lesson end on unmount
      const endTime = Date.now();
      trackInteraction({
        eventType: 'lesson_complete',
        lessonId,
        duration: endTime - startTime,
        success: true,
        metadata: { endTime, totalDuration: endTime - startTime }
      });
    };
  }, [lessonId, trackInteraction]);

  // Handle adaptation triggers
  useEffect(() => {
    if (adaptationTriggers.length === 0) return;

    const highPriorityTriggers = adaptationTriggers.filter(t => t.severity === 'high');
    
    if (highPriorityTriggers.length > 0) {
      const trigger = highPriorityTriggers[0];
      
      switch (trigger.suggestedAction) {
        case 'reduce_difficulty':
          onDifficultyAdjust?.(-1);
          break;
        case 'increase_difficulty':
          onDifficultyAdjust?.(1);
          break;
        case 'take_break':
          onBreakSuggested?.();
          break;
        case 'change_modality':
          setShowAdaptiveHints(true);
          break;
      }
    }
  }, [adaptationTriggers, onDifficultyAdjust, onBreakSuggested]);

  const cognitiveLoadStatus = getCognitiveLoadStatus();
  const styleRecommendations = getLearningStyleRecommendations();

  // Get adaptive UI adjustments based on learning style
  const getAdaptiveStyles = () => {
    if (!currentPath) return {};

    const baseStyles = {};
    
    switch (currentPath.personalityType) {
      case 'visual':
        return {
          ...baseStyles,
          '--adaptive-highlight': '#3b82f6', // Blue for visual learners
          '--adaptive-spacing': '1.5rem'
        };
      case 'auditory':
        return {
          ...baseStyles,
          '--adaptive-highlight': '#10b981', // Green for auditory learners
          '--adaptive-font-size': '1.1em'
        };
      case 'kinesthetic':
        return {
          ...baseStyles,
          '--adaptive-highlight': '#f59e0b', // Orange for kinesthetic learners
          '--adaptive-padding': '1.25rem'
        };
      case 'reading':
        return {
          ...baseStyles,
          '--adaptive-highlight': '#8b5cf6', // Purple for reading/writing learners
          '--adaptive-line-height': '1.7'
        };
      default:
        return baseStyles;
    }
  };

  return (
    <div 
      className="adaptive-lesson-wrapper"
      style={getAdaptiveStyles()}
    >
      {/* Cognitive Load Warning */}
      {cognitiveLoadStatus === 'overload' && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="flex items-center justify-between">
              <span>High cognitive load detected. Consider taking a break.</span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onBreakSuggested?.()}
                className="ml-2"
              >
                Take Break
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Adaptive Hints Panel */}
      {showAdaptiveHints && styleRecommendations.length > 0 && (
        <Card className="mb-4 border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              Personalized Learning Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {styleRecommendations.slice(0, 2).map((tip, index) => (
                <div key={index} className="text-sm text-blue-800 flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                  {tip}
                </div>
              ))}
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setShowAdaptiveHints(false)}
                className="mt-2 text-blue-600 hover:text-blue-700"
              >
                Got it
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Adaptation Indicators */}
      {currentPath && (
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            <span>Load: {currentPath.cognitiveLoad}/10</span>
          </div>
          
          <div className="flex items-center gap-1">
            {currentPath.learningVelocity > 1.5 ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : currentPath.learningVelocity < 0.8 ? (
              <TrendingDown className="h-3 w-3 text-red-600" />
            ) : (
              <Target className="h-3 w-3 text-blue-600" />
            )}
            <span>Velocity: {currentPath.learningVelocity.toFixed(1)}x</span>
          </div>

          <Badge 
            variant="outline" 
            className={cn(
              "text-xs capitalize",
              currentPath.personalityType === 'visual' && "border-blue-200 text-blue-700",
              currentPath.personalityType === 'auditory' && "border-green-200 text-green-700",
              currentPath.personalityType === 'kinesthetic' && "border-orange-200 text-orange-700",
              currentPath.personalityType === 'reading' && "border-purple-200 text-purple-700"
            )}
          >
            {currentPath.personalityType}
          </Badge>
        </div>
      )}

      {/* Main lesson content */}
      <div className={cn(
        "adaptive-content",
        currentPath?.personalityType === 'visual' && "visual-optimized",
        currentPath?.personalityType === 'auditory' && "auditory-optimized", 
        currentPath?.personalityType === 'kinesthetic' && "kinesthetic-optimized",
        currentPath?.personalityType === 'reading' && "reading-optimized"
      )}>
        {children}
      </div>

      {/* Adaptive CSS */}
      <style jsx>{`
        .adaptive-lesson-wrapper {
          --adaptive-highlight: #6366f1;
          --adaptive-spacing: 1rem;
          --adaptive-font-size: 1rem;
          --adaptive-padding: 1rem;
          --adaptive-line-height: 1.6;
        }

        .visual-optimized {
          line-height: var(--adaptive-line-height);
        }

        .visual-optimized h1,
        .visual-optimized h2,
        .visual-optimized h3 {
          color: var(--adaptive-highlight);
          margin-bottom: var(--adaptive-spacing);
        }

        .auditory-optimized {
          font-size: var(--adaptive-font-size);
        }

        .kinesthetic-optimized {
          padding: var(--adaptive-padding);
        }

        .kinesthetic-optimized button,
        .kinesthetic-optimized .interactive-element {
          transform: scale(1.05);
          transition: transform 0.2s ease;
        }

        .reading-optimized {
          line-height: var(--adaptive-line-height);
          letter-spacing: 0.02em;
        }

        .reading-optimized p {
          margin-bottom: calc(var(--adaptive-spacing) * 1.2);
        }
      `}</style>
    </div>
  );
}

// Higher-order component for easy integration
export function withAdaptiveLearning<P extends object>(
  Component: React.ComponentType<P>,
  lessonId: string
) {
  return function AdaptiveComponent(props: P) {
    return (
      <AdaptiveLessonWrapper lessonId={lessonId}>
        <Component {...props} />
      </AdaptiveLessonWrapper>
    );
  };
}