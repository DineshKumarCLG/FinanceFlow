
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLogo } from '@/components/layout/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const COMPANY_ID_LOCAL_STORAGE_KEY = "financeFlowCurrentCompanyId";

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-.97 2.47-1.94 3.21v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.01z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.83 0-5.22-1.9-6.08-4.42H2.27v2.84C3.91 20.91 7.69 23 12 23z" fill="#34A853"/>
    <path d="M5.92 14.41c-.2-.59-.31-1.21-.31-1.84s.11-1.25.31-1.84V7.93H2.27C1.47 9.54 1 11.21 1 13s.47 3.46 1.27 5.07l3.65-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.69 1 3.91 3.09 2.27 6.09l3.65 2.84c.86-2.52 3.25-4.42 6.08-4.42z" fill="#EA4335"/>
  </svg>
);


export default function CompanyLoginPage() {
  const { user, isAuthenticated, isLoading: authIsLoading, signInWithGoogle, currentCompanyId, setCurrentCompanyId } = useAuth();
  const router = useRouter();
  const [companyIdInput, setCompanyIdInput] = useState("");
  const [showGoogleSignIn, setShowGoogleSignIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uiIsLoading, setUiIsLoading] = useState(false);


  const handleCompanyIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCompanyId = e.target.value;
    setCompanyIdInput(newCompanyId);
    setError(null); 
    if (newCompanyId.trim().toUpperCase() === "KENESIS") { 
      setShowGoogleSignIn(true);
    } else {
      setShowGoogleSignIn(false);
      if (newCompanyId.trim() !== "") {
         setError("Enter 'KENESIS' to proceed with Google Sign-In.");
      }
    }
  };
  
  const handleCompanyIdSubmit = () => {
    const trimmedCompanyId = companyIdInput.trim();
    if (trimmedCompanyId) {
      const companyIdToStore = trimmedCompanyId.toUpperCase();
      localStorage.setItem(COMPANY_ID_LOCAL_STORAGE_KEY, companyIdToStore);
      if (companyIdToStore === "KENESIS") {
        setShowGoogleSignIn(true); 
        setError(null);
      } else {
        setError(`Company ID '${trimmedCompanyId}' remembered. For KENESIS demo, please use 'KENESIS' to enable Google Sign-In.`);
        setShowGoogleSignIn(false);
      }
    } else {
      setError("Company ID cannot be empty.");
      setShowGoogleSignIn(false);
    }
  };


  const handleGoogleSignIn = async () => {
    const trimmedCompanyId = companyIdInput.trim();
    const companyIdForStorage = trimmedCompanyId.toUpperCase();

    if (companyIdForStorage !== "KENESIS") { 
      setError("Please ensure Company ID 'KENESIS' is entered to use Google Sign-In.");
      setShowGoogleSignIn(false); 
      return;
    }
    
    localStorage.setItem(COMPANY_ID_LOCAL_STORAGE_KEY, companyIdForStorage);

    setUiIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      if (e.code === 'auth/popup-closed-by-user') {
        setError("Sign-in process was cancelled. Please try again.");
      } else {
        setError(e.message || "An unexpected error occurred during Google Sign-In.");
      }
    } finally {
      setUiIsLoading(false);
    }
  };

  if (authIsLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading FinanceFlow AI...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {/* Using the icon variant for the auth page as requested */}
            <AppLogo variant="icon" iconClassName="h-10 w-10 text-primary" textClassName="text-2xl font-semibold" />
          </div>
          <CardTitle className="text-2xl">Welcome to FinanceFlow AI</CardTitle>
          <CardDescription>
            {!showGoogleSignIn
              ? "Enter your Company ID to proceed."
              : `Company ID: ${companyIdInput.trim().toUpperCase()}. Proceed with Google Sign-In.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {!showGoogleSignIn && ( 
            <div className="space-y-2">
              <label htmlFor="companyId" className="block text-sm font-medium text-foreground">Company ID</label>
              <Input
                id="companyId"
                type="text"
                placeholder="Enter Company ID (e.g., KENESIS)"
                value={companyIdInput}
                onChange={handleCompanyIdChange}
                className={error && companyIdInput.trim() !== "" ? "border-destructive" : ""}
                disabled={uiIsLoading || authIsLoading}
              />
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="py-2 px-3">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm">Error</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {showGoogleSignIn && ( 
            <Button
              onClick={handleGoogleSignIn}
              className="w-full"
              disabled={uiIsLoading || authIsLoading}
            >
              {(uiIsLoading || authIsLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <GoogleIcon />
              Sign in with Google for {companyIdInput.trim().toUpperCase()}
            </Button>
          )}
        </CardContent>
        <CardFooter>
           <p className="text-xs text-muted-foreground text-center w-full">
            &copy; {new Date().getFullYear()} FinanceFlow AI. All rights reserved.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
