
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser, sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUser, User, updateUserProfile } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, BookOpenCheck, BrainCircuit, Clock, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSendingVerification, setIsSendingVerification] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [learningStyle, setLearningStyle] = useState('unspecified');
    const [interests, setInterests] = useState('');
    const [goals, setGoals] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const profile = await getUser(currentUser.uid);
                setUserProfile(profile);
                if (profile) {
                    setName(profile.name || '');
                    setLearningStyle(profile.learningStyle || 'unspecified');
                    setInterests(profile.interests?.join(', ') || '');
                    setGoals(profile.goals || '');
                }
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);
    
    const getInitials = (nameStr?: string) => {
        if (!nameStr) return "U";
        return nameStr.split(' ').map((n) => n[0]).join('').toUpperCase();
    };
    
    const handleResendVerification = async () => {
        if (!user) return;
        setIsSendingVerification(true);
        try {
            await sendEmailVerification(user);
            toast({
                title: "Verification Email Sent",
                description: "Please check your inbox."
            });
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to send verification email."
            });
        } finally {
            setIsSendingVerification(false);
        }
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
            const dataToUpdate = {
                name,
                learningStyle,
                interests: interests.split(',').map(i => i.trim()).filter(Boolean),
                goals,
            };

            await updateUserProfile(user.uid, dataToUpdate);
            setUserProfile(prev => prev ? { ...prev, ...dataToUpdate } : null);

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
    
    const breadcrumbItems = [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/dashboard/profile", label: "Profile" },
    ];

    if (isLoading) {
        return <ProfileSkeleton />;
    }
    
    if (!userProfile) {
        return <div>Could not load profile.</div>
    }

    const timeSpentHours = userProfile.progress.timeSpent ? (userProfile.progress.timeSpent / 3600).toFixed(1) : "0.0";

    return (
        <div className="space-y-6">
            <Breadcrumb items={breadcrumbItems} />
            <h1 className="text-3xl font-bold font-headline">My Profile & Stats</h1>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>View and edit your personal information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20">
                                <AvatarImage src={userProfile.photoURL || undefined} alt={userProfile.name} />
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
                             <div className="flex items-center gap-4">
                                <Input id="email" value={userProfile.email || ''} disabled className="flex-grow" />
                                {user?.emailVerified ? (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Verified</Badge>
                                ) : (
                                    <Badge variant="destructive" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">Not Verified</Badge>
                                )}
                            </div>
                        </div>

                         {!user?.emailVerified && (
                            <div className="p-4 border rounded-md bg-secondary/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-sm text-muted-foreground text-center sm:text-left">Your email address is not verified. Please check your inbox for a verification link.</p>
                                <Button type="button" variant="outline" onClick={handleResendVerification} disabled={isSendingVerification} className="w-full sm:w-auto">
                                    {isSendingVerification && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Resend Email
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary"/>
                            Personalization Settings
                        </CardTitle>
                        <CardDescription>Help the AI tailor the learning experience for you. This will be used in features like the AI Canvas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="space-y-2">
                            <Label htmlFor="learning-style">Preferred Learning Style</Label>
                            <Select value={learningStyle} onValueChange={setLearningStyle} disabled={isSaving}>
                                <SelectTrigger id="learning-style">
                                    <SelectValue placeholder="Select your style" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unspecified">Unspecified / Balanced</SelectItem>
                                    <SelectItem value="visual">Visual (diagrams, charts)</SelectItem>
                                    <SelectItem value="auditory">Auditory (listening, lectures)</SelectItem>
                                    <SelectItem value="reading/writing">Reading/Writing (text, notes)</SelectItem>
                                    <SelectItem value="kinesthetic">Kinesthetic (hands-on, interactive)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="interests">Interests (comma-separated)</Label>
                            <Input
                                id="interests"
                                value={interests}
                                onChange={(e) => setInterests(e.target.value)}
                                placeholder="e.g., Space, Ancient History, Machine Learning"
                                disabled={isSaving}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="goals">Learning Goals</Label>
                            <Textarea
                                id="goals"
                                value={goals}
                                onChange={(e) => setGoals(e.target.value)}
                                placeholder="What do you want to achieve? e.g., 'Pass my final exams', 'Learn to build a web app'"
                                disabled={isSaving}
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>
                
                <div className="flex justify-end">
                     <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save All Changes
                    </Button>
                </div>
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
                                <CardTitle className="text-sm font-medium">Lesson Mastery</CardTitle>
                                <Zap className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{userProfile.progress.mastery || 0}%</div>
                                <p className="text-xs text-muted-foreground">Based on completed lessons</p>
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
                                <CardTitle className="text-sm font-medium">Correct Answers</CardTitle>
                                <BrainCircuit className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{userProfile.progress.totalExercisesCorrect || 0}</div>
                                <p className="text-xs text-muted-foreground">Total exercises answered correctly</p>
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
