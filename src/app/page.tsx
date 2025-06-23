"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AppLogo } from '@/components/layout/AppLogo';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { Loader2, AlertCircle, Building2, CheckCircle, ArrowRight } from 'lucide-react';
import Image from 'next/image';

type AuthMode = 'login' | 'signup' | 'company-entry';

export default function AuthPage() {
  const { user, isAuthenticated, isLoading: authIsLoading, currentCompanyId, setCurrentCompanyId } = useAuth();
  const router = useRouter();

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [companyIdInput, setCompanyIdInput] = useState('');
  const [isSubmittingCompanyId, setIsSubmittingCompanyId] = useState(false);
  const [companyIdError, setCompanyIdError] = useState<string | null>(null);

  // Don't render anything if authenticated (redirecting)
  if (!authIsLoading && isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          {currentCompanyId ? 'Redirecting to dashboard...' : 'Redirecting to onboarding...'}
        </p>
      </div>
    );
  }

  const handleCompanyIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyIdInput.trim()) {
      setCompanyIdError('Please enter a valid Company ID');
      return;
    }

    setIsSubmittingCompanyId(true);
    setCompanyIdError(null);

    try {
      // Set the company ID and let the AuthContext handle redirection
      setCurrentCompanyId(companyIdInput.trim());
      // The useEffect in AuthContext will handle the redirection
    } catch (error: any) {
      setCompanyIdError(error.message || 'Invalid Company ID');
    } finally {
      setIsSubmittingCompanyId(false);
    }
  };

  if (authIsLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-12 flex-col justify-center">
        <div className="max-w-md">
          <div className="mb-8">
            <AppLogo variant="full" logoClassName="h-10 w-auto" textClassName="text-2xl font-bold text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold mb-6">
            Smart Accounting Made Simple
          </h1>
          <p className="text-xl mb-8 opacity-90">
            Let AI handle your journal entries, invoices, and financial reporting while you focus on growing your business.
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5" />
              <span>AI-powered journal entry automation</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5" />
              <span>Smart document processing</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5" />
              <span>Real-time financial insights</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5" />
              <span>GST compliance & reporting</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <AppLogo variant="full" logoClassName="h-8 w-auto mx-auto" textClassName="text-xl font-bold" />
          </div>

          {authMode === 'login' && (
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Welcome Back</CardTitle>
                <CardDescription>
                  Sign in to your FinanceFlow AI account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LoginForm 
                  onSuccess={() => setAuthMode('company-entry')}
                  onSwitchToSignup={() => setAuthMode('signup')}
                />
              </CardContent>
            </Card>
          )}

          {authMode === 'signup' && (
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Create Account</CardTitle>
                <CardDescription>
                  Get started with FinanceFlow AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SignupForm 
                  onSuccess={() => setAuthMode('company-entry')}
                  onSwitchToLogin={() => setAuthMode('login')}
                />
              </CardContent>
            </Card>
          )}

          {authMode === 'company-entry' && (
            <Card>
              <CardHeader className="text-center">
                <Building2 className="mx-auto h-10 w-10 text-primary mb-4" />
                <CardTitle className="text-2xl">Enter Company ID</CardTitle>
                <CardDescription>
                  Enter your company ID to access your workspace, or create a new company
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {companyIdError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{companyIdError}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleCompanyIdSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="company-id" className="text-sm font-medium">
                      Company ID
                    </label>
                    <Input
                      id="company-id"
                      type="text"
                      placeholder="Enter your company ID"
                      value={companyIdInput}
                      onChange={(e) => setCompanyIdInput(e.target.value)}
                      disabled={isSubmittingCompanyId}
                    />
                    <p className="text-xs text-muted-foreground">
                      This was provided when your company was set up
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmittingCompanyId}>
                    {isSubmittingCompanyId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Access Workspace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push('/onboarding')}
                >
                  Create New Company
                </Button>

                <div className="text-center">
                  <button 
                    onClick={() => setAuthMode('login')}
                    className="text-sm text-muted-foreground hover:text-primary underline"
                  >
                    Back to login
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              By signing in, you agree to our{' '}
              <a href="/terms" className="underline hover:text-primary">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="underline hover:text-primary">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}