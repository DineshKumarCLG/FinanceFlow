'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, Building2 } from 'lucide-react';
import Image from 'next/image';

export default function HomePage() {
  const { user, signInWithGoogle, signOut, currentCompanyId, setCurrentCompanyId, checkCompanyExists } = useAuth();
  const [companyIdInput, setCompanyIdInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleAuthStateChange = async () => {
      if (user && currentCompanyId) {
        console.log('AuthContext navigation check:', {
          isAuthenticated: !!user,
          currentCompanyId,
          pathname: '/'
        });
        try {
          console.log('Checking if company exists:', currentCompanyId);
          const companyExists = await checkCompanyExists(currentCompanyId);
          if (companyExists) {
            console.log('Company exists, redirecting to dashboard');
            router.push('/dashboard');
          } else {
            console.log('Company does not exist, redirecting to onboarding');
            router.push('/onboarding');
          }
        } catch (error) {
          console.error('Error checking company existence:', error);
        }
      }
    };

    handleAuthStateChange();
  }, [user, currentCompanyId, router, checkCompanyExists]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // Navigation will be handled by the useEffect above
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      toast({
        variant: "destructive",
        title: "Sign-in failed",
        description: error.message || "Failed to sign in with Google",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanyIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyIdInput.trim()) return;

    setIsLoading(true);
    try {
      const companyExists = await checkCompanyExists(companyIdInput.trim());
      if (companyExists) {
        setCurrentCompanyId(companyIdInput.trim());
        router.push('/dashboard');
      } else {
        toast({
          variant: "destructive",
          title: "Company not found",
          description: "Please check your Company ID or contact your administrator",
        });
      }
    } catch (error) {
      console.error('Error checking company:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to verify company. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setCompanyIdInput('');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Show company ID input if user is signed in but no company ID is set
  if (user && !currentCompanyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 relative">
              <Image
                src="/assets/images/financeflow_icon.png"
                alt="FinanceFlow AI"
                fill
                className="object-contain"
                priority
              />
            </div>
            <CardTitle>Enter Company ID</CardTitle>
            <CardDescription>
              Please enter your Company ID to access your workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCompanyIdSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Company ID"
                value={companyIdInput}
                onChange={(e) => setCompanyIdInput(e.target.value)}
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !companyIdInput.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Building2 className="mr-2 h-4 w-4" />
                    Access Workspace
                  </>
                )}
              </Button>
            </form>
            <div className="text-center">
              <Button variant="ghost" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login page if user is not signed in
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 relative">
            <Image
              src="/assets/images/financeflow_logo.png"
              alt="FinanceFlow AI"
              fill
              className="object-contain"
              priority
            />
          </div>
          <CardTitle className="text-2xl">Welcome to FinanceFlow AI</CardTitle>
          <CardDescription>
            AI-powered accounting and financial management platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleGoogleSignIn} 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in with Google'
            )}
          </Button>

          <div className="text-center text-sm text-gray-600">
            <p>
              By signing in, you agree to our{' '}
              <a href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}