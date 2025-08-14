"use client";

import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import DashboardNav from "@/components/dashboard/DashboardNav";
import { handleUserLogin } from "@/lib/data";
import { UtilitySidebarProvider } from "@/hooks/use-utility-sidebar";
import UtilitySidebar from "@/components/dashboard/UtilitySidebar";

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

const noSidebarPaths = [
    /^\/dashboard\/lessons\/[^/]+$/,
    /^\/dashboard\/practice\/[^/]+$/,
    // Removed study room path after module removal
];  const fullHeightPaths = [
    /^\/dashboard\/buddy-ai$/,
  ];

  const hideNav = noSidebarPaths.some(path => path.test(pathname));
  const isFullHeight = fullHeightPaths.some(path => path.test(pathname));

  if (hideNav) {
    return <>{children}</>;
  }
  
  if (isLoading) {
    return <DashboardLoader />;
  }

  // Special handling for buddy-ai page
  if (isFullHeight) {
    return (
      <UtilitySidebarProvider>
        <div className="h-screen w-full font-body relative">
          <DashboardNav />
          <div className="absolute inset-x-0 top-16 bottom-0 flex">
            <main className="flex-1 relative">
              {children}
            </main>
            <UtilitySidebar />
          </div>
        </div>
      </UtilitySidebarProvider>
    );
  }
  
  return (
    <UtilitySidebarProvider>
        <div className="flex h-screen w-full flex-col font-body">
          <DashboardNav />
          <div className="flex flex-1 overflow-hidden">
             <main className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 lg:p-8">
                {children}
            </main>
            <UtilitySidebar />
          </div>
        </div>
    </UtilitySidebarProvider>
  );
}
