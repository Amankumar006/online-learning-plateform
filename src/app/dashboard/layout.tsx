
"use client";

import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import DashboardNav from "@/components/dashboard/DashboardNav";
import { cn } from "@/lib/utils";

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
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const isCanvasPage = pathname === '/dashboard/canvas';

  if (isLoading) {
    return <DashboardLoader />;
  }
  
  // If it's the canvas page, render it directly without the main layout chrome
  // to allow for a true full-screen experience.
  if (isCanvasPage) {
    return <>{children}</>;
  }

  // Otherwise, render with the standard dashboard navigation and layout
  return (
    <div className="flex h-screen w-full flex-col font-body">
      <DashboardNav />
      <main className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
