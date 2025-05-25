"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/layout/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function WelcomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || (!isLoading && isAuthenticated)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your FinanceFlow...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <main className="flex w-full max-w-md flex-col items-center justify-center space-y-8">
        <div className="glassmorphic p-8 md:p-12 text-center w-full">
          <AppLogo className="justify-center mb-6" iconClassName="h-12 w-12 text-primary" textClassName="text-3xl font-bold text-foreground" />
          
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Welcome to FinanceFlow AI
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Your AI-powered accounting assistant. Manage your business finances with zero accounting knowledge required.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/auth/signup">Sign Up</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/auth/login">Log In</Link>
            </Button>
          </div>
        </div>
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} FinanceFlow AI. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
