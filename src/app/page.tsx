"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen, ArrowRight, Circle, Square, Triangle,
  ChevronDown, Code, Calculator, Terminal, Edit3
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
// Test components removed for production

// Minimal Japanese-style Navigation
const Navigation = () => (
  <nav className="fixed top-0 w-full bg-background/95 backdrop-blur-sm z-50 border-b border-border">
    <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-3">
        <div className="w-10 h-10 bg-foreground rounded-sm flex items-center justify-center">
          <BookOpen className="h-6 w-6 text-background" />
        </div>
        <span className="text-2xl font-light tracking-wide text-foreground">AdaptEd</span>
      </Link>

      <div className="hidden md:flex items-center gap-12 text-muted-foreground font-light">
        <Link href="#philosophy" className="hover:text-foreground transition-colors tracking-wide">Philosophy</Link>
        <Link href="#experience" className="hover:text-foreground transition-colors tracking-wide">Experience</Link>
        <Link href="#harmony" className="hover:text-foreground transition-colors tracking-wide">Harmony</Link>
      </div>

      <div className="flex items-center gap-6">
        <ThemeToggle />
        <Link href="/login" className="text-muted-foreground hover:text-foreground font-light tracking-wide">Sign In</Link>
        <Link href="/signup" className="bg-primary text-primary-foreground px-8 py-3 hover:bg-primary/90 transition-colors font-light tracking-wide">
          Get Started
        </Link>
      </div>
    </div>
  </nav>
);

