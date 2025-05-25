
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import type { LoginFormInputs } from '@/components/auth/LoginForm'; // Assuming this type exists
import type { SignupFormInputs } from '@/components/auth/SignupForm'; // Assuming this type exists


interface AuthContextType {
  user: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginFormInputs) => Promise<void>;
  signup: (credentials: SignupFormInputs) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  const isAuthenticated = !!user;

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !pathname.startsWith('/auth') && pathname !== '/') {
        router.push('/auth/login');
      }
      if (isAuthenticated && (pathname.startsWith('/auth') || pathname === '/')) {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  const login = async (credentials: LoginFormInputs) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      // onAuthStateChanged will handle setting user and redirecting
    } catch (error: any) {
      setIsLoading(false);
      console.error("Firebase login error:", error);
      throw error; // Re-throw to be caught by the form
    }
    // setIsLoading(false) is handled by onAuthStateChanged indirectly
  };

  const signup = async (credentials: SignupFormInputs) => {
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
      // TODO: Optionally create a user profile document in Firestore here
      // e.g., associate with KENESIS_COMPANY_ID
      // onAuthStateChanged will handle setting user and redirecting
    } catch (error: any) {
      setIsLoading(false);
      console.error("Firebase signup error:", error);
      throw error; // Re-throw to be caught by the form
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle setting user to null and redirecting
      router.push('/'); // Explicit push to welcome page after logout
    } catch (error) {
      console.error("Firebase logout error:", error);
      // Still set isLoading to false, as the user state will update via onAuthStateChanged
      setIsLoading(false); 
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
