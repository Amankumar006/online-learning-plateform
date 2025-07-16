
"use client";

import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import DashboardNav from "@/components/dashboard/DashboardNav";
import { cn } from "@/lib/utils";
import { handleUserLogin } from "@/lib/data";

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
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        await handleUserLogin(currentUser.uid);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Don't render the main DashboardNav on specific pages
  const noNavPaths = [
    /^\/dashboard\/lessons\/[^/]+$/,
    /^\/dashboard\/study-room\/[^/]+$/,
  ];

  const hideNav = noNavPaths.some(path => path.test(pathname));

  if (hideNav) {
    return <>{children}</>;
  }
  
  if (isLoading) {
    return <DashboardLoader />;
  }
  
  return (
    <div className="flex h-screen w-full flex-col font-body">
      <DashboardNav />
      <main className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
