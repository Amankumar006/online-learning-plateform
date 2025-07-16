
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUser, getLessons, getStudyRoomsForUser, User, Lesson, StudyRoom } from '@/lib/data';
import StartStudyRoom from '@/components/dashboard/StartStudyRoom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Globe, Lock } from 'lucide-react';

function StudyRoomSkeleton() {
    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-5 w-96 mt-3" />
                </div>
                <Skeleton className="h-12 w-48" />
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-56" />
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}


export default function StudyRoomsPage() {
    const router = useRouter();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [appUser, setAppUser] = useState<User | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [studyRooms, setStudyRooms] = useState<StudyRoom[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const [profile, allLessons, roomsData] = await Promise.all([
                        getUser(currentUser.uid),
                        getLessons(),
                        getStudyRoomsForUser(currentUser.uid)
                    ]);
                    setAppUser(profile);
                    setLessons(allLessons);
                    setStudyRooms(roomsData);
                } catch (error) {
                    console.error("Failed to load study room data:", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const breadcrumbItems = [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/dashboard/study-room", label: "Study Room" },
    ];
    
    if (isLoading) {
        return <StudyRoomSkeleton />;
    }
    
    return (
        <div className="space-y-8">
            <Breadcrumb items={breadcrumbItems} />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold font-headline">Study Rooms</h1>
                    <p className="text-lg text-muted-foreground">Collaborate with peers, ask questions, and learn together.</p>
                </div>
                {user && <StartStudyRoom userId={user.uid} lessons={lessons} />}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Available Study Rooms
                    </CardTitle>
                    <CardDescription>Join an active session below or create your own private or public room.</CardDescription>
                </CardHeader>
                <CardContent>
                    {studyRooms.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {studyRooms.map(room => (
                                <Card key={room.id} className="p-4 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-semibold flex items-center gap-2">
                                          {room.visibility === 'public' ? <Globe className="h-4 w-4 text-muted-foreground" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                                          {room.name}
                                        </h3>
                                        {room.lessonTitle && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Topic: {room.lessonTitle}
                                            </p>
                                        )}
                                    </div>
                                    <Button asChild className="mt-4 w-full">
                                        <Link href={`/dashboard/study-room/${room.id}`}>Join Room</Link>
                                    </Button>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-16">
                            <p>No study rooms are active right now.</p>
                            <p className="text-sm mt-1">Why not start one?</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
