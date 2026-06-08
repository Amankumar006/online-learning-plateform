# AdaptED-LMS

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15.3.3-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Firebase-11.9.1-orange?style=for-the-badge&logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Google_AI-Genkit-4285F4?style=for-the-badge&logo=google" alt="Google AI" />
</div>

<div align="center">
  <h3>🚀 Adaptive Learning Management System</h3>
  <p>Adaptive Learning Management System with personalized learning paths and AI-powered content recommendations.</p>
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
- **AI Framework**: Google Genkit 1.13.0
- **AI Model**: Google Gemini 2.0 Flash
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

6. **Start AI Development Server** (Optional)
   ```bash
   npm run genkit:dev
   ```

The application will be available at `http://localhost:3000`.

## 📁 Project Structure

```
src/
├── ai/                     # AI and Genkit integration
│   ├── actions/           # AI action definitions
│   ├── core/              # Core AI functionality
│   │   └── vector-store.ts # Semantic search implementation
│   ├── flows/             # AI workflow orchestration
│   ├── prompts/           # AI prompt templates
│   ├── schemas/           # Data validation schemas
│   ├── services/          # AI service layer
│   ├── tools/             # AI tools and utilities
│   │   └── buddy/         # Buddy AI tools
│   ├── dev.ts            # AI development server
│   └── genkit.ts         # Genkit configuration
├── app/                   # Next.js App Router pages
│   ├── admin/            # Admin dashboard
│   ├── dashboard/        # Student dashboard
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
- **Model**: Google Gemini 2.0 Flash for text generation
- **Embeddings**: text-embedding-004 for semantic search
- **Vector Store**: In-memory storage with 1000 vector limit
- **Fallback**: Hash-based embeddings for offline scenarios

## 🎯 Usage Examples

### For Students
```typescript
// Access personalized dashboard
/dashboard

// Take adaptive exercises
/dashboard/lessons/[id]

// Chat with AI tutor
// Use Buddy AI chat interface for instant help
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
npm run genkit:dev       # Start AI development server
npm run genkit:watch     # Start AI server with file watching

# Production
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript type checking
```

### AI Development
The project includes a dedicated AI development environment:
```bash
# Start Genkit development server
npm run genkit:dev

# Access Genkit UI at http://localhost:4000
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