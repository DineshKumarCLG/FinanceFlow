
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

export default function CompanyLoginPage() {
  const { user, isAuthenticated, isLoading: authIsLoading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [companyIdInput, setCompanyIdInput] = useState("");
  const [companyIdValidated, setCompanyIdValidated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uiIsLoading, setUiIsLoading] = useState(false);

  useEffect(() => {
    // If user is authenticated and has a companyId in context, redirect to dashboard
    // The AuthContext will handle redirecting to / if companyId is missing after auth.
    if (!authIsLoading && isAuthenticated) {
      // AuthContext will handle the companyId check and appropriate redirect
      // For now, we assume AuthContext manages this.
      // router.push('/dashboard'); // This might be premature if companyId isn't set yet in context
    }
  }, [isAuthenticated, authIsLoading, router]);

  const handleCompanyIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCompanyId = e.target.value;
    setCompanyIdInput(newCompanyId);
    setError(null); // Clear error on input change

    if (newCompanyId.trim().toUpperCase() === "KENESIS") {
      setCompanyIdValidated(true);
    } else {
      setCompanyIdValidated(false);
      if (newCompanyId.trim() !== "" && newCompanyId.trim().toUpperCase() !== "KENESIS") {
         // Keep allowing other IDs for multi-company, but "KENESIS" specifically enables Google button here.
         // This logic might need to be more flexible for true multi-company where any ID is fine.
         // For now, to keep the previous "KENESIS enables Google button" behavior:
        setError("Enter 'KENESIS' to proceed with Google Sign-In for KENESIS. Other IDs will be remembered.");
      }
    }
  };
  
  const handleCompanyIdSubmit = () => {
    const trimmedCompanyId = companyIdInput.trim();
    if (trimmedCompanyId) {
      localStorage.setItem(COMPANY_ID_LOCAL_STORAGE_KEY, trimmedCompanyId);
      // Specific validation for KENESIS to show Google button,
      // but any ID is stored for potential use after login.
      if (trimmedCompanyId.toUpperCase() === "KENESIS") {
        setCompanyIdValidated(true); 
        setError(null);
      } else {
        // For other company IDs, we've stored it. The Google button won't appear based on this logic.
        // This part of the UI flow might need refinement for true multi-company.
        // For now, we focus on KENESIS. If you want ANY company ID to enable Google Sign-In,
        // you'd setCompanyIdValidated(true) here.
        setError(`Company ID '${trimmedCompanyId}' remembered. For KENESIS demo, please use 'KENESIS' to enable Google Sign-In.`);
        setCompanyIdValidated(false); // Ensure Google button doesn't show for non-KENESIS via this path
      }
    } else {
      setError("Company ID cannot be empty.");
      setCompanyIdValidated(false);
    }
  };


  const handleGoogleSignIn = async () => {
    // Ensure companyIdInput is stored before sign-in attempt
    const trimmedCompanyId = companyIdInput.trim();
    if (trimmedCompanyId) {
      localStorage.setItem(COMPANY_ID_LOCAL_STORAGE_KEY, trimmedCompanyId);
    } else {
      // This case should ideally be prevented by disabling the Google button
      // if companyIdValidated (which depends on KENESIS) isn't true.
      setError("Please ensure Company ID 'KENESIS' is entered to use Google Sign-In.");
      return;
    }

    if (!companyIdValidated) { // This check is specific to "KENESIS" enabling the button
      setError("Company ID 'KENESIS' must be validated to proceed with Google Sign-In.");
      return;
    }

    setUiIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // AuthContext will handle redirect on successful login & companyId check
    } catch (e: any) {
      if (e.code === 'auth/popup-closed-by-user') {
        setError("Sign-in process was cancelled. Please try again.");
      } else {
        setError(e.message || "An unexpected error occurred during Google Sign-In.");
      }
      setUiIsLoading(false);
    }
  };

  if (authIsLoading || (!authIsLoading && isAuthenticated)) {
    // Let AuthContext handle initial loading and redirection logic based on auth state and companyId
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
            <AppLogo iconClassName="h-10 w-10 text-primary" textClassName="text-2xl font-semibold" />
          </div>
          <CardTitle className="text-2xl">Welcome to FinanceFlow AI</CardTitle>
          <CardDescription>
            {!companyIdValidated || companyIdInput.trim().toUpperCase() !== "KENESIS"
              ? "Enter your Company ID to proceed."
              : "Company ID verified. Proceed with Google Sign-In."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Always show Company ID input unless specifically hidden after validation + Google Sign In shown */}
          {/* For this iteration, we'll keep it simple: show ID input if Google button isn't ready */}
          {!companyIdValidated && (
            <div className="space-y-2">
              <label htmlFor="companyId" className="block text-sm font-medium text-foreground">Company ID</label>
              <div className="flex gap-2">
                <Input
                  id="companyId"
                  type="text"
                  placeholder="Enter Company ID (e.g., KENESIS)"
                  value={companyIdInput}
                  onChange={handleCompanyIdChange}
                  className={error && companyIdInput.trim() !== "" ? "border-destructive" : ""}
                  disabled={uiIsLoading || authIsLoading}
                />
                {/* Button to confirm/store Company ID if not KENESIS or just to proceed */}
                {/* <Button onClick={handleCompanyIdSubmit} disabled={uiIsLoading || authIsLoading || !companyIdInput.trim()}>
                  Set Company ID
                </Button> */}
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="py-2 px-3">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm">Error</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {/* Only show Google Sign-In if companyIdInput is "KENESIS" (validated) */}
          {companyIdInput.trim().toUpperCase() === "KENESIS" && (
            <Button
              onClick={handleGoogleSignIn}
              className="w-full"
              disabled={uiIsLoading || authIsLoading}
            >
              {(uiIsLoading || authIsLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <GoogleIcon />
              Sign in with Google for KENESIS
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
