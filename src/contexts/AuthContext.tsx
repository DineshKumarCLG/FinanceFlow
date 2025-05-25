
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import type { User as FirebaseUser } from 'firebase/auth';
import {
  onAuthStateChanged,
  // createUserWithEmailAndPassword, // Commented out
  // signInWithEmailAndPassword, // Commented out
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo
} from 'firebase/auth';
import type { LoginFormInputs } from '@/components/auth/LoginForm'; // Keep for type, though form will change
import type { SignupFormInputs } from '@/components/auth/SignupForm'; // Keep for type, though form will change
import { addNotification } from '@/lib/data-service';


interface AuthContextType {
  user: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // login: (credentials: LoginFormInputs) => Promise<void>; // Commented out
  // signup: (credentials: SignupFormInputs) => Promise<void>; // Commented out
  signInWithGoogle: () => Promise<void>;
  updateUserProfileName: (newName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();

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
      if (isAuthenticated && pathname.startsWith('/auth')) {
         router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  // const login = async (credentials: LoginFormInputs) => { // Commented out
  //   setIsLoading(true);
  //   try {
  //     await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
  //   } catch (error: any) {
  //     setIsLoading(false);
  //     console.error("Firebase login error:", error);
  //     throw error;
  //   }
  // };

  // const signup = async (credentials: SignupFormInputs) => { // Commented out
  //   setIsLoading(true);
  //   try {
  //     const userCredential = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
  //     if (userCredential.user) {
  //       await updateProfile(userCredential.user, {
  //         displayName: credentials.name
  //       });
  //       setUser(auth.currentUser);
  //       await addNotification(
  //         `User ${credentials.name} (...${userCredential.user.uid.slice(-6)}) joined KENESIS.`,
  //         'user_joined',
  //         userCredential.user.uid
  //       );
  //     }
  //   } catch (error: any) {
  //     setIsLoading(false);
  //     console.error("Firebase signup error:", error);
  //     throw error;
  //   }
  // };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      
      if (additionalUserInfo?.isNewUser && result.user) {
         // User's displayName and photoURL are automatically populated by Firebase from Google.
         // We just need to ensure our local state reflects this if necessary,
         // but onAuthStateChanged should handle it.
        await addNotification(
          `User ${result.user.displayName || 'New User'} (...${result.user.uid.slice(-6)}) joined KENESIS via Google.`,
          'user_joined',
          result.user.uid
        );
      }
      // onAuthStateChanged will update user state and trigger redirects
    } catch (error: any) {
      setIsLoading(false);
      console.error("Google Sign-In error:", error);
      throw error; // Re-throw to be caught by calling component if needed
    }
  };

  const updateUserProfileName = async (newName: string) => {
    if (!auth.currentUser) {
      throw new Error("No user currently signed in to update profile.");
    }
    setIsLoading(true);
    try {
      await updateProfile(auth.currentUser, { displayName: newName });
      // Update local user state immediately for better UX
      setUser(auth.currentUser ? { ...auth.currentUser, displayName: newName } : null);
      // No need to explicitly call setIsLoading(false) if onAuthStateChanged will refresh user.
      // However, for immediate feedback if not relying on onAuthStateChanged for this specific update:
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      console.error("Error updating user profile name:", error);
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
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, signInWithGoogle, updateUserProfileName, logout }}>
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
