
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookCopy, Users, Activity, Bell, Megaphone } from "lucide-react";
import { getLessons, getUsers, getPendingLessonRequests, approveLessonRequest, LessonRequest } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import AnnouncementForm from "@/components/admin/AnnouncementForm";


function DashboardSkeleton() {
    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-4 w-1/2 mt-1" />
                    </CardContent>
                </Card>
            ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6 mt-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-10 w-32 ml-auto" />
                    </div>
                </CardContent>
            </Card>
        </div>
      </>
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
            <AccordionTrigger className="hover:no-underline">
                <div className="flex-1 text-left">
                    <p className="font-semibold">{request.title}</p>
                    <p className="text-sm text-muted-foreground">
                        Requested by {request.userName} • {formatDistanceToNow(request.createdAt.toDate(), { addSuffix: true })}
                    </p>
                </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
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

  const breadcrumbItems = [{ href: "/admin/dashboard", label: "Dashboard" }];

  if (isLoading) {
    return (
        <div>
            <Breadcrumb items={breadcrumbItems} />
            <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
            <DashboardSkeleton />
        </div>
    )
  }

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
            <BookCopy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lessonsCount}</div>
            <p className="text-xs text-muted-foreground">lessons created</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentsCount}</div>
            <p className="text-xs text-muted-foreground">students enrolled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Real-time data coming soon</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Pending Lesson Requests
                    <Badge>{lessonRequests.length}</Badge>
                </CardTitle>
                <CardDescription>Review and approve new lesson ideas submitted by students.</CardDescription>
            </CardHeader>
            <CardContent>
                {lessonRequests.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {lessonRequests.map(request => (
                        <AdminLessonRequest key={request.id} request={request} onApprove={handleApproveRequest} />
                        ))}
                    </Accordion>
                ) : (
                    <p className="text-muted-foreground text-sm text-center py-4">No pending lesson requests.</p>
                )}
            </CardContent>
        </Card>

         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5" />
                    Send a Custom Announcement
                </CardTitle>
                <CardDescription>Broadcast a message to all users. It will appear in their notification center.</CardDescription>
            </CardHeader>
            <CardContent>
                <AnnouncementForm />
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
