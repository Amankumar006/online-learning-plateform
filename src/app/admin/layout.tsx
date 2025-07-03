
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookCopy,
  LayoutDashboard,
  ShieldCheck,
  Users,
  BrainCircuit,
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
import { onAuthStateChanged, User } from "firebase/auth";
import { getUser } from "@/lib/data";
import { ThemeToggle } from "@/components/theme-toggle";

function AdminLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{ name?: string, role?: string, photoURL?: string } | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/lessons", label: "Lessons", icon: BookCopy },
    { href: "/admin/exercises", label: "Exercises", icon: BrainCircuit },
    { href: "/admin/students", label: "Students", icon: Users },
  ];

  const navContainerRef = useRef<HTMLDivElement>(null);
  const [highlighterStyle, setHighlighterStyle] = useState({});

  // Find the most specific active item
  const getActiveItem = () => {
    const matchingItems = navItems.filter(item => pathname.startsWith(item.href));
    if (matchingItems.length === 0) return null;

    // Find the item with the longest href, which is the most specific match
    return matchingItems.reduce((best, current) => {
        return current.href.length > best.href.length ? current : best;
    });
  };
  const activeItem = getActiveItem();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const profile = await getUser(currentUser.uid);
        if (profile?.role === 'admin') {
          setUser(currentUser);
          setUserProfile(profile);
        } else {
          // Not an admin, redirect to student dashboard
          router.push('/dashboard');
          return;
        }
      } else {
        // Not logged in, redirect to login
        router.push('/login');
        return;
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [router]);
  
  useEffect(() => {
    if (isLoading || !navContainerRef.current || !activeItem) {
        setHighlighterStyle({ opacity: 0 });
        return;
    };

    const activeIndex = navItems.findIndex((item) => item.href === activeItem.href);
    const activeLinkEl = navContainerRef.current.children[activeIndex] as HTMLElement | undefined;

    if (activeLinkEl) {
      setHighlighterStyle({
        width: `${activeLinkEl.offsetWidth}px`,
        transform: `translateX(${activeLinkEl.offsetLeft}px)`,
        opacity: 1,
      });
    } else {
      setHighlighterStyle({ opacity: 0 });
    }
  }, [pathname, isLoading, activeItem]);


  const getInitials = (name?: string) => {
    if (!name) return "A";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (isLoading) {
    return <AdminLoader />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 text-lg font-semibold md:text-base"
        >
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="font-bold font-headline">Admin Panel</span>
        </Link>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="relative hidden items-center rounded-full bg-background/30 p-1 md:flex backdrop-blur-lg border border-black/10 dark:border-white/10 shadow-inner">
            <div
              className="absolute h-[calc(100%-8px)] rounded-full bg-gradient-to-br from-white/50 to-white/20 dark:from-white/20 dark:to-white/5 border border-white/30 dark:border-white/10 shadow-md backdrop-blur-sm transition-all duration-300 ease-in-out"
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
                    activeItem?.href === item.href
                      ? 'text-foreground dark:text-background font-semibold'
                      : 'text-muted-foreground hover:text-foreground dark:hover:text-primary-foreground'
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
              <Button
                variant="outline"
                size="icon"
                className="overflow-hidden rounded-full"
              >
                <Avatar>
                  <AvatarImage
                    src={userProfile?.photoURL || undefined}
                    alt={userProfile?.name || "Admin"}
                  />
                  <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {userProfile?.name || "Admin Account"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <LogoutButton />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 p-2 backdrop-blur-sm md:hidden">
        <div className="grid h-16 grid-cols-4 gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg text-sm font-medium transition-colors",
                activeItem?.href === item.href
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
    </div>
  );
}
