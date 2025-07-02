
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpenCheck,
  LayoutGrid,
  BookCopy,
  BrainCircuit,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import React, { useState, useEffect, useRef } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getUser } from "@/lib/data";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<{ name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const navContainerRef = useRef<HTMLDivElement>(null);
  const [highlighterStyle, setHighlighterStyle] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const profile = await getUser(currentUser.uid);
        setUserProfile(profile);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
    { href: "/dashboard/lessons", label: "Lessons", icon: BookCopy },
    { href: "/dashboard/practice", label: "Practice", icon: BrainCircuit },
    { href: "/dashboard/progress", label: "Progress", icon: TrendingUp },
  ];
  
  useEffect(() => {
    if (isLoading || !navContainerRef.current) return;

    const activeIndex = navItems.findIndex((item) => pathname === item.href);
    const activeLinkEl = navContainerRef.current.children[activeIndex] as HTMLElement | undefined;

    if (activeLinkEl) {
      setHighlighterStyle({
        width: `${activeLinkEl.offsetWidth}px`,
        transform: `translateX(${activeLinkEl.offsetLeft}px)`,
        opacity: 1,
      });
    } else {
      setHighlighterStyle({ opacity: 0, transform: highlighterStyle.transform });
    }
  }, [pathname, isLoading, navItems]);


  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  if (isLoading) {
    return (
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <BookOpenCheck className="h-6 w-6 text-primary" />
          <span className="font-bold font-headline">AdaptEd AI</span>
        </Link>
        <Loader2 className="h-6 w-6 animate-spin" />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
        <BookOpenCheck className="h-6 w-6 text-primary" />
        <span className="font-bold font-headline">AdaptEd AI</span>
      </Link>

      <div className="flex items-center gap-2">
        <div className="relative hidden items-center rounded-full bg-secondary/50 p-1 md:flex">
          <div
            className="absolute h-[calc(100%-8px)] rounded-full bg-secondary transition-all duration-300 ease-in-out"
            style={highlighterStyle}
          />
          <div ref={navContainerRef} className="flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                size="sm"
                asChild
                className={cn(
                  "relative z-10 rounded-full transition-colors",
                  pathname === item.href
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-primary-foreground"
                )}
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </div>
        </div>
        
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src="https://placehold.co/32x32.png"
                  alt={userProfile?.name || "User"}
                  data-ai-hint="person user"
                />
                <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{userProfile?.name || "My Account"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <LogoutButton />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
       {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 p-2 backdrop-blur-sm md:hidden">
        <div className="grid h-16 grid-cols-4 gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-muted text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-primary"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
