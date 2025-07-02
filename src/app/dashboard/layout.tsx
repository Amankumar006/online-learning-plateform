
"use client";

import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

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

  if (isLoading) {
    return <DashboardLoader />;
  }
  
  return (
    <div className="flex min-h-screen w-full flex-col font-body">
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
