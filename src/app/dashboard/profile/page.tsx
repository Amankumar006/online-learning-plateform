
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUser, User } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, BookOpenCheck, BrainCircuit, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

function ProfileSkeleton() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-20 w-20 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-32 ml-auto" />
                </CardFooter>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-56" />
                    <Skeleton className="h-4 w-72 mt-2" />
                </CardHeader>
                 <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => (
                             <Card key={i}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-5 w-5 rounded-full" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-8 w-1/4" />
                                    <Skeleton className="h-4 w-1/2 mt-1" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                 </CardContent>
            </Card>
        </div>
    );
}

export default function ProfilePage() {
    const { toast } = useToast();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [userProfile, setUserProfile] = useState<User | null>(null);
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const profile = await getUser(currentUser.uid);
                setUserProfile(profile);
                setName(profile?.name || '');
                setIsLoading(false);
            }
            // The layout now handles redirection if the user is not logged in.
        });

        return () => unsubscribe();
    }, []);
    
    const getInitials = (nameStr?: string) => {
        if (!nameStr) return "U";
        return nameStr.split(' ').map((n) => n[0]).join('').toUpperCase();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !name.trim()) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Name cannot be empty.',
            });
            return;
        };
        setIsSaving(true);
        try {
            await updateUserProfile(user.uid, { name });
            setUserProfile(prev => prev ? { ...prev, name } : null);
            toast({
                title: 'Success!',
                description: 'Your profile has been updated.',
            });
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to update your profile.',
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) {
        return <ProfileSkeleton />;
    }
    
    if (!userProfile) {
        return <div>Could not load profile.</div>
    }

    const timeSpentHours = userProfile.progress.timeSpent ? (userProfile.progress.timeSpent / 3600).toFixed(1) : "0.0";

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold font-headline">My Profile & Stats</h1>
            
            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>View and edit your personal information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20">
                                <AvatarImage src="https://placehold.co/80x80.png" alt={userProfile.name} data-ai-hint="person user" />
                                <AvatarFallback>{getInitials(userProfile.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="text-xl font-bold">{userProfile.name}</h2>
                                <p className="text-muted-foreground">{userProfile.email}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isSaving}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" value={userProfile.email || ''} disabled />
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button type="submit" disabled={isSaving} className="ml-auto">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </CardFooter>
                </Card>
            </form>

            <Card>
                <CardHeader>
                    <CardTitle>Learning Statistics</CardTitle>
                    <CardDescription>A quick overview of your journey on the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
                                <Zap className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{userProfile.progress.mastery || 0}%</div>
                                <p className="text-xs text-muted-foreground">Mastery across all subjects</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Lessons Completed</CardTitle>
                                <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{userProfile.progress.completedLessonIds?.length || 0}</div>
                                <p className="text-xs text-muted-foreground">Total lessons finished</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Skills Mastered</CardTitle>
                                <BrainCircuit className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{userProfile.progress.totalExercisesCorrect || 0}</div>
                                <p className="text-xs text-muted-foreground">Correctly answered exercises</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Time Spent</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{timeSpentHours} hrs</div>
                                <p className="text-xs text-muted-foreground">Estimated total learning time</p>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
