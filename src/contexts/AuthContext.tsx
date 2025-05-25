
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
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import type { LoginFormInputs } from '@/components/auth/LoginForm';
import type { SignupFormInputs } from '@/components/auth/SignupForm';
import { addNotification } from '@/lib/data-service';


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
      // Allow authenticated users to stay on '/' if they explicitly navigate there.
      // Redirect from '/auth' pages to '/dashboard' if authenticated.
      if (isAuthenticated && pathname.startsWith('/auth')) {
         router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  const login = async (credentials: LoginFormInputs) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    } catch (error: any) {
      setIsLoading(false);
      console.error("Firebase login error:", error);
      throw error; 
    }
  };

  const signup = async (credentials: SignupFormInputs) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
      // Set display name
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: credentials.name
        });
        // Refresh user state to include displayName
        setUser(auth.currentUser); 

        // Add notification for new user joining
        await addNotification(
          `User ${credentials.name} (...${userCredential.user.uid.slice(-6)}) joined KENESIS.`,
          'user_joined',
          userCredential.user.uid
        );
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error("Firebase signup error:", error);
      throw error; 
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      router.push('/'); 
    } catch (error) {
      console.error("Firebase logout error:", error);
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
