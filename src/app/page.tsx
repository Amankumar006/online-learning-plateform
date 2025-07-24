"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpenCheck, ArrowRight, Lightbulb, Bot, BrainCircuit, Wand2, Volume2, VolumeX, Target, Pencil, LineChart, User, GraduationCap, Star, Sparkles, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

// Floating Animation Component
const FloatingElement = ({ children, delay = 0, duration = 3 }: { children: React.ReactNode, delay?: number, duration?: number }) => (
  <div 
    className="absolute animate-bounce opacity-20 pointer-events-none"
    style={{ 
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`
    }}
  >
    {children}
  </div>
);

// Stats Component
const StatsSection = () => (
  <section className="w-full py-12 bg-gradient-to-r from-primary/5 to-accent/5">
    <div className="container px-4 md:px-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div className="space-y-2">
          <div className="text-3xl md:text-4xl font-bold text-primary">10K+</div>
          <div className="text-sm text-muted-foreground">Active Students</div>
        </div>
        <div className="space-y-2">
          <div className="text-3xl md:text-4xl font-bold text-primary">95%</div>
          <div className="text-sm text-muted-foreground">Success Rate</div>
        </div>
        <div className="space-y-2">
          <div className="text-3xl md:text-4xl font-bold text-primary">500+</div>
          <div className="text-sm text-muted-foreground">Educators</div>
        </div>
        <div className="space-y-2">
          <div className="text-3xl md:text-4xl font-bold text-primary">24/7</div>
          <div className="text-sm text-muted-foreground">AI Support</div>
        </div>
      </div>
    </div>
  </section>
);

// Main Hero Section Component
const HeroSection = () => {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };
  
  return (
  <section className="relative w-full py-20 md:py-24 lg:py-32 xl:py-40 overflow-hidden">
    {/* Floating Background Elements */}
    <FloatingElement delay={0} duration={4}>
      <Lightbulb className="h-8 w-8 text-primary top-20 left-10" />
    </FloatingElement>
    <FloatingElement delay={1} duration={5}>
      <Sparkles className="h-6 w-6 text-accent top-32 right-20" />
    </FloatingElement>
    <FloatingElement delay={2} duration={3.5}>
      <Zap className="h-7 w-7 text-primary bottom-32 left-20" />
    </FloatingElement>
    <FloatingElement delay={0.5} duration={4.5}>
      <Star className="h-5 w-5 text-accent bottom-20 right-32" />
    </FloatingElement>

    <div className="container px-4 md:px-6 relative z-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_600px]">
        <div className={`flex flex-col justify-center space-y-6 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary mb-4">
              <Sparkles className="h-4 w-4 mr-2" />
              Powered by Advanced AI
            </div>
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
                The Future of Learning
              </span>
              <br />
              is Personal & Adaptive.
            </h1>
            <p className="max-w-[600px] text-muted-foreground md:text-xl leading-relaxed">
              AdaptEd AI revolutionizes education by personalizing your learning journey. Our platform uses cutting-edge AI to generate tailored lessons, adaptive exercises, and provide 24/7 intelligent support.
            </p>
          </div>
          <div className="flex flex-col gap-4 min-[400px]:flex-row">
            <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <Link href="/signup">
                Get Started For Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="hover:bg-primary/5 transition-all duration-300">
              <Link href="#features">
                Explore Features
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-4 pt-4">
            <div className="flex -space-x-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-white text-xs font-bold border-2 border-background">
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              Join <span className="font-semibold text-primary">10,000+</span> learners already transforming their education
            </div>
          </div>
        </div>
        <div className={`relative mx-auto aspect-video overflow-hidden rounded-xl sm:w-full lg:order-last shadow-2xl transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            src="/video/adapted.mp4"
            autoPlay
            loop
            muted
            playsInline
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <Button
              size="icon"
              variant="outline"
              onClick={toggleMute}
              className="absolute bottom-4 right-4 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 hover:text-white border-white/20"
              aria-label={isMuted ? "Unmute video" : "Mute video"}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
        </div>
      </div>
    </div>
  </section>
)};

// Enhanced Feature Card Component
const FeatureCard = ({ icon, title, children, gradient }: { icon: React.ReactNode, title: string, children: React.ReactNode, gradient?: string }) => (
  <div className={`group relative overflow-hidden rounded-xl border bg-background/50 p-6 backdrop-blur-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 hover:scale-105 ${gradient}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="relative flex items-start gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary group-hover:scale-110 transition-transform duration-300 shadow-lg">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-bold font-headline group-hover:text-primary transition-colors duration-300">{title}</h3>
        <p className="mt-3 text-muted-foreground leading-relaxed">{children}</p>
      </div>
    </div>
    <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
  </div>
);

// Features Section Component
const FeaturesSection = () => (
  <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-secondary/30 to-background">
    <div className="container px-4 md:px-6">
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="space-y-4">
          <div className="inline-block rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 px-4 py-2 text-sm font-medium">
            ✨ Key Features
          </div>
          <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            A Smarter Way to Learn & Teach
          </h2>
          <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed leading-relaxed">
            Our platform is packed with AI-driven features designed to accelerate learning for students and streamline content creation for educators.
          </p>
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-2 mt-16">
        <FeatureCard title="Personalized Learning Paths" icon={<Lightbulb className="h-7 w-7" />}>
          Receive lessons and exercises dynamically generated to match your unique learning style, grade, and curriculum requirements. Our AI analyzes your progress and adapts content in real-time.
        </FeatureCard>
        <FeatureCard title="Your 24/7 AI Tutor" icon={<Bot className="h-7 w-7" />}>
          Never get stuck again. Chat with our intelligent AI assistant to get summaries, ask questions, and deepen your understanding of any topic with instant, personalized responses.
        </FeatureCard>
        <FeatureCard title="Mastery Through Practice" icon={<BrainCircuit className="h-7 w-7" />}>
          Practice with exercises that automatically adjust in difficulty based on your performance, ensuring you're always challenged but never overwhelmed. Build confidence through progressive mastery.
        </FeatureCard>
        <FeatureCard title="Effortless Content Creation" icon={<Wand2 className="h-7 w-7" />}>
          For educators and admins, generate entire courses—from lesson text to complex exercises—from a single topic prompt in minutes. Focus on teaching, not content preparation.
        </FeatureCard>
      </div>
    </div>
  </section>
);

// How It Works Section
const HowItWorksSection = () => {
  const steps = [
    {
      icon: <Target className="h-8 w-8 text-primary" />,
      title: "Set Your Goals",
      description: "Sign up and tell us about your learning objectives, interests, and preferred style. This helps our AI personalize your journey from day one."
    },
    {
      icon: <BookOpenCheck className="h-8 w-8 text-primary" />,
      title: "Explore Lessons",
      description: "Dive into a library of lessons dynamically generated by AI. Each lesson is broken down into manageable sections with clear explanations and examples."
    },
    {
      icon: <Pencil className="h-8 w-8 text-primary" />,
      title: "Practice & Master",
      description: "Solidify your knowledge with adaptive exercises. Our AI adjusts the difficulty based on your answers to keep you perfectly challenged."
    },
    {
      icon: <LineChart className="h-8 w-8 text-primary" />,
      title: "Track Your Progress",
      description: "Watch your mastery grow. Our detailed progress dashboard visualizes your strengths and areas for improvement, keeping you motivated."
    }
  ];

  return (
    <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">How It Works</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">A Simple Path to Mastery</h2>
          </div>
        </div>
        <div className="mx-auto grid gap-8 sm:grid-cols-2 lg:grid-cols-4 mt-12">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                {step.icon}
              </div>
              <h3 className="text-xl font-bold">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// For Everyone Section
const ForEveryoneSection = () => (
  <section className="w-full py-12 md:py-24 lg:py-32 bg-secondary/50">
    <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
      <div className="space-y-3">
        <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">Designed for Everyone</h2>
        <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
          Whether you're a student striving for excellence or an educator building the future, AdaptEd has tools for you.
        </p>
      </div>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 mt-8">
        <div className="rounded-lg border bg-background p-6 text-left">
          <div className="flex items-center gap-4 mb-4">
            <GraduationCap className="h-8 w-8 text-primary" />
            <h3 className="text-2xl font-bold">For Students</h3>
          </div>
          <ul className="space-y-2 text-muted-foreground list-disc pl-5">
            <li>Learn at your own pace with content tailored just for you.</li>
            <li>Get unstuck anytime with a 24/7 AI study buddy.</li>
            <li>Turn learning into a game with points and achievements.</li>
            <li>Visualize your progress and celebrate your successes.</li>
          </ul>
        </div>
        <div className="rounded-lg border bg-background p-6 text-left">
          <div className="flex items-center gap-4 mb-4">
            <User className="h-8 w-8 text-accent" />
            <h3 className="text-2xl font-bold">For Educators</h3>
          </div>
          <ul className="space-y-2 text-muted-foreground list-disc pl-5">
            <li>Generate entire lessons from a single topic in minutes.</li>
            <li>Create diverse sets of exercises without the manual effort.</li>
            <li>Monitor student progress with detailed analytics.</li>
            <li>Broadcast announcements and updates to all users instantly.</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
);


// Call to Action Section Component
const CallToActionSection = () => (
    <section className="w-full py-20 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
            <div className="rounded-2xl border bg-gradient-to-tr from-primary/10 to-accent/10 p-10 text-center shadow-lg">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Ready to Start Your Journey?</h2>
                <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl mt-4">
                    Sign up today and experience a revolutionary new way to learn.
                </p>
                <Button asChild size="lg" className="mt-6">
                    <Link href="/signup">
                        Sign Up Now
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </div>
    </section>
);

// Main Page Component
export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 flex h-16 items-center border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Link href="#" className="flex items-center justify-center gap-2">
          <BookOpenCheck className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold font-headline">AdaptEd AI</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 sm:gap-6">
          <ThemeToggle />
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </nav>
      </header>
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ForEveryoneSection />
        <CallToActionSection />
      </main>
      <footer className="flex items-center justify-center p-6 border-t">
        <p className="text-sm text-muted-foreground">&copy; 2024 AdaptEd AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
