
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AppLogo } from '@/components/layout/AppLogo';
import { Loader2, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-.97 2.47-1.94 3.21v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.01z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.83 0-5.22-1.9-6.08-4.42H2.27v2.84C3.91 20.91 7.69 23 12 23z" fill="#34A853"/>
    <path d="M5.92 14.41c-.2-.59-.31-1.21-.31-1.84s.11-1.25.31-1.84V7.93H2.27C1.47 9.54 1 11.21 1 13s.47 3.46 1.27 5.07l3.65-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.69 1 3.91 3.09 2.27 6.09l3.65 2.84c.86-2.52 3.25-4.42 6.08-4.42z" fill="#EA4335"/>
  </svg>
);

type AuthMode = 'welcome' | 'signin' | 'signup' | 'forgot';

export default function AuthPage() {
  const { user, isAuthenticated, isLoading: authIsLoading, signInWithGoogle, currentCompanyId } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    if (!authIsLoading && isAuthenticated && currentCompanyId) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, authIsLoading, currentCompanyId, router]);

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return { minLength, hasSpecial, isValid: minLength && hasSpecial };
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTerms) {
      setError('Please accept the Terms & Privacy Policy');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError('Password must be at least 8 characters with 1 special character');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Redirect to onboarding after successful signup
      router.push('/onboarding');
    } catch (error: any) {
      setError(error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // User will be redirected by useEffect after successful sign in
    } catch (error: any) {
      setError(error.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      setError(error.message || 'Failed to send password reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      if (e.code === 'auth/popup-closed-by-user') {
        setError('Sign-in process was cancelled. Please try again.');
      } else {
        setError(e.message || 'An unexpected error occurred during Google Sign-In.');
      }
    } finally {
      setIsLoading(false);
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      {mode === 'welcome' && (
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto">
              <AppLogo variant="full" iconClassName="h-12 w-12 text-primary" textClassName="text-3xl font-bold" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Your Virtual CFO is Here.</CardTitle>
              <CardDescription className="text-lg mt-2">
                Kenesis – AI-Native Finance OS for Startups
              </CardDescription>
              <p className="text-sm text-muted-foreground mt-4">
                Automate invoicing, tax filing, payroll, and more – all through natural language.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setMode('signin')} 
              className="w-full"
              size="lg"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => setMode('signup')} 
              variant="outline" 
              className="w-full"
              size="lg"
            >
              Create an Account
            </Button>
          </CardContent>
        </Card>
      )}

      {mode === 'signup' && (
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Create Your Account</CardTitle>
            <CardDescription>
              Get started with your AI-powered finance management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium">Full Name</label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Business Email</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 chars, 1 special"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {password && (
                  <div className="text-xs space-y-1">
                    <div className={`flex items-center gap-1 ${validatePassword(password).minLength ? 'text-green-600' : 'text-red-500'}`}>
                      <CheckCircle2 className="h-3 w-3" />
                      At least 8 characters
                    </div>
                    <div className={`flex items-center gap-1 ${validatePassword(password).hasSpecial ? 'text-green-600' : 'text-red-500'}`}>
                      <CheckCircle2 className="h-3 w-3" />
                      1 special character
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="companyName" className="text-sm font-medium">Company Name</label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Your company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="mobile" className="text-sm font-medium">Mobile Number</label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={setAcceptTerms}
                />
                <label htmlFor="terms" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Accept <Link href="/terms" className="text-primary hover:underline">Terms</Link> & <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !acceptTerms}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
                <GoogleIcon />
                Sign up with Google
              </Button>

              <div className="text-center">
                <Button variant="link" onClick={() => setMode('signin')} className="text-sm">
                  Already have an account? Sign in
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {mode === 'signin' && (
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label htmlFor="signin-email" className="text-sm font-medium">Email / Mobile</label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="signin-password" className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-right">
                <Button variant="link" onClick={() => setMode('forgot')} className="text-sm p-0 h-auto">
                  Forgot Password?
                </Button>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
                <GoogleIcon />
                Sign in with Google
              </Button>

              <div className="text-center">
                <Button variant="link" onClick={() => setMode('signup')} className="text-sm">
                  Don't have an account? Create one
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {mode === 'forgot' && (
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>
              Enter your email to receive a password reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label htmlFor="reset-email" className="text-sm font-medium">Email Address</label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>

              <div className="text-center">
                <Button variant="link" onClick={() => setMode('signin')} className="text-sm">
                  Back to Sign In
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 text-center">
        <Button variant="link" onClick={() => setMode('welcome')} className="text-sm text-muted-foreground">
          ← Back to Welcome
        </Button>
      </div>
    </div>
  );
}
