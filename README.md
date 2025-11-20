# AdaptEd AI - Intelligent Learning Platform

  <img src="https://img.shields.io/badge/Next.js-15.3.3-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Firebase-11.9.1-orange?style=for-the-badge&logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Google_Gemini-2.0-4285F4?style=for-the-badge&logo=google" alt="Google Gemini" />
</div>

<div align="center">
  <h3>🚀 The Future of Learning is Personal & Adaptive</h3>
  <p>An AI-powered educational platform that personalizes learning journeys through adaptive content generation, intelligent tutoring, and semantic search capabilities.</p>
</div>

---

## 🌟 Key Features

### 🎯 **Personalized Learning Experience**
- **Adaptive Content Generation**: AI-powered lesson and exercise creation tailored to individual learning styles
- **Dynamic Difficulty Adjustment**: Real-time exercise difficulty adaptation based on performance
- **Progress Tracking**: Visual progress charts and mastery indicators
- **Personalized Dashboard**: Custom learning paths and achievement tracking

### 🤖 **AI-Powered Study Assistant (Buddy AI)**
- **24/7 Intelligent Tutoring**: Chat with AI for explanations, summaries, and concept clarification
- **Semantic Search**: Find content by meaning and context, not just keywords
- **Web Search Integration**: Perplexity-style search with comprehensive source citations
- **Multi-modal Support**: Text, image, and video content understanding

### 🎨 **Advanced AI Analysis**
- **Visual Problem Solving**: AI analyzes uploaded images and mathematical content
- **Comprehensive Mathematical Analysis**: Step-by-step solutions with detailed explanations
- **Smart Response Formatting**: Multi-section responses with formulas, calculations, and insights
- **Educational Context**: Detailed explanations of mathematical concepts and theorems
- **Multi-modal Support**: Text, image, and document understanding

### 📚 **Content Management System**
- **Lesson Builder**: Create interactive lessons with text, images, and multimedia
- **Exercise Generator**: AI-powered creation of MCQs, true/false, fill-in-the-blanks, and long-form questions
- **Content Library**: Organized repository of educational materials
- **Quality Assessment**: Automatic content quality scoring and optimization

### 👥 **Multi-Role Support**
- **Students**: Personalized learning paths, progress tracking, and AI tutoring
- **Educators**: Content creation tools, student analytics, and curriculum management
- **Administrators**: System management, user oversight, and platform analytics

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: Next.js 15.3.3 with App Router
- **Language**: TypeScript 5.0
- **Styling**: Tailwind CSS 3.4.1 with custom design system
- **UI Components**: Radix UI primitives with shadcn/ui

- **Animations**: Framer Motion for smooth interactions
- **Icons**: Lucide React icon library

### **Backend & AI**
- **AI Integration**: Custom Gemini API Integration (Genkit-compatible)
- **AI Model**: Google Gemini 2.0 Flash for advanced mathematical analysis

- **Visual Analysis**: SVG parsing and geometric shape recognition
- **Embeddings**: Google AI text-embedding-004
- **Vector Search**: Custom in-memory vector store with semantic search
- **Authentication**: Firebase Auth
- **Database**: Cloud Firestore with comprehensive security rules

### **Development & Deployment**
- **Build Tool**: Next.js with Turbopack
- **Deployment**: Netlify with Firebase hosting support
- **Package Manager**: npm
- **Code Quality**: ESLint, TypeScript strict mode
- **Styling**: PostCSS with Tailwind CSS

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project with Firestore and Authentication enabled
- Google AI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/adapted-ai.git
   cd adapted-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Google AI Configuration
   GOOGLE_API_KEY=your_google_ai_api_key
   
   # Google Search (Optional - for web search features)
   GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
   ```

4. **Firebase Setup**
   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools
   
   # Login to Firebase
   firebase login
   
   # Initialize Firebase (if not already done)
   firebase init
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```



The application will be available at `http://localhost:3000`.

### Quick Start with AI Features

1. **Navigate to Buddy AI**
   ```
   http://localhost:3000/dashboard/buddy-ai
   ```

2. **Chat with AI Tutor**
   - Ask questions about any subject
   - Get detailed explanations and step-by-step solutions
   - Upload images for visual problem solving

3. **Practice Exercises**
   - Go to `/dashboard/practice` for interactive exercises
   - Get AI-powered feedback and hints
   - Track your progress across different subjects

