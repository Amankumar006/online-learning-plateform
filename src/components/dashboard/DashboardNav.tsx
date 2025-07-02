
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
  Bell,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import React, { useState, useEffect, useRef } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getUser, Announcement, getRecentAnnouncements, markAnnouncementsAsRead } from "@/lib/data";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatDistanceToNow } from 'date-fns';

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
    { href: "/dashboard/lessons", label: "Lessons", icon: BookCopy },
    { href: "/dashboard/practice", label: "Practice", icon: BrainCircuit },
    { href: "/dashboard/progress", label: "Progress", icon: TrendingUp },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<{ name?: string, lastCheckedAnnouncementsAt?: any, photoURL?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [hasUnread, setHasUnread] = React.useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

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
        setUser(currentUser);
        const profile = await getUser(currentUser.uid);
        setUserProfile(profile);

        const recentAnnouncements = await getRecentAnnouncements();
        setAnnouncements(recentAnnouncements);

        if (profile?.lastCheckedAnnouncementsAt && recentAnnouncements.length > 0) {
          const lastChecked = profile.lastCheckedAnnouncementsAt.toMillis();
          const isAnyNew = recentAnnouncements.some(a => a.createdAt.toMillis() > lastChecked);
          setHasUnread(isAnyNew);
        } else if (recentAnnouncements.length > 0) {
          setHasUnread(true);
        }
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
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

  const handlePopoverOpenChange = async (open: boolean) => {
      setIsPopoverOpen(open);
      if (open && hasUnread && user) {
          try {
              await markAnnouncementsAsRead(user.uid);
              setHasUnread(false);
          } catch (error) {
              console.error("Failed to mark announcements as read:", error);
          }
      }
  };


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
            className="absolute h-[calc(100%-8px)] rounded-full bg-primary transition-all duration-300 ease-in-out"
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

        <Popover open={isPopoverOpen} onOpenChange={handlePopoverOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full">
                    <Bell className="h-5 w-5" />
                    {hasUnread && (
                        <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="p-3 border-b">
                    <h4 className="font-medium text-sm">Notifications</h4>
                </div>
                <ScrollArea className="h-80">
                    <div className="p-2">
                        {announcements.length > 0 ? (
                            announcements.map(announcement => (
                                <Link
                                    key={announcement.id}
                                    href={announcement.link || '#'}
                                    className="block p-3 mb-1 rounded-lg hover:bg-muted"
                                    onClick={() => setIsPopoverOpen(false)}
                                >
                                    <p className="font-semibold text-sm mb-1">{announcement.title}</p>
                                    <p className="text-xs text-muted-foreground mb-2">{announcement.message}</p>
                                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(announcement.createdAt.toDate(), { addSuffix: true })}</p>
                                </Link>
                            ))
                        ) : (
                            <div className="text-center text-muted-foreground p-8">
                                <p>No notifications yet.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={userProfile?.photoURL || undefined}
                  alt={userProfile?.name || "User"}
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
    </header>
  );
}
