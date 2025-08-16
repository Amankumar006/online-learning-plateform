// src/components/dashboard/adaptive-insights-card.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAdaptiveLearning } from '@/hooks/use-adaptive-learning';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Eye, 
  Headphones, 
  Hand, 
  BookOpen,
  Zap,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function AdaptiveInsightsCard() {
  const {
    currentPath,
    isLoading,
    getCognitiveLoadStatus,
    getNextLessonRecommendation,
    adaptationTriggers
  } = useAdaptiveLearning();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentPath) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete a few lessons to unlock personalized AI insights about your learning patterns.
          </p>
        </CardContent>
      </Card>
    );
  }

  const cognitiveLoadStatus = getCognitiveLoadStatus();
  const nextLesson = getNextLessonRecommendation();

  const getLearningStyleIcon = (style: string) => {
    switch (style) {
      case 'visual': return <Eye className="h-4 w-4" />;
      case 'auditory': return <Headphones className="h-4 w-4" />;
      case 'kinesthetic': return <Hand className="h-4 w-4" />;
      case 'reading': return <BookOpen className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getCognitiveLoadColor = (status: string) => {
    switch (status) {
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'medium': return 'text-green-600 bg-green-50 border-green-200';
      case 'high': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'overload': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Learning Insights
          </div>
          {adaptationTriggers.length > 0 && (
            <Badge variant="outline" className="text-orange-600 border-orange-200">
              <Zap className="h-3 w-3 mr-1" />
              {adaptationTriggers.length} Alert{adaptationTriggers.length > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Learning Style & Cognitive Load */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              {getLearningStyleIcon(currentPath.personalityType)}
              Learning Style
            </div>
            <Badge variant="secondary" className="capitalize">
              {currentPath.personalityType}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Brain className="h-4 w-4" />
              Cognitive Load
            </div>
            <Badge 
              variant="outline" 
              className={cn("capitalize", getCognitiveLoadColor(cognitiveLoadStatus))}
            >
              {cognitiveLoadStatus}
            </Badge>
          </div>
        </div>

        {/* Learning Velocity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 font-medium">
              <TrendingUp className="h-4 w-4" />
              Learning Velocity
            </div>
            <span className="font-bold">
              {currentPath.learningVelocity.toFixed(1)}x
            </span>
          </div>
          <Progress 
            value={Math.min(currentPath.learningVelocity * 33.33, 100)} 
            className="h-2" 
          />
        </div>

        {/* Knowledge Gaps */}
        {currentPath.knowledgeGaps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4" />
              Focus Areas
            </div>
            <div className="flex flex-wrap gap-1">
              {currentPath.knowledgeGaps.slice(0, 3).map((gap, index) => (
                <Badge key={index} variant="outline" className="text-xs text-orange-600 border-orange-200">
                  {gap.split(':')[1] || gap}
                </Badge>
              ))}
              {currentPath.knowledgeGaps.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{currentPath.knowledgeGaps.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Next Lesson Recommendation */}
        {nextLesson && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4" />
              Recommended Next
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  Lesson {nextLesson.lessonId}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(nextLesson.confidence * 100)}% match
                </p>
              </div>
              <Button size="sm" asChild>
                <Link href={`/dashboard/lessons/${nextLesson.lessonId}`}>
                  Start
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-2 border-t">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/dashboard/adaptive-insights">
              <Clock className="h-4 w-4 mr-2" />
              View Detailed Insights
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}