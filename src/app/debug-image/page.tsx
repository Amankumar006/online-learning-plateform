'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { generateLessonImage } from '@/ai/flows/generate-lesson-image'
import { uploadImageFromDataUrl } from '@/lib/storage'

export default function DebugImagePage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testImageGeneration = async () => {
    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      console.log('🍌 Starting debug image generation...')
      
      // Step 1: Test image generation
      const imageResult = await generateLessonImage({
        prompt: 'A high-quality, educational illustration for "Photosynthesis Process" in Biology. Clean, modern, engaging style.',
        style: 'educational',
        speed: 'nano-banana',
        context: 'Lesson: Photosynthesis Process, Subject: Biology'
      })
      
      console.log('🍌 Image generation result:', {
        model: imageResult.model,
        generationTime: imageResult.generationTime,
        imageUrlLength: imageResult.imageUrl.length,
        style: imageResult.style
      })

      // Step 2: Test upload
      console.log('🍌 Testing upload...')
      const fileName = `debug_test_${Date.now()}`
      const uploadedUrl = await uploadImageFromDataUrl(imageResult.imageUrl, fileName)
      
      console.log('🍌 Upload successful:', uploadedUrl)

      setResult({
        imageGeneration: imageResult,
        uploadedUrl,
        success: true
      })

    } catch (err) {
      console.error('🍌 Debug test failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setResult({
        success: false,
        error: err
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🍌 Nano-Banana Image Generation Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testImageGeneration}
            disabled={isGenerating}
            size="lg"
          >
            {isGenerating ? 'Testing...' : 'Test Image Generation + Upload'}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800">Error:</h3>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800">Test Results:</h3>
                <pre className="text-sm text-blue-600 mt-2 overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>

              {result.success && result.imageGeneration && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Generated Image (Base64):</h3>
                  <img 
                    src={result.imageGeneration.imageUrl} 
                    alt="Generated" 
                    className="max-w-md border rounded-lg"
                  />
                  
                  {result.uploadedUrl && (
                    <div>
                      <h3 className="font-semibold">Uploaded Image (Firebase):</h3>
                      <img 
                        src={result.uploadedUrl} 
                        alt="Uploaded" 
                        className="max-w-md border rounded-lg"
                      />
                      <p className="text-sm text-gray-600">URL: {result.uploadedUrl}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}