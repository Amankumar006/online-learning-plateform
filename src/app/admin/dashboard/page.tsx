
"use client";

import { useEffect, useState } from "react";

// Force dynamic rendering to avoid build-time Firebase initialization
export const dynamic = 'force-dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookCopy, Users, Bell, Megaphone, ArrowRight } from "lucide-react";
import { getLessons, getUsers, getPendingLessonRequests, approveLessonRequest, LessonRequest } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import AnnouncementForm from "@/components/admin/AnnouncementForm";
import Link from "next/link";


function DashboardSkeleton() {
    return (
     <div className="w-full h-full flex flex-col">
       <div className="relative w-full flex-grow bg-white/20 dark:bg-black/25 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/20 flex flex-col overflow-hidden p-6">
        <div className="relative z-10 flex flex-col h-full">
            <div className="flex-grow overflow-y-auto -mr-6 pr-6">
                <div className="mb-12">
                    <Skeleton className="h-10 w-1/2 md:w-1/3" />
                    <Skeleton className="h-6 w-2/3 md:w-1/2 mt-3" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 md:col-span-2 rounded-xl bg-white/5 backdrop-blur-lg border border-white/5 p-6 flex flex-col">
                         <Skeleton className="h-5 w-32 mb-4" />
                         <div className="space-y-4">
                            <Skeleton className="h-14 w-full" />
                            <Skeleton className="h-14 w-full" />
                         </div>
                    </div>
                    <div className="rounded-xl bg-white/5 backdrop-blur-lg border border-white/5 p-6 flex flex-col">
                        <Skeleton className="h-5 w-24 mb-4" />
                        <div className="space-y-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    </div>
                </div>
                 <div className="mt-8">
                     <div className="rounded-xl bg-white/5 backdrop-blur-lg border border-white/5 p-6">
                        <Skeleton className="h-6 w-48 mb-4" />
                        <Skeleton className="h-4 w-64 mb-6" />
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-10 w-32 ml-auto" />
                        </div>
                    </div>
                 </div>
            </div>
        </div>
      </div>
    </div>
    )
}

