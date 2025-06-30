
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getUser, User } from "@/lib/data";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { History, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";

function DashboardSkeleton() {
  return (
    <>
      <div className="space-y-2 mb-8">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-5 w-1/2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
              <Card>
                  <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                  <CardContent><Skeleton className="h-5 w-1/2" /></CardContent>
              </Card>
              <Card>
                  <CardHeader><Skeleton className="h-6 w-56" /></CardHeader>
                  <CardContent className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                          <div key={i} className="p-4 border-b border-border">
                              <Skeleton className="h-5 w-3/4 mb-2" />
                              <Skeleton className="h-4 w-1/2" />
                          </div>
                      ))}
                  </CardContent>
              </Card>
          </div>
          <div className="lg:col-span-1">
              <Card>
                  <CardHeader>
                      <Skeleton className="h-6 w-40 mb-2" />
                      <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-10 w-full" />
                  </CardContent>
              </Card>
          </div>
      </div>
    </>
  );
}


export default function DashboardPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<{ name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Placeholder data for the new UI
  const lastActivity = {
    type: "exercise",
    title: "Complex Addition Calculation",
  };
  const recentlyMastered = [
    {
      title: "Complex Addition Calculation",
      concepts: "Concepts: Addition, Arithmetic, Number Representation",
      masteredOn: "Mastered on: 11/06/2025",
      type: "Custom Exercise",
    },
    {
      title: "Pizza Portions",
      concepts: "Concepts: arithmetic, fractions, decimal",
      masteredOn: "Mastered on: 10/06/2025",
      type: "Custom Exercise",
    },
    {
      title: "Understanding Photosynthesis: Light-Dependent Reactions",
      concepts: "Concepts: biology, photosynthesis, cellular respiration",
      masteredOn: "Mastered on: 10/06/2025",
      type: "",
    },
  ];
  const learningPath = {
      summary: "Building on your recent completion of 'Introduction to Python' and your mastery of arithmetic and fraction concepts, this learning path combines further programming challenges with a biological extension. The suggested 'Python for Data Science' lesson will leverage your existing Python knowledge, while the custom exercise focuses on applying your arithmetic skills in a new programming context.",
      recommendations: [
          {
              type: "Lesson",
              title: "Python for Data Science",
              description: "Learn to use Python for data analysis and manipulation.",
              link: "/dashboard/lessons"
          },
          {
              type: "Generate Custom Exercise",
              title: "Python Simulation of Photosynthesis",
              description: "Create a program simulating the light-dependent reactions of photosynthesis, using your arithmetic and Python knowledge.",
              link: "#"
          }
      ]
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const profile = await getUser(currentUser.uid);
        setUserProfile(profile);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!user || !userProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className="text-lg font-semibold mb-2">You need to be logged in to view your dashboard.</p>
        <p className="text-muted-foreground mb-4">Please log in to continue.</p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    )
  }
  
  const breadcrumbItems = [{ href: "/dashboard", label: "Dashboard" }];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Welcome back, {userProfile.name?.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">Ready to continue your personalized learning journey? Let's achieve your goals together.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <History className="w-6 h-6 text-primary"/>
              <CardTitle className="font-headline text-xl">Continue Where You Left Off</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Your last activity was an {lastActivity.type}:</p>
              <p className="text-lg font-semibold text-primary mt-1">{lastActivity.title}</p>
              <p className="text-xs text-muted-foreground/70 mt-2">(This was a custom generated exercise or one not directly linkable. You can find saved custom items in your profile or relevant sections.)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <Sparkles className="w-6 h-6 text-primary"/>
              <CardTitle className="font-headline text-xl">Recently Mastered</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">Highlights from your recent successful exercises.</CardDescription>
              <div className="space-y-2">
                {recentlyMastered.map((item, index) => (
                  <div key={index} className="border-b border-border/50 last:border-b-0 py-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold">{item.title}</h4>
                      {item.type && <Badge variant="outline">{item.type}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.concepts}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">{item.masteredOn}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="font-headline text-xl">Your Learning Path</CardTitle>
              <CardDescription>AI-powered suggestions based on your recent progress and goals.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">{learningPath.summary}</p>
              <div className="space-y-4">
                {learningPath.recommendations.map((rec, index) => (
                  <div key={index} className="p-4 bg-card-foreground/5 rounded-lg">
                    <p className="text-xs font-semibold text-primary">{rec.type}</p>
                    <h4 className="font-semibold text-foreground mb-1">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                    <Link href={rec.link} className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                      {rec.type === 'Lesson' ? 'Explore Lesson' : 'Generate Exercise'} <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
              <Button variant="secondary" className="w-full mt-6">
                See All Recommendations ({learningPath.recommendations.length}) <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
