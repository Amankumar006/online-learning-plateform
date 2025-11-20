# Gemini API Usage Analysis - AdaptEdAI

## Overview
This document provides a comprehensive analysis of all Gemini API usage points in the AdaptEdAI application, identifying which endpoints use premium vs free tier models.

---

## 🔧 Configuration

### Main Configuration (`src/ai/genkit.ts`)
**Default Model**: `googleai/gemini-2.0-flash` (FREE - Experimental)
- Used as the base model for all flows unless overridden
- This is the latest flash model with multimodal capabilities
- **Cost**: FREE during preview period

---

## 📊 AI Flow Analysis

### 1. **Buddy Chat Flow** (`src/ai/flows/buddy-chat.ts`)
**Model Used**: Default (`gemini-2.0-flash`)
**Premium Status**: ❌ FREE
**Usage Pattern**:
- Main conversational AI for student interactions
- Handles: questions, file uploads, image analysis, web search
- Uses tools extensively
- Direct vision analysis for images

**Frequency**: HIGH (Every student chat interaction)
**Request Volume**: Very High - Most used feature

---

### 2. **Generate Exercise Flow** (`src/ai/flows/generate-exercise.ts`)
**Model Used**: Default (`gemini-2.0-flash`)
**Premium Status**: ❌ FREE
**Usage Pattern**:
- Generates MCQ, True/False, Long-Form, Fill-in-the-Blanks questions
- Uses structured prompts with schema validation
- Called when creating exercises from lessons

**Frequency**: MEDIUM (Per lesson creation + manual exercise generation)
**Request Volume**: Moderate

---

### 3. **Generate Lesson Content Flow** (`src/ai/flows/generate-lesson-content.ts`)
**Model Used**: Default (`gemini-2.0-flash`)
**Premium Status**: ❌ FREE
**Usage Pattern**:
- Creates full lesson content with sections, code blocks, images
- Personalized to grade level, curriculum, topic depth
- Markdown + LaTeX support

**Frequency**: MEDIUM (New lesson creation)
**Request Volume**: Moderate

---

### 4. **Generate Lesson Image Flow** (`src/ai/flows/generate-lesson-image.ts`)
**Models Used**:
- **Nano-banana mode**: `gemini-2.5-flash-image` (PREMIUM ⚠️)
- **Balanced mode**: `gemini-2.0-flash-preview-image-generation` (PREMIUM ⚠️)
- **Fallback**: `gemini-2.0-flash-preview-image-generation` (PREMIUM ⚠️)

**Premium Status**: ⚠️ **PREMIUM IMAGE GENERATION**
**Usage Pattern**:
- Native Gemini API for ultra-fast image generation
- Three speed modes: nano-banana (fastest), balanced, quality
- Educational diagrams, illustrations, visualizations

**Frequency**: MEDIUM (Per lesson image generation)
**Request Volume**: Moderate
**Cost Impact**: HIGH - Image generation is more expensive

---

### 5. **Grade Long Form Answer Flow** (`src/ai/flows/grade-long-form-answer.ts`)
**Model Used**: Default (`gemini-2.0-flash`)
**Premium Status**: ❌ FREE
**Usage Pattern**:
- Evaluates student answers (text + optional handwritten images)
- Vision capability for analyzing handwritten work
- Returns score, feedback, correctness

**Frequency**: HIGH (Per exercise submission)
**Request Volume**: High

---

### 6. **Generate Custom Exercise Flow** (`src/ai/flows/generate-custom-exercise.ts`)
**Model Used**: Default (`gemini-2.0-flash`)
**Premium Status**: ❌ FREE
**Usage Pattern**:
- Admin feature for creating single custom exercises
- Flexible question type selection
- Curriculum-aligned generation

**Frequency**: LOW (Admin use only)
**Request Volume**: Low

---

### 7. **Generate Follow-up Suggestions Flow** (`src/ai/flows/generate-follow-up-suggestions.ts`)
**Model Used**: Default (`gemini-2.0-flash`)
**Premium Status**: ❌ FREE
**Usage Pattern**:
- Generates 2-4 follow-up prompts after each AI response
- Helps guide student learning journey

**Frequency**: HIGH (After every buddy chat response)
**Request Volume**: Very High

---

### 8. **Generate Study Topics Flow** (`src/ai/flows/generate-study-topics.ts`)
**Model Used**: Default (`gemini-2.0-flash`)
**Premium Status**: ❌ FREE
**Usage Pattern**:
- Suggests study topics based on user progress and goals
- Personalized learning path recommendations

**Frequency**: LOW (Dashboard/profile views)
**Request Volume**: Low

---

### 9. **Quick Chat Flow** (`src/ai/flows/quick-chat.ts`)
**Model Used**: Default (`gemini-2.0-flash`)
**Premium Status**: ❌ FREE
**Usage Pattern**:
- Fast, stateless chat for AI Toolkit sidebar
- Concise answers without conversation context

