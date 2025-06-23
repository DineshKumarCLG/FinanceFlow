
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
              <Button 
                variant="outline" 
                onClick={signOut}
                className="text-sm"
              >
                Sign out
              </Button>
            </div>
            
            <div className="text-center text-sm text-gray-600">
              <p>Don't have a company? 
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-normal text-blue-600"
                  onClick={() => router.push('/onboarding')}
                >
                  Create one here
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-gradient-to-br from-blue-50 to-indigo-100 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start mb-8">
                  <Image
                    src="/assets/images/financeflow_logo.png"
                    alt="FinanceFlow AI Logo"
                    width={200}
                    height={60}
                    className="h-12 w-auto"
                    priority
                  />
                </div>
                
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Smart Accounting</span>
                  <span className="block text-blue-600 xl:inline"> with AI</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Streamline your financial operations with intelligent automation, real-time insights, and comprehensive reporting tools designed for modern businesses.
                </p>
                
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <Button 
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                      size="lg"
                      className="w-full flex items-center justify-center px-8 py-3 text-base font-medium"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Sign in with Google
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-56 w-full bg-gradient-to-r from-blue-500 to-indigo-600 sm:h-72 md:h-96 lg:w-full lg:h-full flex items-center justify-center">
            <div className="text-center text-white p-8">
              <h2 className="text-3xl font-bold mb-4">Features</h2>
              <ul className="space-y-2 text-lg">
                <li>✨ AI-Powered Insights</li>
                <li>📊 Real-time Financial Reports</li>
                <li>🤖 Automated Data Entry</li>
                <li>📱 Mobile-First Design</li>
                <li>🔒 Bank-Level Security</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
