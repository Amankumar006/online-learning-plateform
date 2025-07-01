
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpenCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getUser, createUserInFirestore } from "@/lib/data";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>Google</title>
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.3 1.84-4.52 1.84-5.45 0-9.88-4.45-9.88-9.88s4.43-9.88 9.88-9.88c2.92 0 5.04 1.17 6.6 2.6l2.33-2.33C19.2 2.18 16.23 1 12.48 1 5.83 1 1 5.83 1 12.5s4.83 11.5 11.48 11.5c6.36 0 11.22-4.45 11.22-11.22 0-1.2-.12-2.2-.3-3.18h-11.4z" />
    </svg>
);


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userProfile = await getUser(user.uid);

      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });

      if (userProfile?.role === 'admin') {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "An unknown error occurred.",
      });
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      let userProfile = await getUser(user.uid);
      if (!userProfile) {
        await createUserInFirestore(user.uid, user.email!, user.displayName || 'New User');
        userProfile = await getUser(user.uid);
         toast({
          title: "Account Created & Logged In",
          description: `Welcome to AdaptEd, ${userProfile?.name}!`,
        });
      } else {
         toast({
          title: "Login Successful",
          description: `Welcome back, ${userProfile?.name}!`,
        });
      }


      if (userProfile?.role === 'admin') {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Google login error:", error);
      let description = "An unknown error occurred.";
      if (error.code === 'auth/account-exists-with-different-credential') {
        description = "An account with this email already exists. Please sign in using the original method you used."
      } else {
        description = error.message || description;
      }
      toast({
        variant: "destructive",
        title: "Google Login Failed",
        description,
      });
      setIsLoading(false);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleEmailLogin}>
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <BookOpenCheck className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-headline">Welcome back</CardTitle>
            <CardDescription>Enter your email below to login to your account.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link href="#" className="ml-auto inline-block text-sm underline">
                  Forgot your password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="animate-spin" />}
              Login
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <Button variant="outline" className="w-full" type="button" onClick={handleGoogleLogin} disabled={isLoading}>
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <GoogleIcon className="mr-2 h-4 w-4" />
                )}
                Login with Google
            </Button>
          </CardContent>
          <CardFooter className="text-center text-sm">
            <div className="w-full">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="underline ml-1">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