// Hero Section - Japanese Zen Style
const HeroSection = () => {
  const [currentConcept, setCurrentConcept] = useState(0);
  const concepts = ["Learn", "Grow", "Excel", "Achieve"];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentConcept((prev) => (prev + 1) % concepts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="pt-32 pb-20 bg-background">
      <div className="max-w-7xl mx-auto px-8">

        {/* Zen-style centered layout */}
        <div className="text-center mb-20">
          <div className="mb-12">
            <div className="inline-block border border-border px-6 py-2 text-sm font-light tracking-widest text-muted-foreground mb-8">
              THE FUTURE OF LEARNING
            </div>

            <h1 className="text-7xl md:text-9xl font-extralight leading-none mb-8 text-foreground">
              <span className="block mb-4">Wisdom</span>
              <span className="block relative h-32 overflow-hidden">
                {concepts.map((concept, index) => (
                  <span
                    key={concept}
                    className={`absolute inset-0 transition-all duration-1000 ${index === currentConcept
                      ? 'opacity-100 transform translate-y-0'
                      : 'opacity-0 transform translate-y-full'
                      }`}
                  >
                    {concept}
                  </span>
                ))}
              </span>
            </h1>
          </div>

          <div className="max-w-2xl mx-auto mb-16">
            <p className="text-xl font-light leading-relaxed text-muted-foreground tracking-wide">
              Discover the art of personalized learning through AI that understands your unique path to knowledge.
              <br />
              <span className="text-foreground font-normal">Simple. Elegant. Effective.</span>
            </p>
          </div>

          <div className="flex justify-center mb-12">
            <Link href="/signup" className="group inline-flex items-center justify-center bg-primary text-primary-foreground px-12 py-4 text-lg font-light tracking-wide hover:bg-primary/90 transition-all duration-300">
              Begin Journey
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Scroll indicator */}
          <div className="flex justify-center mb-20">
            <div className="animate-bounce">
              <ChevronDown className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>

          {/* Minimalist stats */}
          <div className="flex justify-center gap-16 text-center">
            <div>
              <div className="text-4xl font-light text-foreground mb-2">10,000</div>
              <div className="text-sm font-light tracking-widest text-muted-foreground uppercase">Students</div>
            </div>
            <div className="w-px bg-border"></div>
            <div>
              <div className="text-4xl font-light text-foreground mb-2">95%</div>
              <div className="text-sm font-light tracking-widest text-muted-foreground uppercase">Success</div>
            </div>
            <div className="w-px bg-border"></div>
            <div>
              <div className="text-4xl font-light text-foreground mb-2">∞</div>
              <div className="text-sm font-light tracking-widest text-muted-foreground uppercase">Potential</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Philosophy Section - Zen Layout
const PhilosophySection = () => (
  <section id="philosophy" className="py-32 bg-secondary">
    <div className="max-w-7xl mx-auto px-8">

      {/* Centered philosophy header */}
      <div className="text-center mb-24">
        <div className="inline-block border border-border px-6 py-2 text-sm font-light tracking-widest text-muted-foreground mb-8">
          OUR PHILOSOPHY
        </div>
        <h2 className="text-5xl md:text-6xl font-extralight text-foreground mb-8 leading-tight">
          Learning is a journey,
          <br />
          not a destination
        </h2>
      </div>

      {/* Vertical rhythm layout */}
      <div className="space-y-32">

        {/* Principle 1 */}
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Circle className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-light tracking-widest text-muted-foreground uppercase">Personalization</span>
            </div>
            <h3 className="text-4xl font-light text-foreground leading-tight">
              Every mind learns differently
            </h3>
            <p className="text-lg font-light leading-relaxed text-muted-foreground">
              Our AI observes, understands, and adapts to your unique learning patterns.
              Like a master teacher, it knows when to challenge and when to support.
            </p>
          </div>
          <div className="bg-card p-12 border border-border">
            <div className="space-y-6">
              <div className="h-2 bg-muted rounded">
                <div className="h-2 bg-primary rounded w-3/4"></div>
              </div>
              <div className="text-sm font-light text-muted-foreground">Adapting to your pace...</div>
            </div>
          </div>
        </div>

        {/* Principle 2 */}
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="lg:order-2 space-y-8">
            <div className="flex items-center gap-4">
              <Square className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-light tracking-widest text-muted-foreground uppercase">Simplicity</span>
            </div>
            <h3 className="text-4xl font-light text-foreground leading-tight">
              Complexity made simple
            </h3>
            <p className="text-lg font-light leading-relaxed text-muted-foreground">
              We believe in the power of clarity. Complex concepts become clear through
              thoughtful explanation and patient guidance.
            </p>
          </div>
          <div className="lg:order-1 bg-card p-12 border border-border">
            <div className="text-center space-y-4">
              <div className="text-6xl font-light text-muted">?</div>
              <div className="text-sm font-light text-muted-foreground">Question becomes understanding</div>
            </div>
          </div>
        </div>

        {/* Principle 3 */}
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Triangle className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-light tracking-widest text-muted-foreground uppercase">Growth</span>
            </div>
            <h3 className="text-4xl font-light text-foreground leading-tight">
              Progress through practice
            </h3>
            <p className="text-lg font-light leading-relaxed text-muted-foreground">
              Like the steady growth of bamboo, learning happens gradually, then suddenly.
              We celebrate each small step forward.
            </p>
          </div>
          <div className="bg-card p-12 border border-border">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-light text-muted-foreground">Today</span>
                <span className="text-sm font-light text-foreground">+5%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-light text-muted-foreground">This Week</span>
                <span className="text-sm font-light text-foreground">+23%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-light text-muted-foreground">This Month</span>
                <span className="text-sm font-light text-foreground">+67%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// Visual Tools Section
const VisualToolsSection = () => {
  const [activeTool, setActiveTool] = useState(0);

  const tools = [
    {
      id: 0,
      title: "Code IDE",
      description: "Write, run, and debug code",
      icon: <Code className="h-6 w-6" />,
      color: "blue",
      preview: {
        type: "code",
        content: `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Test the function
print(fibonacci(10))  # Output: 55`
      }
    },
    {
      id: 1,
      title: "LaTeX Math Board",
      description: "Beautiful mathematical expressions",
      icon: <Calculator className="h-6 w-6" />,
      color: "green",
      preview: {
        type: "latex",
        content: "\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}"
      }
    }
  ];

  return (
    <section className="py-32 bg-white">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-24">
          <div className="inline-block border border-gray-300 px-6 py-2 text-sm font-light tracking-widest text-gray-600 mb-8">
            VISUAL LEARNING TOOLS
          </div>
          <h2 className="text-5xl md:text-6xl font-extralight text-gray-900 mb-8 leading-tight">
            Learn by doing,
            <br />
            create by thinking
          </h2>
          <p className="text-xl font-light leading-relaxed text-gray-700 max-w-3xl mx-auto">
            Powerful visual tools that make complex concepts tangible and interactive.
          </p>
        </div>

        {/* Tool Navigation */}
        <div className="flex justify-center mb-16">
          <div className="flex gap-2 p-2 bg-gray-50 rounded-lg">
            {tools.map((tool, index) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(index)}
                className={`flex items-center gap-3 px-6 py-3 rounded-md transition-all duration-300 ${activeTool === index
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                {tool.icon}
                <span className="font-light">{tool.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tool Preview */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
            {/* Tool Header */}
            <div className="bg-gray-800 px-6 py-4 flex items-center gap-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex items-center gap-2 text-gray-300 font-light">
                {tools[activeTool].icon}
                <span>{tools[activeTool].title}</span>
              </div>
            </div>

            {/* Tool Content */}
            <div className="p-8 min-h-96">
              {tools[activeTool].preview.type === 'code' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm font-light">
                    <Terminal className="h-4 w-4" />
                    <span>Python Interactive Environment</span>
                  </div>
                  <pre className="text-green-400 font-mono text-sm leading-relaxed">
                    {tools[activeTool].preview.content}
                  </pre>
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Ready for input...</span>
                  </div>
                </div>
              )}

              {tools[activeTool].preview.type === 'latex' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-gray-400 text-sm font-light">
                    <Edit3 className="h-4 w-4" />
                    <span>LaTeX Math Editor</span>
                  </div>
                  <div className="bg-white rounded-lg p-8 text-center">
                    <div className="text-4xl text-gray-900 font-light mb-4">
                      ∫<sub>-∞</sub><sup>∞</sup> e<sup>-x²</sup> dx = √π
                    </div>
                    <div className="text-sm text-gray-500 font-light">
                      Rendered mathematical expression
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm font-mono">
                    {tools[activeTool].preview.content}
                  </div>
                </div>
              )}


            </div>
          </div>

          {/* Tool Description */}
          <div className="text-center mt-12">
            <h3 className="text-2xl font-light text-gray-900 mb-4">
              {tools[activeTool].title}
            </h3>
            <p className="text-lg font-light text-gray-600 max-w-2xl mx-auto">
              {tools[activeTool].description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

// Interactive Demo Section
const InteractiveDemoSection = () => {
  const [activeDemo, setActiveDemo] = useState(0);
  const demos = [
    {
      title: "Ask Any Question",
      description: "Natural conversation with AI",
      preview: "How do I solve quadratic equations?"
    },
    {
      title: "Get Instant Help",
      description: "Immediate, personalized responses",
      preview: "Let me break this down step by step..."
    },
    {
      title: "Track Progress",
      description: "Visual learning analytics",
      preview: "Mathematics: 78% → 85% this week"
    }
  ];

  return (
    <section className="py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-24">
          <div className="inline-block border border-gray-300 px-6 py-2 text-sm font-light tracking-widest text-gray-600 mb-8">
            INTERACTIVE EXPERIENCE
          </div>
          <h2 className="text-5xl md:text-6xl font-extralight text-gray-900 mb-8 leading-tight">
            See it in action
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            {demos.map((demo, index) => (
              <div
                key={index}
                className={`p-6 cursor-pointer transition-all duration-300 ${activeDemo === index
                  ? 'bg-white border border-gray-200 shadow-lg'
                  : 'hover:bg-white/50'
                  }`}
                onClick={() => setActiveDemo(index)}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-8 h-8 border-2 flex items-center justify-center text-sm font-light ${activeDemo === index ? 'border-black bg-black text-white' : 'border-gray-300'
                    }`}>
                    {index + 1}
                  </div>
                  <span className="text-sm font-light tracking-widest text-gray-500 uppercase">{demo.description}</span>
                </div>
                <h3 className="text-2xl font-light text-gray-900 mb-2">{demo.title}</h3>
              </div>
            ))}
          </div>

          <div className="bg-white p-12 border border-gray-200 min-h-96 flex items-center justify-center">
            <div className="text-center space-y-6">
              <div className="text-lg font-light text-gray-700">
                "{demos[activeDemo].preview}"
              </div>
              <div className="w-2 h-2 bg-black animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Experience Section - Clean testimonials
const ExperienceSection = () => (
  <section id="experience" className="py-32 bg-white">
    <div className="max-w-7xl mx-auto px-8">

      <div className="text-center mb-24">
        <div className="inline-block border border-gray-300 px-6 py-2 text-sm font-light tracking-widest text-gray-600 mb-8">
          STUDENT EXPERIENCE
        </div>
        <h2 className="text-5xl md:text-6xl font-extralight text-gray-900 mb-8 leading-tight">
          Voices of transformation
        </h2>
      </div>

      {/* Clean testimonial layout */}
      <div className="space-y-20">

        {/* Featured testimonial */}
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <div className="text-6xl font-light text-gray-200 mb-6">"</div>
            <p className="text-2xl font-light leading-relaxed text-gray-800">
              AdaptEd transformed my relationship with mathematics. What once felt impossible
              now feels like a gentle conversation with a wise teacher.
            </p>
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 bg-gray-900 text-white flex items-center justify-center text-sm font-light">
              SC
            </div>
            <div className="text-left">
              <div className="font-light text-gray-900">Sarah Chen</div>
              <div className="text-sm font-light text-gray-500">Mathematics • Grade A-</div>
            </div>
          </div>
        </div>

        {/* Grid testimonials */}
        <div className="grid md:grid-cols-2 gap-16 max-w-5xl mx-auto">
          <div className="space-y-6">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-gray-900"></div>
              ))}
            </div>
            <p className="text-lg font-light leading-relaxed text-gray-700">
              "The AI understands my learning style better than I do.
              It's like having a patient mentor available 24/7."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-900 text-white flex items-center justify-center text-xs font-light">
                MJ
              </div>
              <div>
                <div className="text-sm font-light text-gray-900">Marcus Johnson</div>
                <div className="text-xs font-light text-gray-500">Physics Student</div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-gray-900"></div>
              ))}
            </div>
            <p className="text-lg font-light leading-relaxed text-gray-700">
              "Learning became joyful again. I actually look forward
              to my study sessions now."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-900 text-white flex items-center justify-center text-xs font-light">
                ER
              </div>
              <div>
                <div className="text-sm font-light text-gray-900">Emma Rodriguez</div>
                <div className="text-xs font-light text-gray-500">High School</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// Harmony Section - Call to Action