4. **Explore Lessons**
   - Browse comprehensive lessons at `/dashboard/lessons`
   - Each lesson includes AI-generated content and exercises
   - Ask questions like "Calculate area and perimeter"
   - Experiment with complex mathematical problems

## 📁 Project Structure

```
src/
├── ai/                     # AI Integration (Custom Gemini Layer)
│   ├── actions/           # AI action definitions
│   ├── core/              # Core AI functionality & Provider Logic
│   │   └── vector-store.ts # Semantic search implementation
│   ├── flows/             # AI workflow orchestration
│   ├── prompts/           # AI prompt templates
│   ├── schemas/           # Data validation schemas
│   ├── services/          # AI service layer
│   ├── tools/             # AI tools and utilities
│   │   └── buddy/         # Buddy AI tools
│   └── ai.ts             # AI service entry point
├── app/                   # Next.js App Router pages
│   ├── admin/            # Admin dashboard
│   ├── api/              # API routes
│   │   └── ai/           # AI analysis endpoints

│   ├── dashboard/        # Student dashboard

│   │   ├── lessons/      # Lesson pages
│   │   └── practice/     # Exercise pages
│   ├── login/            # Authentication pages
│   ├── signup/           
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Landing page
├── components/            # React components
│   ├── admin/            # Admin-specific components
│   ├── auth/             # Authentication components
│   ├── buddy-ai/         # AI chat interface

│   ├── common/           # Shared components
│   ├── dashboard/        # Dashboard components
│   ├── lessons/          # Lesson components
│   ├── practice/         # Exercise components
│   ├── progress/         # Progress tracking
│   └── ui/               # Base UI components (shadcn/ui)
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
│   ├── firebase.ts       # Firebase configuration
│   ├── types.ts          # TypeScript type definitions
│   └── utils.ts          # Utility functions
└── documentation.md       # Additional documentation
```

## 🔧 Configuration

### Firebase Security Rules
The project includes comprehensive Firestore security rules in `firestore.rules`:
- User data protection and validation
- Role-based access control (student/admin)
- Exercise and lesson content management
- Conversation memory and AI features security

