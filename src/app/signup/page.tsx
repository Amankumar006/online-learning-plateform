
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Loader2, Sparkles, Zap, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, sendEmailVerification, setPersistence, browserLocalPersistence } from "firebase/auth";
import { createUserInFirestore, getUser, updateUserProfile } from "@/lib/data";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <title>Google</title>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.3 1.84-4.52 1.84-5.45 0-9.88-4.45-9.88-9.88s4.43-9.88 9.88-9.88c2.92 0 5.04 1.17 6.6 2.6l2.33-2.33C19.2 2.18 16.23 1 12.48 1 5.83 1 1 5.83 1 12.5s4.83 11.5 11.48 11.5c6.36 0 11.22-4.45 11.22-11.22 0-1.2-.12-2.2-.3-3.18h-11.4z" />
  </svg>
);

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <title>GitHub</title>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

// Floating animated shapes for the left panel
const FloatingShape = ({ className, delay = 0 }: { className?: string; delay?: number }) => (
  <div
    className={`absolute rounded-full opacity-20 animate-pulse ${className}`}
    style={{ animationDelay: `${delay}s`, animationDuration: '3s' }}
  />
);

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: "Password must be at least 6 characters long.",
      });
      setIsLoading(false);
      return;
    }

    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await sendEmailVerification(user);
      await createUserInFirestore(user.uid, user.email!, name, user.photoURL);

      toast({
        title: "Account Created",
        description: "A verification email has been sent. Please check your inbox.",
      });

      router.push("/dashboard");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: error.message || "An unknown error occurred.",
      });
      setIsLoading(false);
    }
  };

  const socialLogin = async (provider: GoogleAuthProvider | GithubAuthProvider) => {
    setIsLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      let userProfile = await getUser(user.uid);

      if (!userProfile) {
        await createUserInFirestore(user.uid, user.email!, user.displayName || 'New User', user.photoURL);
        userProfile = await getUser(user.uid);
        toast({
          title: "Account Created",
          description: "Welcome to AdaptEd AI!",
        });
      } else {
        if (user.photoURL && user.photoURL !== userProfile.photoURL) {
          await updateUserProfile(user.uid, { photoURL: user.photoURL });
        }
        toast({
          title: "Login Successful",
          description: `Welcome back, ${userProfile.name}!`,
        });
      }

      if (userProfile?.role === 'admin') {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Social signup error:", error);
      let description = "An unknown error occurred.";
      if (error.code === 'auth/account-exists-with-different-credential') {
        description = "An account with this email already exists. Please sign in using the original method you used."
      } else {
        description = error.message || description;
      }
      toast({
        variant: "destructive",
        title: "Sign-Up Failed",
        description,
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">
      {/* Left Panel - Gradient with animated elements */}
      <div className="relative lg:w-[55%] min-h-[30vh] lg:min-h-screen bg-gradient-to-br from-accent via-primary to-primary/90 overflow-hidden">
        {/* Animated floating shapes */}
        <FloatingShape className="w-36 h-36 bg-white/30 top-[15%] left-[15%]" delay={0} />
        <FloatingShape className="w-28 h-28 bg-white/20 top-[25%] right-[10%]" delay={0.5} />
        <FloatingShape className="w-44 h-44 bg-primary/40 bottom-[15%] left-[25%]" delay={1} />
        <FloatingShape className="w-24 h-24 bg-white/25 bottom-[35%] right-[20%]" delay={1.5} />
        <FloatingShape className="w-20 h-20 bg-accent/30 top-[55%] left-[45%]" delay={2} />

        {/* Diagonal decorative lines */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute w-[200%] h-2 bg-gradient-to-r from-transparent via-white/40 to-transparent -rotate-45 top-1/3 -left-1/2" />
          <div className="absolute w-[200%] h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent -rotate-45 top-2/3 -left-1/4" />
          <div className="absolute w-[200%] h-3 bg-gradient-to-r from-transparent via-white/20 to-transparent -rotate-45 bottom-1/3 -left-1/2" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-start h-full p-8 lg:p-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-8 lg:mb-12">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <BookOpen className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-light tracking-wide text-white">AdaptEd</span>
          </Link>

          <div className="max-w-md">
            <h1 className="text-3xl lg:text-5xl font-light text-white mb-4 lg:mb-6 leading-tight">
              Begin your learning adventure today
            </h1>
            <p className="text-base lg:text-lg text-white/80 font-light leading-relaxed mb-8">
              Join thousands of learners who have transformed their education with AI-powered personalized learning.
            </p>

            {/* Feature highlights */}
            <div className="hidden lg:flex flex-col gap-4">
              <div className="flex items-center gap-3 text-white/90">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="font-light">Personalized learning paths</span>
              </div>
              <div className="flex items-center gap-3 text-white/90">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Zap className="h-5 w-5" />
                </div>
                <span className="font-light">Practice with instant feedback</span>
              </div>
              <div className="flex items-center gap-3 text-white/90">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Target className="h-5 w-5" />
                </div>
                <span className="font-light">Master any subject efficiently</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 lg:p-12">
        <Card className="w-full max-w-md border-border bg-card shadow-xl">
          <form onSubmit={handleEmailSignup}>
            <CardHeader className="text-center space-y-2 pb-6">
              <CardTitle className="text-2xl font-semibold tracking-tight">
                Create your account
              </CardTitle>
              <CardDescription>
                Start your personalized learning journey
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full-name">Full name</Label>
                <Input
                  id="full-name"
                  placeholder="John Doe"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="bg-background h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="hello@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-background h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-background h-11"
                />
                <p className="text-[10px] text-muted-foreground ml-1">Must be at least 6 characters</p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base mt-2"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="w-full h-11"
                  type="button"
                  onClick={() => socialLogin(new GoogleAuthProvider())}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                  Google
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-11"
                  type="button"
                  onClick={() => socialLogin(new GithubAuthProvider())}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GithubIcon className="mr-2 h-4 w-4" />}
                  GitHub
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 text-center text-sm text-muted-foreground pb-8">
              <div className="w-full">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline underline-offset-4">
                  Sign in
                </Link>
              </div>
              <div className="text-xs text-muted-foreground/50 px-4">
                By joining, you agree to our Terms of Service and Privacy Policy.
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