const HarmonySection = () => (
  <section id="harmony" className="py-32 bg-gray-900 text-white">
    <div className="max-w-4xl mx-auto px-8 text-center">

      <div className="mb-12">
        <div className="inline-block border border-gray-600 px-6 py-2 text-sm font-light tracking-widest text-gray-400 mb-8">
          FIND YOUR HARMONY
        </div>
        <h2 className="text-5xl md:text-6xl font-extralight leading-tight mb-8">
          Begin your journey
          <br />
          to mastery
        </h2>
        <p className="text-xl font-light leading-relaxed text-gray-300 max-w-2xl mx-auto">
          Join thousands of students who have discovered the art of effortless learning
          through personalized AI guidance.
        </p>
      </div>

      <Link href="/signup" className="inline-block bg-white text-gray-900 px-12 py-4 text-lg font-light tracking-wide hover:bg-gray-100 transition-colors mb-12">
        Start Your Practice
      </Link>

      <div className="flex justify-center gap-12 text-sm font-light text-gray-400">
        <span>Free</span>
        <span>Instant</span>
        <span>Simple</span>
      </div>
    </div>
  </section>
);

// Test section removed for production

// Minimal Footer
const Footer = () => (
  <footer className="bg-white border-t border-gray-100 py-12">
    <div className="max-w-7xl mx-auto px-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-light tracking-wide text-gray-900">AdaptEd</span>
        </div>

        <div className="flex gap-12 text-gray-600 font-light">
          <Link href="/about" className="hover:text-black transition-colors">About</Link>
          <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
          <Link href="/contact" className="hover:text-black transition-colors">Contact</Link>
        </div>
      </div>

      <div className="border-t border-gray-100 mt-8 pt-8 text-center text-gray-500 font-light text-sm">
        <p>© 2024 AdaptEd AI • Made with respect for learning</p>
      </div>
    </div>
  </footer>
);

// Floating Help Button
const FloatingHelp = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`fixed bottom-8 right-8 z-40 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
      <Link href="/signup" className="group flex items-center gap-3 bg-black text-white px-6 py-4 hover:bg-gray-800 transition-colors shadow-lg">
        <span className="font-light tracking-wide">Try Now</span>
        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
};

// Progress Indicator
const ProgressIndicator = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-1 bg-gray-100 z-50">
      <div
        className="h-full bg-black transition-all duration-150"
        style={{ width: `${scrollProgress}%` }}
      />
    </div>
  );
};

// Main Component
export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <ProgressIndicator />
      <Navigation />
      <main>
        <HeroSection />
        <PhilosophySection />
        <VisualToolsSection />
        <InteractiveDemoSection />
        <ExperienceSection />
        <HarmonySection />
      </main>
      <Footer />
      <FloatingHelp />
    </div>
  );
}