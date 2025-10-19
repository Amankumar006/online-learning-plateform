# Lesson Content Editor

A Medium-style inline editor for creating and editing lesson content with drag-and-drop functionality.

## Features

### 🎨 **Medium-Style Inline Editing**
- Click any content block to edit inline
- Rich text formatting toolbar with Markdown support
- Auto-focus and keyboard shortcuts for smooth editing
- Real-time preview of formatted content

### 🔄 **Drag & Drop Reordering**
- Drag sections to reorder lesson structure
- Drag blocks within sections to reorganize content
- Visual feedback during drag operations
- Smooth animations and transitions

### 📝 **Block Types**
- **Text Blocks**: Rich text with Markdown formatting, LaTeX math support
- **Image Blocks**: Images with URL/upload support, alt text, captions, and AI generation
- **Code Blocks**: Syntax-highlighted code with language selection
- **Video Blocks**: Embed videos from URLs

### ⌨️ **Keyboard Shortcuts**
- `⌘ + Enter` / `Ctrl + Enter`: Save changes
- `Escape`: Cancel editing
- `Enter`: Save (for single-line inputs)

### 🎯 **Formatting Tools**
- **Bold**: `**text**` or toolbar button
- **Italic**: `*text*` or toolbar button
- **Links**: `[text](url)` or toolbar button
- **Lists**: `- item` or `1. item` or toolbar buttons
- **LaTeX**: `$equation$` for inline math

### 🤖 **AI Features**
- **Smart Image Generation**: AI creates contextual images based on section content
- **Context-Aware Prompts**: Uses section title, alt text, and captions for better results
- **Automatic Upload**: Generated images are automatically uploaded and inserted
- **Intelligent Descriptions**: AI suggests alt text and captions

## Usage

```tsx
import { LessonContentEditor } from '@/components/admin/lesson-editor'

function MyComponent() {
  const [sections, setSections] = useState<Section[]>([
    {
      title: "Introduction to React",
      blocks: [
        {
          type: "text",
          content: "React is a **powerful** JavaScript library for building user interfaces."
        },
        {
          type: "image",
          url: "https://example.com/react-logo.png",
          alt: "React logo",
          caption: "The React logo represents the component-based architecture"
        },
        {
          type: "code",
          language: "javascript",
          code: "function Welcome(props) {\n  return <h1>Hello, {props.name}!</h1>;\n}"
        }
      ]
    }
  ])
  
  return (
    <LessonContentEditor
      sections={sections}
      onChange={setSections}
      disabled={false}
    />
  )
}
```

## Props

### LessonContentEditor

| Prop | Type | Description |
|------|------|-------------|
| `sections` | `Section[]` | Array of lesson sections |
| `onChange` | `(sections: Section[]) => void` | Callback when content changes |
| `disabled` | `boolean` | Disable editing (read-only mode) |

### Section Structure

```typescript
interface Section {
  title: string
  blocks: Block[]
  audioUrl?: string
}

type Block = TextBlock | CodeBlock | VideoBlock

interface TextBlock {
  type: 'text'
  content: string
}

interface ImageBlock {
  type: 'image'
  url: string
  alt?: string
  caption?: string
}

interface CodeBlock {
  type: 'code'
  language: string
  code: string
}

interface VideoBlock {
  type: 'video'
  url: string
}
```

## Styling

The editor uses CSS custom properties for theming and includes:
- Smooth transitions and animations
- Drag feedback with rotation and scaling
- Hover states and focus indicators
- Responsive design for mobile and desktop
- AI generation progress indicators
- Contextual loading states

## AI Image Generation

The image block includes intelligent AI generation that creates contextual images:

### How It Works
1. **Context Analysis**: AI analyzes the section title, existing content, alt text, and captions
2. **Smart Prompting**: Creates an educational-focused prompt automatically
3. **Image Generation**: Uses advanced AI to create relevant illustrations
4. **Auto Upload**: Seamlessly uploads and inserts the generated image
5. **Metadata Enhancement**: Suggests improved alt text and captions

### Best Practices for AI Generation
- Add descriptive alt text before generating (helps AI understand what you want)
- Include a caption describing the desired image content
- Use clear, educational section titles
- The AI works best with concrete concepts rather than abstract ideas

### Example Workflow
```
Section: "Photosynthesis Process"
Alt Text: "diagram showing sunlight, water, and CO2 converting to glucose"
Caption: "The basic inputs and outputs of photosynthesis"
→ AI generates: Educational diagram of photosynthesis with labeled components
```

## Accessibility

- Full keyboard navigation support
- Screen reader friendly with proper ARIA labels
- Focus management during editing
- High contrast mode support

## Performance

- Optimized re-renders with React.memo and useCallback
- Efficient drag and drop with @hello-pangea/dnd
- Lazy loading of heavy components
- Debounced auto-save (when implemented)