// src/components/adaptive/adaptive-learning-dashboard.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAdaptiveLearning } from '@/hooks/use-adaptive-learning';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  AlertTriangle, 
  Lightbulb, 
  Eye, 
  Headphones, 
  Hand, 
  BookOpen,
  RefreshCw,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdaptiveLearningDashboardProps {
  className?: string;
}

export default function AdaptiveLearningDashboard({ className }: AdaptiveLearningDashboardProps) {
  const {
    profile,
    currentPath,
    isLoading,
    error,
    refreshAnalysis,
    adaptationTriggers,
    clearTriggers,
    getCognitiveLoadStatus,
    getLearningStyleRecommendations,
    getNextLessonRecommendation
  } = useAdaptiveLearning();

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Analyzing your learning patterns...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Analysis Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!profile || !currentPath) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            Complete a few lessons to unlock personalized learning insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  const cognitiveLoadStatus = getCognitiveLoadStatus();
  const styleRecommendations = getLearningStyleRecommendations();
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
    <div className={cn("space-y-6", className)}>
      {/* Adaptation Triggers Alert */}
      {adaptationTriggers.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <Zap className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Learning Adaptation Suggested</AlertTitle>
          <AlertDescription className="text-orange-700">
            <div className="space-y-2 mt-2">
              {adaptationTriggers.map((trigger, index) => (
                <div key={index} className="text-sm">
                  <strong>{trigger.type.replace('_', ' ').toUpperCase()}:</strong> {trigger.suggestedAction.replace('_', ' ')}
                </div>
              ))}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={clearTriggers}
                className="mt-2"
              >
                Acknowledge
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Learning Style Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {getLearningStyleIcon(currentPath.personalityType)}
              Learning Style
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Badge variant="secondary" className="capitalize">
                {currentPath.personalityType} Learner
              </Badge>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Style Distribution:</div>
                {Object.entries(profile.styleMetrics)
                  .filter(([key]) => key !== 'detectedFrom')
                  .map(([style, score]) => (
                    <div key={style} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{style}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={(score as number) * 100} className="w-16 h-2" />
                        <span className="text-xs text-muted-foreground">
                          {Math.round((score as number) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cognitive Load Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Cognitive Load
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge 
                  variant="outline" 
                  className={cn("capitalize", getCognitiveLoadColor(cognitiveLoadStatus))}
                >
                  {cognitiveLoadStatus}
                </Badge>
                <span className="text-2xl font-bold">
                  {currentPath.cognitiveLoad}/10
                </span>
              </div>
              
              <Progress value={currentPath.cognitiveLoad * 10} className="h-2" />
              
              <div className="text-sm text-muted-foreground">
                {cognitiveLoadStatus === 'overload' && 'Consider taking a break or reducing difficulty'}
                {cognitiveLoadStatus === 'high' && 'You\'re working hard! Stay focused'}
                {cognitiveLoadStatus === 'medium' && 'Optimal learning zone'}
                {cognitiveLoadStatus === 'low' && 'Ready for more challenging content'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Learning Velocity Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Learning Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Concepts/Hour</span>
                <span className="text-2xl font-bold">
                  {currentPath.learningVelocity.toFixed(1)}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Retention Rate</span>
                  <span>{Math.round(profile.velocityMetrics.retentionRate * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Transfer Learning</span>
                  <span>{Math.round(profile.velocityMetrics.transferLearning * 100)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Gaps */}
      {currentPath.knowledgeGaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Knowledge Gaps to Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {currentPath.knowledgeGaps.map((gap, index) => (
                <Badge key={index} variant="outline" className="text-orange-600 border-orange-200">
                  {gap}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Lesson Recommendation */}
      {nextLesson && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Recommended Next Lesson
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Lesson ID: {nextLesson.lessonId}</p>
                <p className="text-sm text-muted-foreground">
                  Confidence: {Math.round(nextLesson.confidence * 100)}%
                </p>
              </div>
              <Button size="sm">
                Start Lesson
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Style Recommendations */}
      {styleRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Personalized Study Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {styleRecommendations.slice(0, 3).map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Refresh Analysis */}
      <div className="flex justify-center">
        <Button 
          variant="outline" 
          onClick={refreshAnalysis}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Analysis
        </Button>
      </div>
    </div>
  );
}