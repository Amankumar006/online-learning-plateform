"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { BookOpenCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

export default function Home() {
  const navContainerRef = useRef<HTMLDivElement>(null);
  const [highlighterStyle, setHighlighterStyle] = useState({ opacity: 0 });

  const updateHighlighter = (element: HTMLElement | null) => {
    if (!element || !navContainerRef.current) {
        setHighlighterStyle({ opacity: 0 });
        return;
    }
    
    setHighlighterStyle({
      width: `${element.offsetWidth}px`,
      transform: `translateX(${element.offsetLeft}px)`,
      opacity: 1,
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 flex h-16 items-center border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Link href="#" className="flex items-center justify-center gap-2">
          <BookOpenCheck className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold font-headline">AdaptEd AI</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 sm:gap-6">
          <ThemeToggle />
          <div 
            ref={navContainerRef}
            className="relative hidden items-center rounded-full bg-background/30 p-1 md:flex backdrop-blur-lg border border-black/10 dark:border-white/10 shadow-inner"
            onMouseLeave={() => updateHighlighter(null)}
          >
            <div
              className="absolute h-[calc(100%-8px)] rounded-full bg-gradient-to-br from-white/50 to-white/20 dark:from-white/20 dark:to-white/5 border border-white/30 dark:border-white/10 shadow-md backdrop-blur-sm transition-all duration-300 ease-in-out"
              style={highlighterStyle}
            />
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={cn(
                "relative z-10 rounded-full transition-colors",
                "text-muted-foreground hover:text-foreground"
              )}
              onMouseEnter={(e) => updateHighlighter(e.currentTarget)}
            >
              <Link href="/login">Login</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={cn(
                "relative z-10 rounded-full transition-colors",
                "text-muted-foreground hover:text-foreground"
              )}
              onMouseEnter={(e) => updateHighlighter(e.currentTarget)}
            >
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
           <div className="flex items-center gap-2 md:hidden">
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
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                    The Future of Learning is Adaptive
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    AdaptEd AI personalizes your learning journey with AI-powered lessons and exercises that adjust to your pace.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="/signup">Get Started</Link>
                  </Button>
                  <Button asChild variant="secondary" size="lg">
                    <Link href="#features">Learn More</Link>
                  </Button>
                </div>
              </div>
              <Image
                src="/images/adapted.png"
                width="600"
                height="400"
                alt="A student using a futuristic learning interface"
                data-ai-hint="education learning"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
              />
            </div>
          </div>
        </section>
      </main>
      <footer className="flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">&copy; 2024 AdaptEd AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
