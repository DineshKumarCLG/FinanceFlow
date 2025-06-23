"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function HomePage() {
  const { user, isLoading, signInWithGoogle, setCurrentCompanyId, checkCompanyExists } = useAuth();
  const [companyId, setCompanyIdInput] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingCompany, setIsCheckingCompany] = useState(false);

  const handleGoogleSignIn = async () => {
    if (!companyId.trim()) {
      setError('Please enter a Company ID');
      return;
    }

    setIsSigningIn(true);
    setError(null);

    try {
      // First check if company exists
      setIsCheckingCompany(true);
      const companyExists = await checkCompanyExists(companyId.trim());
      setIsCheckingCompany(false);

      if (!companyExists) {
        setError('Company not found. Please check the Company ID or contact your administrator.');
        setIsSigningIn(false);
        return;
      }

      // Set company ID before signing in
      setCurrentCompanyId(companyId.trim());

      // Then sign in
      await signInWithGoogle();
    } catch (error: any) {
      setIsCheckingCompany(false);
      setIsSigningIn(false);
      console.error('Google Sign-In error:', error);
      setError(error.message || 'Failed to sign in. Please try again.');
    }
  };

  const handleCompanyIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyIdInput(e.target.value);
    if (error) setError(null); // Clear error when user starts typing
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg text-gray-700">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="relative w-16 h-16">
                <Image
                  src="/assets/images/financeflow_icon.png"
                  alt="FinanceFlow AI"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">Welcome to FinanceFlow AI</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Sign in to access your company's financial dashboard
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="companyId" className="text-sm font-medium text-gray-700">
                Company ID
              </Label>
              <Input
                id="companyId"
                type="text"
                placeholder="Enter your Company ID"
                value={companyId}
                onChange={handleCompanyIdChange}
                className="w-full"
                disabled={isSigningIn || isCheckingCompany}
              />
              <p className="text-xs text-gray-500">
                Contact your administrator if you don't have a Company ID
              </p>
            </div>

            <div className="space-y-4">
              <Button 
                onClick={handleGoogleSignIn} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
                disabled={isSigningIn || isCheckingCompany || !companyId.trim()}
              >
                {isCheckingCompany ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking Company...
                  </>
                ) : isSigningIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">New to FinanceFlow?</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Contact your team administrator to get started with FinanceFlow AI
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}