**Frequency**: MEDIUM (Utility sidebar usage)
**Request Volume**: Moderate

---

### 10. **Generate Audio from Text Flow** (`src/ai/flows/generate-audio-from-text.ts`)
**Models Used**:
- Text processing: `gemini-2.0-flash` (FREE)
- Audio generation: `gemini-2.5-flash-preview-tts` (PREMIUM ⚠️)

**Premium Status**: ⚠️ **PREMIUM TTS GENERATION**
**Usage Pattern**:
- Converts lesson content to audio
- Makes text speakable, then generates audio
- Two-step process

**Frequency**: LOW (Optional accessibility feature)
**Request Volume**: Low to Medium
**Cost Impact**: MEDIUM - TTS can be expensive at scale

---

### 11. **Generate Proactive Suggestion Flow** (`src/ai/flows/generate-proactive-suggestion.ts`)
**Model Used**: Default (`gemini-2.0-flash`)
**Premium Status**: ❌ FREE
**Usage Pattern**:
- Generates proactive learning suggestions
- Context-aware recommendations

**Frequency**: LOW (Periodic suggestions)
**Request Volume**: Low

---

### 12. **Grade Math Solution Flow** (`src/ai/flows/grade-math-solution.ts`)
**Model Used**: Default (`gemini-2.0-flash`)
**Premium Status**: ❌ FREE
**Usage Pattern**:
- Evaluates mathematical solutions
- LaTeX support for equations
- Step-by-step feedback

**Frequency**: MEDIUM (Math exercise submissions)
**Request Volume**: Moderate

---

## 🛠️ Service Layer Analysis

### 1. **Code Analysis Service** (`src/ai/services/code-analysis.ts`)
**Model Used**: `googleai/gemini-1.5-flash` (FREE)
**Premium Status**: ❌ FREE
**Usage Pattern**:
- Analyzes code complexity
- Uses AI for complexity analysis with fallback to rule-based
- Called from buddy chat tool

**Frequency**: LOW (When analyzing code)
**Request Volume**: Low

---

### 2. **NLP Service** (`src/ai/services/nlp-service.ts`)
**Model Used**: `googleai/gemini-1.5-flash` (FREE)
**Premium Status**: ❌ FREE
**Usage Pattern**:
- Topic extraction
- Content analysis
- Intent classification
- Semantic similarity
- Uses AI with rule-based fallbacks

**Frequency**: MEDIUM (Enhanced buddy features)
**Request Volume**: Moderate

---

### 3. **Image Generation Service** (`src/ai/services/image-generation.ts`)
**Models Used**:
- Google AI: `googleai/imagen-3.0-generate-001` (PREMIUM ⚠️ - if used)
- OpenAI: `dall-e-3` (EXTERNAL PREMIUM ⚠️ - if configured)

**Premium Status**: ⚠️ **CONDITIONAL - NOT ACTIVELY USED**
**Note**: This service exists but appears to be replaced by `generate-lesson-image.ts`

---

## 🔍 Tool Usage Analysis

### Buddy AI Tools (`src/ai/tools/buddy/`)

#### 1. **Analysis Tool** (`analysis-tool.ts`)
- Uses Code Analysis Service
- Model: `gemini-1.5-flash` (FREE)

#### 2. **Exercise Tool** (`exercise-tool.ts`)
- No direct AI calls (uses flows)

#### 3. **File Analysis Tool** (`file-analysis-tool.ts`)
- Likely uses default model for file processing
- Model: `gemini-2.0-flash` (FREE)

#### 4. **Search Tool** (`search-tool.ts`)
- Web search - No direct AI model calls
- FREE

#### 5. **Semantic Search Tool** (`semantic-search-tool.ts`)
- Uses semantic search flow
- Model: Default `gemini-2.0-flash` (FREE)

#### 6. **Study Tool** (`study-tool.ts`)
- Uses study topics flow
- Model: `gemini-2.0-flash` (FREE)

#### 7. **Topic Extraction Tool** (`topic-extraction-tool.ts`)
- Uses NLP Service
- Model: `gemini-1.5-flash` (FREE)

#### 8. **Visual Tool** (`visual-tool.ts`)
- Uses image generation flow
- Model: `gemini-2.5-flash-image` (PREMIUM ⚠️)

---

## 💰 Cost Analysis Summary

### FREE Tier Usage (Most Features)
✅ **Models Used**:
- `gemini-2.0-flash` - Main conversational AI (FREE during preview)
- `gemini-1.5-flash` - Code analysis & NLP services (FREE)

✅ **Features on Free Tier**:
1. Buddy Chat conversations
2. Exercise generation
3. Lesson content creation
4. Answer grading (text + vision)
5. Custom exercise creation
6. Follow-up suggestions
7. Study topic suggestions
8. Quick chat
9. Code analysis
10. NLP features (topic extraction, intent classification)
11. Semantic search
12. Proactive suggestions
13. Math solution grading

**Volume**: ~95% of all AI requests

---

