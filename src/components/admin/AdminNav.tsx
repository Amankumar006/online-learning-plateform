
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, LayoutDashboard, BookCopy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogoutButton } from "../auth/LogoutButton";
import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUser } from "@/lib/data";

export default function AdminNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{name?: string; email?: string | null;} | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profile = await getUser(currentUser.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);


  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    { href: "/admin/lessons", label: "Lessons", icon: <BookCopy /> },
    { href: "/admin/students", label: "Students", icon: <Users /> },
  ];

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
          <BookOpenCheck className="h-6 w-6 text-primary" />
          <span>AdaptEd Admin</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
              pathname.startsWith(item.href) && "bg-primary/10 text-primary"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto p-4 border-t">
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src="https://placehold.co/32x32.png" alt={userProfile?.name || "Admin"} />
                        <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                        <p className="text-sm font-medium">{userProfile?.name || 'Admin User'}</p>
                        <p className="text-xs text-muted-foreground">{userProfile?.email || 'admin@example.com'}</p>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <LogoutButton />
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </aside>
  );
}