function AdminLessonRequest({ request, onApprove }: { request: LessonRequest; onApprove: (id: string) => Promise<void> }) {
    const [isApproving, setIsApproving] = useState(false);

    const handleApprove = async () => {
        setIsApproving(true);
        await onApprove(request.id);
        // The parent component will handle refetching and state updates.
    };
    
    return (
        <AccordionItem value={request.id}>
            <AccordionTrigger className="hover:no-underline p-4 rounded-lg hover:bg-white/5 dark:hover:bg-black/20">
                <div className="flex-1 text-left">
                    <p className="font-semibold">{request.title}</p>
                    <p className="text-sm text-muted-foreground">
                        Requested by {request.userName} • {formatDistanceToNow(request.createdAt.toDate(), { addSuffix: true })}
                    </p>
                </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 p-4">
                <div className="space-y-1">
                    <h4 className="font-medium text-sm">Subject</h4>
                    <p className="text-muted-foreground text-sm">{request.subject}</p>
                </div>
                 <div className="space-y-1">
                    <h4 className="font-medium text-sm">Description</h4>
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap">{request.description}</p>
                </div>
                {request.notes && (
                     <div className="space-y-1">
                        <h4 className="font-medium text-sm">Additional Notes</h4>
                        <p className="text-muted-foreground text-sm">{request.notes}</p>
                    </div>
                )}
                <div className="pt-2">
                    <Button onClick={handleApprove} disabled={isApproving}>
                        {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isApproving ? "Generating..." : "Approve & Generate Lesson"}
                    </Button>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}


export default function AdminDashboardPage() {
  const [lessonsCount, setLessonsCount] = useState(0);
  const [studentsCount, setStudentsCount] = useState(0);
  const [lessonRequests, setLessonRequests] = useState<LessonRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [lessonsData, usersData, requestsData] = await Promise.all([
        getLessons(),
        getUsers(),
        getPendingLessonRequests(),
      ]);
      setLessonsCount(lessonsData.length);
      const studentUsers = usersData.filter(user => user.role === 'student');
      setStudentsCount(studentUsers.length);
      setLessonRequests(requestsData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load dashboard data." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  const handleApproveRequest = async (requestId: string) => {
    try {
        await approveLessonRequest(requestId);
        toast({ title: "Success!", description: "Lesson has been generated and the request is approved." });
        // Refresh the list of pending requests
        setLessonRequests(prev => prev.filter(r => r.id !== requestId));
        setLessonsCount(prev => prev + 1); // Increment lesson count
    } catch (error: any) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: error.message || "Failed to approve request." });
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="relative w-full flex-grow bg-white/20 dark:bg-black/25 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/20 flex flex-col overflow-hidden p-6">
        
         <div className="absolute inset-0 z-0 opacity-60">
            <svg width="100%" height="100%" className="absolute inset-0">
                <defs>
                    <linearGradient id="thread-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary)/0.15)" />
                        <stop offset="100%" stopColor="hsl(var(--accent)/0.15)" />
                    </linearGradient>
                     <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <path d="M-100 100 Q 150 150, 400 -50" stroke="url(#thread-gradient)" fill="none" strokeWidth="2" filter="url(#glow)"/>
                <path d="M-50 400 Q 200 200, 500 500" stroke="url(#thread-gradient)" fill="none" strokeWidth="1.5" filter="url(#glow)"/>
                <path d="M 1200 100 Q 900 300, 700 600" stroke="url(#thread-gradient)" fill="none" strokeWidth="2" filter="url(#glow)"/>
                <path d="M 1000 800 Q 1200 600, 1400 700" stroke="url(#thread-gradient)" fill="none" strokeWidth="1.5" filter="url(#glow)"/>
                <path d="M 200 800 Q 400 700, 600 900" stroke="url(#thread-gradient)" fill="none" strokeWidth="1.5" filter="url(#glow)"/>
                <circle cx="15%" cy="20%" r="2" fill="hsl(var(--primary)/0.2)" filter="url(#glow)" />
                <circle cx="80%" cy="10%" r="2" fill="hsl(var(--accent)/0.2)" filter="url(#glow)" />
                <circle cx="5%" cy="85%" r="3" fill="hsl(var(--primary)/0.3)" filter="url(#glow)" />
                <circle cx="95%" cy="80%" r="2" fill="hsl(var(--accent)/0.2)" filter="url(#glow)" />
                <circle cx="50%" cy="50%" r="1" fill="hsl(var(--primary)/0.1)" filter="url(#glow)" />
            </svg>
        </div>

        <div className="relative z-10 flex flex-col h-full">
            <div className="flex-grow overflow-y-auto -mr-6 pr-6">
                <div className="mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-headline text-foreground">Admin Dashboard</h1>
                    <p className="text-muted-foreground text-lg">Manage content, users, and platform settings.</p>
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 md:col-span-2 rounded-xl bg-white/5 backdrop-blur-lg border border-white/5 p-6 flex flex-col">
                         <h3 className="font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                            <Bell className="h-4 w-4" /> Pending Lesson Requests <Badge>{lessonRequests.length}</Badge>
                         </h3>
                         <div className="flex-grow">
                             {lessonRequests.length > 0 ? (
                                <Accordion type="single" collapsible className="w-full -mt-4">
                                    {lessonRequests.map(request => (
                                    <AdminLessonRequest key={request.id} request={request} onApprove={handleApproveRequest} />
                                    ))}
                                </Accordion>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center">
                                    <p className="text-muted-foreground text-sm">No pending lesson requests at the moment.</p>
                                </div>
                            )}
                         </div>
                    </div>
                    <div className="rounded-xl bg-white/5 backdrop-blur-lg border border-white/5 p-6 flex flex-col space-y-4">
                        <h3 className="font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                            Quick Stats
                        </h3>
                        <Card className="bg-transparent border-white/10">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
                                <BookCopy className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{lessonsCount}</div>
                                <p className="text-xs text-muted-foreground">lessons created</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-transparent border-white/10">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{studentsCount}</div>
                                <p className="text-xs text-muted-foreground">students enrolled</p>
                            </CardContent>
                        </Card>
                        <Button variant="link" asChild className="mt-auto -mb-2 -mx-2 justify-start">
                            <Link href="/admin/students">Manage all users <ArrowRight className="w-4 h-4 ml-1" /></Link>
                        </Button>
                    </div>
                </div>

                 <div className="mt-8">
                    <div className="rounded-xl bg-white/5 backdrop-blur-lg border border-white/5 p-6">
                        <h3 className="font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                            <Megaphone className="h-4 w-4" /> Send a Custom Announcement
                        </h3>
                         <p className="text-sm text-muted-foreground mb-4">Broadcast a message to all users. It will appear in their notification center.</p>
                        <AnnouncementForm />
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