### PREMIUM Tier Usage (Limited Features)

⚠️ **Premium Models**:
1. **`gemini-2.5-flash-image`** - Ultra-fast image generation
2. **`gemini-2.0-flash-preview-image-generation`** - Standard image generation
3. **`gemini-2.5-flash-preview-tts`** - Text-to-speech audio generation

⚠️ **Features Using Premium**:
1. **Lesson Image Generation** (All modes)
   - Frequency: Medium
   - Cost Impact: HIGH
   - Used per lesson creation

2. **Audio Generation** (TTS)
   - Frequency: Low
   - Cost Impact: MEDIUM
   - Optional accessibility feature

**Volume**: ~5% of all AI requests
**Cost Impact**: HIGH (Image/Audio generation is expensive)

---

## 🎯 Recommendations

### 1. **Immediate Cost Optimization**

#### Option A: Make Image Generation Optional
```typescript
// Add user preference for images
- Allow users to skip image generation
- Offer placeholder images as alternative
- Generate images only on explicit request
```

#### Option B: Use External Free Image APIs
```typescript
// Replace Gemini image generation with:
- Unsplash API (free, limited)
- Pexels API (free)
- Placeholder services
- SVG generation for diagrams
```

#### Option C: Reduce Image Generation Quality
```typescript
// Current: nano-banana mode (fastest, but still premium)
// Alternative: Further compress or cache generated images
```

### 2. **Audio Generation Optimization**

#### Make TTS Completely Optional
```typescript
// Current: Available feature
// Recommendation: 
- Add user preference toggle
- Only generate on explicit user request
- Consider browser native Web Speech API as free alternative
```

### 3. **Caching Strategy**

#### Cache Premium Content
```typescript
// Implement aggressive caching for:
- Generated images (store in Firebase Storage)
- Generated audio (store in Firebase Storage)
- Reuse similar content across lessons
```

### 4. **Feature Flags**

```typescript
// Add environment-based feature flags
const PREMIUM_FEATURES = {
  imageGeneration: process.env.ENABLE_IMAGE_GEN === 'true',
  audioGeneration: process.env.ENABLE_AUDIO_GEN === 'true',
  imageQuality: process.env.IMAGE_QUALITY || 'standard'
}
```

---

## 📈 Usage Patterns

### High Frequency (80% of requests)
1. Buddy Chat (every interaction)
2. Follow-up suggestions (after each chat)
3. Answer grading (student submissions)

### Medium Frequency (15% of requests)
4. Exercise generation (per lesson)
5. Lesson content generation (new lessons)
6. Image generation (per lesson) ⚠️ PREMIUM
7. Quick chat (utility sidebar)

### Low Frequency (5% of requests)
8. Study topics (occasional)
9. Custom exercises (admin only)
10. Audio generation (optional) ⚠️ PREMIUM
11. Code analysis (when needed)

---

## 🚨 High-Impact Premium Usage

### 1. **Image Generation** 
- **Model**: `gemini-2.5-flash-image` / `gemini-2.0-flash-preview-image-generation`
- **Cost**: HIGH per request
- **Frequency**: Medium
- **Annual Impact**: SIGNIFICANT

**Cost Calculation Example**:
- If 100 lessons created/day
- 1 image per lesson
- ~$0.01-0.05 per image (estimated)
- **Daily**: $1-5
- **Monthly**: $30-150
- **Annual**: $360-1,800

### 2. **Audio Generation**
- **Model**: `gemini-2.5-flash-preview-tts`
- **Cost**: MEDIUM per request
- **Frequency**: Low (currently)
- **Annual Impact**: MODERATE

---

## ✅ Action Items

### Immediate (Week 1)
1. ✅ Document all usage points (COMPLETE)
2. Add usage logging/monitoring
3. Implement feature flags for premium features
4. Add user preferences for image/audio

### Short-term (Month 1)
1. Implement image caching in Firebase Storage
2. Add free image API alternatives
3. Make TTS completely optional
4. Add usage analytics dashboard

### Long-term (Quarter 1)
1. Implement intelligent caching
2. Consider CDN for generated assets
3. Optimize image generation prompts
4. Explore batch processing for premium features

---

## 📝 Notes

1. **Gemini 2.0 Flash Preview**: Currently free, but may change after preview period
2. **Image Generation**: Most expensive feature - consider alternatives
3. **Vision Capabilities**: Gemini 2.0 Flash includes vision for FREE
4. **Tool Usage**: Most tools use free models via default configuration
5. **Fallback Strategy**: Many services have rule-based fallbacks (good for cost control)

---

## 🔗 Related Files

- Main config: `src/ai/genkit.ts`
- All flows: `src/ai/flows/*.ts`
- Services: `src/ai/services/*.ts`
- Tools: `src/ai/tools/buddy/*.ts`
- Environment: `.env` (API keys)

---

**Last Updated**: November 18, 2025
**Analysis Version**: 1.0
**Next Review**: Check when Gemini 2.0 Flash exits preview period
