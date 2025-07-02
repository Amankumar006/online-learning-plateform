
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Home, LineChart, BookOpenCheck, WandSparkles, Loader2 } from "lucide-react";
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
import React, { useState, useEffect } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { getUser } from "@/lib/data";
import { ThemeToggle } from "@/components/theme-toggle";

function DashboardLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{name?: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const profile = await getUser(currentUser.uid);
        setUserProfile(profile);
        setIsLoading(false);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: <Home /> },
    { href: "/dashboard/lessons", label: "Lessons", icon: <BookOpen /> },
    { href: "/dashboard/practice", label: "Practice", icon: <WandSparkles /> },
    { href: "/dashboard/progress", label: "Progress", icon: <LineChart /> },
  ];
  
  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
  
  if (isLoading) {
    return <DashboardLoader />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col font-body">
      <header className="sticky top-0 flex h-16 items-center justify-between border-b border-slate-300/10 bg-background/80 backdrop-blur-lg px-4 md:px-6 z-50">
        <Link
            href="/dashboard"
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
        >
            <BookOpenCheck className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline">AdaptEd AI</span>
        </Link>
        
        <div className="flex items-center gap-4 md:gap-5">
            <nav className="hidden flex-row items-center gap-5 text-sm md:flex lg:gap-6">
            {navItems.map((item) => (
                <Link
                key={item.href}
                href={item.href}
                className={cn(
                    "transition-colors hover:text-foreground",
                    (item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href)) ? "text-foreground" : "text-muted-foreground"
                )}
                >
                {item.label}
                </Link>
            ))}
            </nav>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="overflow-hidden rounded-full"
                >
                    <Avatar>
                    <AvatarImage src="https://placehold.co/32x32.png" alt={userProfile?.name || "User"} />
                    <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
                    </Avatar>
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                <DropdownMenuLabel>{userProfile?.name || "My Account"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>Settings</DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuItem>
                  <ThemeToggle />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <LogoutButton />
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {children}
      </main>
      
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-300/10 bg-background/80 backdrop-blur-lg md:hidden">
        <div className="grid h-16 grid-cols-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-sm font-medium",
                (item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href))
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              {React.cloneElement(item.icon, { className: "h-5 w-5" })}
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
