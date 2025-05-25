
// This component is no longer used in the primary authentication flow.
// Kept for reference or if needed for other purposes, but can be deleted.

"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link"; // Link might still be useful if this component were reused
import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface SignupFormInputs {
  name?: string; 
  email?: string;
  password?: string;
}

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-.97 2.47-1.94 3.21v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.01z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.83 0-5.22-1.9-6.08-4.42H2.27v2.84C3.91 20.91 7.69 23 12 23z" fill="#34A853"/>
    <path d="M5.92 14.41c-.2-.59-.31-1.21-.31-1.84s.11-1.25.31-1.84V7.93H2.27C1.47 9.54 1 11.21 1 13s.47 3.46 1.27 5.07l3.65-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.69 1 3.91 3.09 2.27 6.09l3.65 2.84c.86-2.52 3.25-4.42 6.08-4.42z" fill="#EA4335"/>
  </svg>
);

export function SignupForm() {
  const { signInWithGoogle, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignUp() {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      if (e.code === 'auth/popup-closed-by-user') {
        setError("Sign-up process was cancelled. Please try again.");
      } else {
        setError(e.message || "An unexpected error occurred during Google Sign-Up.");
      }
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Create Account for KENESIS</CardTitle>
        <CardDescription>Sign up for KENESIS accounting using your Google account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Signup Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
         <Button onClick={handleGoogleSignUp} className="w-full" disabled={isLoading || authLoading}>
           {(isLoading || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <GoogleIcon />
          Sign up with Google
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Button variant="link" asChild className="p-0 h-auto">
             {/* Link should point to the new root login/company ID page if this component were used. */}
            <Link href="/">Log In</Link>
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}

    