### Tailwind CSS Theme
Custom design system with:
- **Primary Color**: Calming blue (#64B5F6) for focus and trust
- **Accent Color**: Warm orange (#FFB74D) for calls to action
- **Typography**: Inter font family for modern readability
- **Dark Mode**: Full dark mode support with theme toggle

### AI Configuration
- **Model**: Google Gemini 2.0 Flash for text generation and mathematical analysis

- **Visual Analysis**: SVG parsing for geometric shape analysis
- **Mathematical Engine**: Advanced problem-solving with step-by-step solutions
- **Embeddings**: text-embedding-004 for semantic search
- **Vector Store**: In-memory storage with 1000 vector limit
- **Fallback**: Hash-based embeddings for offline scenarios

## 🎨 AI Analysis Features

### **Visual Problem Solving**
The AI system provides powerful analysis capabilities for uploaded images and mathematical content.

### **Comprehensive Mathematical Analysis**
When you upload mathematical problems or images, the AI provides detailed analysis including:

#### **Problem Identification**
- Automatic recognition of geometric shapes and mathematical elements
- Identification of problem types (area calculation, perimeter, missing sides, etc.)
- Analysis of given measurements and annotations

#### **Mathematical Concepts & Formulas**
- Relevant formula identification and explanation
- Geometric theorem references (Pythagorean theorem, area formulas, etc.)
- Step-by-step formula applications

#### **Detailed Solutions**
- Complete mathematical work with intermediate steps
- Clear explanations for each calculation step
- Unit handling and conversions
- Verification of results

#### **Educational Insights**
- Concept explanations and broader mathematical context
- Alternative solution methods
- Real-world applications
- Related practice problem suggestions

### **Smart Response Formatting**
- **Multi-section Layout**: Responses are organized into clear sections
- **Mathematical Notation**: Proper formatting for formulas and calculations
- **Visual Positioning**: AI responses appear optimally positioned near selected shapes
- **Adaptive Length**: Long responses are split into multiple readable text boxes

### **Usage Modes**

#### **Full Analysis Mode**
Click "Full Analysis" for automatic comprehensive breakdown:
```
🤖 COMPREHENSIVE ANALYSIS

**Problem Identification:**
Rectangle with dimensions 10cm × 5cm

**Given Information:**
- Length = 10 cm
- Width = 5 cm

**Mathematical Concepts & Formulas:**
- Area = length × width
- Perimeter = 2(length + width)

**Detailed Step-by-Step Solution:**
1. Calculate area: 10 × 5 = 50 cm²
2. Calculate perimeter: 2(10 + 5) = 30 cm

**Final Answer:**
- Area = 50 cm²
- Perimeter = 30 cm
```

#### **Custom Query Mode**
Click "Ask" to pose specific questions:
- "Calculate the area and perimeter"
- "Find the missing side length"
- "Solve this step by step"
- "Explain the mathematical concepts"
- "Show all formulas used"
- "Verify this solution"

## 🎯 Usage Examples

### For Students
```typescript
// Access personalized dashboard
/dashboard

// Take adaptive exercises
/dashboard/lessons/[id]

// Use AI buddy for help
/dashboard/buddy-ai

// Chat with AI tutor
// Use Buddy AI chat interface for instant help
```

### AI Buddy Features
```typescript
// Chat with AI tutor for comprehensive help
/dashboard/buddy-ai

// Upload images and get instant analysis
// 1. Upload mathematical problems, diagrams, or any image
// 2. Ask specific questions about the content
// 3. Get detailed explanations and step-by-step solutions
// 4. Chat naturally with the AI tutor

// Example AI responses include:
// - Step-by-step problem solutions
// - Concept explanations and educational insights
// - Formula derivations and applications
// - Educational insights and related concepts
```

### For Educators
```typescript
// Create new lessons
/admin/lessons/create

// Generate exercises
/admin/exercises/create

// Monitor student progress
/admin/analytics
```

### AI Features
```typescript
// Semantic search
semanticSearch("JavaScript async programming", {
  contentTypes: ['lesson', 'web'],
  limit: 5
});

// Content indexing
indexContent({
  content: "React hooks tutorial...",
  title: "React Hooks Guide",
  contentType: "lesson"
});
```

## 🚀 Deployment

### Netlify Deployment
The project is configured for Netlify deployment with:
- Automatic builds from Git
- Next.js plugin integration
- Security headers configuration
- Environment variable management

```bash
# Build for production
npm run build

# Deploy to Netlify (automatic via Git integration)
```

### Firebase Hosting (Alternative)
```bash
# Build and deploy to Firebase
npm run build
firebase deploy
```

## 🧪 Development

### Available Scripts
```bash
# Development
npm run dev              # Start Next.js development server

# Production
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript type checking
```

## 🔒 Security Features

- **Firebase Authentication**: Secure user authentication and authorization
- **Firestore Security Rules**: Comprehensive data access control
- **Content Sanitization**: XSS protection and input validation
- **API Rate Limiting**: Protection against abuse
- **HTTPS Enforcement**: Secure data transmission
- **Environment Variables**: Secure configuration management

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests and linting**
   ```bash
   npm run lint
   npm run typecheck
   ```
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Use the existing component patterns
- Maintain consistent code formatting
- Add appropriate error handling
- Update documentation for new features

## 📊 Performance

### Key Metrics
- **Search Response Time**: <500ms for semantic search
- **Page Load Time**: <2s for initial load
- **AI Response Time**: <3s for content generation
- **AI Analysis**: <5s for comprehensive mathematical analysis
- **Shape Recognition**: Real-time SVG parsing and analysis
- **Vector Store**: Handles 1000+ indexed items efficiently

### Optimization Features
- **Next.js App Router**: Optimized routing and rendering
- **Image Optimization**: Automatic image optimization
- **Code Splitting**: Automatic bundle optimization
- **Caching**: Intelligent caching strategies
- **CDN**: Global content delivery via Netlify

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google AI**: For Gemini and embedding models
- **Firebase**: For backend infrastructure
- **Vercel**: For Next.js framework
- **Radix UI**: For accessible UI primitives
- **Tailwind CSS**: For utility-first styling
- **shadcn/ui**: For beautiful component library

## 📞 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Join community discussions
- **Email**: Contact the development team

---

<div align="center">
  <p><strong>Built with ❤️ for the future of education</strong></p>
  <p>© 2024 AdaptEd AI. All rights reserved.</p>
</div>